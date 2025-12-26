import React, { useState, useEffect, useRef } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { Crosshair } from 'lucide-react';

interface VistProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

const COLORS = [
  'bg-white shadow-[0_0_20px_white]', 
  'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]', 
  'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]', 
  'bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.6)]',
  'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]'
];

const SIZES = [
  'w-6 h-6',   // Small
  'w-10 h-10', // Medium
  'w-14 h-14'  // Large
];

export const Vist: React.FC<VistProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [stimulus, setStimulus] = useState<{x: number, y: number, colorClass: string, sizeClass: string} | null>(null);
  
  const scheduleStimulus = () => {
    if (!gameState.isPlaying) return;
    const delay = 1000 + Math.random() * 2000;
    
    setTimeout(() => {
      // Random position (percentage) with safe margins for mobile
      // Keep between 10% and 90% to avoid edge clipping
      let x, y;
      do {
        x = Math.random() * 80 + 10;
        y = Math.random() * 80 + 10;
      } while (x > 35 && x < 65 && y > 35 && y < 65); // Avoid center fixation area

      // Random attributes for variety
      const colorClass = COLORS[Math.floor(Math.random() * COLORS.length)];
      const sizeClass = SIZES[Math.floor(Math.random() * SIZES.length)];

      setStimulus({x, y, colorClass, sizeClass});

      // Disappear after 2.5s
      setTimeout(() => {
         setStimulus(null);
         scheduleStimulus();
      }, 2500);
    }, delay);
  };

  useEffect(() => {
    scheduleStimulus();
  }, []);

  const handleClick = (isStimulus: boolean) => {
    if (isStimulus) {
      setGameState(p => ({...p, score: p.score + 1, trials: p.trials + 1}));
      setStimulus(null);
    } else {
      // Clicked empty space
      setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
    }
  };

  const finishSession = () => {
     onComplete({
      moduleId: ModuleID.VIST,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  return (
    <ModuleShell title={t.modInfo.VIST.name} language={language} gameState={gameState} onPauseToggle={() => {}} onStop={finishSession}>
      <div 
        className="w-full h-full bg-slate-950 relative cursor-crosshair overflow-hidden touch-none"
        onClick={(e) => {
           if (e.target === e.currentTarget) handleClick(false);
        }}
      >
        <div className="absolute top-4 left-0 w-full text-center text-slate-500 text-sm select-none pointer-events-none z-10 px-4">
          {t.game.vist_instr}
        </div>

        {/* Fixation Point */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-700 pointer-events-none">
           <Crosshair size={32} strokeWidth={1} />
        </div>

        {stimulus && (
          <div 
            className={`absolute rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-transform ${stimulus.colorClass} ${stimulus.sizeClass}`}
            style={{ 
              left: `${stimulus.x}%`, 
              top: `${stimulus.y}%`,
              transform: 'translate(-50%, -50%)' // Centers the element on the coordinate
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleClick(true);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleClick(true);
            }}
          />
        )}
      </div>
    </ModuleShell>
  );
};