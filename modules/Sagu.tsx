import React, { useState, useEffect } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { RotateCw, RefreshCw, MoveHorizontal, MoveVertical } from 'lucide-react';

interface SaguProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

type Operation = 'rot90' | 'rot180' | 'flipH' | 'flipV';

// Hardcoded transformation maps to ensure 100% accuracy without complex math.
const TRANSFORMS: Record<Operation, number[]> = {
  rot90:  [6, 3, 0, 7, 4, 1, 8, 5, 2],
  rot180: [8, 7, 6, 5, 4, 3, 2, 1, 0],
  flipH:  [2, 1, 0, 5, 4, 3, 8, 7, 6],
  flipV:  [6, 7, 8, 3, 4, 5, 0, 1, 2]
};

export const Sagu: React.FC<SaguProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [pattern, setPattern] = useState<boolean[]>([]);
  const [options, setOptions] = useState<boolean[][]>([]);
  const [correctGrid, setCorrectGrid] = useState<boolean[]>([]);
  const [operation, setOperation] = useState<Operation>('rot90');

  // New accurate transformation logic using maps
  const transformGrid = (grid: boolean[], op: Operation) => {
    const map = TRANSFORMS[op];
    const newGrid = new Array(9).fill(false);
    for(let i=0; i<9; i++) {
      newGrid[i] = grid[map[i]];
    }
    return newGrid;
  };

  const gridsAreEqual = (g1: boolean[], g2: boolean[]) => {
    return JSON.stringify(g1) === JSON.stringify(g2);
  };

  // Mutate a grid slightly to create a distractor
  const mutateGrid = (grid: boolean[]) => {
    const newGrid = [...grid];
    const filledIndices = newGrid.map((v, i) => v ? i : -1).filter(i => i !== -1);
    const emptyIndices = newGrid.map((v, i) => !v ? i : -1).filter(i => i !== -1);
    
    if (filledIndices.length > 0 && Math.random() < 0.5) {
      const idxToRemove = filledIndices[Math.floor(Math.random() * filledIndices.length)];
      newGrid[idxToRemove] = false;
    } else if (emptyIndices.length > 0) {
      const idxToAdd = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      newGrid[idxToAdd] = true;
    } else {
      newGrid[4] = !newGrid[4];
    }
    return newGrid;
  };

  const generateTrial = () => {
    const ops: Operation[] = ['rot90', 'rot180', 'flipH', 'flipV'];
    const selectedOp = ops[Math.floor(Math.random() * ops.length)];
    setOperation(selectedOp);

    let base: boolean[] = [];
    let correct: boolean[] = [];
    let retries = 0;
    
    do {
       base = new Array(9).fill(false);
       const numDots = Math.floor(Math.random() * 3) + 2; 
       const indices = Array.from({length: 9}, (_, i) => i).sort(() => Math.random() - 0.5);
       for(let i=0; i<numDots; i++) {
         base[indices[i]] = true;
       }
       correct = transformGrid(base, selectedOp);
       retries++;
    } while (gridsAreEqual(base, correct) && retries < 10);

    setCorrectGrid(correct);

    const opts: boolean[][] = [];
    opts.push(correct);

    let attempts = 0;
    while (opts.length < 3 && attempts < 100) {
      let candidate: boolean[];
      const r = Math.random();
      if (r < 0.4) {
         candidate = [...base];
      } else if (r < 0.7) {
         const wrongOp = ops.filter(o => o !== selectedOp)[Math.floor(Math.random() * 3)];
         candidate = transformGrid(base, wrongOp);
      } else {
         candidate = mutateGrid(correct);
      }

      const isUnique = !opts.some(existing => gridsAreEqual(existing, candidate));
      if (isUnique) {
        opts.push(candidate);
      }
      attempts++;
    }

    while(opts.length < 3) {
      let forced = mutateGrid(opts[opts.length-1]);
      if (gridsAreEqual(forced, correct)) forced[0] = !forced[0]; 
      opts.push(forced);
    }
    
    setPattern(base);
    setOptions(opts.sort(() => Math.random() - 0.5));
  };

  useEffect(() => {
    generateTrial();
  }, [gameState.level]);

  const handleOptionClick = (selectedGrid: boolean[]) => {
    if (gridsAreEqual(selectedGrid, correctGrid)) {
      setGameState(p => ({
        ...p, 
        score: p.score + 1, 
        trials: p.trials + 1,
        level: p.score > 0 && p.score % 5 === 0 ? Math.min(20, p.level + 1) : p.level
      }));
      generateTrial();
    } else {
      setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
    }
  };

  const finishSession = () => {
    onComplete({
      moduleId: ModuleID.SAGU,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  const RenderGrid = ({ grid, size = "sm" }: { grid: boolean[], size?: "sm"|"lg" }) => {
     const sizeClass = size === "lg" 
       ? "w-32 h-32 md:w-48 md:h-48" 
       : "w-20 h-20 md:w-32 md:h-32";
     
     return (
        <div className={`grid grid-cols-3 gap-1 ${sizeClass} bg-slate-200 p-2 border border-slate-300 shadow-inner`} dir="ltr">
          {grid.map((filled, i) => (
            <div key={i} className={`rounded-sm transition-colors duration-300 ${filled ? "bg-blue-600 shadow-sm" : "bg-white"}`}></div>
          ))}
        </div>
     );
  };

  const OperationIcon = () => {
     const opText = t.sagu_ops[operation];
     
     switch(operation) {
         case 'rot90': return (
             <div className="flex flex-col items-center gap-2 text-slate-600">
                <RotateCw size={40} className="md:w-12 md:h-12 text-blue-600"/>
                <span className="font-bold text-sm md:text-lg text-center">{opText}</span>
             </div>
         );
         case 'rot180': return (
             <div className="flex flex-col items-center gap-2 text-slate-600">
                <RefreshCw size={40} className="md:w-12 md:h-12 text-green-600"/>
                <span className="font-bold text-sm md:text-lg text-center">{opText}</span>
             </div>
         );
         case 'flipH': return (
             <div className="flex flex-col items-center gap-2 text-slate-600">
                <MoveHorizontal size={40} className="md:w-12 md:h-12 text-purple-600"/>
                <span className="font-bold text-sm md:text-lg text-center">{opText}</span>
             </div>
         );
         case 'flipV': return (
             <div className="flex flex-col items-center gap-2 text-slate-600">
                <MoveVertical size={40} className="md:w-12 md:h-12 text-orange-600"/>
                <span className="font-bold text-sm md:text-lg text-center">{opText}</span>
             </div>
         );
     }
  };

  return (
    <ModuleShell title={t.modInfo.SAGU.name} language={language} gameState={gameState} onPauseToggle={() => {}} onStop={finishSession}>
       <div className="flex flex-col h-full bg-slate-50 p-4 md:p-8 overflow-y-auto items-center">
         <div className="text-center text-base md:text-xl text-slate-700 font-bold mb-8">{t.game.sagu_instr}</div>
         
         <div className="w-full max-w-2xl flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
            {/* Source */}
            <div className="flex flex-col items-center gap-3">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === Language.EN ? 'Original' : (language === Language.AR ? 'الأصل' : 'تصویر اصلی')}</span>
               <RenderGrid grid={pattern} size="lg" />
            </div>

            {/* Operator */}
            <div className="bg-white px-8 py-4 rounded-2xl shadow-lg border border-slate-100 flex flex-col items-center justify-center min-w-[160px]">
                <OperationIcon />
            </div>
            
            {/* Target Placeholder (Visual Guide) */}
            <div className="hidden md:flex flex-col items-center gap-3 opacity-30">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === Language.EN ? 'Result' : (language === Language.AR ? 'النتيجة' : 'پاسخ')}</span>
               <div className="w-48 h-48 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                  <span className="text-4xl text-slate-300">?</span>
               </div>
            </div>
         </div>

         {/* Options */}
         <div className="grid grid-cols-3 gap-4 md:gap-12">
           {options.map((opt, i) => (
             <button 
               key={i} 
               onClick={() => handleOptionClick(opt)}
               className="group relative hover:-translate-y-2 transition-transform duration-300"
             >
               <div className="absolute inset-0 bg-blue-500 rounded-xl opacity-0 group-hover:opacity-10 blur-md transition-opacity"></div>
               <div className="relative bg-white p-2 rounded-xl shadow-md border-2 border-transparent group-hover:border-blue-400 overflow-hidden">
                  <RenderGrid grid={opt} size="sm" />
               </div>
             </button>
           ))}
         </div>
       </div>
    </ModuleShell>
  );
};