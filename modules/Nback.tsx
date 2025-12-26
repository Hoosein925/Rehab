
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { Button } from '../components/Button';
import { translations } from '../services/localization';
import { 
  Apple, Banana, Cherry, Grape, Citrus, Croissant, Carrot, Pizza,
  Anchor, Bike, Bug, Cloud, Flower, Hammer, Heart, Key, Moon, Music, 
  Star, Sun, Snowflake, Zap, Umbrella, Plane
} from 'lucide-react';

interface NbackProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

// Expanded Icon Set for more variety
const ICONS = [
  Apple, Banana, Cherry, Grape, Citrus, Croissant, Carrot, Pizza,
  Anchor, Bike, Bug, Cloud, Flower, Hammer, Heart, Key, Moon, Music, 
  Star, Sun, Snowflake, Zap, Umbrella, Plane
];

export const Nback: React.FC<NbackProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1, // Represents 'N'
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [currentIconIdx, setCurrentIconIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'missed' | 'wrong'>('none');
  const [userResponded, setUserResponded] = useState(false);
  const [trialDuration, setTrialDuration] = useState(3000);
  
  // Refs for logic accuracy & Timer Management
  // Fixed: Added initial value undefined to useRef to comply with Expected 1 arguments
  const displayTimerRef = useRef<number>(undefined);
  const blankTimerRef = useRef<number>(undefined);
  
  const historyRef = useRef<number[]>([]);
  const isCurrentTargetRef = useRef(false);
  const userRespondedRef = useRef(false);
  
  // Track loop status to prevent double-starts
  const isLoopRunningRef = useRef(false);

  const clearTimers = () => {
    if (displayTimerRef.current) {
      window.clearTimeout(displayTimerRef.current);
      displayTimerRef.current = undefined;
    }
    if (blankTimerRef.current) {
      window.clearTimeout(blankTimerRef.current);
      blankTimerRef.current = undefined;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Determine N based on level. 
  const getN = (lvl: number) => {
    if (lvl <= 5) return 1;
    if (lvl <= 10) return 2;
    return 3;
  };

  // --- Core Game Loop ---

  const startBlankPhase = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;

    // Check Omission from the phase that just ended (Display Phase)
    // Note: We check if it WAS a target, and user did NOT respond.
    if (isCurrentTargetRef.current && !userRespondedRef.current && historyRef.current.length > 0) {
      setFeedback('missed');
      setGameState(prev => ({ ...prev, errors: prev.errors + 1, trials: prev.trials + 1 }));
    } else {
      setFeedback('none');
    }

    // Reset UI for blank
    setCurrentIconIdx(null);
    isCurrentTargetRef.current = false;
    setUserResponded(false);
    userRespondedRef.current = false;

    // Schedule Next Display
    clearTimers();
    blankTimerRef.current = window.setTimeout(() => {
        prepareAndShowNext();
    }, 500); // Increased to 500ms for better separation
  }, [gameState.isPlaying, gameState.isPaused]);


  const prepareAndShowNext = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const h = historyRef.current;
    const n = getN(gameState.level);
    
    // Logic: Match item at history.length - n
    const targetHistoryIdx = h.length - n;
    let nextIdx: number;
    let isMatch = false;

    // Determine if we WANT a match (approx 30-35% chance), but only if we have enough history
    const shouldBeMatch = targetHistoryIdx >= 0 && Math.random() < 0.35;

    if (shouldBeMatch) {
      // Force a match
      nextIdx = h[targetHistoryIdx];
      isMatch = true;
    } else {
      // Force a NON-match (Distractor)
      // We must pick an icon that is NOT the target (if target exists)
      
      let attempts = 0;
      do {
        nextIdx = Math.floor(Math.random() * ICONS.length);
        attempts++;
        // Check conditions:
        // 1. Must not equal the N-back target (accidental match prevention)
        // 2. Ideally should not equal the immediate previous item (to prevent A-A visual fatigue) if N > 1
        //    (For N=1, immediate previous IS the target, so checking rule #1 covers it)
        
        let isValid = true;
        
        // Rule 1: Don't match target accidentally
        if (targetHistoryIdx >= 0 && nextIdx === h[targetHistoryIdx]) {
           isValid = false;
        }

        // Rule 2: Don't repeat immediate last item if N > 1 (just for variety)
        if (n > 1 && h.length > 0 && nextIdx === h[h.length - 1]) {
           isValid = false; 
        }

        if (isValid) break;
        
      } while (attempts < 10); // Safety break
    }

    // Update Refs IMMEDIATELY for accuracy
    historyRef.current = [...h, nextIdx];
    isCurrentTargetRef.current = isMatch;
    
    // Update State
    setCurrentIconIdx(nextIdx);
    
    // Calculate speed
    // Base 3000ms, gets faster. Min 1500ms.
    const newDuration = Math.max(1500, 3000 - (gameState.level * 100));
    setTrialDuration(newDuration);

    // Schedule End of Display
    clearTimers();
    displayTimerRef.current = window.setTimeout(() => {
       startBlankPhase();
    }, newDuration);

  }, [gameState.level, gameState.isPlaying, gameState.isPaused, startBlankPhase]);


  // --- Game State Watcher ---
  // This is the single source of truth for starting/stopping the loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
       if (!isLoopRunningRef.current) {
          isLoopRunningRef.current = true;
          // Start immediately or after short delay?
          // Let's start with a blank phase to settle
          startBlankPhase();
       }
    } else {
       // Stop everything
       isLoopRunningRef.current = false;
       clearTimers();
    }
  }, [gameState.isPlaying, gameState.isPaused, startBlankPhase]);


  const handleMatch = () => {
    if (userRespondedRef.current || currentIconIdx === null) return;
    
    setUserResponded(true);
    userRespondedRef.current = true;

    // Check Accuracy using Ref (Source of Truth)
    if (isCurrentTargetRef.current) {
      setFeedback('correct');
      setGameState(prev => ({ 
        ...prev, 
        score: prev.score + 1, 
        trials: prev.trials + 1,
        level: (prev.score > 0 && prev.score % 5 === 0) ? Math.min(20, prev.level + 1) : prev.level
      }));
    } else {
      setFeedback('wrong');
      setGameState(prev => ({ ...prev, errors: prev.errors + 1, trials: prev.trials + 1 }));
    }
  };

  const finishSession = () => {
    onComplete({
      moduleId: ModuleID.NBACK,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  const CurrentIcon = currentIconIdx !== null ? ICONS[currentIconIdx] : null;
  const nValue = getN(gameState.level);

  const getInstruction = () => {
    return t.game.nback_instr
      .replace('{n}', nValue.toString())
      .replace('{s}', nValue > 1 && language === Language.EN ? 's' : '');
  };

  return (
    <ModuleShell 
      title={`N-BACK (N=${nValue})`} 
      language={language}
      gameState={gameState}
      onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))}
      onStop={finishSession}
    >
      <div className="flex flex-col items-center justify-center h-full gap-6 bg-slate-50 p-4">
        
        <div className="text-center">
           <div className="text-xl text-slate-600 font-bold mb-2">
             {nValue}-Back
           </div>
           <div className="text-sm text-slate-500 font-medium px-4">
             {getInstruction()}
           </div>
        </div>

        {/* Card Container */}
        <div className="relative w-56 h-56 md:w-64 md:h-64 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center border-2 border-slate-100 overflow-hidden">
          
          {/* Feedback Overlay */}
          <div className="absolute top-2 left-0 w-full text-center z-10 h-8">
            {feedback === 'correct' && <span className="text-emerald-500 font-black text-lg animate-bounce inline-block">{t.correct}</span>}
            {feedback === 'wrong' && <span className="text-rose-500 font-black text-lg animate-pulse inline-block">{t.incorrect}</span>}
            {feedback === 'missed' && <span className="text-amber-500 font-black text-lg inline-block">{t.game.missed}</span>}
          </div>

          {/* Icon */}
          <div className="flex-1 flex items-center justify-center w-full">
            {CurrentIcon ? (
              <CurrentIcon size={112} className="text-indigo-600 animate-in zoom-in duration-300 drop-shadow-lg" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-slate-200"></div> 
            )}
          </div>

          {/* Countdown Bar - Visual Timer */}
          {CurrentIcon && !gameState.isPaused && (
            <div className="w-full h-2 bg-slate-100 absolute bottom-0 left-0">
               <div 
                 key={`${currentIconIdx}-${gameState.trials}`} // Force re-render on new item
                 className="h-full bg-indigo-500 origin-left"
                 style={{
                   animation: `shrink ${trialDuration}ms linear forwards`
                 }}
               />
               <style>{`
                 @keyframes shrink {
                   from { width: 100%; }
                   to { width: 0%; }
                 }
               `}</style>
            </div>
          )}
        </div>

        <Button 
          variant="primary" 
          size="xl" 
          onClick={handleMatch}
          className={`w-56 h-16 md:w-64 md:h-20 text-xl font-bold transition-all ${userResponded ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
          disabled={currentIconIdx === null || userResponded}
        >
          {t.game.match}
        </Button>

      </div>
    </ModuleShell>
  );
};
