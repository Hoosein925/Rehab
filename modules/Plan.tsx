
import React, { useState, useEffect, useRef } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';

interface PlanProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

interface Node {
  id: number;
  label: string; // "1", "2" or "A", "B"
  x: number;
  y: number;
  order: number;
  completed: boolean;
}

export const Plan: React.FC<PlanProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [nodes, setNodes] = useState<Node[]>([]);
  const [nextOrder, setNextOrder] = useState(1);
  const [mode, setMode] = useState<'num' | 'mix'>('num');
  const isMounted = useRef(true);

  const getLabel = (idx: number, isMix: boolean) => {
    if (!isMix) return (idx + 1).toString();
    if (idx % 2 === 0) {
      return (Math.floor(idx / 2) + 1).toString();
    } else {
      const charCode = Math.floor(idx / 2);
      return String.fromCharCode(65 + charCode); // A, B, C...
    }
  };

  const startLevel = () => {
    if (!isMounted.current) return;
    const isMix = gameState.level >= 5;
    setMode(isMix ? 'mix' : 'num');

    const count = Math.min(4 + gameState.level, 12);
    const newNodes: Node[] = [];
    
    for(let i=0; i<count; i++) {
      let x, y, valid;
      let attempts = 0;
      do {
        x = Math.random() * 80 + 10;
        // Safety margin at top (35%) to prevent overlap with instruction header
        y = Math.random() * 55 + 35; 
        valid = true;

        for (const n of newNodes) {
          const dx = n.x - x;
          const dy = n.y - y;
          if (Math.sqrt(dx*dx + dy*dy) < 15) { 
             valid = false;
             break;
          }
        }
        attempts++;
      } while (!valid && attempts < 200);

      newNodes.push({
        id: i,
        label: getLabel(i, isMix),
        x,
        y,
        order: i + 1,
        completed: false
      });
    }
    setNodes(newNodes);
    setNextOrder(1);
  };

  useEffect(() => {
    isMounted.current = true;
    startLevel();
    return () => { isMounted.current = false; };
  }, [gameState.level]);

  const handleNodeClick = (node: Node) => {
    if (gameState.isPaused || !isMounted.current) return;

    if (node.order === nextOrder) {
      const updated = nodes.map(n => n.id === node.id ? {...n, completed: true} : n);
      setNodes(updated);
      setNextOrder(v => v + 1);

      if (nextOrder === nodes.length) {
        setGameState(p => ({...p, score: p.score + 1, trials: p.trials + 1, level: p.level + 1}));
      }
    } else {
      setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
    }
  };

  const finishSession = () => {
     onComplete({
      moduleId: ModuleID.PLAN,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  return (
    <ModuleShell title={t.modInfo.PLAN.name} language={language} gameState={gameState} onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))} onStop={finishSession}>
       <div className="w-full h-full relative bg-slate-50 overflow-hidden">
          {/* Header forced to LTR and fixed width for clinical accuracy */}
          <div className="absolute top-0 left-0 right-0 p-3 md:p-5 bg-white/90 backdrop-blur-md border-b border-slate-200 z-40 text-center shadow-sm">
             <div className="text-[10px] md:text-xs uppercase tracking-widest text-slate-400 mb-1 font-bold">{t.game.plan_instr}</div>
             <div className="text-lg md:text-2xl text-blue-600 font-black" dir="ltr">
               {mode === 'num' ? "1 → 2 → 3" : "1 → A → 2 → B"}
             </div>
          </div>
          
          {nodes.map(node => (
            <button
              key={node.id}
              disabled={node.completed}
              onClick={() => handleNodeClick(node)}
              className={`absolute w-14 h-14 md:w-20 md:h-20 rounded-full border-2 font-bold shadow-lg transition-all flex items-center justify-center text-xl md:text-2xl
                ${node.completed 
                   ? 'bg-emerald-50 border-emerald-300 text-emerald-600 opacity-40 scale-90' 
                   : 'bg-white border-blue-500 text-blue-700 hover:scale-110 active:scale-95 z-20 hover:z-30'
                }
              `}
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {node.label}
            </button>
          ))}
       </div>
    </ModuleShell>
  );
};
