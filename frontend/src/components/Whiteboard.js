import React, { useState, useEffect, useRef } from 'react';
import { 
  Square, Circle, Type, Trash2, Move, Pencil, Eraser,
  Plus, Minus, Hand, Maximize2, Download, Undo, Redo
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const COLORS = ['#FBBF24', '#F87171', '#60A5FA', '#34D399', '#A78BFA', '#F472B6'];
const NOTE_COLORS = ['#FEF3C7', '#FEE2E2', '#DBEAFE', '#D1FAE5', '#E9D5FF', '#FCE7F3'];

const Whiteboard = ({ workspaceId, socket, currentUser }) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('select'); // select, draw, sticky, rectangle, circle, text
  const [color, setColor] = useState('#000000');
  const [stickyNotes, setStickyNotes] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const canvasContainerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('whiteboard:update', handleWhiteboardUpdate);
    socket.on('whiteboard:init', handleWhiteboardInit);

    // Request initial whiteboard state
    socket.emit('whiteboard:request', { workspace_id: workspaceId });

    return () => {
      socket.off('whiteboard:update');
      socket.off('whiteboard:init');
    };
  }, [socket, workspaceId]);

  const handleWhiteboardInit = (data) => {
    if (data.workspace_id === workspaceId) {
      setStickyNotes(data.stickyNotes || []);
      setShapes(data.shapes || []);
      setPaths(data.paths || []);
    }
  };

  const handleWhiteboardUpdate = (data) => {
    if (data.workspace_id === workspaceId && data.user_id !== currentUser?.user_id) {
      if (data.type === 'sticky') {
        setStickyNotes(data.stickyNotes);
      } else if (data.type === 'shape') {
        setShapes(data.shapes);
      } else if (data.type === 'path') {
        setPaths(data.paths);
      } else if (data.type === 'delete') {
        setStickyNotes(data.stickyNotes);
        setShapes(data.shapes);
      }
    }
  };

  const broadcastUpdate = (type, updateData) => {
    if (!socket) return;
    socket.emit('whiteboard:update', {
      workspace_id: workspaceId,
      user_id: currentUser?.user_id,
      type,
      ...updateData
    });
  };

  const addStickyNote = () => {
    const newNote = {
      id: `sticky_${Date.now()}_${Math.random()}`,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 200,
      height: 150,
      content: '',
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      createdBy: currentUser?.name
    };
    const updated = [...stickyNotes, newNote];
    setStickyNotes(updated);
    broadcastUpdate('sticky', { stickyNotes: updated });
    setSelectedId(newNote.id);
  };

  const updateStickyNote = (id, updates) => {
    const updated = stickyNotes.map(note => 
      note.id === id ? { ...note, ...updates } : note
    );
    setStickyNotes(updated);
    broadcastUpdate('sticky', { stickyNotes: updated });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    
    const updatedNotes = stickyNotes.filter(n => n.id !== selectedId);
    const updatedShapes = shapes.filter(s => s.id !== selectedId);
    
    setStickyNotes(updatedNotes);
    setShapes(updatedShapes);
    setSelectedId(null);
    
    broadcastUpdate('delete', { stickyNotes: updatedNotes, shapes: updatedShapes });
  };

  const handleMouseDown = (e) => {
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    if (tool === 'draw' || tool === 'eraser') {
      setDrawing(true);
      setCurrentPath([{ x, y, color: tool === 'eraser' ? '#FFFFFF' : color }]);
    } else if (tool === 'sticky') {
      addStickyNote();
      setTool('select');
    }
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    setCurrentPath(prev => [...prev, { x, y, color: currentPath[0]?.color || color }]);
  };

  const handleMouseUp = () => {
    if (drawing && currentPath.length > 0) {
      const updatedPaths = [...paths, currentPath];
      setPaths(updatedPaths);
      broadcastUpdate('path', { paths: updatedPaths });
      setCurrentPath([]);
    }
    setDrawing(false);
  };

  const clearCanvas = () => {
    if (window.confirm('Clear entire whiteboard? This cannot be undone.')) {
      setStickyNotes([]);
      setShapes([]);
      setPaths([]);
      broadcastUpdate('clear', { stickyNotes: [], shapes: [], paths: [] });
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#F8F9FA]">
      {/* Toolbar */}
      <div className="bg-white border-b border-[#E2E8F0] p-3 flex items-center gap-2 flex-wrap shadow-sm flex-shrink-0">
        {/* Selection Tools */}
        <div className="flex items-center gap-1 border-r border-[#E2E8F0] pr-2">
          <Button
            onClick={() => setTool('select')}
            variant={tool === 'select' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0"
            data-testid="tool-select"
          >
            <Hand className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setTool('move')}
            variant={tool === 'move' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Move className="w-4 h-4" />
          </Button>
        </div>

        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r border-[#E2E8F0] pr-2">
          <Button
            onClick={() => setTool('draw')}
            variant={tool === 'draw' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0"
            data-testid="tool-draw"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setTool('eraser')}
            variant={tool === 'eraser' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Eraser className="w-4 h-4" />
          </Button>
        </div>

        {/* Shape Tools */}
        <div className="flex items-center gap-1 border-r border-[#E2E8F0] pr-2">
          <Button
            onClick={() => setTool('sticky')}
            variant={tool === 'sticky' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0 bg-[#FEF3C7] hover:bg-[#FDE047]"
            data-testid="tool-sticky"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setTool('rectangle')}
            variant={tool === 'rectangle' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setTool('circle')}
            variant={tool === 'circle' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Circle className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setTool('text')}
            variant={tool === 'text' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Type className="w-4 h-4" />
          </Button>
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-1 border-r border-[#E2E8F0] pr-2">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                color === c ? 'border-[#6366F1] ring-2 ring-[#6366F1] ring-offset-1' : 'border-gray-300'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            onClick={deleteSelected}
            disabled={!selectedId}
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 hover:bg-red-100 hover:text-red-600"
            data-testid="delete-selected"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={clearCanvas}
            variant="ghost"
            size="sm"
            className="h-9 px-3"
          >
            Clear All
          </Button>
        </div>

        <div className="flex-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-l border-[#E2E8F0] pl-2">
          <Button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-sm text-[#64748B] min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={canvasContainerRef}
        className="flex-1 relative overflow-hidden bg-white w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: tool === 'draw' ? 'crosshair' : tool === 'eraser' ? 'pointer' : 'default',
          minHeight: 0
        }}
      >
        <div 
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            minHeight: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          {/* Canvas for drawing */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              zIndex: 1,
              width: '200vw',
              height: '200vh',
              minWidth: '2000px',
              minHeight: '2000px'
            }}
          >
            {paths.map((path, idx) => (
              <polyline
                key={idx}
                points={path.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={path[0]?.color || '#000000'}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath.length > 0 && (
              <polyline
                points={currentPath.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={currentPath[0]?.color || color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Sticky Notes */}
          {stickyNotes.map(note => (
            <div
              key={note.id}
              className={`absolute p-3 rounded-lg shadow-lg cursor-move transition-all hover:shadow-xl ${
                selectedId === note.id ? 'ring-2 ring-[#6366F1]' : ''
              }`}
              style={{
                left: note.x,
                top: note.y,
                width: note.width,
                minHeight: note.height,
                backgroundColor: note.color,
                zIndex: selectedId === note.id ? 10 : 2
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(note.id);
              }}
            >
              <textarea
                className="w-full h-full bg-transparent border-none outline-none resize-none text-sm font-medium text-[#0F172A] placeholder-[#94A3B8]"
                placeholder="Type your note..."
                value={note.content}
                onChange={(e) => updateStickyNote(note.id, { content: e.target.value })}
                style={{ minHeight: '100px' }}
              />
              {note.createdBy && (
                <div className="text-xs text-[#64748B] mt-2 font-medium">
                  - {note.createdBy}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Instructions */}
        {stickyNotes.length === 0 && paths.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-[#94A3B8]">
              <Square className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Start collaborating!</p>
              <p className="text-sm">Add sticky notes, draw, or create shapes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;
