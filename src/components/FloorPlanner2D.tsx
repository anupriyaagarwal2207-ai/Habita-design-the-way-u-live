'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Room, Furniture, RoomType, FurnitureType, HousePlan, DesignConfig } from '../types/designer';
import {
  Square,
  Trash2,
  RotateCw,
  Plus,
  Move,
  Check,
  Grid,
  Maximize2,
  HelpCircle,
  Undo
} from 'lucide-react';

interface FloorPlanner2DProps {
  plan: HousePlan;
  onChange: (updatedPlan: HousePlan) => void;
}

const ROOM_COLORS: Record<RoomType, string> = {
  living: '#8B5CF6',    // Purple
  bedroom: '#6366F1',   // Indigo
  bathroom: '#3B82F6',  // Blue
  kitchen: '#10B981',   // Emerald
  office: '#F59E0B',    // Amber
  gym: '#EF4444',       // Red
  garden: '#84CC16',    // Lime
  pool: '#0EA5E9',      // Sky Blue
  garage: '#6B7280',    // Gray
  hallway: '#EC4899',   // Pink
};

const FURNITURE_SIZES: Record<FurnitureType, { width: number; height: number; name: string }> = {
  bed: { width: 6.5, height: 7, name: 'King Bed' },
  sofa: { width: 7, height: 3, name: 'Sofa' },
  table: { width: 5, height: 3, name: 'Dining Table' },
  chair: { width: 2, height: 2, name: 'Chair' },
  tv: { width: 5, height: 1.5, name: 'TV & Console' },
  desk: { width: 4.5, height: 2.5, name: 'Desk' },
  toilet: { width: 2, height: 2.5, name: 'Toilet' },
  shower: { width: 3.5, height: 3.5, name: 'Shower' },
  sink: { width: 3, height: 2, name: 'Sink' },
  fridge: { width: 3, height: 3, name: 'Fridge' },
  stove: { width: 3, height: 2.5, name: 'Stove Counter' },
  plant: { width: 2.5, height: 2.5, name: 'House Plant' },
  car: { width: 6.5, height: 15, name: 'Car' },
  pool_chair: { width: 2, height: 4.5, name: 'Pool Lounger' },
};

