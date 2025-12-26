import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { Crosshair } from 'lucide-react';

interface VistProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

interface Stimulus {
  id: number;
  x: number;
  y: number;
  size: number;
  startTime: number;
}

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

  const [stimulus, setStimulus] = useState<Stimulus | null>(null);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  
  const isMounted = useRef(true);
  const timerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
  };

  const scheduleStimulus = useCallback(() => {
    if (!isMounted.current || !gameState.isPlaying || gameState.isPaused) return;

    // Standard RehaCom inter-stimulus interval: 1-3 seconds
    const delay = 1000 + Math.random() * 2000;
    
    timerRef.current = window.setTimeout(() => {
      if (!isMounted.current) return;

      // Ensure dots appear across the field but avoid the very edges and the exact center
      let x, y;
      do {
        x = 10 + Math.random() * 80;
        y = 10 + Math.random() * 80;
      } while (x > 40 && x < 60 && y > 40 && y < 60);

      // Level 1-20 affects stimulus size (smaller is harder)
      const size = Math.max(12, 40 - (gameState.level * 1.5));

      setStimulus({
        id: Date.now(),
        x,
        y,
        size,
        startTime: Date.now()
      });

      // Stimulus visibility duration: decreases with level (adaptive)
      const duration = Math.max(800, 2500 - (gameState.level * 80));
      
      timerRef.current = window.setTimeout(() => {
        if (!isMounted.current) return;
        setStimulus(curr => {
          if (curr) {
            // If stimulus disappears without being clicked, it's a miss/error
            setGameState(p => ({ ...p, errors: p.errors + 1, trials: p.trials + 1 }));
          }
          return null;
        });
        scheduleStimulus();
      }, duration);

    }, delay);
  }, [gameState.level, gameState.isPlaying, gameState.isPaused]);

  useEffect(() => {
    isMounted.current = true;
    scheduleStimulus();
    return () => {
      isMounted.current = false;
      clearTimers();
    };
  }, [scheduleStimulus]);

  // Unified click handler to prevent double scoring
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent, hit: boolean) => {
    e.preventDefault();
    e.stopPropagation(); // CRITICAL: Stop bubbling to prevent parent container from firing

    if (gameState.isPaused || !isMounted.current) return;

    if (hit && stimulus) {
      const rt = Date.now() - stimulus.startTime;
      setReactionTimes(prev => [...prev, rt]);
      
      setGameState(p => ({
        ...p,
        score: p.score + 1,
        trials: p.trials + 1,
        // Advance level every 5 correct hits
        level: p.score > 0 && (p.score + 1) % 5 === 0 ? Math.min(20, p.level + 1) : p.level
      }));
      
      clearTimers();
      setStimulus(null);
      scheduleStimulus();
    } else if (!hit) {
      // Background click = Error
      setGameState(p => ({ ...p, errors: p.errors + 1, trials: p.trials + 1 }));
    }
  };

  const finishSession = () => {
    isMounted.current = false;
    clearTimers();
    
    const avgRt = reactionTimes.length > 0 
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length 
      : 0;

    onComplete({
      moduleId: ModuleID.VIST,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: avgRt
    });
  };

  return (
    <ModuleShell 
      title={t.modInfo.VIST.name} 
      language={language} 
      gameState={gameState} 
      onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))} 
      onStop={finishSession}
    >
      <div 
        className="w-full h-full bg-black relative cursor-crosshair overflow-hidden touch-none"
        onClick={(e) => handleInteraction(e, false)}
      >
        {/* Instruction overlay - fades out shortly after start */}
        <div className="absolute top-4 left-0 w-full text-center text-slate-500 text-xs md:text-sm select-none pointer-events-none z-10 px-4 animate-out fade-out fill-mode-forwards delay-3000 duration-1000">
          {t.game.vist_instr}
        </div>

        {/* Clinical Fixation Cross */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-600 pointer-events-none opacity-40">
           <Crosshair size={40} strokeWidth={1.5} />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-red-900 rounded-full"></div>
        </div>

        {stimulus && (
          <button 
            className="absolute rounded-full bg-white shadow-[0_0_15px_white] active:scale-125 transition-transform duration-75"
            style={{ 
              left: `${stimulus.x}%`, 
              top: `${stimulus.y}%`,
              width: `${stimulus.size}px`,
              height: `${stimulus.size}px`,
              transform: 'translate(-50%, -50%)'
            }}
            onClick={(e) => handleInteraction(e, true)}
          />
        )}
      </div>
    </ModuleShell>
  );
};