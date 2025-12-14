import React, { useRef, useEffect, useState } from 'react';
import { Vector, GridMode, THEME } from '../types';
import { getAngle, getNearestAxis, DEG_TO_RAD } from '../utils/math';

interface VectorCanvasProps {
  vectors: Vector[];
  resultant?: { x: number; y: number; label: string } | null;
  missingVector?: { x: number; y: number } | null;
  showDashedLines: boolean;
  gridMode: GridMode;
  selectedVectorId: number | null;
  rotationAngle: number;
  onVectorChange?: (id: number, x: number, y: number) => void;
  onSelectVector?: (id: number | null) => void;
  readOnly?: boolean;
  scale?: number;
}

const VectorCanvas: React.FC<VectorCanvasProps> = ({
  vectors,
  resultant,
  missingVector,
  showDashedLines,
  gridMode,
  selectedVectorId,
  rotationAngle,
  onVectorChange,
  onSelectVector,
  readOnly = false,
  scale = 30,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width === 0 || height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
        // Center origin
        setOffset({ x: width / 2, y: height / 2 });
      }
    };
    
    // Immediate call
    handleResize();
    // Delayed call to ensure layout stability (fixes modal rendering issues)
    const timer = setTimeout(handleResize, 50);

    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
    };
  }, [vectors]); // Dependency on vectors ensures resize if data loads late

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set origin
    const cx = offset.x * dpr;
    const cy = offset.y * dpr;
    const s = scale * dpr;

    // --- GRID ---
    if (gridMode !== 'none') {
      ctx.strokeStyle = gridMode === 'light' ? '#E2E8F0' : '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      const gridSize = s;
      // Vertical
      for (let x = cx % gridSize; x < width; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      // Horizontal
      for (let y = cy % gridSize; y < height; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    // --- AXES ---
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(width, cy); // X
    ctx.moveTo(cx, 0); ctx.lineTo(cx, height); // Y
    ctx.stroke();

    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('x', width - 20, cy - 10);
    ctx.fillText('y', cx + 10, 20);

    // --- ROTATION AXIS ---
    if (rotationAngle !== 0) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-rotationAngle * DEG_TO_RAD); 
        
        ctx.strokeStyle = '#94A3B8';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        // X' axis
        ctx.moveTo(-width, 0); ctx.lineTo(width, 0);
        // Y' axis
        ctx.moveTo(0, -height); ctx.lineTo(0, height);
        ctx.stroke();
        ctx.restore();
    }

    // --- HELPERS ---
    const drawArrow = (x: number, y: number, color: string, label: string, isSelected: boolean, isGhost = false) => {
        const px = cx + x * s;
        const py = cy - y * s;
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;
        if (isGhost) ctx.setLineDash([5, 3]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Head
        const headLen = 12;
        const angle = Math.atan2(py - cy, px - cx);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - headLen * Math.cos(angle - Math.PI / 6), py - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(px - headLen * Math.cos(angle + Math.PI / 6), py - headLen * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(px, py);
        ctx.fill();

        // Label
        if (label) {
            ctx.font = isSelected ? 'bold 14px Inter, sans-serif' : '12px Inter, sans-serif';
            ctx.fillText(label, px + 10, py - 10);
        }

        // Projections
        if (isSelected && showDashedLines) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.4;
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py); ctx.lineTo(px, cy); // to X axis
            ctx.moveTo(px, py); ctx.lineTo(cx, py); // to Y axis
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
        }
    };

    const drawAngleArc = (x: number, y: number, radius = 25) => {
        const angle = getAngle(x, y);
        const nearest = getNearestAxis(angle);
  
        // Calculate diff early to detect small angles
        let diff = (angle - nearest + 360) % 360;
        if (diff > 180) diff -= 360; 
  
        // FIX: Increase distances for small angles (< 20°) ONLY in readOnly mode (Preview)
        // Main interactive canvas (readOnly=false) remains standard.
        const isSmallAngle = readOnly && Math.abs(diff) < 20;
        const effectiveRadius = isSmallAngle ? radius + 25 : radius;
  
        ctx.beginPath();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1;
        
        // Convert to canvas angles (invert Y)
        const startRad = -nearest * DEG_TO_RAD; 
        const endRad = -angle * DEG_TO_RAD;
        
        let counterClockwise = true; 
        if (diff > 0) counterClockwise = true; 
        else counterClockwise = false;
  
        ctx.arc(cx, cy, effectiveRadius, startRad, endRad, counterClockwise); 
        ctx.stroke();
  
        // Enable label drawing for both Main (!readOnly) and Preview (readOnly)
        // Preview previously hid labels, causing the "missing/too close" issue.
        if (true) {
          const midAngle = nearest + diff / 2;
          const labelRad = -midAngle * DEG_TO_RAD;
          
          const offset = isSmallAngle ? 20 : 15;
          const lx = cx + (effectiveRadius + offset) * Math.cos(labelRad);
          const ly = cy + (effectiveRadius + offset) * Math.sin(labelRad);
          
          ctx.font = '500 10px Inter, sans-serif';
          ctx.fillStyle = '#64748B';
          const text = `${Math.abs(diff).toFixed(0)}°`;
          const tm = ctx.measureText(text);
          
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#FFFFFF';
          ctx.strokeText(text, lx - tm.width/2, ly + 3);
          ctx.fillText(text, lx - tm.width/2, ly + 3);
        }
      };

    // --- DRAW CONTENT ---
    
    // 1. Resultant (Ghost if missing mode?)
    if (resultant) {
        drawArrow(resultant.x, resultant.y, THEME.resultant, resultant.label, false);
    }
    
    // 2. Missing Vector (Calculated)
    if (missingVector) {
        drawArrow(missingVector.x, missingVector.y, THEME.missing, 'Vf', false, true);
    }

    // 3. Vectors
    vectors.forEach(v => {
        const isSel = selectedVectorId === v.id;
        drawArrow(v.x, v.y, v.color, v.label, isSel);
        if (isSel || v.inputType === 'angle') {
            drawAngleArc(v.x, v.y);
        }
    });

  }, [vectors, resultant, missingVector, showDashedLines, gridMode, selectedVectorId, rotationAngle, offset, readOnly, scale]);

  // --- INTERACTION ---
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const cx = offset.x; // CSS pixels
    const cy = offset.y; 
    
    // Check collision with vector heads
    let hitId = null;
    let minDist = 20;

    vectors.forEach(v => {
        const vx = cx + v.x * scale;
        const vy = cy - v.y * scale;
        const dist = Math.sqrt(Math.pow(mouseX - vx, 2) + Math.pow(mouseY - vy, 2));
        if (dist < minDist) {
            minDist = dist;
            hitId = v.id;
        }
    });

    if (hitId) {
        setDragId(hitId);
        setIsDragging(true);
        onSelectVector?.(hitId);
    } else {
        onSelectVector?.(null);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !dragId || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    const cx = offset.x;
    const cy = offset.y;
    
    let nx = (mouseX - cx) / scale;
    let ny = (cy - mouseY) / scale; // Invert Y

    // Snap
    if (gridMode !== 'none') {
        const snap = 0.5;
        nx = Math.round(nx / snap) * snap;
        ny = Math.round(ny / snap) * snap;
    }

    onVectorChange?.(dragId, nx, ny);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragId(null);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white/50">
       <canvas
         ref={canvasRef}
         className="block w-full h-full cursor-crosshair touch-none"
         onMouseDown={handlePointerDown}
         onMouseMove={handlePointerMove}
         onMouseUp={handlePointerUp}
         onMouseLeave={handlePointerUp}
         onTouchStart={handlePointerDown}
         onTouchMove={handlePointerMove}
         onTouchEnd={handlePointerUp}
       />
    </div>
  );
};

export default VectorCanvas;