export default function FloorPlanner2D({ plan, onChange }: FloorPlanner2DProps) {
  const { config, rooms, furniture } = plan;

  // Canvas configuration
  const [scale, setScale] = useState(16); // Pixels per foot
  const [pan, setPan] = useState({ x: 60, y: 60 });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);

  // Dragging state
  // dragInfo tracks what is currently being dragged
  const [dragInfo, setDragInfo] = useState<{
    type: 'room' | 'furniture' | 'resize';
    id: string;
    startX: number; // Mouse start screen coordinates
    startY: number;
    initialX: number; // Original item coordinates in feet
    initialY: number;
    initialW?: number; // Original dimensions in feet (for resize)
    initialH?: number;
    resizeHandle?: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Fit plot in viewport on mount
  useEffect(() => {
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      const plotW_px = config.plotWidth * scale;
      const plotL_px = config.plotLength * scale;

      const newScale = Math.min(
        (containerW - 80) / config.plotWidth,
        (containerH - 80) / config.plotLength,
        25 // max default scale
      );
      setScale(newScale);
      setPan({
        x: (containerW - config.plotWidth * newScale) / 2,
        y: (containerH - config.plotLength * newScale) / 2
      });
    }
  }, [config.plotWidth, config.plotLength]);

  // Convert screen coordinates to canvas space coordinates (feet)
  const getCoordinatesFromEvent = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    // Convert screen coordinates to SVG scale/pan coordinates (in feet)
    const x = (clientX - rect.left - pan.x) / scale;
    const y = (clientY - rect.top - pan.y) / scale;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left click only
    if (e.button !== 0) return;

    // Clear selection if clicking on grid background
    if (e.target === svgRef.current || (e.target as SVGElement).classList.contains('grid-background')) {
      setSelectedRoomId(null);
      setSelectedFurnitureId(null);

      // Middle click or space+click for panning could be added, or simple drag pan if no item is dragged
      setDragInfo({
        type: 'resize', // hack for canvas pan
        id: 'canvas',
        startX: e.clientX,
        startY: e.clientY,
        initialX: pan.x,
        initialY: pan.y
      });
    }
  };

  const startDragRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRoomId(roomId);
    setSelectedFurnitureId(null);

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    setDragInfo({
      type: 'room',
      id: roomId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: room.x,
      initialY: room.y
    });
  };

  const startDragFurniture = (furnitureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFurnitureId(furnitureId);
    setSelectedRoomId(null);

    const item = furniture.find(f => f.id === furnitureId);
    if (!item) return;

    setDragInfo({
      type: 'furniture',
      id: furnitureId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: item.x,
      initialY: item.y
    });
  };

  const startResizeRoom = (roomId: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedRoomId(roomId);
    setSelectedFurnitureId(null);

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    setDragInfo({
      type: 'resize',
      id: roomId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: room.x,
      initialY: room.y,
      initialW: room.width,
      initialH: room.height,
      resizeHandle: handle as any
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfo) return;
      e.preventDefault();

      const dx = (e.clientX - dragInfo.startX) / scale;
      const dy = (e.clientY - dragInfo.startY) / scale;

      const snap = (val: number) => {
        if (!snapToGrid) return val;
        // Snap to nearest 0.5 feet
        return Math.round(val * 2) / 2;
      };

      if (dragInfo.id === 'canvas') {
        // Canvas panning
        setPan({
          x: dragInfo.initialX + (e.clientX - dragInfo.startX),
          y: dragInfo.initialY + (e.clientY - dragInfo.startY)
        });
        return;
      }

      if (dragInfo.type === 'room') {
        const updatedRooms = rooms.map(r => {
          if (r.id === dragInfo.id) {
            let newX = snap(dragInfo.initialX + dx);
            let newY = snap(dragInfo.initialY + dy);

            // Constrain within plot
            newX = Math.max(0, Math.min(config.plotWidth - r.width, newX));
            newY = Math.max(0, Math.min(config.plotLength - r.height, newY));

            return { ...r, x: newX, y: newY };
          }
          return r;
        });
        onChange({ ...plan, rooms: updatedRooms });
      }

      if (dragInfo.type === 'furniture') {
        const updatedFurniture = furniture.map(f => {
          if (f.id === dragInfo.id) {
            let newX = snap(dragInfo.initialX + dx);
            let newY = snap(dragInfo.initialY + dy);

            // Constrain within plot
            newX = Math.max(0, Math.min(config.plotWidth - f.width, newX));
            newY = Math.max(0, Math.min(config.plotLength - f.height, newY));

            return { ...f, x: newX, y: newY };
          }
          return f;
        });
        onChange({ ...plan, furniture: updatedFurniture });
      }

      if (dragInfo.type === 'resize') {
        const room = rooms.find(r => r.id === dragInfo.id);
        if (!room || !dragInfo.initialW || !dragInfo.initialH) return;

        const handle = dragInfo.resizeHandle;
        let newX = room.x;
        let newY = room.y;
        let newW = room.width;
        let newH = room.height;

        // Apply resizing depending on the handle dragged
        if (handle?.includes('e')) {
          newW = snap(dragInfo.initialW + dx);
          newW = Math.max(2, Math.min(config.plotWidth - dragInfo.initialX, newW));
        }
        if (handle?.includes('w')) {
          const proposedX = snap(dragInfo.initialX + dx);
          const maxLeftX = dragInfo.initialX + dragInfo.initialW - 2;
          newX = Math.max(0, Math.min(maxLeftX, proposedX));
          newW = dragInfo.initialW + (dragInfo.initialX - newX);
        }
        if (handle?.includes('s')) {
          newH = snap(dragInfo.initialH + dy);
          newH = Math.max(2, Math.min(config.plotLength - dragInfo.initialY, newH));
        }
        if (handle?.includes('n')) {
          const proposedY = snap(dragInfo.initialY + dy);
          const maxTopY = dragInfo.initialY + dragInfo.initialH - 2;
          newY = Math.max(0, Math.min(maxTopY, proposedY));
          newH = dragInfo.initialH + (dragInfo.initialY - newY);
        }

        const updatedRooms = rooms.map(r => {
          if (r.id === dragInfo.id) {
            return { ...r, x: newX, y: newY, width: newW, height: newH };
          }
          return r;
        });
        onChange({ ...plan, rooms: updatedRooms });
      }
    };

    const handleMouseUp = () => {
      setDragInfo(null);
    };

    if (dragInfo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, rooms, furniture, scale, snapToGrid, plan, onChange, config.plotWidth, config.plotLength]);

  // Actions
  const handleAddRoom = (type: RoomType) => {
    const id = Math.random().toString(36).substring(2, 9);

    // Position room in the middle of plot
    const rWidth = 12;
    const rHeight = 12;
    const rx = Math.max(0, Math.round((config.plotWidth - rWidth) / 2));
    const ry = Math.max(0, Math.round((config.plotLength - rHeight) / 2));

    const newRoom: Room = {
      id,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      x: rx,
      y: ry,
      width: rWidth,
      height: rHeight,
      color: ROOM_COLORS[type] || '#3B82F6'
    };

    onChange({
      ...plan,
      rooms: [...rooms, newRoom]
    });
    setSelectedRoomId(id);
    setSelectedFurnitureId(null);
  };

  const handleAddFurniture = (type: FurnitureType) => {
    const id = Math.random().toString(36).substring(2, 9);
    const size = FURNITURE_SIZES[type];

    // Find room center or plot center
    let fx = Math.max(0, Math.round((config.plotWidth - size.width) / 2));
    let fy = Math.max(0, Math.round((config.plotLength - size.height) / 2));

    if (selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) {
        fx = Math.round(room.x + (room.width - size.width) / 2);
        fy = Math.round(room.y + (room.height - size.height) / 2);
      }
    }

    const newItem: Furniture = {
      id,
      name: size.name,
      type,
      x: fx,
      y: fy,
      width: size.width,
      height: size.height,
      rotation: 0,
      roomId: selectedRoomId || undefined
    };

    onChange({
      ...plan,
      furniture: [...furniture, newItem]
    });
    setSelectedFurnitureId(id);
    setSelectedRoomId(null);
  };

  const handleDeleteSelected = () => {
    if (selectedRoomId) {
      const updatedRooms = rooms.filter(r => r.id !== selectedRoomId);
      // Also delete any furniture that belongs to this room
      const updatedFurniture = furniture.filter(f => f.roomId !== selectedRoomId);
      onChange({
        ...plan,
        rooms: updatedRooms,
        furniture: updatedFurniture
      });
      setSelectedRoomId(null);
    } else if (selectedFurnitureId) {
      const updatedFurniture = furniture.filter(f => f.id !== selectedFurnitureId);
      onChange({
        ...plan,
        furniture: updatedFurniture
      });
      setSelectedFurnitureId(null);
    }
  };

  const handleRotateSelectedFurniture = () => {
    if (!selectedFurnitureId) return;

    const updatedFurniture = furniture.map(f => {
      if (f.id === selectedFurnitureId) {
        const newRot = (f.rotation + 90) % 360;

        // Swap width & height for visual correctness on rotation if rotation is 90/270
        // (but actually Three.js handle rotation. Let's just update rotation number)
        return {
          ...f,
          rotation: newRot
        };
      }
      return f;
    });

    onChange({
      ...plan,
      furniture: updatedFurniture
    });
  };

  const handleRoomColorChange = (color: string) => {
    if (!selectedRoomId) return;
    const updatedRooms = rooms.map(r => {
      if (r.id === selectedRoomId) {
        return { ...r, color };
      }
      return r;
    });
    onChange({ ...plan, rooms: updatedRooms });
  };

  const handleRoomNameChange = (name: string) => {
    if (!selectedRoomId) return;
    const updatedRooms = rooms.map(r => {
      if (r.id === selectedRoomId) {
        return { ...r, name };
      }
      return r;
    });
    onChange({ ...plan, rooms: updatedRooms });
  };

  const handleZoom = (factor: number) => {
    setScale(prev => Math.max(5, Math.min(50, prev * factor)));
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const selectedFurniture = furniture.find(f => f.id === selectedFurnitureId);

  // Generate SVG Grid Pattern lines
  const gridLines = [];
  const gridSpacing = 5; // Major lines every 5 feet

  for (let i = 0; i <= config.plotWidth; i += gridSpacing) {
    gridLines.push(
      <line
        key={`vx-${i}`}
        x1={i * scale}
        y1={0}
        x2={i * scale}
        y2={config.plotLength * scale}
        stroke="#1E293B"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
    );
  }
  for (let i = 0; i <= config.plotLength; i += gridSpacing) {
    gridLines.push(
      <line
        key={`hy-${i}`}
        x1={0}
        y1={i * scale}
        x2={config.plotWidth * scale}
        y2={i * scale}
        stroke="#1E293B"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-950 text-black dark:text-white rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl backdrop-blur-md">

      {/* Left panel: Add components */}
      <div className="w-52 border-r border-slate-800 bg-slate-900/60 p-3 overflow-y-auto flex flex-col gap-5 select-none shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 tracking-wider uppercase">Add Rooms</h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(ROOM_COLORS) as RoomType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleAddRoom(type)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-white transition active:scale-95 text-left font-medium capitalize group"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-110 transition"
                  style={{ backgroundColor: ROOM_COLORS[type] }}
                />
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 tracking-wider uppercase">Add Furniture</h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(FURNITURE_SIZES) as FurnitureType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleAddFurniture(type)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-white transition active:scale-95 text-left font-medium capitalize"
              >
                <Square className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{FURNITURE_SIZES[type].name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-slate-800/80 pt-4 flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={() => setSnapToGrid(!snapToGrid)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0"
            />
            Snap to grid (0.5 ft)
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showMeasurements}
              onChange={() => setShowMeasurements(!showMeasurements)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0"
            />
            Show measurements
          </label>
        </div>
      </div>

      {/* Center panel: Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="absolute inset-0 select-none pointer-events-auto"
        >
          {/* Outer Canvas Container applying scale & pan */}
          <g transform={`translate(${pan.x}, ${pan.y})`}>
            {/* Plot Border */}
            <rect
              x={0}
              y={0}
              width={config.plotWidth * scale}
              height={config.plotLength * scale}
              fill="#0F172A"
              stroke="#4F46E5"
              strokeWidth={3}
              className="grid-background"
            />

            {/* Grid Line Overlay */}
            {gridLines}

            {/* Plot Dimension Text */}
            <text
              x={(config.plotWidth * scale) / 2}
              y={-10}
              fill="#4F46E5"
              fontSize={11}
              fontWeight="bold"
              textAnchor="middle"
            >
              Width: {config.plotWidth} ft
            </text>
            <text
              x={-12}
              y={(config.plotLength * scale) / 2}
              fill="#4F46E5"
              fontSize={11}
              fontWeight="bold"
              textAnchor="middle"
              transform={`rotate(-90, -12, ${(config.plotLength * scale) / 2})`}
            >
              Length: {config.plotLength} ft
            </text>

            {/* Render Rooms */}
            {rooms.map((room) => {
              const rx = room.x * scale;
              const ry = room.y * scale;
              const rw = room.width * scale;
              const rh = room.height * scale;
              const isSelected = room.id === selectedRoomId;

              return (
                <g key={room.id} className="group">
                  {/* Room Body */}
                  <rect
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rh}
                    fill={room.color}
                    fillOpacity={0.15}
                    stroke={isSelected ? '#F59E0B' : room.color}
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-move transition-colors duration-150"
                    onMouseDown={(e) => startDragRoom(room.id, e)}
                  />

                  {/* Room Name Label */}
                  <text
                    x={rx + rw / 2}
                    y={ry + rh / 2}
                    fill={isSelected ? '#F59E0B' : '#FFFFFF'}
                    fontSize={12}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none drop-shadow"
                  >
                    {room.name}
                  </text>

                  {/* Room Dimensions Label */}
                  {showMeasurements && (
                    <text
                      x={rx + rw / 2}
                      y={ry + rh / 2 + 14}
                      fill="#94A3B8"
                      fontSize={9}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none"
                    >
                      {room.width}′ × {room.height}′
                    </text>
                  )}

                  {/* Resize Handles (rendered only when selected) */}
                  {isSelected && (
                    <>
                      {/* Top Edge */}
                      <line
                        x1={rx} y1={ry} x2={rx + rw} y2={ry}
                        stroke="#F59E0B" strokeWidth={5} className="cursor-ns-resize"
                        onMouseDown={(e) => startResizeRoom(room.id, 'n', e)}
                      />
                      {/* Bottom Edge */}
                      <line
                        x1={rx} y1={ry + rh} x2={rx + rw} y2={ry + rh}
                        stroke="#F59E0B" strokeWidth={5} className="cursor-ns-resize"
                        onMouseDown={(e) => startResizeRoom(room.id, 's', e)}
                      />
                      {/* Left Edge */}
                      <line
                        x1={rx} y1={ry} x2={rx} y2={ry + rh}
                        stroke="#F59E0B" strokeWidth={5} className="cursor-ew-resize"
                        onMouseDown={(e) => startResizeRoom(room.id, 'w', e)}
                      />
                      {/* Right Edge */}
                      <line
                        x1={rx + rw} y1={ry} x2={rx + rw} y2={ry + rh}
                        stroke="#F59E0B" strokeWidth={5} className="cursor-ew-resize"
                        onMouseDown={(e) => startResizeRoom(room.id, 'e', e)}
                      />
                      {/* Corners */}
                      <circle cx={rx} cy={ry} r={5} fill="#FFFFFF" stroke="#F59E0B" strokeWidth={2} className="cursor-nwse-resize" onMouseDown={(e) => startResizeRoom(room.id, 'nw', e)} />
                      <circle cx={rx + rw} cy={ry} r={5} fill="#FFFFFF" stroke="#F59E0B" strokeWidth={2} className="cursor-nesw-resize" onMouseDown={(e) => startResizeRoom(room.id, 'ne', e)} />
                      <circle cx={rx} cy={ry + rh} r={5} fill="#FFFFFF" stroke="#F59E0B" strokeWidth={2} className="cursor-nesw-resize" onMouseDown={(e) => startResizeRoom(room.id, 'sw', e)} />
                      <circle cx={rx + rw} cy={ry + rh} r={5} fill="#FFFFFF" stroke="#F59E0B" strokeWidth={2} className="cursor-nwse-resize" onMouseDown={(e) => startResizeRoom(room.id, 'se', e)} />
                    </>
                  )}
                </g>
              );
            })}

            {/* Render Furniture */}
            {furniture.map((item) => {
              const fx = item.x * scale;
              const fy = item.y * scale;
              const fw = item.width * scale;
              const fh = item.height * scale;
              const isSelected = item.id === selectedFurnitureId;

              // Center coordinates for rotation transformation
              const cx = fx + fw / 2;
              const cy = fy + fh / 2;

              return (
                <g
                  key={item.id}
                  transform={`rotate(${item.rotation}, ${cx}, ${cy})`}
                >
                  <rect
                    x={fx}
                    y={fy}
                    width={fw}
                    height={fh}
                    fill={isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(30, 41, 59, 0.7)'}
                    stroke={isSelected ? '#3B82F6' : '#64748B'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    rx={2}
                    className="cursor-move hover:stroke-blue-400 transition"
                    onMouseDown={(e) => startDragFurniture(item.id, e)}
                  />
                  {/* Furniture visual indicators based on type */}
                  {item.type === 'bed' && (
                    <>
                      {/* Bed pillows */}
                      <rect x={fx + 0.5 * scale} y={fy + 0.5 * scale} width={fw * 0.35} height={1.2 * scale} fill="#475569" rx={1} />
                      <rect x={fx + fw - 0.5 * scale - fw * 0.35} y={fy + 0.5 * scale} width={fw * 0.35} height={1.2 * scale} fill="#475569" rx={1} />
                      {/* Blanket line */}
                      <line x1={fx} y1={fy + 2.5 * scale} x2={fx + fw} y2={fy + 2.5 * scale} stroke="#64748B" strokeWidth={1} />
                    </>
                  )}
                  {item.type === 'sofa' && (
                    <>
                      {/* Sofa Backrest */}
                      <rect x={fx} y={fy} width={fw} height={0.6 * scale} fill="#475569" />
                      {/* Sofa Armrests */}
                      <rect x={fx} y={fy} width={0.6 * scale} height={fh} fill="#475569" />
                      <rect x={fx + fw - 0.6 * scale} y={fy} width={0.6 * scale} height={fh} fill="#475569" />
                    </>
                  )}
                  {item.type === 'toilet' && (
                    <>
                      <circle cx={cx} cy={fy + fh - 0.8 * scale} r={0.7 * scale} fill="none" stroke="#64748B" strokeWidth={1.5} />
                      <rect x={fx + 0.2 * scale} y={fy} width={fw - 0.4 * scale} height={0.8 * scale} fill="#475569" rx={1} />
                    </>
                  )}
                  {item.type === 'stove' && (
                    <>
                      {/* Stove burners */}
                      <circle cx={fx + fw * 0.25} cy={cy} r={0.5 * scale} fill="#E2E8F0" opacity={0.3} />
                      <circle cx={fx + fw * 0.75} cy={cy} r={0.5 * scale} fill="#E2E8F0" opacity={0.3} />
                      <line x1={fx} y1={fy + fh} x2={fx + fw} y2={fy + fh} stroke="#64748B" strokeWidth={1.5} />
                    </>
                  )}
                  {item.type === 'sink' && (
                    <circle cx={cx} cy={cy} r={Math.min(fw, fh) * 0.3} fill="none" stroke="#64748B" strokeWidth={1.5} />
                  )}
                  {item.type === 'plant' && (
                    <circle cx={cx} cy={cy} r={Math.min(fw, fh) * 0.4} fill="#10B981" fillOpacity={0.4} stroke="#10B981" strokeWidth={1} />
                  )}

                  <text
                    x={cx}
                    y={cy}
                    fill={isSelected ? '#60A5FA' : '#94A3B8'}
                    fontSize={7.5}
                    fontWeight="semibold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none"
                  >
                    {item.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Zoom & Controls */}
        <div className="absolute bottom-4 left-4 flex gap-1.5 bg-slate-900/95 border border-slate-800 p-1.5 rounded-xl shadow-lg backdrop-blur z-10 select-none">
          <button
            onClick={() => handleZoom(1.15)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold transition flex items-center justify-center"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => handleZoom(0.85)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold transition flex items-center justify-center"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={() => {
              if (containerRef.current) {
                const w = containerRef.current.clientWidth;
                const h = containerRef.current.clientHeight;
                setPan({
                  x: (w - config.plotWidth * scale) / 2,
                  y: (h - config.plotLength * scale) / 2
                });
              }
            }}
            className="px-2.5 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1"
            title="Recenter Plan"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Recenter
          </button>
        </div>

        {/* Canvas Instructions */}
        <div className="absolute top-4 left-4 text-[10px] text-slate-500 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-900 pointer-events-none leading-relaxed hidden sm:block">
          💡 Drag rooms/furniture to place them. <br />
          📏 Drag borders of selected rooms to resize. <br />
          🖱️ Drag grid background to pan.
        </div>
      </div>

      {/* Right panel: Selection Inspector */}
      <div className="w-60 border-l border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-4 select-none shrink-0 overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-300 tracking-wider uppercase border-b border-slate-800 pb-2">Properties</h3>

        {selectedRoom ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Room Name</label>
              <input
                type="text"
                value={selectedRoom.name}
                onChange={(e) => handleRoomNameChange(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Width (ft)</label>
                <div className="bg-slate-950/80 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-300 font-semibold">
                  {selectedRoom.width}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Height (ft)</label>
                <div className="bg-slate-950/80 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-300 font-semibold">
                  {selectedRoom.height}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Color Tag</label>
              <div className="flex gap-2 flex-wrap">
                {['#6366F1', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6B7280'].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleRoomColorChange(color)}
                    className={`w-6 h-6 rounded-full border-2 transition hover:scale-110 active:scale-95 ${selectedRoom.color === color ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleDeleteSelected}
              className="mt-4 flex items-center justify-center gap-2 bg-red-950/30 hover:bg-red-900/50 border border-red-900/40 hover:border-red-800 text-red-200 py-2.5 rounded-xl text-xs font-semibold transition active:scale-98"
            >
              <Trash2 className="w-4 h-4" />
              Delete Room
            </button>
          </div>
        ) : selectedFurniture ? (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
              <div className="text-xs text-slate-400">Type</div>
              <div className="text-sm font-semibold capitalize text-indigo-300">{selectedFurniture.type}</div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-900 text-xs text-slate-400">
                <div>Size: {selectedFurniture.width}′ × {selectedFurniture.height}′</div>
                <div>Rot: {selectedFurniture.rotation}°</div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={handleRotateSelectedFurniture}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-semibold transition active:scale-98 border border-slate-750"
              >
                <RotateCw className="w-4 h-4 text-indigo-400" />
                Rotate 90°
              </button>

              <button
                onClick={handleDeleteSelected}
                className="flex items-center justify-center gap-2 bg-red-950/30 hover:bg-red-900/50 border border-red-900/40 hover:border-red-800 text-red-200 py-2.5 rounded-xl text-xs font-semibold transition active:scale-98"
              >
                <Trash2 className="w-4 h-4" />
                Delete Furniture
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500 text-xs flex flex-col items-center gap-2">
            <HelpCircle className="w-8 h-8 text-slate-650" />
            <span>Select a room or furniture item on the canvas to edit its properties.</span>
          </div>
        )}
      </div>

    </div>
  );
}
