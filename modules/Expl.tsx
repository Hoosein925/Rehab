import React, { useState, useEffect } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { 
  Triangle, Circle, Square, Star, Hexagon, Diamond, Heart, Cloud, Moon, Sun, 
  Droplet, Zap, Shield, Crown, Flower
} from 'lucide-react';

interface ExplProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

// Increased variety of shapes
const SHAPES = [
  Triangle, Circle, Square, Star, Hexagon, Diamond, Heart, Cloud, Moon, Sun,
  Droplet, Zap, Shield, Crown, Flower
];

const COLORS = [
  { name: 'Red', class: 'text-red-500 fill-current' },
  { name: 'Blue', class: 'text-blue-500 fill-current' },
  { name: 'Green', class: 'text-green-600 fill-current' },
  { name: 'Yellow', class: 'text-yellow-400 fill-current' },
  { name: 'Purple', class: 'text-purple-500 fill-current' },
  { name: 'Orange', class: 'text-orange-500 fill-current' },
  { name: 'Pink', class: 'text-pink-500 fill-current' },
  { name: 'Teal', class: 'text-teal-500 fill-current' },
];

interface Item {
  id: number;
  shapeIdx: number;
  colorIdx: number;
  isTarget: boolean;
  found: boolean;
}

export const Expl: React.FC<ExplProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [items, setItems] = useState<Item[]>([]);
  const [targetConfig, setTargetConfig] = useState<{shapeIdx: number, colorIdx: number} | null>(null);
  
  const generateLevel = () => {
    const gridSize = Math.min(5 + Math.floor(gameState.level/2), 10);
    const totalItems = gridSize * gridSize;
    const targetCount = Math.max(3, Math.floor(totalItems * 0.2)); // At least 3 targets, approx 20%
    
    // 1. Pick a random Target Configuration for this level
    const tShapeIdx = Math.floor(Math.random() * SHAPES.length);
    const tColorIdx = Math.floor(Math.random() * COLORS.length);
    setTargetConfig({ shapeIdx: tShapeIdx, colorIdx: tColorIdx });

    const newItems: Item[] = [];
    
    // 2. Generate Targets
    for(let i=0; i<targetCount; i++) {
      newItems.push({
        id: i,
        shapeIdx: tShapeIdx,
        colorIdx: tColorIdx,
        isTarget: true,
        found: false
      });
    }

    // 3. Generate Distractors
    // Distractors must NOT match the target (cannot have BOTH same shape and same color)
    for(let i=targetCount; i<totalItems; i++) {
      let dShapeIdx, dColorIdx;
      
      // Keep generating until it's distinct from target
      do {
        dShapeIdx = Math.floor(Math.random() * SHAPES.length);
        dColorIdx = Math.floor(Math.random() * COLORS.length);
      } while (dShapeIdx === tShapeIdx && dColorIdx === tColorIdx);

      newItems.push({
        id: i,
        shapeIdx: dShapeIdx,
        colorIdx: dColorIdx,
        isTarget: false,
        found: false
      });
    }
    
    setItems(newItems.sort(() => Math.random() - 0.5));
  };

  useEffect(() => {
    generateLevel();
  }, [gameState.level]);

  const handleItemClick = (idx: number) => {
    const item = items[idx];
    if (item.found) return; // Prevent double clicking

    if (item.isTarget) {
      // Correct Click
      const newItems = [...items];
      newItems[idx].found = true;
      setItems(newItems);
      
      // Check if all targets found
      const remaining = newItems.filter(i => i.isTarget && !i.found).length;
      if (remaining === 0) {
         setGameState(p => ({
           ...p, 
           score: p.score + 1, 
           trials: p.trials + 1, 
           level: p.level < 20 ? p.level + 1 : 20
         }));
         setTimeout(generateLevel, 500);
      }
    } else {
      // Wrong Click
      setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
    }
  };

  const finishSession = () => {
    onComplete({
      moduleId: ModuleID.EXPL,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  // Determine grid columns responsive
  const gridSize = Math.sqrt(items.length);
  const TargetShape = targetConfig ? SHAPES[targetConfig.shapeIdx] : Triangle;
  const targetColorClass = targetConfig ? COLORS[targetConfig.colorIdx].class : 'text-slate-400';

  return (
    <ModuleShell title={t.modInfo.EXPL.name} language={language} gameState={gameState} onPauseToggle={() => {}} onStop={finishSession}>
      <div className="flex flex-col items-center justify-center h-full p-4 bg-slate-50 overflow-y-auto">
        
        {/* Instruction Header */}
        <div className="mb-6 bg-white px-8 py-3 rounded-2xl border border-slate-200 shadow-lg flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
           <span className="font-bold text-slate-700">{t.game.expl_instr}</span>
           <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
             <TargetShape size={32} className={targetColorClass} />
           </div>
        </div>
        
        {/* Game Grid */}
        <div 
           className="grid gap-2 md:gap-3 bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-slate-200 max-w-full md:max-w-2xl"
           style={{ 
             gridTemplateColumns: `repeat(${Math.ceil(gridSize)}, minmax(0, 1fr))` 
           }}
        >
          {items.map((item, i) => {
            const Shape = SHAPES[item.shapeIdx];
            const colorClass = COLORS[item.colorIdx].class;
            
            return (
              <button
                key={i}
                onClick={() => handleItemClick(i)}
                className={`
                  aspect-square rounded-xl flex items-center justify-center transition-all duration-300
                  ${item.found 
                    ? 'opacity-20 bg-emerald-100 scale-90' 
                    : 'bg-slate-50 hover:bg-slate-100 hover:scale-105 hover:shadow-md border border-transparent hover:border-slate-200'
                  }
                `}
              >
                 <Shape 
                   size={gridSize > 7 ? 20 : 32} // Smaller icons for larger grids
                   className={colorClass}
                 />
              </button>
            )
          })}
        </div>
      </div>
    </ModuleShell>
  );
};