import React, { useState, useEffect } from 'react';
import { TriangleMode, TriangleData, TrigoExercise } from './types';
import { solveTriangle } from './utils/trigoMath';
import TriangleCanvas from './components/TriangleCanvas';
import { generateTrigoPDF } from './utils/trigoPdf';

const MODES: { value: TriangleMode; label: string; inputs: string[] }[] = [
  { value: 'Right', label: 'Triângulo Retângulo', inputs: ['Cateto 1', 'Cateto 2'] },
  { value: 'SSS', label: 'Lado-Lado-Lado (LLL)', inputs: ['Lado a', 'Lado b', 'Lado c'] },
  { value: 'SAS', label: 'Lado-Ângulo-Lado (LAL)', inputs: ['Lado b', 'Ângulo A (°)', 'Lado c'] },
  { value: 'ASA', label: 'Ângulo-Lado-Ângulo (ALA)', inputs: ['Ângulo A (°)', 'Lado c', 'Ângulo B (°)'] },
  { value: 'AAS', label: 'Lado-Ângulo-Ângulo (LAA)', inputs: ['Ângulo A (°)', 'Ângulo B (°)', 'Lado a'] },
];

const TrigoApp: React.FC = () => {
  // --- STATE ---
  const [mode, setMode] = useState<TriangleMode>('Right');
  const [val1, setVal1] = useState<string>('3');
  const [val2, setVal2] = useState<string>('4');
  const [val3, setVal3] = useState<string>('5'); // Not used for Right triangle default
  
  const [triangle, setTriangle] = useState<TriangleData | null>(null);
  
  // Generator
  const [numQuestions, setNumQuestions] = useState(5);
  const [generatedList, setGeneratedList] = useState<TrigoExercise[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // PDF Options
  const [pdfMode, setPdfMode] = useState<'full' | 'simple'>('full');
  const [itemsPerPage, setItemsPerPage] = useState(4);

  // --- SOLVER EFFECT ---
  useEffect(() => {
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    const v3 = parseFloat(val3);

    if (!isNaN(v1) && !isNaN(v2)) {
        // For Right triangle we don't need v3. For others we do.
        if (mode === 'Right' || !isNaN(v3)) {
            const result = solveTriangle(mode, v1, v2, v3);
            setTriangle(result);
        } else {
            setTriangle(null);
        }
    } else {
        setTriangle(null);
    }
  }, [mode, val1, val2, val3]);

  // --- HANDLERS ---
  const currentModeConfig = MODES.find(m => m.value === mode)!;

  const handleGenerate = () => {
    const list: TrigoExercise[] = [];
    for (let i = 0; i < numQuestions; i++) {
        // Random mode excluding Right sometimes? Let's include all.
        const modes: TriangleMode[] = ['SSS', 'SAS', 'ASA', 'AAS', 'Right'];
        const m = modes[Math.floor(Math.random() * modes.length)];
        
        let ex: TrigoExercise | null = null;
        let attempts = 0;
        
        // Generate valid exercises
        while (!ex && attempts < 50) {
            attempts++;
            // Generate random reasonable numbers
            const rSide = () => Math.floor(Math.random() * 15) + 3;
            const rAng = () => Math.floor(Math.random() * 80) + 10;
            
            let v1=0, v2=0, v3=0;
            let label1='', label2='', label3='';
            
            if (m === 'Right') {
                v1 = rSide(); v2 = rSide(); v3 = 0;
                label1 = 'Cateto b'; label2 = 'Cateto a';
            } else if (m === 'SSS') {
                // Ensure valid triangle inequality
                v1 = rSide(); v2 = rSide(); 
                const min = Math.abs(v1-v2) + 1;
                const max = v1+v2 - 1;
                v3 = Math.floor(Math.random() * (max-min+1)) + min;
                label1 = 'a'; label2 = 'b'; label3 = 'c';
            } else if (m === 'SAS') {
                v1 = rSide(); v2 = rAng(); v3 = rSide();
                label1 = 'b'; label2 = 'Âng A'; label3 = 'c';
            } else if (m === 'ASA') {
                v1 = rAng(); v2 = rSide(); v3 = rAng();
                label1 = 'Âng A'; label2 = 'c'; label3 = 'Âng B';
            } else if (m === 'AAS') {
                v1 = rAng(); v2 = rAng(); v3 = rSide();
                label1 = 'Âng A'; label2 = 'Âng B'; label3 = 'a';
            }
            
            const sol = solveTriangle(m, v1, v2, v3);
            if (sol && sol.valid) {
                ex = {
                    id: i+1,
                    mode: m,
                    given: {
                        val1: v1, label1,
                        val2: v2, label2,
                        val3: m !== 'Right' ? v3 : undefined, label3
                    },
                    solution: sol
                };
            }
        }
        if (ex) list.push(ex);
    }
    setGeneratedList(list);
    setShowPreview(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA] font-sans text-slate-800">
      
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-400 rounded-lg flex items-center justify-center text-white font-bold text-lg">T</div>
          <div>
            <h1 className="font-bold text-lg text-teal-800">TrigoMestre</h1>
          </div>
        </div>
        <div className="text-sm font-medium text-gray-600">Calculadora & Gerador de Listas</div>
      </header>

      <div className="flex-1 p-6 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        
        {/* LEFT: INPUTS */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
           
           {/* Mode Select */}
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Caso / Tipo</label>
              <select 
                value={mode} 
                onChange={e => setMode(e.target.value as TriangleMode)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 font-medium text-gray-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              >
                 {MODES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                 ))}
              </select>
           </div>

           {/* Inputs */}
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
               <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                 <span>✏️</span> Entradas
               </h3>
               <div className="space-y-3">
                   <div>
                       <label className="text-xs font-bold text-teal-600 mb-1 block">{currentModeConfig.inputs[0]}</label>
                       <input type="number" value={val1} onChange={e => setVal1(e.target.value)} className="w-full p-2 border rounded bg-white focus:ring-1 focus:ring-teal-400" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-teal-600 mb-1 block">{currentModeConfig.inputs[1]}</label>
                       <input type="number" value={val2} onChange={e => setVal2(e.target.value)} className="w-full p-2 border rounded bg-white focus:ring-1 focus:ring-teal-400" />
                   </div>
                   {currentModeConfig.inputs[2] && (
                       <div>
                           <label className="text-xs font-bold text-teal-600 mb-1 block">{currentModeConfig.inputs[2]}</label>
                           <input type="number" value={val3} onChange={e => setVal3(e.target.value)} className="w-full p-2 border rounded bg-white focus:ring-1 focus:ring-teal-400" />
                       </div>
                   )}
               </div>
           </div>

           {/* Results */}
           {triangle && triangle.valid && (
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-bottom-2">
                   <h3 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">Resultados Calculados</h3>
                   
                   <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm mb-4">
                       <div className="text-gray-500">Lado a:</div><div className="font-mono font-bold">{triangle.a}</div>
                       <div className="text-gray-500">Lado b:</div><div className="font-mono font-bold">{triangle.b}</div>
                       <div className="text-gray-500">Lado c:</div><div className="font-mono font-bold">{triangle.c}</div>
                   </div>
                   <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm mb-4">
                       <div className="text-gray-500">Ângulo A:</div><div className="font-mono font-bold">{triangle.A}°</div>
                       <div className="text-gray-500">Ângulo B:</div><div className="font-mono font-bold">{triangle.B}°</div>
                       <div className="text-gray-500">Ângulo C:</div><div className="font-mono font-bold">{triangle.C}°</div>
                   </div>
                   
                   <div className="bg-teal-50 p-2 rounded text-xs grid grid-cols-2 gap-2 text-teal-800 font-medium">
                       <div>Área: {triangle.area}</div>
                       <div>Perímetro: {triangle.perimeter}</div>
                   </div>
               </div>
           )}

        </div>

        {/* CENTER: CANVAS */}
        <div className="col-span-12 lg:col-span-6 flex flex-col h-full bg-slate-100 rounded-xl border border-gray-200 p-4 shadow-inner relative">
           <div className="absolute top-4 right-4 bg-white/80 px-2 py-1 rounded text-xs font-mono text-gray-500">
               Visualização Automática
           </div>
           <TriangleCanvas data={triangle} />
        </div>

        {/* RIGHT: GENERATOR */}
        <div className="col-span-12 lg:col-span-3 flex flex-col h-full">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 bg-orange-50/50 rounded-t-xl">
                   <h2 className="font-semibold text-orange-900">📚 Gerar Lista</h2>
                </div>
                <div className="p-4 space-y-4">
                   <p className="text-xs text-gray-500 leading-relaxed">
                       Crie listas de exercícios aleatórios misturando todos os casos (Lei dos Senos, Cossenos e Pitágoras).
                   </p>
                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Quantidade: {numQuestions}</label>
                       <input type="range" min="1" max="10" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} className="w-full accent-orange-500" />
                   </div>

                   {/* PDF CONFIGS */}
                   <div className="pt-2 border-t border-gray-100">
                      <label className="text-xs font-bold text-gray-500 block mb-2">Formato do PDF</label>
                      <div className="flex gap-4 mb-3">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="pdfMode" checked={pdfMode === 'full'} onChange={() => setPdfMode('full')} className="accent-orange-600" />
                              Completo
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="pdfMode" checked={pdfMode === 'simple'} onChange={() => setPdfMode('simple')} className="accent-orange-600" />
                              Simplificado
                          </label>
                      </div>
                      {pdfMode === 'simple' && (
                          <div className="animate-in fade-in slide-in-from-top-1">
                              <label className="text-xs text-gray-600 mb-1 block">Itens por página (Max 8):</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="range" 
                                  min="1" 
                                  max="8" 
                                  value={itemsPerPage} 
                                  onChange={(e) => setItemsPerPage(parseInt(e.target.value))} 
                                  className="w-full accent-orange-500"
                                />
                                <span className="text-xs font-bold w-4">{itemsPerPage}</span>
                              </div>
                          </div>
                      )}
                   </div>

                   <button 
                     onClick={handleGenerate}
                     className="w-full py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all"
                   >
                     Gerar Lista & Imprimir
                   </button>
                </div>
            </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {showPreview && (
          <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
               <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-800">Preview: {generatedList.length} Questões</h2>
                  <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {generatedList.map((ex, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                           <div className="flex justify-between mb-2">
                               <span className="font-bold text-sm text-gray-700">Q{i+1} - {getModeLabel(ex.mode)}</span>
                           </div>
                           <div className="text-xs text-gray-500 mb-2">
                               Dados: {ex.given.label1}={ex.given.val1}, {ex.given.label2}={ex.given.val2}
                               {ex.given.val3 && `, ${ex.given.label3}=${ex.given.val3}`}
                           </div>
                           <div className="h-32 bg-gray-100 rounded relative">
                              <TriangleCanvas data={ex.solution} />
                           </div>
                           <div className="mt-2 text-[10px] text-gray-400">
                              Resp: a={ex.solution.a}, b={ex.solution.b}, c={ex.solution.c}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
                   <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-gray-600 text-sm font-bold hover:bg-gray-100 rounded">Voltar</button>
                   <button onClick={() => generateTrigoPDF(generatedList, false, pdfMode, itemsPerPage)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-bold rounded hover:border-orange-400 hover:text-orange-600 transition">📄 PDF Aluno</button>
                   <button onClick={() => generateTrigoPDF(generatedList, true, pdfMode, itemsPerPage)} className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded hover:bg-orange-600 shadow-lg shadow-orange-200 transition">🎓 PDF Professor</button>
               </div>
            </div>
          </div>
      )}

    </div>
  );
};

const getModeLabel = (m: string) => {
    switch(m) {
        case 'SSS': return 'LLL';
        case 'SAS': return 'LAL';
        case 'ASA': return 'ALA';
        case 'AAS': return 'LAA';
        case 'Right': return 'Retângulo';
        default: return m;
    }
};

export default TrigoApp;