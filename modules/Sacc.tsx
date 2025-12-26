import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { Circle, Square, Triangle, Star, Hexagon, Diamond, Heart, Cloud, Moon, Sun } from 'lucide-react';

interface SaccProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
  userId: string;
}

const SHAPES = [Circle, Square, Triangle, Star, Hexagon, Diamond, Heart, Cloud, Moon, Sun];
const COLORS = [
  'text-red-600', 'text-blue-600', 'text-green-600', 
  'text-yellow-500', 'text-purple-600', 'text-orange-600', 
  'text-teal-600', 'text-pink-600'
];

interface Item {
  id: number;
  Shape: React.ElementType;
  color: string;
  isTarget: boolean;
}

export const Sacc: React.FC<SaccProps> = ({ language, onComplete }) => {
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
  const [targetItem, setTargetItem] = useState<Item | null>(null);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const startTimeRef = useRef<number>(0);

  // Difficulty parameters based on level (1-30)
  const getParams = (level: number) => {
    // Grid size increases every 5 levels
    const gridSize = Math.min(3 + Math.floor((level - 1) / 5), 8); 
    const numItems = gridSize * gridSize;
    // Number of shape/color variants available increases with level
    const complexity = Math.min(3 + Math.floor(level / 2), SHAPES.length); 
    return { gridSize, numItems, complexity };
  };

  const generateTrial = useCallback(() => {
    if (!gameState.isPlaying) return;

    const { numItems, complexity } = getParams(gameState.level);
    const availableShapes = SHAPES.slice(0, complexity);
    const availableColors = COLORS.slice(0, complexity);
    
    // Pick target properties
    const targetShapeIdx = Math.floor(Math.random() * availableShapes.length);
    const targetColorIdx = Math.floor(Math.random() * availableColors.length);

    const newItems: Item[] = [];
    
    // Create target
    const target: Item = {
      id: 0,
      Shape: availableShapes[targetShapeIdx],
      color: availableColors[targetColorIdx],
      isTarget: true
    };
    
    // Store target separately for the hint display
    setTargetItem(target);

    // Place target in the grid
    newItems.push(target);

    // Create distractors
    for (let i = 1; i < numItems; i++) {
      let shapeIdx = Math.floor(Math.random() * availableShapes.length);
      let colorIdx = Math.floor(Math.random() * availableColors.length);
      
      // Ensure distractor is not identical to target
      while (shapeIdx === targetShapeIdx && colorIdx === targetColorIdx) {
        shapeIdx = Math.floor(Math.random() * availableShapes.length);
        colorIdx = Math.floor(Math.random() * availableColors.length);
      }

      newItems.push({
        id: i,
        Shape: availableShapes[shapeIdx],
        color: availableColors[colorIdx],
        isTarget: false
      });
    }

    // Shuffle
    setItems(newItems.sort(() => Math.random() - 0.5));
    startTimeRef.current = Date.now();
  }, [gameState.level, gameState.isPlaying]);

  useEffect(() => {
    generateTrial();
  }, [generateTrial]);

  const handleItemClick = (item: Item) => {
    if (gameState.isPaused) return;

    const rt = Date.now() - startTimeRef.current;
    
    if (item.isTarget) {
      setReactionTimes(prev => [...prev, rt]);
      
      // Adaptive Logic
      let newLevel = gameState.level;
      // Increase level every 3 correct answers without much error
      if ((gameState.score + 1) % 3 === 0) {
        newLevel = Math.min(30, newLevel + 1);
      }

      setGameState(prev => ({
        ...prev,
        score: prev.score + 1,
        trials: prev.trials + 1,
        level: newLevel
      }));

      generateTrial();

    } else {
      // Error
      setGameState(prev => ({
        ...prev,
        errors: prev.errors + 1,
        trials: prev.trials + 1,
        // Decrease level if errors accumulate
        level: prev.errors > 0 && prev.errors % 3 === 0 ? Math.max(1, prev.level - 1) : prev.level
      }));
    }
  };

  const finishSession = () => {
    const avgRt = reactionTimes.length > 0 
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length 
      : 0;

    onComplete({
      moduleId: ModuleID.SACC,
      durationSeconds: 0, // Calculated by parent
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: avgRt
    });
  };

  const { gridSize } = getParams(gameState.level);

  return (
    <ModuleShell 
      title={t.modInfo.SACC.name} 
      language={language}
      gameState={gameState}
      onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))}
      onStop={finishSession}
    >
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-2 md:p-4 overflow-y-auto">
        {/* Instruction / Target Display */}
        <div className="mb-4 md:mb-8 flex items-center gap-4 bg-white px-4 md:px-8 py-2 md:py-4 rounded-full shadow-md border border-slate-200 shrink-0">
          <span className="text-sm md:text-lg text-slate-600 font-medium">{t.game.sacc_instr}</span>
          {targetItem && (
            <div className={`transform scale-100 md:scale-150 ${targetItem.color}`}>
               <targetItem.Shape className="w-6 h-6 md:w-8 md:h-8 opacity-20" fill="currentColor" />
               <targetItem.Shape className="w-6 h-6 md:w-8 md:h-8 absolute inset-0" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Grid */}
        <div 
          className="grid gap-2 md:gap-4 bg-white p-4 md:p-8 rounded-xl shadow-inner border border-slate-200 max-w-full"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` 
          }}
        >
          {items.map((item) => (
            <button
              key={`${item.id}-${gameState.trials}`} // Force re-render on new trial
              onClick={() => handleItemClick(item)}
              className={`
                p-1 md:p-4 rounded-lg hover:bg-slate-50 transition-all duration-200 active:scale-95 flex items-center justify-center
                ${item.color} aspect-square
              `}
            >
              <div className="relative">
                <item.Shape className="w-8 h-8 md:w-12 md:h-12 opacity-20" fill="currentColor" />
                <item.Shape className="w-8 h-8 md:w-12 md:h-12 absolute inset-0" strokeWidth={2.5} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </ModuleShell>
  );
};