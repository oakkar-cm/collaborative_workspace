import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Square, Circle, Type, Trash2, Pencil, Eraser,
  Plus, Minus, Hand, Maximize2, MousePointer2, StickyNote
} from 'lucide-react';
import { Button } from './ui/button';

const COLORS = ['#000000', '#FBBF24', '#F87171', '#60A5FA', '#34D399', '#A78BFA', '#F472B6'];
const NOTE_COLORS = ['#FEF3C7', '#FEE2E2', '#DBEAFE', '#D1FAE5', '#E9D5FF', '#FCE7F3'];

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_SENSITIVITY = 0.001;
const DOT_SPACING = 24;

function screenToWorld(screenX, screenY, pan, zoom) {
  return {
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom,
  };
}

const Whiteboard = ({ workspaceId, socket, currentUser }) => {
  const containerRef = useRef(null);

  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#000000');

  const [stickyNotes, setStickyNotes] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [paths, setPaths] = useState([]);
  const [texts, setTexts] = useState([]);

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

  const [editingTextId, setEditingTextId] = useState(null);

  // ─── Socket handlers ────────────────────────────────────────────
  const handleWhiteboardInit = useCallback((data) => {
    if (data.workspace_id !== workspaceId) return;
    setStickyNotes(data.stickyNotes || []);
    setShapes(data.shapes || []);
    setPaths(data.paths || []);
    setTexts(data.texts || []);
  }, [workspaceId]);

  const handleWhiteboardUpdate = useCallback((data) => {
    if (data.workspace_id !== workspaceId || data.user_id === currentUser?.user_id) return;
    if (data.type === 'sticky') setStickyNotes(data.stickyNotes);
    else if (data.type === 'shape') setShapes(data.shapes);
    else if (data.type === 'path') setPaths(data.paths);
    else if (data.type === 'text') setTexts(data.texts);
    else if (data.type === 'delete') {
      setStickyNotes(data.stickyNotes);
      setShapes(data.shapes);
      setTexts(data.texts || []);
    } else if (data.type === 'clear') {
      setStickyNotes([]);
      setShapes([]);
      setPaths([]);
      setTexts([]);
    }
  }, [workspaceId, currentUser]);

  useEffect(() => {
    if (!socket) return;
    socket.on('whiteboard:update', handleWhiteboardUpdate);
    socket.on('whiteboard:init', handleWhiteboardInit);
    socket.emit('whiteboard:request', { workspace_id: workspaceId });
    return () => {
      socket.off('whiteboard:update');
      socket.off('whiteboard:init');
    };
  }, [socket, workspaceId, handleWhiteboardInit, handleWhiteboardUpdate]);

  const broadcastUpdate = useCallback((type, updateData) => {
    if (!socket) return;
    socket.emit('whiteboard:update', {
      workspace_id: workspaceId,
      user_id: currentUser?.user_id,
      type,
      ...updateData,
    });
  }, [socket, workspaceId, currentUser]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (editingTextId) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space' && !spaceHeld) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
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
  });

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const updNotes = stickyNotes.filter((n) => n.id !== selectedId);
    const updShapes = shapes.filter((s) => s.id !== selectedId);
    const updTexts = texts.filter((t) => t.id !== selectedId);
    const updPaths = paths.filter((p) => p.id !== selectedId);
    setStickyNotes(updNotes);
    setShapes(updShapes);
    setTexts(updTexts);
    setPaths(updPaths);
    setSelectedId(null);
    broadcastUpdate('delete', { stickyNotes: updNotes, shapes: updShapes, texts: updTexts });
  }, [selectedId, stickyNotes, shapes, texts, paths, broadcastUpdate]);

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
      eraseAtPoint(x, y);
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

    if (drawing && currentPath.length > 1) {
      const newPath = { id: typeof drawing === 'string' ? drawing : `path_${Date.now()}`, points: currentPath, color };
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

  const updateStickyNote = (id, updates) => {
    const updated = stickyNotes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    setStickyNotes(updated);
    broadcastUpdate('sticky', { stickyNotes: updated });
  };

  const updateText = (id, updates) => {
    const updated = texts.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setTexts(updated);
    broadcastUpdate('text', { texts: updated });
  };

  const cycleStickyColor = (id) => {
    const note = stickyNotes.find((n) => n.id === id);
    if (!note) return;
    const idx = NOTE_COLORS.indexOf(note.color);
    const next = NOTE_COLORS[(idx + 1) % NOTE_COLORS.length];
    updateStickyNote(id, { color: next });
  };

  const eraseAtPoint = (wx, wy) => {
    const hitRadius = 12 / zoom;
    const updated = paths.filter((p) => {
      return !p.points.some((pt) => Math.hypot(pt.x - wx, pt.y - wy) < hitRadius);
    });
    if (updated.length !== paths.length) {
      setPaths(updated);
      broadcastUpdate('path', { paths: updated });
    }
  };

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

  const clearCanvas = () => {
    if (!window.confirm('Clear entire whiteboard? This cannot be undone.')) return;
    setStickyNotes([]);
    setShapes([]);
    setPaths([]);
    setTexts([]);
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
    if (tool === 'eraser') return 'crosshair';
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
      onMouseLeave={handleMouseUp}
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
          {paths.map((p) => (
            <polyline
              key={p.id}
              points={p.points.map((pt) => `${pt.x},${pt.y}`).join(' ')}
              fill="none"
              stroke={p.color || '#000'}
              strokeWidth={2.5 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: tool === 'eraser' ? 'stroke' : 'none' }}
            />
          ))}
          {currentPath.length > 1 && (
            <polyline
              points={currentPath.map((pt) => `${pt.x},${pt.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2.5 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

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
      </div>

      {/* ─── Empty state ──────────────────────────────────────── */}
      {stickyNotes.length === 0 && paths.length === 0 && shapes.length === 0 && texts.length === 0 && (
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
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
              title={t.label}
            >
              <t.icon className="w-4 h-4" />
            </Button>
          )
        )}

        <div className="w-px h-7 bg-[#E2E8F0] mx-1" />

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
          className="text-xs font-medium text-[#64748B] hover:text-[#0F172A] min-w-[48px] text-center transition-colors"
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
    </div>
  );
};

export default Whiteboard;
