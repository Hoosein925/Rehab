import React, { useState, useEffect, useRef } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { Button } from '../components/Button';
import { translations } from '../services/localization';
import { audioService } from '../services/audio';
import { Volume2, Eye, VolumeX } from 'lucide-react';

interface DiviProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

type LightState = 'off' | 'target' | 'distractor';

export const Divi: React.FC<DiviProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  // Calculate grid size based on level
  const getGridSize = (level: number) => {
    if (level < 6) return 5;
    if (level < 15) return 7;
    return 9;
  };
  const numLights = getGridSize(gameState.level);

  // Visual Task State
  const [lights, setLights] = useState<LightState[]>([]);
  const [showSilentWarning, setShowSilentWarning] = useState(false);
  
  // Timers
  const visualTimerRef = useRef<number>();
  const audioTimerRef = useRef<number>();

  // Init lights array when level changes
  useEffect(() => {
    setLights(new Array(numLights).fill('off'));
  }, [numLights]);

  const scheduleVisual = () => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    // Faster visual stimuli at higher levels
    const baseDelay = Math.max(1000, 2500 - (gameState.level * 80));
    const delay = baseDelay + Math.random() * 1500;
    
    visualTimerRef.current = window.setTimeout(() => {
      // Pick random light
      const idx = Math.floor(Math.random() * numLights);
      
      // Determine if Target (Green) or Distractor (Red)
      const hasDistractors = gameState.level >= 4;
      const isTarget = !hasDistractors || Math.random() > 0.3;

      const newLights = new Array(numLights).fill('off');
      newLights[idx] = isTarget ? 'target' : 'distractor';
      setLights(newLights);
      
      const duration = Math.max(1000, 2500 - (gameState.level * 50));
      setTimeout(() => setLights(new Array(numLights).fill('off')), duration);
      
      scheduleVisual();
    }, delay);
  };

  const scheduleAudio = () => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    const delay = 3000 + Math.random() * 3000;
    
    audioTimerRef.current = window.setTimeout(() => {
      const isTarget = Math.random() < 0.3;
      audioService.playSound(isTarget ? 'high-pitch' : 'low-pitch');
      
      if (isTarget) {
        (window as any).audioTargetActive = true;
        setTimeout(() => { (window as any).audioTargetActive = false; }, 2500);
      }

      scheduleAudio();
    }, delay);
  };

  useEffect(() => {
    // Check for silent mode after a short delay
    const silentCheckTimer = setTimeout(() => {
      if (!audioService.isAudioReady()) {
        setShowSilentWarning(true);
      }
    }, 1000);

    if (gameState.isPlaying && !gameState.isPaused) {
      scheduleVisual();
      scheduleAudio();
    }
    
    return () => {
      clearTimeout(silentCheckTimer);
      clearTimeout(visualTimerRef.current);
      clearTimeout(audioTimerRef.current);
    };
  }, [gameState.level, numLights, gameState.isPlaying, gameState.isPaused]);

  const handleVisualClick = (idx: number) => {
    if (gameState.isPaused) return;
    const state = lights[idx];
    if (state === 'target') {
      setLights(new Array(numLights).fill('off'));
      setGameState(p => ({
        ...p, 
        score: p.score + 1, 
        trials: p.trials + 1,
        level: p.score > 0 && p.score % 5 === 0 ? p.level + 1 : p.level
      }));
    } else if (state === 'distractor' || state === 'off') {
      setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
    }
  };

  const handleAudioResponse = () => {
    if (gameState.isPaused) return;
    if ((window as any).audioTargetActive) {
      setGameState(p => ({...p, score: p.score + 1, trials: p.trials + 1}));
      (window as any).audioTargetActive = false;
    } else {
      setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
    }
  };

  const finishSession = () => {
    setGameState(p => ({ ...p, isPlaying: false })); // Stop timer loops
    onComplete({
      moduleId: ModuleID.DIVI,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  return (
    <ModuleShell 
      title={t.modInfo.DIVI.name} 
      language={language}
      gameState={gameState}
      onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))}
      onStop={finishSession}
    >
      <div className="flex flex-col h-full bg-slate-900 text-white p-4 md:p-8 gap-4 md:gap-8 relative">
        
        {showSilentWarning && (
          <div className="absolute top-4 right-4 z-50 bg-amber-100 text-amber-800 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-lg border border-amber-200 animate-in fade-in">
            <VolumeX className="w-4 h-4" />
            <span>{t.silentModeWarning}</span>
          </div>
        )}

        {/* Visual Task Area */}
        <div className="flex-1 border-b border-slate-700 flex flex-col items-center justify-center gap-6">
           <div className="flex items-center gap-2 text-blue-300">
             <Eye /> <span>{t.game.divi_vis}</span>
           </div>
           
           <div className="flex gap-3 md:gap-5 flex-wrap justify-center max-w-3xl">
             {lights.map((state, i) => {
               let colorClass = 'bg-slate-800 border-slate-700';
               if (state === 'target') colorClass = 'bg-green-500 border-green-300 shadow-[0_0_30px_rgba(34,197,94,0.6)] animate-pulse';
               if (state === 'distractor') colorClass = 'bg-red-600 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]';

               return (
                 <button 
                   key={i}
                   onClick={() => handleVisualClick(i)}
                   className={`w-14 h-14 md:w-20 md:h-20 rounded-full border-4 transition-all duration-150 ${colorClass}`}
                 />
               );
             })}
           </div>
           
           {gameState.level >= 4 && (
             <p className="text-xs text-slate-500 mt-2">
               Level {gameState.level}: Watch out for Red lights!
             </p>
           )}
        </div>

        {/* Audio Task Area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
           <div className="flex items-center gap-2 text-blue-300">
             <Volume2 /> <span>{t.game.divi_aud}</span>
           </div>
           <Button 
             variant="primary" 
             size="xl" 
             className="w-56 h-20 md:w-72 md:h-24 text-lg md:text-xl font-bold shadow-blue-900/40"
             onClick={handleAudioResponse}
           >
             {t.game.divi_btn}
           </Button>
        </div>

      </div>
    </ModuleShell>
  );
};