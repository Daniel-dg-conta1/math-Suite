import React, { useState } from 'react';
import VectorCanvas from './components/VectorCanvas';
import { Vector, COLORS, Exercise, GridMode, THEME } from './types';
import { calculateComponents, formatNumber, getMagnitude, getAngle, DEG_TO_RAD, isAngleTooClose, rotatePoint } from './utils/math';
import { generatePDF } from './utils/pdfGenerator';

const VectoraApp: React.FC = () => {
  // --- STATE ---
  const [vectors, setVectors] = useState<Vector[]>([
    { id: 1, x: 4, y: 3, label: 'V1', color: COLORS[0], inputType: 'cartesian', param1: 4, param2: 3, param3: null },
    { id: 2, x: 2, y: -2, label: 'V2', color: COLORS[1], inputType: 'cartesian', param1: 2, param2: -2, param3: null },
  ]);
  const [showDashedLines, setShowDashedLines] = useState(true);
  const [gridMode, setGridMode] = useState<GridMode>('light');
  const [missingMode, setMissingMode] = useState(false);
  const [desiredResultant, setDesiredResultant] = useState<{x: number, y: number, mag: number, ang: number}>({ x: 5, y: 5, mag: 7.07, ang: 45 });
  const [selectedVectorId, setSelectedVectorId] = useState<number | null>(null);
  const [canvasScale, setCanvasScale] = useState(30);
  
  // New Feature: Axis Rotation
  const [rotationAngle, setRotationAngle] = useState(0);

  // Generator & Preview
  const [numQuestions, setNumQuestions] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['2', '3']);
  const [generatedExercises, setGeneratedExercises] = useState<Exercise[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  // New Generator Configs
  const [minSep, setMinSep] = useState(15);
  const [minGenMag, setMinGenMag] = useState(5);
  const [maxGenMag, setMaxGenMag] = useState(10);

  // PDF Config
  const [pdfMode, setPdfMode] = useState<'full' | 'simple'>('full');
  const [itemsPerPage, setItemsPerPage] = useState(4);

  // --- DERIVED STATE ---
  const sumX = vectors.reduce((acc, v) => acc + v.x, 0);
  const sumY = vectors.reduce((acc, v) => acc + v.y, 0);
  
  let displayedResultant = { x: sumX, y: sumY, label: 'R' };
  let missingVectorCalc = null;

  if (missingMode) {
    missingVectorCalc = { x: desiredResultant.x - sumX, y: desiredResultant.y - sumY };
    displayedResultant = { x: desiredResultant.x, y: desiredResultant.y, label: 'Rd' }; 
  }

  const rMag = getMagnitude(displayedResultant.x, displayedResultant.y);
  const rAng = getAngle(displayedResultant.x, displayedResultant.y);

  // --- HANDLERS ---
  const addVector = () => {
    if (vectors.length >= 6) return;
    const id = (vectors.length > 0 ? Math.max(...vectors.map(v => v.id)) : 0) + 1;
    const color = COLORS[(id - 1) % COLORS.length];
    const newV: Vector = { 
      id, x: 3, y: 3, label: `V${id}`, color, inputType: 'cartesian', param1: 3, param2: 3, param3: null 
    };
    setVectors([...vectors, newV]);
    setSelectedVectorId(id);
  };

  const removeVector = (id: number) => {
    setVectors(vectors.filter(v => v.id !== id));
    if (selectedVectorId === id) setSelectedVectorId(null);
  };

  // High Priority: Reverse Calculation Sync
  const updateVector = (id: number, updates: Partial<Vector>) => {
    setVectors(vectors.map(v => {
      if (v.id !== id) return v;
      const newV = { ...v, ...updates };

      // If params changed (Input typed), update X/Y
      if ('param1' in updates || 'param2' in updates || 'param3' in updates || 'inputType' in updates) {
         const { x, y } = calculateComponents(newV.inputType, newV.param1, newV.param2, newV.param3);
         newV.x = x;
         newV.y = y;
      } 
      // If X/Y changed (Drag or internal logic), update params based on current inputType
      else if ('x' in updates || 'y' in updates) {
         if (newV.inputType === 'cartesian') {
            newV.param1 = newV.x;
            newV.param2 = newV.y;
         } else if (newV.inputType === 'angle') {
            newV.param1 = getMagnitude(newV.x, newV.y);
            newV.param2 = getAngle(newV.x, newV.y);
         } else if (newV.inputType === 'triangle') {
            newV.param1 = getMagnitude(newV.x, newV.y);
            newV.param2 = newV.x;
            newV.param3 = newV.y;
         }
      }
      return newV;
    }));
  };

  const handleCanvasVectorChange = (id: number, nx: number, ny: number) => {
    updateVector(id, { x: nx, y: ny });
  };

  // Handler for Desired Resultant inputs
  const handleDesiredChange = (key: 'x'|'y'|'mag'|'ang', val: string) => {
     const numVal = parseFloat(val) || 0;
     let newR = { ...desiredResultant };
     
     if (key === 'x') {
        newR.x = numVal;
        newR.mag = getMagnitude(newR.x, newR.y);
        newR.ang = getAngle(newR.x, newR.y);
     } else if (key === 'y') {
        newR.y = numVal;
        newR.mag = getMagnitude(newR.x, newR.y);
        newR.ang = getAngle(newR.x, newR.y);
     } else if (key === 'mag') {
        newR.mag = numVal;
        const rad = newR.ang * DEG_TO_RAD;
        newR.x = newR.mag * Math.cos(rad);
        newR.y = newR.mag * Math.sin(rad);
     } else if (key === 'ang') {
        newR.ang = numVal;
        const rad = newR.ang * DEG_TO_RAD;
        newR.x = newR.mag * Math.cos(rad);
        newR.y = newR.mag * Math.sin(rad);
     }
     setDesiredResultant(newR);
  };

  // --- GENERATOR LOGIC ---
  const generateSingleExercise = (id: number, typeKey: string): Exercise => {
     const isMissing = typeKey === 'missing';
     const numVecs = isMissing ? Math.floor(Math.random() * 2) + 2 : parseInt(typeKey);
     
     const exVectors: Vector[] = [];
     let exSumX = 0;
     let exSumY = 0;
     const usedAngles: number[] = [];

     for(let j=0; j<numVecs; j++) {
        const mag = Math.floor(Math.random() * (maxGenMag - minGenMag + 1)) + minGenMag;
        let ang = 0;
        let attempts = 0;
        let valid = false;
        while (!valid && attempts < 50) {
           ang = Math.floor(Math.random() * 36) * 10;
           if (Math.random() > 0.5) ang += 5; 
           if (!isAngleTooClose(ang, usedAngles, minSep)) {
              valid = true;
           } else {
              ang = (ang + minSep) % 360;
              if (!isAngleTooClose(ang, usedAngles, minSep)) valid = true;
           }
           attempts++;
        }
        usedAngles.push(ang);
        const rad = ang * DEG_TO_RAD;
        const vx = mag * Math.cos(rad);
        const vy = mag * Math.sin(rad);
        exSumX += vx;
        exSumY += vy;
        
        exVectors.push({
           id: j+1,
           x: vx, y: vy,
           label: `V${j+1}`,
           color: COLORS[j % COLORS.length],
           inputType: 'angle',
           param1: mag,
           param2: ang,
           param3: null
        });
     }
     
     let solution: any = {};
     let exRd = undefined;

     if (isMissing) {
        const rdMag = Math.floor(Math.random() * (maxGenMag - minGenMag + 1)) + minGenMag;
        const rdAng = Math.floor(Math.random() * 36) * 10;
        const rdRad = rdAng * DEG_TO_RAD;
        const rdx = rdMag * Math.cos(rdRad);
        const rdy = rdMag * Math.sin(rdRad);
        
        exRd = { x: rdx, y: rdy, label: 'Rd' };
        const vfx = rdx - exSumX;
        const vfy = rdy - exSumY;
        const vfMag = getMagnitude(vfx, vfy);
        const vfAng = getAngle(vfx, vfy);
        
        solution = {
           label: 'Vf',
           x: formatNumber(vfx),
           y: formatNumber(vfy),
           magnitude: formatNumber(vfMag),
           angle: formatNumber(vfAng)
        };
     } else {
        const rMag = getMagnitude(exSumX, exSumY);
        const rAng = getAngle(exSumX, exSumY);
        solution = {
           label: 'R',
           x: formatNumber(exSumX),
           y: formatNumber(exSumY),
           magnitude: formatNumber(rMag),
           angle: formatNumber(rAng)
        };
     }

     return {
        id,
        type: isMissing ? 'missing' : `${numVecs} vetores`,
        vectors: exVectors,
        resultantDesired: exRd,
        solution
     };
  };

  const generateList = () => {
    const list: Exercise[] = [];
    for (let i = 0; i < numQuestions; i++) {
       const type = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
       list.push(generateSingleExercise(i+1, type));
    }
    setGeneratedExercises(list);
    setShowPreview(true);
  };

  const regenerateExercise = (index: number) => {
     const oldEx = generatedExercises[index];
     let typeKey = '2';
     if (oldEx.type === 'missing') typeKey = 'missing';
     else typeKey = oldEx.type.split(' ')[0]; 
     const newEx = generateSingleExercise(oldEx.id, typeKey);
     const newList = [...generatedExercises];
     newList[index] = newEx;
     setGeneratedExercises(newList);
  };

  // --- PREVIEW COMPONENT ---
  const PreviewModal = () => (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Pré-visualização da Lista</h2>
            <p className="text-sm text-gray-500">Confira os {generatedExercises.length} exercícios gerados antes de imprimir.</p>
          </div>
          <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generatedExercises.map((ex, idx) => {
              const previewVectors = ex.vectors.map(v => {
                 const c = calculateComponents(v.inputType, v.param1, v.param2, v.param3);
                 return { ...v, ...c };
              });
              const previewRes = ex.resultantDesired || null;
              let previewMissing = null;
              if (ex.type === 'missing' && ex.resultantDesired) {
                 const sx = previewVectors.reduce((s, v) => s + v.x, 0);
                 const sy = previewVectors.reduce((s, v) => s + v.y, 0);
                 previewMissing = { x: ex.resultantDesired.x - sx, y: ex.resultantDesired.y - sy };
              }
              return (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-gray-700">Questão {idx + 1}</span>
                       <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{ex.type}</span>
                    </div>
                    <button onClick={() => regenerateExercise(idx)} className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-red-100 transition font-bold">Excluir e Refazer</button>
                  </div>
                  <div className="h-48 w-full bg-gray-50 rounded-lg overflow-hidden relative border border-gray-100">
                    <VectorCanvas vectors={previewVectors} resultant={previewRes} missingVector={previewMissing} showDashedLines={false} gridMode="none" selectedVectorId={null} rotationAngle={0} readOnly={true} />
                  </div>
                  <div className="mt-3 text-xs text-gray-500 font-mono">
                    Resposta: {ex.solution.label} = ({ex.solution.x}, {ex.solution.y})
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
           <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">Voltar</button>
           <button onClick={() => generatePDF(generatedExercises, false, pdfMode, itemsPerPage)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:border-blue-400 hover:text-blue-600 transition flex items-center gap-2">📄 Baixar PDF Aluno</button>
           <button onClick={() => generatePDF(generatedExercises, true, pdfMode, itemsPerPage)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition flex items-center gap-2">🎓 Baixar Gabarito</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA] font-sans text-slate-800">
      
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#005A7A] to-[#1FA67A] rounded-lg flex items-center justify-center text-white font-bold text-lg">V</div>
          <div>
            <h1 className="font-bold text-lg text-[#005A7A]">Vectora Pro</h1>
          </div>
        </div>
        <div className="text-sm font-medium text-gray-600">Simulador & Gerador PDF</div>
      </header>

      <div className="flex-1 p-6 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        
        {/* LEFT: CONTROLS */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar h-full">
          
          {/* MODE SELECTOR */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex gap-2 mb-2">
               <button onClick={() => setMissingMode(false)} className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${!missingMode ? 'bg-blue-100 text-blue-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Resultante</button>
               <button onClick={() => setMissingMode(true)} className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${missingMode ? 'bg-teal-100 text-teal-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Alvo / Faltante</button>
            </div>
            {missingMode && (
               <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-teal-50/50 p-2 rounded-lg border border-teal-100">
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-[10px] font-bold text-teal-800 uppercase">Definir Resultante Alvo (Rd)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                     <div>
                        <label className="text-[9px] text-teal-600 font-bold">Mag</label>
                        <input className="w-full text-xs p-1 border rounded" value={desiredResultant.mag.toFixed(2)} onChange={e => handleDesiredChange('mag', e.target.value)} />
                     </div>
                     <div>
                        <label className="text-[9px] text-teal-600 font-bold">Ângulo</label>
                        <input className="w-full text-xs p-1 border rounded" value={desiredResultant.ang.toFixed(2)} onChange={e => handleDesiredChange('ang', e.target.value)} />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                        <label className="text-[9px] text-teal-600 font-bold">X</label>
                        <input className="w-full text-xs p-1 border rounded" value={desiredResultant.x.toFixed(2)} onChange={e => handleDesiredChange('x', e.target.value)} />
                     </div>
                     <div>
                        <label className="text-[9px] text-teal-600 font-bold">Y</label>
                        <input className="w-full text-xs p-1 border rounded" value={desiredResultant.y.toFixed(2)} onChange={e => handleDesiredChange('y', e.target.value)} />
                     </div>
                  </div>
               </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
               <h2 className="font-semibold text-gray-700">↗ Vetores</h2>
               <button onClick={addVector} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-100 transition">+ Novo</button>
             </div>
             <div className="p-4 space-y-3">
               {vectors.map(v => (
                 <div key={v.id} className={`border rounded-lg p-3 transition-all ${selectedVectorId === v.id ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-2" onClick={() => setSelectedVectorId(v.id)}>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <div className="w-3 h-3 rounded-full" style={{ background: v.color }}></div>
                        <span className="font-bold text-sm">{v.label}</span>
                      </div>
                      {vectors.length > 1 && <button onClick={() => removeVector(v.id)} className="text-gray-300 hover:text-red-500">×</button>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                       {v.inputType === 'cartesian' ? (
                         <>
                           <input value={v.param1 ?? ''} onChange={e => updateVector(v.id, {param1: e.target.value})} className="p-1 border rounded bg-gray-50" placeholder="X" />
                           <input value={v.param2 ?? ''} onChange={e => updateVector(v.id, {param2: e.target.value})} className="p-1 border rounded bg-gray-50" placeholder="Y" />
                         </>
                       ) : v.inputType === 'angle' ? (
                         <>
                           <input value={v.param1 ?? ''} onChange={e => updateVector(v.id, {param1: e.target.value})} className="p-1 border rounded bg-gray-50" placeholder="Mag" />
                           <input value={v.param2 ?? ''} onChange={e => updateVector(v.id, {param2: e.target.value})} className="p-1 border rounded bg-gray-50" placeholder="Ang" />
                         </>
                       ) : (
                         <div className="col-span-2 space-y-2 mt-1">
                           <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Módulo (hipotenusa)</label>
                              <input value={v.param1 ?? ''} onChange={e => updateVector(v.id, {param1: e.target.value})} className="w-full p-1 border rounded bg-gray-50" />
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Cateto horizontal (H)</label>
                                <input value={v.param2 ?? ''} onChange={e => updateVector(v.id, {param2: e.target.value})} className="w-full p-1 border rounded bg-gray-50" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Cateto vertical (V)</label>
                                <input value={v.param3 ?? ''} onChange={e => updateVector(v.id, {param3: e.target.value})} className="w-full p-1 border rounded bg-gray-50" />
                              </div>
                           </div>
                         </div>
                       )}
                    </div>
                    {/* Input Types */}
                    <div className="flex gap-1 mt-2">
                       <button onClick={() => updateVector(v.id, {inputType: 'cartesian'})} className={`flex-1 text-[10px] py-1 rounded ${v.inputType === 'cartesian' ? 'bg-gray-200 font-bold' : 'text-gray-400'}`}>(x,y)</button>
                       <button onClick={() => updateVector(v.id, {inputType: 'angle'})} className={`flex-1 text-[10px] py-1 rounded ${v.inputType === 'angle' ? 'bg-gray-200 font-bold' : 'text-gray-400'}`}>(r,θ)</button>
                       <button onClick={() => updateVector(v.id, {inputType: 'triangle'})} className={`flex-1 text-[10px] py-1 rounded ${v.inputType === 'triangle' ? 'bg-gray-200 font-bold' : 'text-gray-400'}`}>Tri</button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
          
          {/* NEW SUMMARY TABLE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col p-4">
             <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Resumo de Dados</h3>
             <div className="overflow-x-auto">
               <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-400 font-medium border-b border-gray-100">
                      <th className="pb-1 pl-1">Vetor</th>
                      <th className="pb-1">x</th>
                      <th className="pb-1">y</th>
                      <th className="pb-1">|V|</th>
                      <th className="pb-1">θ°</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    {/* Linha da Resultante */}
                    <tr className="font-bold text-gray-800 bg-gray-50">
                       <td className="py-1 pl-1" style={{color: THEME.resultant}}>{missingMode ? 'Rd (Alvo)' : 'R (Soma)'}</td>
                       <td>{formatNumber(displayedResultant.x)}</td>
                       <td>{formatNumber(displayedResultant.y)}</td>
                       <td>{formatNumber(rMag)}</td>
                       <td>{formatNumber(rAng)}</td>
                    </tr>
                    {missingMode && missingVectorCalc && (
                       <tr className="font-bold text-teal-700 bg-teal-50">
                          <td className="py-1 pl-1">Vf (Faltante)</td>
                          <td>{formatNumber(missingVectorCalc.x)}</td>
                          <td>{formatNumber(missingVectorCalc.y)}</td>
                          <td>{formatNumber(getMagnitude(missingVectorCalc.x, missingVectorCalc.y))}</td>
                          <td>{formatNumber(getAngle(missingVectorCalc.x, missingVectorCalc.y))}</td>
                       </tr>
                    )}
                    {/* Linhas dos Vetores do Usuário */}
                    {vectors.map(v => {
                       const mag = getMagnitude(v.x, v.y);
                       const ang = getAngle(v.x, v.y);
                       return (
                         <tr key={v.id}>
                           <td className="py-1 pl-1 font-medium" style={{color: v.color}}>{v.label}</td>
                           <td>{formatNumber(v.x)}</td>
                           <td>{formatNumber(v.y)}</td>
                           <td>{formatNumber(mag)}</td>
                           <td>{formatNumber(ang)}</td>
                         </tr>
                       );
                    })}
                  </tbody>
               </table>
             </div>
          </div>

          {/* ROTATION & TABLE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col p-4">
             <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Rotação de Eixos (α)</h3>
             <div className="flex items-center gap-2 mb-4">
                <input 
                  type="number" 
                  value={rotationAngle} 
                  onChange={(e) => setRotationAngle(parseFloat(e.target.value)||0)}
                  className="p-2 border rounded w-24 bg-gray-50 text-sm"
                />
                <span className="text-sm text-gray-600">graus</span>
             </div>
             
             <h4 className="text-[10px] font-bold text-indigo-600 mb-2 border-b border-indigo-100 pb-1">Componentes (x', y')</h4>
             <div className="overflow-x-auto">
               <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-400 font-medium">
                      <th className="pb-1">Vetor</th>
                      <th className="pb-1">x'</th>
                      <th className="pb-1">y'</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-600">
                    <tr className="font-bold text-purple-700 bg-purple-50">
                       <td className="py-1">R</td>
                       {(() => {
                          const rot = rotatePoint(displayedResultant.x, displayedResultant.y, rotationAngle);
                          return (
                            <>
                              <td>{formatNumber(rot.x)}</td>
                              <td>{formatNumber(rot.y)}</td>
                            </>
                          )
                       })()}
                    </tr>
                    {vectors.map(v => {
                       const rot = rotatePoint(v.x, v.y, rotationAngle);
                       return (
                         <tr key={v.id}>
                           <td className="py-1 font-medium">{v.label}</td>
                           <td>{formatNumber(rot.x)}</td>
                           <td>{formatNumber(rot.y)}</td>
                         </tr>
                       );
                    })}
                  </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* CENTER: CANVAS */}
        <div className="col-span-12 lg:col-span-6 flex flex-col h-full relative">
           <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <button onClick={() => setGridMode(g => g === 'none' ? 'light' : g === 'light' ? 'strong' : 'none')} className="bg-white p-2 rounded-lg shadow border border-gray-200 text-gray-500 hover:text-blue-600 text-xs font-bold">
                 Grid: {gridMode}
              </button>
              
              <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col overflow-hidden">
                 <button onClick={() => setCanvasScale(s => Math.min(s + 5, 100))} className="p-2 hover:bg-gray-50 text-gray-600 border-b border-gray-100 flex items-center justify-center" title="Zoom In">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                       <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                    </svg>
                 </button>
                 <button onClick={() => setCanvasScale(s => Math.max(s - 5, 10))} className="p-2 hover:bg-gray-50 text-gray-600 flex items-center justify-center" title="Zoom Out">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                       <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/>
                    </svg>
                 </button>
              </div>
           </div>
           
           <VectorCanvas 
              vectors={vectors}
              resultant={displayedResultant} 
              missingVector={missingMode ? missingVectorCalc : null}
              showDashedLines={showDashedLines}
              gridMode={gridMode}
              selectedVectorId={selectedVectorId}
              rotationAngle={rotationAngle}
              onVectorChange={handleCanvasVectorChange}
              onSelectVector={setSelectedVectorId}
              scale={canvasScale}
           />
           
           <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-xl shadow-lg flex justify-between items-center">
               <div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{missingMode ? 'Alvo (Rd)' : 'Resultante (R)'}</div>
                  <div className="text-xl font-bold text-gray-800 font-mono">
                     {missingMode ? 'Rd' : 'R'} = ({formatNumber(displayedResultant.x)}; {formatNumber(displayedResultant.y)})
                  </div>
               </div>
               <div className="text-right">
                  <div className="text-sm font-bold text-gray-700">|{missingMode ? 'Rd' : 'R'}| = {formatNumber(rMag)}</div>
                  <div className="text-sm font-bold text-gray-700">θ = {formatNumber(rAng)}°</div>
               </div>
           </div>
        </div>

        {/* RIGHT: GENERATOR */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 pl-2 h-full overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
             <div className="p-4 border-b border-gray-100 bg-purple-50/50 rounded-t-xl">
               <h2 className="font-semibold text-purple-900">📝 Gerador de Lista</h2>
             </div>
             
             <div className="p-4 space-y-6">
                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Quantidade: {numQuestions}</label>
                   <input type="range" min="1" max="20" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} className="w-full accent-purple-600" />
                </div>
                
                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Tipos de Questão</label>
                   <div className="grid grid-cols-2 gap-2">
                      {['2','3','4','missing'].map(t => (
                        <label key={t} className={`p-2 border rounded-md text-xs font-medium text-center cursor-pointer transition ${selectedTypes.includes(t) ? 'bg-purple-100 border-purple-300 text-purple-800' : 'hover:bg-gray-50'}`}>
                           <input type="checkbox" checked={selectedTypes.includes(t)} onChange={e => e.target.checked ? setSelectedTypes([...selectedTypes, t]) : setSelectedTypes(selectedTypes.filter(x => x !== t))} className="hidden" />
                           {t === 'missing' ? 'Vetor Faltante' : `${t} Vetores`}
                        </label>
                      ))}
                   </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Separação angular mínima (°)</label>
                        <input type="number" value={minSep} onChange={e => setMinSep(parseInt(e.target.value)||15)} className="w-full p-2 border rounded bg-gray-50 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Mínimo módulo</label>
                            <input type="number" value={minGenMag} onChange={e => setMinGenMag(parseInt(e.target.value)||5)} className="w-full p-2 border rounded bg-gray-50 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Máximo módulo</label>
                            <input type="number" value={maxGenMag} onChange={e => setMaxGenMag(parseInt(e.target.value)||10)} className="w-full p-2 border rounded bg-gray-50 text-sm" />
                        </div>
                    </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                    <label className="text-xs font-bold text-gray-500 block mb-2">Formato do PDF</label>
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="radio" name="pdfMode" checked={pdfMode === 'full'} onChange={() => setPdfMode('full')} className="accent-purple-600" />
                            Completo
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="radio" name="pdfMode" checked={pdfMode === 'simple'} onChange={() => setPdfMode('simple')} className="accent-purple-600" />
                            Simplificado
                        </label>
                    </div>
                    {pdfMode === 'simple' && (
                        <div className="flex items-center gap-2 animate-in fade-in">
                            <label className="text-xs text-gray-600">Exercícios/pág:</label>
                            <input type="number" min="1" max="8" value={itemsPerPage} onChange={(e) => setItemsPerPage(parseInt(e.target.value)||4)} className="w-16 p-1 border rounded text-xs" />
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-100">
                   <button 
                     onClick={generateList}
                     disabled={selectedTypes.length === 0}
                     className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg shadow-lg shadow-purple-200 hover:bg-purple-700 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                   >
                     Gerar Lista & Preview
                   </button>
                   
                   {generatedExercises.length > 0 && (
                      <button onClick={() => setShowPreview(true)} className="w-full mt-3 py-2 text-purple-600 text-sm font-bold hover:bg-purple-50 rounded-lg transition">
                         Ver Preview Novamente
                      </button>
                   )}
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* MODAL */}
      {showPreview && <PreviewModal />}
    </div>
  );
};

export default VectoraApp;