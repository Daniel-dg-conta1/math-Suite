// Updated pdf generation + diagram rendering with robust pagination and layout fixes.
// Key fixes:
// - Accurate pagination so diagrams never get cut at page bottom (full & simple modes).
// - Respect itemsPerPage in simple mode and auto-adjust if it doesn't fit.
// - Stable per-page layout calculations using margins and usable area.
// - Minimal changes elsewhere; only pagination/layout logic adjusted.

import { jsPDF } from 'jspdf';
import { Exercise, THEME } from '../types';
import { formatNumber, getMagnitude, getAngle, calculateComponents, getNearestAxis, DEG_TO_RAD, calculateVisualLayout, checkCollision, Rect, normalizeAngle } from './math';

const DIAGRAM_SIZE = 90; // mm
const CENTER = DIAGRAM_SIZE / 2; // 45mm

// --- NATIVE DRAWING HELPERS ---

const toPDFCoords = (x: number, y: number, scaleFactor: number, cx: number, cy: number) => {
  return {
    x: cx + x * scaleFactor,
    y: cy - y * scaleFactor 
  };
};

const drawArrow = (doc: jsPDF, x1: number, y1: number, x2: number, y2: number, color: string, scale = 1) => {
  const headLen = 3.5 * scale; // mm
  const angle = Math.atan2(y2 - y1, x2 - x1); 
  
  const tipX = x2;
  const tipY = y2;
  
  const shaftLenScale = 0.8;
  const shaftEndX = tipX - (headLen * shaftLenScale) * Math.cos(angle);
  const shaftEndY = tipY - (headLen * shaftLenScale) * Math.sin(angle);
  
  doc.setDrawColor(color);
  doc.setLineWidth(0.4 * scale);
  doc.line(x1, y1, shaftEndX, shaftEndY);
  
  const baseCenter = { 
     x: tipX - headLen * Math.cos(angle),
     y: tipY - headLen * Math.sin(angle)
  };
  
  const width = headLen * 0.35;
  const p1 = { x: tipX, y: tipY };
  const p2 = { 
     x: baseCenter.x + width * Math.cos(angle + Math.PI/2),
     y: baseCenter.y + width * Math.sin(angle + Math.PI/2)
  };
  const p3 = {
     x: baseCenter.x + width * Math.cos(angle - Math.PI/2),
     y: baseCenter.y + width * Math.sin(angle - Math.PI/2)
  };
  
  doc.setFillColor(color);
  doc.triangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, 'F');
};

const drawArc = (doc: jsPDF, cx: number, cy: number, vecX: number, vecY: number, radius: number) => {
  const angle = getAngle(vecX, vecY); 
  const nearest = getNearestAxis(angle);
  
  let startDeg = nearest;
  let endDeg = angle;
  let diff = normalizeAngle(endDeg - startDeg);
  if (diff > 180) diff -= 360; 
  
  // Detect small angle (< 20 degrees)
  const isSmallAngle = Math.abs(diff) < 20;
  // Increase radius for small angles to prevent overlap
  const effectiveRadius = isSmallAngle ? radius * 2.5 : radius;
  
  const segments = 12;
  const step = diff / segments;
  
  doc.setDrawColor('#64748B');
  doc.setLineWidth(0.15);
  
  let currA = startDeg;
  
  const getPt = (deg: number) => {
     const rad = deg * DEG_TO_RAD;
     return {
        x: cx + effectiveRadius * Math.cos(rad),
        y: cy - effectiveRadius * Math.sin(rad)
     };
  };
  
  const pStart = getPt(startDeg);
  let lx = pStart.x;
  let ly = pStart.y;
  
  for (let i = 1; i <= segments; i++) {
     currA += step;
     const p = getPt(currA);
     doc.line(lx, ly, p.x, p.y);
     lx = p.x;
     ly = p.y;
  }
  
  const midDeg = startDeg + diff / 2;
  // Increase label distance for small angles
  const labelRad = effectiveRadius + (isSmallAngle ? 8 : 3); 
  const lPos = {
     x: cx + labelRad * Math.cos(midDeg * DEG_TO_RAD),
     y: cy - labelRad * Math.sin(midDeg * DEG_TO_RAD)
  };
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  const txt = `${Math.abs(diff).toFixed(0)}°`;
  
  const w = doc.getTextWidth(txt);
  doc.text(txt, lPos.x - w/2, lPos.y + 1);
};


