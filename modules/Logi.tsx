import React, { useState, useEffect } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { ArrowRight, Circle, Square, Triangle, Hexagon, ArrowLeft } from 'lucide-react';

interface LogiProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

export const Logi: React.FC<LogiProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [sequence, setSequence] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [correctOption, setCorrectOption] = useState<any>(null);

  const generateProblem = () => {
    // Determine type: Number (0) or Shape (1)
    const type = Math.random() < 0.5 ? 0 : 1;

    if (type === 0) {
      // --- NUMBER SEQUENCES ---
      const patterns = [
        // 1. Linear: x, x+a, x+2a...
        () => {
           const start = Math.floor(Math.random() * 10) + 1;
           const step = Math.floor(Math.random() * 5) + 2; 
           const seq = [start, start + step, start + step * 2, start + step * 3];
           return { seq, ans: start + step * 4 };
        },
        // 2. Geometric: x, x*2, x*4...
        () => {
           const start = Math.floor(Math.random() * 3) + 2;
           const seq = [start, start * 2, start * 4, start * 8];
           return { seq, ans: start * 16 };
        },
        // 3. Alternating: +a, -b
        () => {
           const start = 20;
           const plus = Math.floor(Math.random() * 3) + 3; // 3-5
           const minus = 2;
           // 20, 24, 22, 26, 24
           const n0 = start;
           const n1 = n0 + plus;
           const n2 = n1 - minus;
           const n3 = n2 + plus;
           const n4 = n3 - minus;
           return { seq: [n0, n1, n2, n3], ans: n4 };
        }
      ];

      const p = patterns[Math.floor(Math.random() * patterns.length)]();
      setSequence(p.seq);
      setCorrectOption(p.ans);
      
      // Strict Distractor Generation
      const opts = new Set([p.ans]);
      while(opts.size < 4) {
         const offset = Math.floor(Math.random() * 10) - 5; // -5 to +5
         const val = p.ans + offset;
         if (val !== p.ans && val > 0) opts.add(val);
      }
      setOptions(Array.from(opts).sort(() => Math.random() - 0.5));

    } else {
      // --- SHAPE PATTERNS ---
      const S = [Circle, Square, Triangle, Hexagon];
      // Pick 3 distinct shapes
      const pool = [...S].sort(() => Math.random() - 0.5);
      const A = pool[0];
      const B = pool[1];
      const C = pool[2];

      const patterns = [
         // A B A B -> ? (A)
         { seq: [A, B, A, B], ans: A },
         // A B C A -> ? (B)
         { seq: [A, B, C, A], ans: B },
         // A A B B -> ? (C is unlikely, usually A A B B C C) -> let's do A B B C C -> ? (D? no hard)
         // Rotate: A B C -> B C A
         { seq: [A, B, C, B], ans: C }, // Palindrome-ish? No confusing.
         // Simple Cycle: A B C A B -> ? (C)
         { seq: [A, B, C, A], ans: B }
      ];

      // Let's stick to very clear Rotation logic
      // Sequence: 3 items displayed. 4th is target.
      // Logic: A -> B -> C -> A
      const seq = [A, B, C, A];
      const ans = B;

      setSequence(seq);
      setCorrectOption(ans);
      
      // Options are just the unique shapes involved
      setOptions([A, B, C, pool[3]].sort(() => Math.random() - 0.5));
    }
  };

  useEffect(() => {
    generateProblem();
  }, [gameState.level]);

  const handleOptionClick = (opt: any) => {
    if (opt === correctOption) {
      setGameState(prev => ({
        ...prev,
        score: prev.score + 1,
        trials: prev.trials + 1,
        // Infinite levels
        level: (prev.score > 0 && prev.score % 5 === 0) ? prev.level + 1 : prev.level
      }));
      generateProblem();
    } else {
       setGameState(prev => ({
        ...prev,
        errors: prev.errors + 1,
        trials: prev.trials + 1
      }));
    }
  };

  const finishSession = () => {
    onComplete({
      moduleId: ModuleID.LOGI,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  const isShape = (item: any) => typeof item !== 'number';
  const Arrow = language === Language.FA ? ArrowLeft : ArrowRight;

  return (
    <ModuleShell 
      title={t.modInfo.LOGI.name} 
      language={language}
      gameState={gameState}
      onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))}
      onStop={finishSession}
    >
      <div className="flex flex-col items-center justify-center h-full gap-8 md:gap-12 bg-white p-4 md:p-8 overflow-y-auto">
        <h2 className="text-lg md:text-2xl text-slate-600 text-center">{t.game.logi_instr}</h2>
        
        {/* Sequence Display */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 items-center" dir="ltr">
          {sequence.map((Item, i) => (
            <div key={i} className="w-14 h-14 md:w-20 md:h-20 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-300 shadow-sm">
               {isShape(Item) ? <Item className="w-8 h-8 md:w-10 md:h-10 text-slate-700"/> : <span className="text-xl md:text-3xl font-bold text-slate-700">{Item}</span>}
            </div>
          ))}
          <ArrowRight className="text-slate-400 w-6 h-6 md:w-8 md:h-8" />
          <div className="w-14 h-14 md:w-20 md:h-20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center bg-blue-50">
            <span className="text-xl md:text-3xl font-bold text-blue-300">?</span>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-4 md:mt-8" dir="ltr">
           {options.map((Opt, i) => (
             <button 
               key={i}
               onClick={() => handleOptionClick(Opt)}
               className="w-20 h-20 md:w-24 md:h-24 bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex items-center justify-center active:scale-95"
             >
                {isShape(Opt) ? <Opt className="w-8 h-8 md:w-10 md:h-10 text-slate-700"/> : <span className="text-xl md:text-3xl font-bold text-slate-700">{Opt}</span>}
             </button>
           ))}
         </div>
      </div>
    </ModuleShell>
  );
};