import React, { useRef, useEffect } from 'react';
import { TriangleData } from '../types';
import { getTriangleCoords } from '../utils/trigoMath';
import { DEG_TO_RAD } from '../utils/math';

interface TriangleCanvasProps {
  data: TriangleData | null;
}

const TriangleCanvas: React.FC<TriangleCanvasProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
       draw();
    };
    window.addEventListener('resize', handleResize);
    draw(); // Initial draw
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  const draw = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const { width, height } = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (!data || !data.valid) {
       // Placeholder
       ctx.font = '14px Inter, sans-serif';
       ctx.fillStyle = '#94a3b8';
       ctx.textAlign = 'center';
       ctx.fillText('Insira valores válidos para gerar o triângulo', width/2, height/2);
       return;
    }

    const coords = getTriangleCoords(data);
    
    // Auto-scale and Center
    // Find bounding box
    const minX = Math.min(coords.Ax, coords.Bx, coords.Cx);
    const maxX = Math.max(coords.Ax, coords.Bx, coords.Cx);
    const minY = Math.min(coords.Ay, coords.By, coords.Cy); // Math Y is normal
    const maxY = Math.max(coords.Ay, coords.By, coords.Cy);
    
    const triW = maxX - minX;
    const triH = maxY - minY;
    
    const padding = 40;
    const availW = width - padding * 2;
    const availH = height - padding * 2;
    
    const scale = Math.min(availW / (triW || 1), availH / (triH || 1));
    
    // Center logic
    const cx = (width - triW * scale) / 2 - minX * scale;
    // Canvas Y is inverted relative to math Y, so we need to flip.
    // Let's translate so that the lowest Y (usually 0) is at the bottom of canvas with padding.
    // Or just center vertically using the bounding box.
    const cy = (height + triH * scale) / 2 + minY * scale; 
    
    // Transform Function: Math (x,y) -> Canvas (x, y)
    // Math Y grows Up, Canvas Y grows Down.
    // CanvasY = height - (MathY * scale + offset) is standard, but simple translation is:
    // Centering vertically:
    // CenterY of math = (minY + maxY)/2.
    // CenterY of canvas = height/2.
    // y_canvas = height/2 - (y_math - center_math_y) * scale
    
    const mathCy = (minY + maxY) / 2;
    const mathCx = (minX + maxX) / 2;
    const canvasCx = width / 2;
    const canvasCy = height / 2;
    
    const tx = (val: number) => canvasCx + (val - mathCx) * scale;
    const ty = (val: number) => canvasCy - (val - mathCy) * scale;

    const Ax = tx(coords.Ax); const Ay = ty(coords.Ay);
    const Bx = tx(coords.Bx); const By = ty(coords.By);
    const Cx = tx(coords.Cx); const Cy = ty(coords.Cy);

    // DRAW FILL
    ctx.beginPath();
    ctx.moveTo(Ax, Ay);
    ctx.lineTo(Bx, By);
    ctx.lineTo(Cx, Cy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(236, 253, 245, 0.5)'; // Minty background
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#005A7A';
    ctx.stroke();

    // LABELS & ANGLES
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#005A7A';

    // Vertex Labels
    const labelOffset = 15;
    const labelPos = (vx: number, vy: number, ox: number, oy: number) => {
        const angle = Math.atan2(vy - oy, vx - ox);
        return { x: vx + Math.cos(angle)*labelOffset, y: vy + Math.sin(angle)*labelOffset };
    }
    
    // Approximate centroid for pushing labels out
    const cX = (Ax+Bx+Cx)/3;
    const cY = (Ay+By+Cy)/3;
    
    const lA = labelPos(Ax, Ay, cX, cY);
    const lB = labelPos(Bx, By, cX, cY);
    const lC = labelPos(Cx, Cy, cX, cY);
    
    ctx.fillText(`A (${data.A}°)`, lA.x, lA.y);
    ctx.fillText(`B (${data.B}°)`, lB.x, lB.y);
    ctx.fillText(`C (${data.C}°)`, lC.x, lC.y);
    
    // Side Labels
    ctx.fillStyle = '#475569';
    ctx.font = '11px Inter, sans-serif';
    
    // Side c (AB)
    ctx.fillText(`c=${data.c}`, (Ax+Bx)/2, (Ay+By)/2 + 12);
    // Side b (AC)
    ctx.fillText(`b=${data.b}`, (Ax+Cx)/2 - 10, (Ay+Cy)/2 - 5);
    // Side a (BC)
    ctx.fillText(`a=${data.a}`, (Bx+Cx)/2 + 10, (By+Cy)/2 - 5);
    
    // Draw Arcs
    const drawAngle = (vx: number, vy: number, p1x: number, p1y: number, p2x: number, p2y: number, label: string) => {
       const rad = 20;
       const ang1 = Math.atan2(p1y - vy, p1x - vx);
       const ang2 = Math.atan2(p2y - vy, p2x - vx);
       
       ctx.beginPath();
       ctx.strokeStyle = '#F59E0B'; // Amber
       ctx.lineWidth = 1.5;
       // We need to draw arc between ang1 and ang2.
       // Canvas arc is clockwise by default if not specified? 
       // We usually want the interior angle.
       ctx.arc(vx, vy, rad, ang1, ang2, false); 
       // Check if we drew the reflex angle (>180). Simple geometric check not easy here without full logic, 
       // but typically standard triangles draw correctly if points ordered.
       // If standard drawing order A->B->C is CCW, then angles work out.
       ctx.stroke();
    };
    
    // Simple visual arcs (not mathematically perfect fills, just lines)
    // A connects C and B
    // B connects A and C
    // C connects B and A
    // drawAngle(Ax, Ay, Cx, Cy, Bx, By, ''); // visual noise if overlapping text, disabled for now
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white/50 rounded-lg">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default TriangleCanvas;