const renderVectorDiagramToPDF = (doc: jsPDF, offsetX: number, offsetY: number, vectors: any[], resultant: any, showResultant: boolean) => {
  const cx = offsetX + CENTER;
  const cy = offsetY + CENTER;
  
  // AUTO-SCALE LOGIC: Scale so longest vector is ~70% of radius
  let maxMag = 0;
  vectors.forEach(v => {
    // Skip hidden 'Rd' vectors if resultant is hidden
    if (v.label === 'Rd' && !showResultant) return;
    if (v) maxMag = Math.max(maxMag, getMagnitude(v.x, v.y));
  });
  
  if (resultant && showResultant) {
     maxMag = Math.max(maxMag, getMagnitude(resultant.x, resultant.y));
  }
  
  // Prevent division by zero
  maxMag = Math.max(maxMag, 0.001);
  
  const Rmax = DIAGRAM_SIZE / 2; // 45mm
  // Target: max vector takes 70% of the available radius
  const scaleFactor = (Rmax * 0.70) / maxMag;
  
  // Axes (Clean, no numbers)
  doc.setDrawColor('#94A3B8');
  doc.setLineWidth(0.2);
  doc.line(offsetX, cy, offsetX + DIAGRAM_SIZE, cy); // X
  doc.line(cx, offsetY, cx, offsetY + DIAGRAM_SIZE); // Y
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor('#64748B');
  doc.text('y', cx + 1, offsetY + 3);
  doc.text('x', offsetX + DIAGRAM_SIZE - 3, cy - 1);
  
  const rawList: { id: number | string, x: number, y: number }[] = vectors.map((v, i) => ({ id: i, x: v.x, y: v.y }));
  if (resultant) rawList.push({ id: 'R', x: resultant.x, y: resultant.y });
  
  const visualLayout = calculateVisualLayout(rawList);
  const getVisual = (id: number|string) => visualLayout.find(v => v.id === id) || { vx: 0, vy: 0 };
  
  const placedLabels: Rect[] = [
     { x: cx - 5, y: offsetY, w: 10, h: DIAGRAM_SIZE }, 
     { x: offsetX, y: cy - 3, w: DIAGRAM_SIZE, h: 6 }  
  ];

  const drawVecItem = (v: any, isRes: boolean, id: number|string) => {
     const visual = getVisual(id);
     
     const start = { x: cx, y: cy };
     const end = toPDFCoords(visual.vx, visual.vy, scaleFactor, cx, cy);
     
     // ANGLE SUPPRESSION LOGIC
     const angleDeg = Math.round(getAngle(v.x, v.y));
     const skipAngle = [0, 90, 180, 360].includes(angleDeg);

     // Allowed angle drawing for resultant as well
     if (!skipAngle && getMagnitude(v.x, v.y) > 0.5) {
        drawArc(doc, cx, cy, v.x, v.y, 8);
     }
     
     const scale = isRes ? 1.4 : 1.0;
     drawArrow(doc, start.x, start.y, end.x, end.y, v.color, scale);
     
     // INTEGER MAGNITUDE LOGIC
     const magVal = Math.round(getMagnitude(v.x, v.y));
     
     // Labels: Resultant uses "R=<mag>", others use only magnitude
     const labelTxt = isRes ? `R=${magVal}` : `${magVal}`;

     doc.setFontSize(10);
     doc.setFont('helvetica', isRes ? 'bold' : 'normal'); 
     
     const textW = doc.getTextWidth(labelTxt);
     const textH = 3; 
     
     // Positioning rules: Q1/Q2 -> above; Q3/Q4 -> below; centered horizontally on arrow tip.
     let bestX = end.x - (textW / 2); // Center horizontally
     let bestY = end.y;

     const verticalOffset = 4;

     if (v.y > 0) {
        // Q1 or Q2: Label ABOVE
        bestY = end.y - verticalOffset;
     } else {
        // Q3 or Q4 (y<=0): Label BELOW
        bestY = end.y + textH + verticalOffset;
     }
     
     // Minimal Collision Nudging
     const r: Rect = { x: bestX - 1, y: bestY - textH, w: textW + 2, h: textH + 4 };
     let collide = false;
     for (const p of placedLabels) {
        if (checkCollision(r, p)) { collide = true; break; }
     }
     
     if (collide) {
        // Push further in the preferred direction
        if (v.y > 0) bestY -= 4; // Further up
        else bestY += 4; // Further down
     }
     
     // Register placement
     placedLabels.push({ x: bestX - 1, y: bestY - textH, w: textW + 2, h: textH + 4 });

     doc.setTextColor(isRes ? THEME.resultant : '#1E293B');
     doc.text(labelTxt, bestX, bestY);
  };
  
  vectors.forEach((v, i) => {
     if (v.label === 'Rd' && !showResultant) return;
     drawVecItem(v, false, i);
  });
  
  if (resultant && showResultant) {
     drawVecItem(resultant, true, 'R');
  }
};


