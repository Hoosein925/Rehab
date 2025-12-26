import React, { useState, useEffect } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { 
  MapPin, Home, Flag, TreePine, Car, 
  Book, Coffee, Pen, Scissors, Paperclip,
  Utensils, CupSoda, Sandwich, Apple, Pizza
} from 'lucide-react';

interface TopoProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

const THEMES = [
  { 
    id: 'map', 
    name: 'Map', 
    icons: [MapPin, Home, Flag, TreePine, Car],
    bg: 'bg-emerald-50',
    cellBg: 'bg-emerald-200'
  },
  { 
    id: 'desk', 
    name: 'Office', 
    icons: [Book, Coffee, Pen, Scissors, Paperclip],
    bg: 'bg-slate-50',
    cellBg: 'bg-slate-200'
  },
  { 
    id: 'kitchen', 
    name: 'Kitchen', 
    icons: [Utensils, CupSoda, Sandwich, Apple, Pizza],
    bg: 'bg-orange-50',
    cellBg: 'bg-orange-200'
  }
];

export const Topo: React.FC<TopoProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [phase, setPhase] = useState<'memorize' | 'recall' | 'feedback'>('memorize');
  const [items, setItems] = useState<{id: number, icon: number, r: number, c: number}[]>([]);
  const [targetItem, setTargetItem] = useState<number | null>(null);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);

  const gridSize = 4;

  const startTrial = () => {
    setPhase('memorize');
    
    // Switch theme every 3 trials
    const themeIdx = Math.floor(gameState.trials / 3) % THEMES.length;
    setCurrentTheme(THEMES[themeIdx]);

    const count = Math.min(2 + Math.floor(gameState.level / 2), 5);
    const newItems = [];
    const usedPos = new Set();

    for(let i=0; i<count; i++) {
       let r, c, posKey;
       do {
         r = Math.floor(Math.random() * gridSize);
         c = Math.floor(Math.random() * gridSize);
         posKey = `${r}-${c}`;
       } while(usedPos.has(posKey));
       usedPos.add(posKey);
       newItems.push({ id: i, icon: i % currentTheme.icons.length, r, c });
    }
    setItems(newItems);

    // Memorize time
    setTimeout(() => {
      setPhase('recall');
      // Pick one to ask about
      setTargetItem(Math.floor(Math.random() * newItems.length));
    }, 2000 + (gameState.level * 500));
  };

  useEffect(() => {
    startTrial();
  }, []);

  const handleCellClick = (r: number, c: number) => {
    if (phase !== 'recall' || targetItem === null) return;
    
    const target = items[targetItem];
    if (target.r === r && target.c === c) {
      // Infinite progression: Remove cap on level
      setGameState(p => ({...p, score: p.score + 1, trials: p.trials + 1, level: p.level + 1}));
      setPhase('memorize');
      setTimeout(startTrial, 1000);
    } else {
      setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
      alert(t.incorrect);
      setTimeout(startTrial, 500);
    }
  };

  const finishSession = () => {
    onComplete({
      moduleId: ModuleID.TOPO,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  const TargetIcon = targetItem !== null && items[targetItem] ? currentTheme.icons[items[targetItem].icon] : null;

  return (
    <ModuleShell title={t.modInfo.TOPO.name} language={language} gameState={gameState} onPauseToggle={() => {}} onStop={finishSession}>
       <div className={`h-full flex flex-col items-center justify-center p-4 md:p-8 gap-4 md:gap-8 overflow-y-auto ${currentTheme.bg}`}>
         
         <div className="h-12 md:h-16 text-lg md:text-xl text-stone-600 font-bold flex items-center justify-center">
            {phase === 'memorize' && t.game.topo_mem}
            {phase === 'recall' && TargetIcon && (
              <div className="flex items-center gap-2 animate-bounce">
                {t.game.topo_where} <TargetIcon className="text-blue-600 w-6 h-6 md:w-8 md:h-8" />
              </div>
            )}
         </div>

         <div className="grid grid-cols-4 gap-1.5 md:gap-2 bg-white/50 p-2 md:p-4 rounded-xl shadow-lg border border-white/60">
            {Array.from({length: gridSize * gridSize}).map((_, i) => {
               const r = Math.floor(i / gridSize);
               const c = i % gridSize;
               const item = items.find(it => it.r === r && it.c === c);
               const Icon = item ? currentTheme.icons[item.icon] : null;

               return (
                 <div 
                   key={i} 
                   onClick={() => handleCellClick(r, c)}
                   className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg shadow-sm cursor-pointer flex items-center justify-center transition-all hover:brightness-105
                     ${currentTheme.cellBg}
                   `}
                 >
                    {phase === 'memorize' && Icon && <Icon className="text-slate-800 w-8 h-8 md:w-10 md:h-10"/>}
                    {phase === 'recall' && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-black/10"></div>}
                 </div>
               );
            })}
         </div>
       </div>
    </ModuleShell>
  );
};