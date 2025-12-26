
import React, { useState, useEffect, useRef } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { audioService } from '../services/audio';
import { Circle, User, Play, AlertTriangle, VolumeX } from 'lucide-react';

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
  const [showSilentWarning, setShowSilentWarning] = useState(false);
  
  const isMounted = useRef(true);
  const timeoutRef = useRef<number | undefined>(undefined);
  const missTimerRef = useRef<number | undefined>(undefined);
  const feedbackTimerRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);

  const clearAllTimers = () => {
    if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
    if (missTimerRef.current !== undefined) window.clearTimeout(missTimerRef.current);
    if (feedbackTimerRef.current !== undefined) window.clearTimeout(feedbackTimerRef.current);
  };

  const scheduleTrial = () => {
    if (!isMounted.current || !gameState.isPlaying || gameState.isPaused) return;
    
    setStatus('waiting');
    setFeedback('');
    
    if (gameState.trials > 0 && gameState.trials % 5 === 0) {
      const modes: Mode[] = ['simple', 'traffic', 'runner'];
      setMode(modes[Math.floor(gameState.trials / 5) % modes.length]);
    }

    const delay = 2000 + Math.random() * 3000;
    clearAllTimers();
    
    timeoutRef.current = window.setTimeout(() => {
      if (!isMounted.current) return;
      
      setStatus('go');
      startTimeRef.current = Date.now();
      audioService.playSound('success-chime');

      missTimerRef.current = window.setTimeout(() => {
         if (!isMounted.current) return;
         if (status !== 'feedback') {
           setStatus('feedback');
           setFeedback(t.game.missed);
           audioService.playSound('error-buzz');
           setGameState(prev => ({ ...prev, errors: prev.errors + 1, trials: prev.trials + 1 }));
           feedbackTimerRef.current = window.setTimeout(scheduleTrial, 1500);
         }
      }, 2500);
    }, delay);
  };

  useEffect(() => {
    isMounted.current = true;
    scheduleTrial();
    return () => {
      isMounted.current = false;
      clearAllTimers();
    };
  }, []);

  const handleAction = () => {
    if (gameState.isPaused || status === 'feedback' || !isMounted.current) return;

    if (status === 'waiting') {
      clearAllTimers(); 
      setStatus('feedback');
      setFeedback(t.game.reak_early);
      audioService.playSound('error-buzz');
      setGameState(prev => ({ ...prev, errors: prev.errors + 1, trials: prev.trials + 1 }));
      feedbackTimerRef.current = window.setTimeout(scheduleTrial, 1500);
    } else if (status === 'go') {
      if (missTimerRef.current !== undefined) window.clearTimeout(missTimerRef.current);
      const rt = Date.now() - startTimeRef.current;
      setReactionTimes(prev => [...prev, rt]);
      setStatus('feedback');
      setFeedback(`${rt} ms`);
      setGameState(prev => ({
        ...prev,
        score: prev.score + 1,
        trials: prev.trials + 1,
        level: prev.score > 0 && prev.score % 5 === 0 ? prev.level + 1 : prev.level
      }));
      feedbackTimerRef.current = window.setTimeout(scheduleTrial, 1500);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleAction(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, gameState.isPaused]);

  const finishSession = () => {
    isMounted.current = false;
    clearAllTimers();
    const avgRt = reactionTimes.length > 0 ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 0;
    onComplete({ moduleId: ModuleID.REAK, durationSeconds: 0, level: gameState.level, correctCount: gameState.score, errorCount: gameState.errors, totalTrials: gameState.trials, averageReactionTimeMs: avgRt });
  };

  const renderVisual = () => {
    if (status === 'feedback') {
       const isError = feedback === t.game.reak_early || feedback === t.game.missed;
       return <div className={`text-4xl font-bold ${isError ? 'text-red-500' : 'text-green-600'}`}>{feedback}</div>;
    }
    if (mode === 'simple') {
       return <div className={`w-64 h-64 rounded-full shadow-xl flex items-center justify-center transition-colors duration-100 ${status === 'go' ? 'bg-green-500 animate-bounce' : 'bg-red-500'}`}>{status === 'go' && <span className="text-white text-3xl font-bold">{t.game.reak_press}</span>}</div>;
    }
    if (mode === 'traffic') {
       return <div className="bg-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-2xl border-4 border-slate-700"><div className={`w-24 h-24 rounded-full ${status === 'waiting' ? 'bg-red-500 shadow-[0_0_30px_red]' : 'bg-red-900/30'}`}></div><div className="w-24 h-24 rounded-full bg-yellow-900/30"></div><div className={`w-24 h-24 rounded-full ${status === 'go' ? 'bg-green-500 shadow-[0_0_30px_lime]' : 'bg-green-900/30'}`}></div></div>;
    }
    return <div className="flex flex-col items-center">{status === 'waiting' ? <User size={120} className="text-slate-400 rotate-12" /> : <div className="flex gap-2"><User size={120} className="text-green-600 -rotate-12 translate-x-12" /><Play size={60} className="text-green-500 animate-ping" /></div>}<div className="w-64 h-2 bg-slate-300 rounded-full mt-4"></div></div>;
  };

  return (
    <ModuleShell title={t.modInfo.REAK.name} language={language} gameState={gameState} onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))} onStop={finishSession}>
      <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer select-none bg-slate-50 relative" onClick={handleAction}>
        {showSilentWarning && <div className="absolute top-4 right-4 z-50 bg-amber-100 text-amber-800 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-lg border border-amber-200"><VolumeX className="w-4 h-4" /><span>{t.silentModeWarning}</span></div>}
        {renderVisual()}
        <div className="absolute bottom-10 text-slate-400 text-sm font-medium">{t.game.reak_instr}</div>
      </div>
    </ModuleShell>
  );
};