// -------------------
// PDF GENERATION
// -------------------

export const generatePDF = (exercises: Exercise[], isTeacher: boolean, mode: 'full' | 'simple' = 'full', itemsPerPageRequested: number = 4) => {
  const doc = new jsPDF();
  
  // CLEAN HEADER: Left Title, Right Date, No Border
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const mainTitle = isTeacher ? 'Gabarito Oficial' : 'Lista de Exercícios';
  doc.text(mainTitle, 15, 20, { align: 'left' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 195, 20, { align: 'right' });
  doc.setTextColor(0, 0, 0); // Reset

  // Page layout constants
  const pageHeight = 297;
  const pageWidth = 210;
  const margin = { top: 30, bottom: 18, left: 15, right: 15 };
  const usableHeight = pageHeight - margin.top - margin.bottom;
  const blockPadding = 5;

  if (mode === 'full') {
    // Each question block height should include header + diagram (+ optional solution)
    const headerH = 12; // "Questão N" + description
    const solutionHTeacher = 22; // teacher solution block height (only for teacher)
    const diagH = DIAGRAM_SIZE;
    // Estimate block height conservatively
    const blockBaseH = headerH + diagH + blockPadding + 8; // default for student
    const blockTeacherH = headerH + diagH + solutionHTeacher + blockPadding + 8;

    // calculate how many blocks per page fit
    const perPageStudent = Math.floor(usableHeight / blockBaseH) || 1;
    const perPageTeacher = Math.floor(usableHeight / blockTeacherH) || 1;
    const perPage = isTeacher ? perPageTeacher : perPageStudent;

    let pageIndex = 0;
    for (let i = 0; i < exercises.length; i += perPage) {
      if (pageIndex > 0) doc.addPage();
      let yPos = margin.top;

      const pageSlice = exercises.slice(i, i + perPage);
      pageSlice.forEach((ex, idx) => {
        // Question header
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Questão ${i + idx + 1}`, margin.left, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const desc = ex.type === 'missing' 
           ? 'Determine o vetor faltante (Vf) para o equilíbrio.' 
           : 'Determine o vetor resultante (R) do sistema.';
        doc.text(desc, margin.left + 30, yPos);
        yPos += headerH;

        // Prepare vectors & resultant
        const drawVectors = ex.vectors.map(v => {
           const c = calculateComponents(v.inputType, v.param1, v.param2, v.param3);
           return { ...c, color: v.color, label: v.label };
        });

        let resultantObj = null;
        if (ex.resultantDesired) {
           resultantObj = { ...ex.resultantDesired, color: THEME.resultant, label: 'R' };
        } else {
           let sumX = 0, sumY = 0;
           drawVectors.forEach(v => { sumX += v.x; sumY += v.y; });
           resultantObj = { x: sumX, y: sumY, color: THEME.resultant, label: 'R' };
        }

        const teacherMode = isTeacher;

        if (teacherMode && ex.type === 'missing' && resultantObj) {
           let sumX = 0, sumY = 0;
           drawVectors.forEach(v => { sumX += v.x; sumY += v.y; });
           const vfX = resultantObj.x - sumX;
           const vfY = resultantObj.y - sumY;
           drawVectors.push({ x: vfX, y: vfY, color: THEME.missing, label: 'Vf' });
        }

        const xOffset = margin.left;
        const showResultant = teacherMode || ex.type === 'missing';

        // Render diagram
        renderVectorDiagramToPDF(doc, xOffset, yPos, drawVectors, resultantObj, showResultant);

        // Student calculation area
        if (!teacherMode) {
          doc.setDrawColor(220);
          doc.setLineWidth(0.1);
          doc.line(margin.left + DIAGRAM_SIZE + 10, yPos, margin.left + DIAGRAM_SIZE + 10, yPos + DIAGRAM_SIZE); 
          doc.setTextColor(150);
          doc.setFontSize(8);
          doc.text("Espaço para cálculos:", margin.left + DIAGRAM_SIZE + 13, yPos + 5);
        }

        yPos += DIAGRAM_SIZE + blockPadding;

        // Teacher solution block
        if (teacherMode) {
          doc.setFillColor(241, 245, 249);
          doc.rect(margin.left, yPos, pageWidth - margin.left - margin.right, 15, 'F');
          doc.setTextColor(30, 41, 59);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);

          const sol = ex.solution || { x: 0, y: 0, magnitude: 0, angle: 0 };
          const label = ex.type === 'missing' ? 'Vf' : 'R';
          const txt = `Resposta: ${label} = (${sol.x}; ${sol.y})   |${label}| = ${sol.magnitude}   θ = ${sol.angle}°`;
          doc.text(txt, margin.left + 4, yPos + 10);
          yPos += 20;
        } else {
          yPos += 6;
        }

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin.left, yPos, pageWidth - margin.right, yPos);
        yPos += 8;
      });

      pageIndex++;
    }

  } else {
    // SIMPLE MODE: multiple diagrams per page, user-specified itemsPerPageRequested
    // We handle itemsPerPageRequested but ensure it physically fits on the page
    const cols = 2; // fixed two columns for A4
    const diagWidth = DIAGRAM_SIZE;
    const rowHeight = DIAGRAM_SIZE + 8; // spacing for label/angle
    // rows per page that physically fit
    const rowsThatFit = Math.floor(usableHeight / rowHeight) || 1;
    // maximum items that can fit per page given 2 columns
    const maxItemsPerPage = rowsThatFit * cols;
    // adopt requested itemsPerPage but clamp to maxItemsPerPage
    let itemsPerPage = Math.min(Math.max(1, itemsPerPageRequested), maxItemsPerPage);

    // If requested doesn't fit, reduce to maxItemsPerPage (safe)
    if (itemsPerPageRequested > maxItemsPerPage) {
      itemsPerPage = maxItemsPerPage;
    }

    // Rows to use for the chosen itemsPerPage
    const rowsPerPage = Math.ceil(itemsPerPage / cols);

    // layout variables
    const marginX = margin.left;
    const availableW = pageWidth - margin.left - margin.right;
    const colWidth = availableW / cols;
    const startY = margin.top;

    // iterate pages
    const totalPages = Math.ceil(exercises.length / itemsPerPage);
    for (let p = 0; p < totalPages; p++) {
      if (p > 0) doc.addPage();
      const pageStartIdx = p * itemsPerPage;
      for (let localIdx = 0; localIdx < itemsPerPage; localIdx++) {
        const exIndex = pageStartIdx + localIdx;
        if (exIndex >= exercises.length) break;

        const col = localIdx % cols;
        const row = Math.floor(localIdx / cols);

        const x = marginX + (col * colWidth) + (colWidth - DIAGRAM_SIZE) / 2;
        const y = startY + (row * rowHeight);

        const ex = exercises[exIndex];

        // Prepare vectors & resultant
        const drawVectors = ex.vectors.map(v => {
           const c = calculateComponents(v.inputType, v.param1, v.param2, v.param3);
           return { ...c, color: v.color, label: v.label };
        });

        let resultantObj = null;
        if (ex.resultantDesired) {
           resultantObj = { ...ex.resultantDesired, color: THEME.resultant, label: 'R' };
        } else {
           let sumX = 0, sumY = 0;
           drawVectors.forEach(v => { sumX += v.x; sumY += v.y; });
           resultantObj = { x: sumX, y: sumY, color: THEME.resultant, label: 'R' };
        }

        if (isTeacher && ex.type === 'missing' && resultantObj) {
           let sumX = 0, sumY = 0;
           drawVectors.forEach(v => { sumX += v.x; sumY += v.y; });
           const vfX = resultantObj.x - sumX;
           const vfY = resultantObj.y - sumY;
           drawVectors.push({ x: vfX, y: vfY, color: THEME.missing, label: 'Vf' });
        }

        const showResultant = isTeacher || ex.type === 'missing';
        renderVectorDiagramToPDF(doc, x, y, drawVectors, resultantObj, showResultant);
      }
    }
  }
  
  const filename = isTeacher ? 'Vectora_Pro_Gabarito.pdf' : 'Vectora_Pro_Exercicios.pdf';
  doc.save(filename);
};