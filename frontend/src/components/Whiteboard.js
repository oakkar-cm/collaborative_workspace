import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Square, Circle, Type, Trash2, Pencil, Eraser,
  Plus, Minus, Hand, Maximize2, MousePointer2, StickyNote, ImagePlus, Scissors, Check, X
} from 'lucide-react';
import { Button } from './ui/button';

const COLORS = ['#000000', '#FBBF24', '#F87171', '#60A5FA', '#34D399', '#A78BFA', '#F472B6'];
const NOTE_COLORS = ['#FEF3C7', '#FEE2E2', '#DBEAFE', '#D1FAE5', '#E9D5FF', '#FCE7F3'];

const PEN_TYPES = {
  pencil:      { label: 'Pencil',      opacity: 0.75, widthMul: 1,   linecap: 'round' },
  pen:         { label: 'Pen',         opacity: 1,    widthMul: 1,   linecap: 'round' },
  softpen:     { label: 'Soft Pen',    opacity: 0.45, widthMul: 2.5, linecap: 'round' },
  highlighter: { label: 'Highlighter', opacity: 0.3,  widthMul: 5,   linecap: 'square' },
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_SENSITIVITY = 0.001;
const DOT_SPACING = 24;
const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;
const MIN_CROP_SIZE = 30;

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function screenToWorld(screenX, screenY, pan, zoom) {
  return {
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom,
  };
}

function resizeRectFromHandle(rect, handle, pointer, minWidth = 60, minHeight = 40) {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  let nextX = rect.x;
  let nextY = rect.y;
  let nextRight = right;
  let nextBottom = bottom;

  if (handle.includes('w')) {
    nextX = Math.min(pointer.x, right - minWidth);
  }
  if (handle.includes('e')) {
    nextRight = Math.max(pointer.x, rect.x + minWidth);
  }
  if (handle.includes('n')) {
    nextY = Math.min(pointer.y, bottom - minHeight);
  }
  if (handle.includes('s')) {
    nextBottom = Math.max(pointer.y, rect.y + minHeight);
  }

  return {
    x: nextX,
    y: nextY,
    width: Math.max(minWidth, nextRight - nextX),
    height: Math.max(minHeight, nextBottom - nextY),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampRectToBounds(rect, boundsWidth, boundsHeight, minWidth = MIN_CROP_SIZE, minHeight = MIN_CROP_SIZE) {
  const width = clamp(rect.width, minWidth, boundsWidth);
  const height = clamp(rect.height, minHeight, boundsHeight);
  const x = clamp(rect.x, 0, Math.max(0, boundsWidth - width));
  const y = clamp(rect.y, 0, Math.max(0, boundsHeight - height));
  return { x, y, width, height };
}

/** CSS object-fit: cover — image fills the box; maps box coords → natural pixels */
function getObjectCoverLayout(naturalWidth, naturalHeight, boxWidth, boxHeight) {
  if (!naturalWidth || !naturalHeight || !boxWidth || !boxHeight) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight);
  const scaledW = naturalWidth * scale;
  const scaledH = naturalHeight * scale;
  const offsetX = (boxWidth - scaledW) / 2;
  const offsetY = (boxHeight - scaledH) / 2;
  return { scale, offsetX, offsetY };
}

function boxRectToNaturalCrop(rect, layout, naturalWidth, naturalHeight) {
  const { scale, offsetX, offsetY } = layout;
  let sx = Math.round((rect.x - offsetX) / scale);
  let sy = Math.round((rect.y - offsetY) / scale);
  let sw = Math.max(1, Math.round(rect.width / scale));
  let sh = Math.max(1, Math.round(rect.height / scale));
  sx = clamp(sx, 0, Math.max(0, naturalWidth - 1));
  sy = clamp(sy, 0, Math.max(0, naturalHeight - 1));
  sw = clamp(sw, 1, naturalWidth - sx);
  sh = clamp(sh, 1, naturalHeight - sy);
  return { sx, sy, sw, sh };
}

const Whiteboard = ({ workspaceId, socket, currentUser }) => {
  const containerRef = useRef(null);
  const imageInputRef = useRef(null);

  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#000000');
  const [penType, setPenType] = useState('pen');
  const [penSize, setPenSize] = useState(3);

  const [stickyNotes, setStickyNotes] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [paths, setPaths] = useState([]);
  const [texts, setTexts] = useState([]);
  const [images, setImages] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const [dragging, setDragging] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [shapeStart, setShapeStart] = useState(null);
  const [shapePreview, setShapePreview] = useState(null);
  const [imageDragging, setImageDragging] = useState(null);
  const [imageResizing, setImageResizing] = useState(null);
  const [imageCropping, setImageCropping] = useState(null);

  const [editingTextId, setEditingTextId] = useState(null);
  const [eraserSize, setEraserSize] = useState(20);
  const [eraserPos, setEraserPos] = useState(null);
  const isErasing = useRef(false);
  const pathsRef = useRef(paths);
  const editingTextIdRef = useRef(editingTextId);
  const spaceHeldRef = useRef(spaceHeld);
  const deleteSelectedRef = useRef(() => {});
  const pendingBroadcastRef = useRef(new Map());
  const broadcastTimerRef = useRef(new Map());
  useEffect(() => { pathsRef.current = paths; }, [paths]);
  useEffect(() => { editingTextIdRef.current = editingTextId; }, [editingTextId]);
  useEffect(() => { spaceHeldRef.current = spaceHeld; }, [spaceHeld]);

  // ─── Socket handlers ────────────────────────────────────────────
  const handleWhiteboardInit = useCallback((data) => {
    if (data.workspace_id !== workspaceId) return;
    setStickyNotes(data.stickyNotes || []);
    setShapes(data.shapes || []);
    setPaths(data.paths || []);
    setTexts(data.texts || []);
    setImages(data.images || []);
  }, [workspaceId]);

  const handleWhiteboardUpdate = useCallback((data) => {
    if (data.workspace_id !== workspaceId || data.user_id === currentUser?.user_id) return;
    if (data.type === 'sticky') setStickyNotes(data.stickyNotes);
    else if (data.type === 'shape') setShapes(data.shapes);
    else if (data.type === 'path') setPaths(data.paths);
    else if (data.type === 'text') setTexts(data.texts);
    else if (data.type === 'image') setImages(data.images);
    else if (data.type === 'delete') {
      setStickyNotes(data.stickyNotes);
      setShapes(data.shapes);
      setPaths(data.paths || []);
      setTexts(data.texts || []);
      setImages(data.images || []);
    } else if (data.type === 'clear') {
      setStickyNotes([]);
      setShapes([]);
      setPaths([]);
      setTexts([]);
      setImages([]);
    }
  }, [workspaceId, currentUser]);

  useEffect(() => {
    if (!socket) return;
    socket.on('whiteboard:update', handleWhiteboardUpdate);
    socket.on('whiteboard:init', handleWhiteboardInit);
    socket.emit('whiteboard:request', { workspace_id: workspaceId });
    return () => {
      socket.off('whiteboard:update', handleWhiteboardUpdate);
      socket.off('whiteboard:init', handleWhiteboardInit);
    };
  }, [socket, workspaceId, handleWhiteboardInit, handleWhiteboardUpdate]);

  const emitWhiteboardUpdate = useCallback((type, updateData) => {
    if (!socket?.connected) return;
    socket.emit('whiteboard:update', {
      workspace_id: workspaceId,
      user_id: currentUser?.user_id,
      type,
      ...updateData
    });
  }, [socket, workspaceId, currentUser]);

  const broadcastUpdate = useCallback((type, updateData, options = {}) => {
    const { immediate = true, debounceMs = 140 } = options;
    if (immediate) {
      emitWhiteboardUpdate(type, updateData);
      return;
    }

    pendingBroadcastRef.current.set(type, updateData);
    if (broadcastTimerRef.current.has(type)) return;

    const timer = setTimeout(() => {
      broadcastTimerRef.current.delete(type);
      const payload = pendingBroadcastRef.current.get(type);
      pendingBroadcastRef.current.delete(type);
      if (payload) {
        emitWhiteboardUpdate(type, payload);
      }
    }, debounceMs);
    broadcastTimerRef.current.set(type, timer);
  }, [emitWhiteboardUpdate]);

  useEffect(() => () => {
    Array.from(broadcastTimerRef.current.values()).forEach((timer) => clearTimeout(timer));
    broadcastTimerRef.current.clear();
    pendingBroadcastRef.current.clear();
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (editingTextIdRef.current) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.target.closest && e.target.closest('[contenteditable="true"]')) return;

      if (e.code === 'Space' && !spaceHeldRef.current) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedRef.current();
      }
      if (e.key === 'v' || e.key === '1') setTool('select');
      if (e.key === 'h' || e.key === '2') setTool('hand');
      if (e.key === 'p' || e.key === '3') setTool('draw');
      if (e.key === 'e') setTool('eraser');
      if (e.key === 's' || e.key === '4') setTool('sticky');
      if (e.key === 'r') setTool('rectangle');
      if (e.key === 'c') setTool('circle');
      if (e.key === 't') setTool('text');
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
        setIsPanning(false);
        setPanStart(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const updNotes = stickyNotes.filter((n) => n.id !== selectedId);
    const updShapes = shapes.filter((s) => s.id !== selectedId);
    const updTexts = texts.filter((t) => t.id !== selectedId);
    const updPaths = paths.filter((p) => p.id !== selectedId);
    const updImages = images.filter((img) => img.id !== selectedId);
    setStickyNotes(updNotes);
    setShapes(updShapes);
    setTexts(updTexts);
    setPaths(updPaths);
    setImages(updImages);
    setSelectedId(null);
    broadcastUpdate('delete', { stickyNotes: updNotes, shapes: updShapes, paths: updPaths, texts: updTexts, images: updImages });
  }, [selectedId, stickyNotes, shapes, texts, paths, images, broadcastUpdate]);
  useEffect(() => {
    deleteSelectedRef.current = deleteSelected;
  }, [deleteSelected]);

  // ─── Wheel → zoom toward cursor ───────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (1 + delta)));
      const scale = newZoom / zoom;

      setPan((p) => ({
        x: mx - scale * (mx - p.x),
        y: my - scale * (my - p.y),
      }));
      setZoom(newZoom);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom]);

  // ─── Mouse helpers ─────────────────────────────────────────────────
  const getWorldPos = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan, zoom);
  };

  // ─── Pan start ─────────────────────────────────────────────────────
  const startPan = (e) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // ─── Mouse down ────────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    if (spaceHeld || tool === 'hand' || e.button === 1) {
      startPan(e);
      return;
    }

    const { x, y } = getWorldPos(e);

    if (tool === 'draw') {
      setDrawing(true);
      const pathId = `path_${Date.now()}_${Math.random()}`;
      setCurrentPath([{ x, y }]);
      setDrawing(pathId);
    } else if (tool === 'eraser') {
      isErasing.current = true;
      pathsRef.current = eraseAtPoint(x, y, pathsRef.current);
    } else if (tool === 'sticky') {
      addStickyNote(x, y);
      setTool('select');
    } else if (tool === 'rectangle' || tool === 'circle') {
      setShapeStart({ x, y });
      setShapePreview(null);
    } else if (tool === 'text') {
      addText(x, y);
      setTool('select');
    } else if (tool === 'select') {
      setSelectedId(null);
    }
  };

  // ─── Mouse move ────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const { x, y } = getWorldPos(e);

    if (imageDragging) {
      const updated = images.map((img) =>
        img.id === imageDragging.id
          ? { ...img, x: x - imageDragging.ox, y: y - imageDragging.oy }
          : img
      );
      setImages(updated);
      return;
    }

    if (imageCropping?.mode) {
      const activeImage = images.find((item) => item.id === imageCropping.id);
      if (!activeImage) return;
      const localX = x - activeImage.x;
      const localY = y - activeImage.y;

      if (imageCropping.mode === 'move') {
        const nextRect = clampRectToBounds({
          ...imageCropping.rect,
          x: localX - imageCropping.ox,
          y: localY - imageCropping.oy
        }, activeImage.width, activeImage.height);
        setImageCropping((prev) => prev ? { ...prev, rect: nextRect } : prev);
        return;
      }

      if (imageCropping.mode === 'resize') {
        const resized = resizeRectFromHandle(
          imageCropping.rect,
          imageCropping.handle,
          { x: localX, y: localY },
          MIN_CROP_SIZE,
          MIN_CROP_SIZE
        );
        const nextRect = clampRectToBounds(resized, activeImage.width, activeImage.height);
        setImageCropping((prev) => prev ? { ...prev, rect: nextRect } : prev);
        return;
      }
    }

    if (imageResizing) {
      const updated = images.map((img) => {
        if (img.id !== imageResizing.id) return img;
        const nextRect = resizeRectFromHandle(
          { x: img.x, y: img.y, width: img.width, height: img.height },
          imageResizing.handle,
          { x, y },
          60,
          40
        );
        return { ...img, ...nextRect };
      });
      setImages(updated);
      return;
    }

    if (tool === 'eraser') {
      const rect = containerRef.current.getBoundingClientRect();
      setEraserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (isErasing.current) {
        pathsRef.current = eraseAtPoint(x, y, pathsRef.current);
      }
      return;
    }

    if (dragging) {
      const updated = stickyNotes.map((n) =>
        n.id === dragging.id ? { ...n, x: x - dragging.ox, y: y - dragging.oy } : n
      );
      setStickyNotes(updated);
      return;
    }

    if (drawing) {
      setCurrentPath((prev) => [...prev, { x, y }]);
      return;
    }

    if (shapeStart) {
      setShapePreview({ x: Math.min(shapeStart.x, x), y: Math.min(shapeStart.y, y), w: Math.abs(x - shapeStart.x), h: Math.abs(y - shapeStart.y) });
    }
  };

  // ─── Mouse up ──────────────────────────────────────────────────────
  const handleMouseUp = () => {
    if (isErasing.current) {
      isErasing.current = false;
    }

    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (dragging) {
      broadcastUpdate('sticky', { stickyNotes });
      setDragging(null);
      return;
    }

    if (imageDragging) {
      broadcastUpdate('image', { images });
      setImageDragging(null);
      return;
    }

    if (imageResizing) {
      broadcastUpdate('image', { images });
      setImageResizing(null);
      return;
    }

    if (imageCropping?.mode) {
      setImageCropping((prev) => (prev ? { ...prev, mode: null, handle: null } : prev));
      return;
    }

    if (drawing && currentPath.length > 1) {
      const newPath = { id: typeof drawing === 'string' ? drawing : `path_${Date.now()}`, points: currentPath, color, penType, strokeWidth: penSize };
      const updated = [...paths, newPath];
      setPaths(updated);
      broadcastUpdate('path', { paths: updated });
    }
    setDrawing(false);
    setCurrentPath([]);

    if (shapeStart && shapePreview && (shapePreview.w > 5 || shapePreview.h > 5)) {
      const newShape = {
        id: `shape_${Date.now()}_${Math.random()}`,
        type: tool,
        x: shapePreview.x,
        y: shapePreview.y,
        w: shapePreview.w,
        h: shapePreview.h,
        color,
      };
      const updated = [...shapes, newShape];
      setShapes(updated);
      broadcastUpdate('shape', { shapes: updated });
    }
    setShapeStart(null);
    setShapePreview(null);
  };

  // ─── Object creators ──────────────────────────────────────────────
  const addStickyNote = (x, y) => {
    const note = {
      id: `sticky_${Date.now()}_${Math.random()}`,
      x: x - 110,
      y: y - 80,
      width: 220,
      height: 160,
      content: '',
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      createdBy: currentUser?.name,
    };
    const updated = [...stickyNotes, note];
    setStickyNotes(updated);
    broadcastUpdate('sticky', { stickyNotes: updated });
    setSelectedId(note.id);
  };

  const addText = (x, y) => {
    const t = {
      id: `text_${Date.now()}_${Math.random()}`,
      x,
      y,
      content: 'Text',
      color,
      fontSize: 18,
    };
    const updated = [...texts, t];
    setTexts(updated);
    broadcastUpdate('text', { texts: updated });
    setSelectedId(t.id);
    setEditingTextId(t.id);
  };

  const getWorldCenter = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 100, y: 100 };
    return screenToWorld(rect.width / 2, rect.height / 2, pan, zoom);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      window.alert('Please select an image file');
      return;
    }
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      window.alert('Image too large. Max size is 2MB.');
      return;
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const dims = await new Promise((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error('Invalid image'));
        image.src = dataUrl;
      });

      const center = getWorldCenter();
      const maxWidth = 320;
      const scale = dims.width > maxWidth ? maxWidth / dims.width : 1;
      const width = Math.max(100, Math.round(dims.width * scale));
      const height = Math.max(80, Math.round(dims.height * scale));
      const imageItem = {
        id: `image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        x: center.x - width / 2,
        y: center.y - height / 2,
        width,
        height,
        src: dataUrl,
        name: file.name
      };
      const updated = [...images, imageItem];
      setImages(updated);
      setSelectedId(imageItem.id);
      broadcastUpdate('image', { images: updated });
    } catch {
      window.alert('Could not upload image');
    }
  };

  const updateStickyNote = (id, updates) => {
    const updated = stickyNotes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    setStickyNotes(updated);
    broadcastUpdate('sticky', { stickyNotes: updated }, { immediate: false, debounceMs: 180 });
  };

  const updateText = (id, updates) => {
    const updated = texts.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setTexts(updated);
    broadcastUpdate('text', { texts: updated }, { immediate: false, debounceMs: 180 });
  };

  const cycleStickyColor = (id) => {
    const note = stickyNotes.find((n) => n.id === id);
    if (!note) return;
    const idx = NOTE_COLORS.indexOf(note.color);
    const next = NOTE_COLORS[(idx + 1) % NOTE_COLORS.length];
    updateStickyNote(id, { color: next });
  };

  const eraseAtPoint = useCallback((wx, wy, currentPaths) => {
    const hitRadius = eraserSize / zoom;
    let changed = false;
    const result = [];

    for (const p of currentPaths) {
      const pts = p.points;
      if (pts.length < 2) { result.push(p); continue; }

      const segHit = [];
      for (let i = 0; i < pts.length - 1; i++) {
        segHit.push(distToSegment(wx, wy, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < hitRadius);
      }

      if (!segHit.includes(true)) {
        result.push(p);
        continue;
      }

      changed = true;
      let segment = [pts[0]];
      for (let i = 0; i < segHit.length; i++) {
        if (segHit[i]) {
          if (segment.length >= 2) {
            result.push({ ...p, id: `${p.id}_s${Date.now()}_${Math.random()}`, points: [...segment] });
          }
          segment = [];
        } else {
          if (segment.length === 0) segment.push(pts[i]);
          segment.push(pts[i + 1]);
        }
      }
      if (segment.length >= 2) {
        result.push({ ...p, id: `${p.id}_s${Date.now()}_${Math.random()}`, points: [...segment] });
      }
    }

    if (changed) {
      setPaths(result);
      broadcastUpdate('path', { paths: result }, { immediate: false, debounceMs: 120 });
    }
    return changed ? result : currentPaths;
  }, [eraserSize, zoom, broadcastUpdate]);

  // ─── Sticky drag ──────────────────────────────────────────────────
  const handleStickyMouseDown = (e, noteId) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    const { x, y } = getWorldPos(e);
    const note = stickyNotes.find((n) => n.id === noteId);
    if (!note) return;
    setSelectedId(noteId);
    setDragging({ id: noteId, ox: x - note.x, oy: y - note.y });
  };

  const handleImageMouseDown = (e, imageId) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    if (imageCropping?.id === imageId) return;
    const { x, y } = getWorldPos(e);
    const image = images.find((item) => item.id === imageId);
    if (!image) return;
    setSelectedId(imageId);
    setImageDragging({ id: imageId, ox: x - image.x, oy: y - image.y });
  };

  const handleImageResizeMouseDown = (e, imageId, handle) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    if (imageCropping?.id === imageId) return;
    setSelectedId(imageId);
    setImageResizing({ id: imageId, handle });
  };

  const startImageCrop = () => {
    const selectedImage = images.find((img) => img.id === selectedId);
    if (!selectedImage) return;
    const insetX = Math.max(8, Math.round(selectedImage.width * 0.1));
    const insetY = Math.max(8, Math.round(selectedImage.height * 0.1));
    setImageCropping({
      id: selectedImage.id,
      rect: {
        x: insetX,
        y: insetY,
        width: Math.max(MIN_CROP_SIZE, selectedImage.width - insetX * 2),
        height: Math.max(MIN_CROP_SIZE, selectedImage.height - insetY * 2),
      },
      mode: null,
      handle: null,
      ox: 0,
      oy: 0,
    });
  };

  const cancelImageCrop = () => {
    setImageCropping(null);
  };

  const handleCropAreaMouseDown = (e, imageId) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    const image = images.find((img) => img.id === imageId);
    if (!image || imageCropping?.id !== imageId) return;
    const { x, y } = getWorldPos(e);
    const localX = x - image.x;
    const localY = y - image.y;
    setImageCropping((prev) => (
      prev
        ? { ...prev, mode: 'move', ox: localX - prev.rect.x, oy: localY - prev.rect.y }
        : prev
    ));
  };

  const handleCropResizeMouseDown = (e, imageId, handle) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    if (imageCropping?.id !== imageId) return;
    setImageCropping((prev) => (prev ? { ...prev, mode: 'resize', handle } : prev));
  };

  const applyImageCrop = async () => {
    if (!imageCropping?.id) return;
    const target = images.find((img) => img.id === imageCropping.id);
    if (!target) return;
    const rect = clampRectToBounds(imageCropping.rect, target.width, target.height);

    try {
      const sourceImage = await new Promise((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image for crop'));
        image.src = target.src;
      });

      const layout = getObjectCoverLayout(
        sourceImage.naturalWidth,
        sourceImage.naturalHeight,
        target.width,
        target.height
      );
      const { sx, sy, sw, sh } = boxRectToNaturalCrop(rect, layout, sourceImage.naturalWidth, sourceImage.naturalHeight);

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, sw, sh);
      const croppedDataUrl = canvas.toDataURL('image/png');

      const updated = images.map((img) => (
        img.id === target.id
          ? {
              ...img,
              src: croppedDataUrl,
              x: img.x + rect.x,
              y: img.y + rect.y,
              width: rect.width,
              height: rect.height
            }
          : img
      ));
      setImages(updated);
      setImageCropping(null);
      broadcastUpdate('image', { images: updated });
    } catch {
      window.alert('Failed to crop image');
    }
  };

  const clearCanvas = () => {
    if (!window.confirm('Clear entire whiteboard? This cannot be undone.')) return;
    setStickyNotes([]);
    setShapes([]);
    setPaths([]);
    setTexts([]);
    setImages([]);
    broadcastUpdate('clear', {});
  };

  // ─── Dot grid background ──────────────────────────────────────────
  const dotSize = DOT_SPACING * zoom;
  const dotBg = {
    backgroundImage: `radial-gradient(circle, #d0d5dd ${1}px, transparent ${1}px)`,
    backgroundSize: `${dotSize}px ${dotSize}px`,
    backgroundPosition: `${pan.x % dotSize}px ${pan.y % dotSize}px`,
  };

  // ─── Cursor ────────────────────────────────────────────────────────
  const getCursor = () => {
    if (spaceHeld || tool === 'hand') return isPanning ? 'grabbing' : 'grab';
    if (tool === 'draw') return 'crosshair';
    if (tool === 'eraser') return 'none';
    if (tool === 'rectangle' || tool === 'circle') return 'crosshair';
    if (tool === 'text') return 'text';
    if (tool === 'sticky') return 'copy';
    return 'default';
  };

  // ─── Toolbar items ────────────────────────────────────────────────
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Pan (H)' },
    { id: 'sep1' },
    { id: 'draw', icon: Pencil, label: 'Pen (P)' },
    { id: 'eraser', icon: Eraser, label: 'Eraser (E)' },
    { id: 'sep2' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: Circle, label: 'Circle (C)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
  ];

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative overflow-hidden select-none"
      style={{ ...dotBg, cursor: getCursor() }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { handleMouseUp(); setEraserPos(null); }}
      tabIndex={0}
    >
      {/* ─── Transformed world layer ──────────────────────────── */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          overflow: 'visible',
        }}
      >
        {/* SVG for paths and shapes */}
        <svg
          style={{
            position: 'absolute',
            top: -10000,
            left: -10000,
            width: 20000,
            height: 20000,
            pointerEvents: 'none',
          }}
          viewBox="-10000 -10000 20000 20000"
        >
          {paths.map((p) => {
            const pt = PEN_TYPES[p.penType] || PEN_TYPES.pen;
            const sw = ((p.strokeWidth || 2.5) * pt.widthMul) / zoom;
            return (
              <polyline
                key={p.id}
                points={p.points.map((pt) => `${pt.x},${pt.y}`).join(' ')}
                fill="none"
                stroke={p.color || '#000'}
                strokeWidth={sw}
                strokeLinecap={pt.linecap}
                strokeLinejoin="round"
                opacity={pt.opacity}
                style={{ pointerEvents: tool === 'eraser' ? 'stroke' : 'none' }}
              />
            );
          })}
          {currentPath.length > 1 && (() => {
            const activePt = PEN_TYPES[penType] || PEN_TYPES.pen;
            const activeSw = (penSize * activePt.widthMul) / zoom;
            return (
              <polyline
                points={currentPath.map((pt) => `${pt.x},${pt.y}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={activeSw}
                strokeLinecap={activePt.linecap}
                strokeLinejoin="round"
                opacity={activePt.opacity}
              />
            );
          })()}

          {shapes.map((s) =>
            s.type === 'rectangle' ? (
              <rect
                key={s.id}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5 / zoom}
                rx={3 / zoom}
                className={selectedId === s.id ? 'outline' : ''}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (tool === 'select') setSelectedId(s.id);
                }}
              />
            ) : (
              <ellipse
                key={s.id}
                cx={s.x + s.w / 2}
                cy={s.y + s.h / 2}
                rx={s.w / 2}
                ry={s.h / 2}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5 / zoom}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (tool === 'select') setSelectedId(s.id);
                }}
              />
            )
          )}

          {/* Selection highlight */}
          {selectedId &&
            shapes
              .filter((s) => s.id === selectedId)
              .map((s) => (
                <rect
                  key={`sel_${s.id}`}
                  x={s.x - 4 / zoom}
                  y={s.y - 4 / zoom}
                  width={s.w + 8 / zoom}
                  height={s.h + 8 / zoom}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth={1.5 / zoom}
                  strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                  rx={4 / zoom}
                />
              ))}

          {/* Shape preview while drawing */}
          {shapePreview && tool === 'rectangle' && (
            <rect
              x={shapePreview.x}
              y={shapePreview.y}
              width={shapePreview.w}
              height={shapePreview.h}
              fill="none"
              stroke={color}
              strokeWidth={2 / zoom}
              strokeDasharray={`${6 / zoom} ${3 / zoom}`}
              rx={3 / zoom}
            />
          )}
          {shapePreview && tool === 'circle' && (
            <ellipse
              cx={shapePreview.x + shapePreview.w / 2}
              cy={shapePreview.y + shapePreview.h / 2}
              rx={shapePreview.w / 2}
              ry={shapePreview.h / 2}
              fill="none"
              stroke={color}
              strokeWidth={2 / zoom}
              strokeDasharray={`${6 / zoom} ${3 / zoom}`}
            />
          )}
        </svg>

        {/* Sticky Notes */}
        {stickyNotes.map((note) => (
          <div
            key={note.id}
            className={`absolute rounded-lg shadow-lg select-text ${
              selectedId === note.id ? 'ring-2 ring-[#6366F1]' : ''
            }`}
            style={{
              left: note.x,
              top: note.y,
              width: note.width,
              minHeight: note.height,
              backgroundColor: note.color,
              zIndex: selectedId === note.id ? 10 : 2,
              transform: 'rotate(-0.5deg)',
            }}
          >
            {/* Header / drag handle */}
            <div
              className="flex items-center justify-between px-3 pt-2 pb-1 cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleStickyMouseDown(e, note.id)}
            >
              <span className="text-[10px] font-semibold text-black/30 uppercase tracking-wider truncate">
                {note.createdBy || 'Note'}
              </span>
              <button
                className="w-4 h-4 rounded-full border border-black/10 hover:scale-125 transition-transform flex-shrink-0"
                style={{ backgroundColor: note.color }}
                onClick={(e) => {
                  e.stopPropagation();
                  cycleStickyColor(note.id);
                }}
                title="Change color"
              />
            </div>
            <textarea
              className="w-full bg-transparent border-none outline-none resize-none text-sm font-medium text-[#0F172A] placeholder-[#94A3B8] px-3 pb-3"
              placeholder="Type your note..."
              value={note.content}
              onChange={(e) => updateStickyNote(note.id, { content: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(note.id);
              }}
              style={{ minHeight: '90px' }}
            />
          </div>
        ))}

        {/* Text elements */}
        {texts.map((t) => (
          <div
            key={t.id}
            className={`absolute ${selectedId === t.id ? 'ring-2 ring-[#6366F1] ring-offset-2' : ''}`}
            style={{ left: t.x, top: t.y, zIndex: 3 }}
            onClick={(e) => {
              e.stopPropagation();
              if (tool === 'select') {
                setSelectedId(t.id);
                setEditingTextId(t.id);
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {editingTextId === t.id ? (
              <input
                autoFocus
                className="bg-transparent outline-none border-b-2 border-[#6366F1] font-medium"
                style={{ color: t.color, fontSize: t.fontSize, minWidth: 60 }}
                value={t.content}
                onChange={(e) => updateText(t.id, { content: e.target.value })}
                onBlur={() => setEditingTextId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    setEditingTextId(null);
                  }
                }}
              />
            ) : (
              <span
                className="cursor-text font-medium whitespace-pre"
                style={{ color: t.color, fontSize: t.fontSize }}
              >
                {t.content || 'Text'}
              </span>
            )}
          </div>
        ))}

        {/* Image elements */}
        {images.map((img) => (
          <div
            key={img.id}
            className={`absolute overflow-hidden rounded-md border bg-neutral-900/5 shadow-md ${
              selectedId === img.id ? 'ring-2 ring-[#6366F1]' : 'border-black/10'
            }`}
            style={{ left: img.x, top: img.y, width: img.width, height: img.height, zIndex: 2 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(img.id);
            }}
            onMouseDown={(e) => handleImageMouseDown(e, img.id)}
          >
            <img
              src={img.src}
              alt={img.name || 'Whiteboard upload'}
              className="block h-full w-full select-none object-cover object-center"
              draggable={false}
            />
            {imageCropping?.id === img.id && (() => {
              const r = imageCropping.rect;
              const W = img.width;
              const H = img.height;
              return (
                <div className="absolute inset-0">
                  <div
                    className="absolute left-0 right-0 top-0 bg-black/50"
                    style={{ height: r.y }}
                  />
                  <div
                    className="absolute left-0 right-0 bg-black/50"
                    style={{ top: r.y + r.height, height: Math.max(0, H - r.y - r.height) }}
                  />
                  <div
                    className="absolute left-0 bg-black/50"
                    style={{ top: r.y, width: r.x, height: r.height }}
                  />
                  <div
                    className="absolute bg-black/50"
                    style={{
                      left: r.x + r.width,
                      top: r.y,
                      width: Math.max(0, W - r.x - r.width),
                      height: r.height
                    }}
                  />
                  <div
                    className="absolute border-2 border-dashed border-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]"
                    style={{
                      left: r.x,
                      top: r.y,
                      width: r.width,
                      height: r.height,
                      boxSizing: 'border-box'
                    }}
                    onMouseDown={(e) => handleCropAreaMouseDown(e, img.id)}
                  >
                    {[
                      { key: 'n', className: 'left-1/2 -top-1.5 -translate-x-1/2 h-2.5 w-6 cursor-ns-resize rounded-full' },
                      { key: 'e', className: '-right-1.5 top-1/2 -translate-y-1/2 h-6 w-2.5 cursor-ew-resize rounded-full' },
                      { key: 's', className: 'left-1/2 -bottom-1.5 -translate-x-1/2 h-2.5 w-6 cursor-ns-resize rounded-full' },
                      { key: 'w', className: '-left-1.5 top-1/2 -translate-y-1/2 h-6 w-2.5 cursor-ew-resize rounded-full' },
                    ].map((handle) => (
                      <button
                        key={`crop_${img.id}_${handle.key}`}
                        type="button"
                        className={`absolute border border-[#1E3A8A] bg-[#93C5FD] shadow ${handle.className}`}
                        onMouseDown={(e) => handleCropResizeMouseDown(e, img.id, handle.key)}
                        title="Adjust crop border"
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
            {selectedId === img.id && tool === 'select' && imageCropping?.id !== img.id && (
              <>
                {[
                  { key: 'nw', className: '-left-1.5 -top-1.5 cursor-nwse-resize' },
                  { key: 'ne', className: '-right-1.5 -top-1.5 cursor-nesw-resize' },
                  { key: 'se', className: '-right-1.5 -bottom-1.5 cursor-nwse-resize' },
                  { key: 'sw', className: '-left-1.5 -bottom-1.5 cursor-nesw-resize' },
                ].map((handle) => (
                  <button
                    key={`${img.id}_${handle.key}`}
                    type="button"
                    className={`absolute h-3 w-3 rounded-full border border-white bg-[#2563EB] shadow ${handle.className}`}
                    onMouseDown={(e) => handleImageResizeMouseDown(e, img.id, handle.key)}
                    title="Resize image"
                  />
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      {/* ─── Empty state ──────────────────────────────────────── */}
      {stickyNotes.length === 0 && paths.length === 0 && shapes.length === 0 && texts.length === 0 && images.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-[#94A3B8]">
            <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Click to start collaborating</p>
            <p className="text-sm">Add sticky notes, draw, or create shapes</p>
          </div>
        </div>
      )}

      {/* ─── Floating bottom toolbar ──────────────────────────── */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-lg border border-[#E2E8F0] px-2 py-1.5 flex items-center gap-0.5 z-50"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {tools.map((t) =>
          t.id.startsWith('sep') ? (
            <div key={t.id} className="w-px h-7 bg-[#E2E8F0] mx-1" />
          ) : (
            <Button
              key={t.id}
              onClick={() => setTool(t.id)}
              variant="ghost"
              size="sm"
              className={`h-9 w-9 p-0 rounded-lg transition-all ${
                tool === t.id
                  ? 'bg-[#6366F1] text-white hover:bg-[#5558E3] hover:text-white'
                  : 'text-[#64748B] hover:text-[#6B7280] hover:bg-[#F1F5F9]'
              }`}
              title={t.label}
            >
              <t.icon className="w-4 h-4" />
            </Button>
          )
        )}

        {tool === 'eraser' && (
          <>
            <div className="w-px h-7 bg-[#E2E8F0] mx-1" />
            <div className="flex items-center gap-1.5 px-1">
              <Eraser className="w-3 h-3 text-[#94A3B8]" />
              <input
                type="range"
                min={5}
                max={60}
                value={eraserSize}
                onChange={(e) => setEraserSize(Number(e.target.value))}
                className="w-20 h-1 accent-[#6366F1] cursor-pointer"
                title={`Eraser size: ${eraserSize}px`}
              />
              <span className="text-[10px] font-medium text-[#64748B] min-w-[20px] text-center">{eraserSize}</span>
            </div>
          </>
        )}

        {tool === 'draw' && (
          <>
            <div className="w-px h-7 bg-[#E2E8F0] mx-1" />
            <div className="flex items-center gap-1 px-1">
              {Object.entries(PEN_TYPES).map(([key, pt]) => (
                <button
                  key={key}
                  onClick={() => setPenType(key)}
                  className={`h-7 px-2 rounded-md text-[10px] font-medium transition-all ${
                    penType === key
                      ? 'bg-[#6366F1] text-white'
                      : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#6B7280]'
                  }`}
                  title={pt.label}
                >
                  {pt.label}
                </button>
              ))}
            </div>
            <div className="w-px h-7 bg-[#E2E8F0] mx-1" />
            <div className="flex items-center gap-1.5 px-1">
              <Pencil className="w-3 h-3 text-[#94A3B8]" />
              <input
                type="range"
                min={1}
                max={20}
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value))}
                className="w-20 h-1 accent-[#6366F1] cursor-pointer"
                title={`Pen size: ${penSize}px`}
              />
              <span className="text-[10px] font-medium text-[#64748B] min-w-[20px] text-center">{penSize}</span>
            </div>
          </>
        )}

        <div className="w-px h-7 bg-[#E2E8F0] mx-1" />

        <Button
          onClick={() => imageInputRef.current?.click()}
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-lg text-[#64748B] hover:text-[#6B7280] hover:bg-[#F1F5F9]"
          title="Upload image"
        >
          <ImagePlus className="w-4 h-4" />
        </Button>

        {/* Color picker */}
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 mx-0.5 ${
              color === c ? 'border-[#6366F1] ring-2 ring-[#6366F1]/30' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}

        <div className="w-px h-7 bg-[#E2E8F0] mx-1" />

        <Button
          onClick={deleteSelected}
          disabled={!selectedId}
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
          title="Delete selected (Del)"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        {tool === 'select' && selectedId && images.some((img) => img.id === selectedId) && (
          <>
            <div className="w-px h-7 bg-[#E2E8F0] mx-1" />
            {!imageCropping ? (
              <Button
                onClick={startImageCrop}
                variant="ghost"
                size="sm"
                className="h-9 px-2 rounded-lg text-[#64748B] hover:text-[#6B7280] hover:bg-[#F1F5F9]"
                title="Crop selected image"
              >
                <Scissors className="w-4 h-4 mr-1" />
                Crop
              </Button>
            ) : (
              <>
                <Button
                  onClick={applyImageCrop}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 rounded-lg text-[#16A34A] hover:bg-green-50"
                  title="Apply crop"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Apply
                </Button>
                <Button
                  onClick={cancelImageCrop}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 rounded-lg text-[#DC2626] hover:bg-red-50"
                  title="Cancel crop"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {/* ─── Zoom controls (bottom-right) ─────────────────────── */}
      <div
        className="absolute bottom-6 right-6 bg-white rounded-xl shadow-lg border border-[#E2E8F0] flex items-center gap-1 p-1 z-50"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Button
          onClick={() => {
            const newZoom = Math.max(MIN_ZOOM, zoom - 0.15);
            setPan((p) => {
              const rect = containerRef.current.getBoundingClientRect();
              const cx = rect.width / 2;
              const cy = rect.height / 2;
              const s = newZoom / zoom;
              return { x: cx - s * (cx - p.x), y: cy - s * (cy - p.y) };
            });
            setZoom(newZoom);
          }}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          title="Zoom out"
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="text-xs font-medium text-[#64748B] hover:text-[#6B7280] min-w-[48px] text-center transition-colors"
          title="Reset zoom (Ctrl+0)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          onClick={() => {
            const newZoom = Math.min(MAX_ZOOM, zoom + 0.15);
            setPan((p) => {
              const rect = containerRef.current.getBoundingClientRect();
              const cx = rect.width / 2;
              const cy = rect.height / 2;
              const s = newZoom / zoom;
              return { x: cx - s * (cx - p.x), y: cy - s * (cy - p.y) };
            });
            setZoom(newZoom);
          }}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          title="Zoom in"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-5 bg-[#E2E8F0]" />
        <Button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          title="Fit to view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Eraser cursor circle */}
      {tool === 'eraser' && eraserPos && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-[#6366F1]/60 bg-[#6366F1]/10"
          style={{
            width: eraserSize * 2,
            height: eraserSize * 2,
            left: eraserPos.x - eraserSize,
            top: eraserPos.y - eraserSize,
            zIndex: 9999,
          }}
        />
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
};

export default Whiteboard;
