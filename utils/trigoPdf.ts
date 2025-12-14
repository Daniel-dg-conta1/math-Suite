import { jsPDF } from 'jspdf';
import { TrigoExercise, TriangleData } from '../types';
import { getTriangleCoords } from './trigoMath';

// Formatter to match the rule: 1 decimal place if > 1, replace dot with comma
const fmt = (num: number | undefined) => {
  if (num === undefined) return '';
  const abs = Math.abs(num);
  let str = '';
  if (abs < 1) str = num.toFixed(3);
  else str = num.toFixed(1);
  return str.replace('.', ',');
};

const getModeLabel = (m: string) => {
    switch(m) {
        case 'SSS': return 'Lado-Lado-Lado';
        case 'SAS': return 'Lado-Ângulo-Lado';
        case 'ASA': return 'Ângulo-Lado-Ângulo';
        case 'AAS': return 'Lado-Ângulo-Ângulo';
        case 'Right': return 'Triângulo Retângulo';
        default: return m;
    }
};

export const generateTrigoPDF = (
  exercises: TrigoExercise[], 
  isTeacher: boolean,
  mode: 'full' | 'simple',
  itemsPerPage: number
) => {
  const doc = new jsPDF();
  
  // --- HEADER ---
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const mainTitle = isTeacher ? 'Gabarito - Trigonometria' : 'Lista de Exercícios - Trigonometria';
  doc.text(mainTitle, 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 195, 20, { align: 'right' });

  // Page Constants
  const pageHeight = 297;
  const pageWidth = 210;
  const margin = 15;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2 - 20; // minus header space
  const startY = 35;

  if (mode === 'full') {
    // --- FULL MODE (Standard List with Calculation Space) ---
    let yPos = startY;
    const itemHeight = 70; // mm

    exercises.forEach((ex, i) => {
      if (yPos + itemHeight > pageHeight - margin) {
         doc.addPage();
         yPos = margin + 10;
      }

      doc.setTextColor(0,0,0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Questão ${i+1} (${getModeLabel(ex.mode)})`, margin, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Dados: ${ex.given.label1}=${fmt(ex.given.val1)}, ${ex.given.label2}=${fmt(ex.given.val2)}` + (ex.given.val3 ? `, ${ex.given.label3}=${fmt(ex.given.val3)}` : ''), margin, yPos + 6);
      
      doc.setFontSize(9);
      doc.setTextColor(80,80,80);
      const prompt = isTeacher ? '' : 'Calcule os lados e ângulos restantes.';
      doc.text(prompt, margin, yPos + 11);

      // Draw Triangle
      drawTriangleInPDF(doc, ex.solution, margin + 20, yPos + 35, 40);

      // Solution Box / Space
      if (isTeacher) {
         doc.setFillColor(245, 245, 245);
         doc.rect(margin + 60, yPos, usableWidth - 60, 45, 'F');
         doc.setTextColor(0,0,0);
         doc.setFontSize(10);
         doc.setFont('helvetica', 'bold');
         doc.text('Solução Completa:', margin + 65, yPos + 8);
         
         doc.setFont('helvetica', 'normal');
         doc.setFontSize(9);
         const col1X = margin + 65;
         const col2X = margin + 110;
         
         doc.text(`a = ${fmt(ex.solution.a)}`, col1X, yPos + 16);
         doc.text(`b = ${fmt(ex.solution.b)}`, col1X, yPos + 22);
         doc.text(`c = ${fmt(ex.solution.c)}`, col1X, yPos + 28);
         
         doc.text(`Âng. A = ${fmt(ex.solution.A)}°`, col2X, yPos + 16);
         doc.text(`Âng. B = ${fmt(ex.solution.B)}°`, col2X, yPos + 22);
         doc.text(`Âng. C = ${fmt(ex.solution.C)}°`, col2X, yPos + 28);
         
         doc.text(`Área = ${fmt(ex.solution.area)}`, col1X, yPos + 38);
         doc.text(`Perímetro = ${fmt(ex.solution.perimeter)}`, col2X, yPos + 38);
      } else {
         doc.setDrawColor(200);
         doc.rect(margin + 60, yPos, usableWidth - 60, 45);
         doc.setTextColor(150);
         doc.text('Espaço para cálculos', margin + 65, yPos + 8);
      }
      
      doc.setDrawColor(220);
      doc.line(margin, yPos + 55, pageWidth - margin, yPos + 55);

      yPos += 60;
    });

  } else {
    // --- SIMPLE MODE (Grid System) ---
    // Max 8 items per page, 2 columns.
    const cols = 2;
    const safeItemsPerPage = Math.min(Math.max(1, itemsPerPage), 8);
    const rows = Math.ceil(safeItemsPerPage / cols);
    
    // Calculate Grid Dimensions
    const cellW = usableWidth / cols;
    const cellH = usableHeight / rows;
    
    // Drawing area inside cell (keep padding)
    const drawSize = Math.min(cellW * 0.5, cellH * 0.6); 

    const totalPages = Math.ceil(exercises.length / safeItemsPerPage);
    
    for (let p = 0; p < totalPages; p++) {
        if (p > 0) doc.addPage();
        
        const pageStartIdx = p * safeItemsPerPage;
        for (let k = 0; k < safeItemsPerPage; k++) {
            const idx = pageStartIdx + k;
            if (idx >= exercises.length) break;

            const ex = exercises[idx];
            
            const col = k % cols;
            const row = Math.floor(k / cols);
            
            // Cell Coordinates
            const cellX = margin + col * cellW;
            const cellY = startY + row * cellH;

            // Header of Question
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`Q${idx+1} (${getModeLabel(ex.mode)})`, cellX + 2, cellY + 5);
            
            // Given Values
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const givenText = `${ex.given.label1}=${fmt(ex.given.val1)}, ${ex.given.label2}=${fmt(ex.given.val2)}` + (ex.given.val3 ? `, ${ex.given.label3}=${fmt(ex.given.val3)}` : '');
            doc.text(givenText, cellX + 2, cellY + 10);
            
            // Draw Triangle Centered in Cell
            const drawCx = cellX + cellW / 2;
            const drawCy = cellY + 15 + drawSize / 2;
            drawTriangleInPDF(doc, ex.solution, drawCx, drawCy, drawSize);

            // Answer Key (Teacher Only)
            if (isTeacher) {
                doc.setFontSize(8);
                doc.setTextColor(50, 50, 50);
                const ansY = cellY + cellH - 12;
                doc.text(`Resp: a=${fmt(ex.solution.a)}, b=${fmt(ex.solution.b)}, c=${fmt(ex.solution.c)}`, cellX + 2, ansY);
                doc.text(`Ângs: A=${fmt(ex.solution.A)}°, B=${fmt(ex.solution.B)}°, C=${fmt(ex.solution.C)}°`, cellX + 2, ansY + 4);
                doc.text(`Área: ${fmt(ex.solution.area)}`, cellX + 2, ansY + 8);
            }
            
            // Border for cell (optional, makes grid clear)
            doc.setDrawColor(230);
            doc.rect(cellX, cellY, cellW - 2, cellH - 2);
        }
    }
  }
  
  doc.save(isTeacher ? 'Trigo_Gabarito.pdf' : 'Trigo_Lista.pdf');
};

