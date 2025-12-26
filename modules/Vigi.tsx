
import React, { useState, useEffect, useRef } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { Button } from '../components/Button';
import { translations } from '../services/localization';
import { 
  Sun, Moon, Cloud, Star, Zap, Heart, Anchor, Music, Bell, Feather, 
  Flag, Key, Umbrella, Diamond, Trophy, Crown, Flower, Gift, Leaf, 
  Plane, Rocket, Scissors, Snowflake, Truck
} from 'lucide-react';

interface VigiProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

const ITEMS = [
  Sun, Moon, Cloud, Star, Heart, Anchor, Music, Bell, Feather, 
  Flag, Key, Umbrella, Diamond, Trophy, Crown, Flower, Gift, Leaf, 
  Plane, Rocket, Scissors, Snowflake, Truck
];

export const Vigi: React.FC<VigiProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [currentItem, setCurrentItem] = useState<any>(null);
  const [targetItem, setTargetItem] = useState<any>(Zap);
  // Fixed: Added initial value undefined to useRef to comply with Expected 1 arguments
  const timerRef = useRef<number>(undefined);

  const runTrial = () => {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const isTarget = Math.random() < 0.15; // Rare target (15%)
    const Item = isTarget ? Zap : ITEMS[Math.floor(Math.random() * ITEMS.length)];
    
    setCurrentItem(() => Item);
    (window as any).vigiTarget = isTarget;
    (window as any).vigiResponded = false;

    const duration = 1500; 

    timerRef.current = window.setTimeout(() => {
       if ((window as any).vigiTarget && !(window as any).vigiResponded) {
         setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
       }
       
       setCurrentItem(null); // Blank screen interval
       setTimeout(runTrial, 500); 
    }, duration);
  };
  
  useEffect(() => {
    setTargetItem(Zap);
    if(gameState.isPlaying && !gameState.isPaused) {
      runTrial();
    }
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused]);

  const handlePress = () => {
    if ((window as any).vigiResponded || gameState.isPaused) return;
    (window as any).vigiResponded = true;

    if ((window as any).vigiTarget) {
      setGameState(p => ({...p, score: p.score + 1, trials: p.trials + 1}));
    } else {
      setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
    }
  };

  const finishSession = () => {
     setGameState(p => ({ ...p, isPlaying: false })); // Stop timer loops
     onComplete({
      moduleId: ModuleID.VIGI,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  const DisplayIcon = currentItem;

  return (
    <ModuleShell 
      title={t.modInfo.VIGI.name} 
      language={language} 
      gameState={gameState} 
      onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))} 
      onStop={finishSession}
    >
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white gap-12">
        <div className="text-xl text-slate-400">{t.game.vigi_instr}</div>
        
        <div className="w-64 h-64 border-4 border-slate-700 rounded-xl flex items-center justify-center bg-slate-800 shadow-2xl">
          {DisplayIcon && <DisplayIcon size={120} className={DisplayIcon === Zap ? "text-yellow-400" : "text-slate-500"} />}
        </div>

        <Button 
             variant="primary" 
             size="xl" 
             className="w-64 h-24 text-2xl"
             onClick={handlePress}
           >
             {t.game.detect}
        </Button>
      </div>
    </ModuleShell>
  );
};
