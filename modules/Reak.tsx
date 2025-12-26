import React, { useState, useEffect, useRef } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { audioService } from '../services/audio';
import { Circle, User, Play, AlertTriangle } from 'lucide-react';

interface ReakProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

type Mode = 'simple' | 'traffic' | 'runner';

export const Reak: React.FC<ReakProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [status, setStatus] = useState<'waiting' | 'ready' | 'go' | 'feedback'>('waiting');
  const [feedback, setFeedback] = useState<string>('');
  const [mode, setMode] = useState<Mode>('simple');
  
  const timeoutRef = useRef<number>();
  const missTimerRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);

  const scheduleTrial = () => {
    if (!gameState.isPlaying) return;
    setStatus('waiting');
    setFeedback('');
    
    // Switch mode every 5 trials
    if (gameState.trials > 0 && gameState.trials % 5 === 0) {
      const modes: Mode[] = ['simple', 'traffic', 'runner'];
      setMode(modes[Math.floor(gameState.trials / 5) % modes.length]);
    }

    // Random delay between 2000ms and 5000ms
    const delay = 2000 + Math.random() * 3000;
    
    timeoutRef.current = window.setTimeout(() => {
      setStatus('go');
      startTimeRef.current = Date.now();
      audioService.playSound('success-chime');

      // Set a timer for missed reaction (e.g., 2 seconds max)
      missTimerRef.current = window.setTimeout(() => {
         if (status !== 'feedback') {
           setStatus('feedback');
           setFeedback(t.game.missed || "Missed!");
           audioService.playSound('error-buzz');
           setGameState(prev => ({
              ...prev,
              errors: prev.errors + 1,
              trials: prev.trials + 1
           }));
           setTimeout(scheduleTrial, 1500);
         }
      }, 2000);

    }, delay);
  };

  useEffect(() => {
    scheduleTrial();
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(missTimerRef.current);
    };
  }, []);

  const handleAction = () => {
    if (gameState.isPaused || status === 'feedback') return;

    if (status === 'waiting') {
      // Impulsive reaction (too early) - ERROR
      clearTimeout(timeoutRef.current); // Prevent it from turning green
      setStatus('feedback');
      setFeedback(t.game.reak_early);
      audioService.playSound('error-buzz');
      
      setGameState(prev => ({
        ...prev,
        errors: prev.errors + 1,
        trials: prev.trials + 1
      }));
      setTimeout(scheduleTrial, 1500);
      
    } else if (status === 'go') {
      // Correct reaction
      clearTimeout(missTimerRef.current); // Clear the miss timer
      const rt = Date.now() - startTimeRef.current;
      setReactionTimes(prev => [...prev, rt]);
      setStatus('feedback');
      setFeedback(`${rt} ms`);
      
      setGameState(prev => ({
        ...prev,
        score: prev.score + 1,
        trials: prev.trials + 1,
        // Infinite progression: Level up every 5 correct trials
        level: prev.score > 0 && prev.score % 5 === 0 ? prev.level + 1 : prev.level
      }));
      
      setTimeout(scheduleTrial, 1500);
    }
  };

  // Keyboard handler for Space bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        handleAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, gameState.isPaused]);

  const finishSession = () => {
    const avgRt = reactionTimes.length > 0 
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length 
      : 0;

    onComplete({
      moduleId: ModuleID.REAK,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: avgRt
    });
  };

  const renderVisual = () => {
    if (status === 'feedback') {
       const isError = feedback === t.game.reak_early || feedback === t.game.missed || feedback === "Missed!";
       return (
          <div className={`text-4xl font-bold ${isError ? 'text-red-500' : 'text-green-600'}`}>
            {feedback}
          </div>
       );
    }

    if (mode === 'simple') {
       return (
          <div className={`w-64 h-64 rounded-full shadow-xl flex items-center justify-center transition-colors duration-100
             ${status === 'go' ? 'bg-green-500 animate-bounce' : 'bg-red-500'}
          `}>
             {status === 'waiting' && <div className="text-white/50 text-xl font-bold">{t.game.reak_wait}</div>}
             {status === 'go' && <span className="text-white text-3xl font-bold">{t.game.reak_press}</span>}
          </div>
       );
    }

    if (mode === 'traffic') {
       return (
          <div className="bg-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-2xl border-4 border-slate-700">
             <div className={`w-24 h-24 rounded-full ${status === 'waiting' ? 'bg-red-500 shadow-[0_0_30px_red]' : 'bg-red-900/30'}`}></div>
             <div className="w-24 h-24 rounded-full bg-yellow-900/30"></div>
             <div className={`w-24 h-24 rounded-full ${status === 'go' ? 'bg-green-500 shadow-[0_0_30px_lime]' : 'bg-green-900/30'}`}></div>
          </div>
       );
    }

    if (mode === 'runner') {
       return (
          <div className="flex flex-col items-center">
             {status === 'waiting' ? (
                <User size={120} className="text-slate-400 rotate-12 transition-transform" />
             ) : (
                <div className="flex gap-2">
                   <User size={120} className="text-green-600 -rotate-12 translate-x-12 transition-transform" />
                   <Play size={60} className="text-green-500 animate-ping" />
                </div>
             )}
             <div className="w-64 h-2 bg-slate-300 rounded-full mt-4"></div>
          </div>
       );
    }
  };

  return (
    <ModuleShell 
      title={t.modInfo.REAK.name} 
      language={language}
      gameState={gameState}
      onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))}
      onStop={finishSession}
    >
      <div 
        className="w-full h-full flex flex-col items-center justify-center cursor-pointer select-none touch-manipulation bg-slate-50"
        onClick={handleAction} // Allow click/tap anywhere
      >
        {renderVisual()}
        
        <div className="absolute bottom-10 text-slate-400 text-sm font-medium">
          {t.game.reak_instr}
        </div>
      </div>
    </ModuleShell>
  );
};