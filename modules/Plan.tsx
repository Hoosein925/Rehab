import React, { useState, useEffect } from 'react';
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

  const getLabel = (idx: number, isMix: boolean, lang: Language) => {
    // idx starts at 0
    if (!isMix) return (idx + 1).toString();

    // Mix: 1, A, 2, B...
    // Even idx (0, 2...) -> Numbers (1, 2...)
    // Odd idx (1, 3...) -> Letters (A, B...)
    if (idx % 2 === 0) {
      return (Math.floor(idx / 2) + 1).toString();
    } else {
      const charCode = Math.floor(idx / 2);
      if (lang === Language.FA || lang === Language.AR) {
        const arabicAlpha = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د'];
        return arabicAlpha[charCode] || '?';
      }
      return String.fromCharCode(65 + charCode); // A, B, C...
    }
  };

  const startLevel = () => {
    // Mode switch: Level 5+ introduces Mix mode
    const isMix = gameState.level >= 5;
    setMode(isMix ? 'mix' : 'num');

    const count = Math.min(4 + gameState.level, 12);
    const newNodes: Node[] = [];
    
    // Collision detection
    for(let i=0; i<count; i++) {
      let x, y, valid;
      let attempts = 0;
      do {
        x = Math.random() * 80 + 10;
        y = Math.random() * 80 + 10;
        valid = true;
        for (const n of newNodes) {
          const dx = n.x - x;
          const dy = n.y - y;
          if (Math.sqrt(dx*dx + dy*dy) < 12) { // Minimum distance
             valid = false;
             break;
          }
        }
        attempts++;
      } while (!valid && attempts < 100);

      newNodes.push({
        id: i,
        label: getLabel(i, isMix, language),
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
    startLevel();
  }, [gameState.level]);

  const handleNodeClick = (node: Node) => {
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
    <ModuleShell title={t.modInfo.PLAN.name} language={language} gameState={gameState} onPauseToggle={() => {}} onStop={finishSession}>
       <div className="w-full h-full relative bg-slate-50">
          <div className="absolute top-4 left-4 text-slate-500 font-bold bg-white/80 p-2 rounded shadow backdrop-blur-sm z-10">
             <div className="text-sm">{t.game.plan_instr}</div>
             <div className="text-lg text-blue-600">
               {mode === 'num' ? t.game.plan_mode_num : t.game.plan_mode_mix}
             </div>
          </div>
          
          {nodes.map(node => (
            <button
              key={node.id}
              disabled={node.completed}
              onClick={() => handleNodeClick(node)}
              className={`absolute w-12 h-12 md:w-16 md:h-16 rounded-full border-2 font-bold shadow-md transition-all flex items-center justify-center text-lg md:text-xl
                ${node.completed 
                   ? 'bg-green-100 border-green-300 text-green-700 opacity-50' 
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