// Helper function to draw triangle
const drawTriangleInPDF = (doc: jsPDF, triangle: TriangleData, cx: number, cy: number, boxSize: number) => {
    const coords = getTriangleCoords(triangle);
    
    // Scale for PDF
    const minX = Math.min(coords.Ax, coords.Bx, coords.Cx);
    const maxX = Math.max(coords.Ax, coords.Bx, coords.Cx);
    const minY = Math.min(coords.Ay, coords.By, coords.Cy);
    const maxY = Math.max(coords.Ay, coords.By, coords.Cy);
    
    const w = maxX - minX;
    const h = maxY - minY;
    
    // Scale factor
    const scale = Math.min(boxSize / (w || 1), boxSize / (h || 1));
    
    // Transform math coords (Y up) to PDF coords (Y down) and Center
    const tx = (val: number) => cx + (val - (minX + w/2)) * scale;
    const ty = (val: number) => cy - (val - (minY + h/2)) * scale;
    
    const Ax = tx(coords.Ax); const Ay = ty(coords.Ay);
    const Bx = tx(coords.Bx); const By = ty(coords.By);
    const Cx = tx(coords.Cx); const Cy = ty(coords.Cy);
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.setFillColor(250, 250, 250);
    doc.triangle(Ax, Ay, Bx, By, Cx, Cy, 'FD'); // Fill and Draw
    
    // Labels Vertex (A, B, C)
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text('A', Ax-2, Ay-2);
    doc.text('B', Bx+1, By-2);
    doc.text('C', Cx-1, Cy-3);

    // Labels Sides (a, b, c) - Placed at midpoints with offset
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80); // Darker gray for visibility

    // Side a connects B and C
    const midAx = (Bx + Cx) / 2;
    const midAy = (By + Cy) / 2;
    // Simple nudge to right
    doc.text('a', midAx + 2, midAy, { align: 'center' });

    // Side b connects A and C
    const midBx = (Ax + Cx) / 2;
    const midBy = (Ay + Cy) / 2;
    // Simple nudge to left
    doc.text('b', midBx - 2, midBy, { align: 'center' });

    // Side c connects A and B (Base)
    const midCx = (Ax + Bx) / 2;
    const midCy = (Ay + By) / 2;
    // Simple nudge down
    doc.text('c', midCx, midCy + 3, { align: 'center' });
};