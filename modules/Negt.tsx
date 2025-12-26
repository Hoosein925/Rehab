import React, { useState, useEffect, useRef } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { ArrowLeft, ArrowRight, Target } from 'lucide-react';

interface NegtProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

type Phase = 'anchor' | 'task' | 'feedback';

interface TaskConfig {
  id: number;
  widthPercent: number; // Length of the line
  topPercent: number;   // Vertical position
  leftPercent: number;  // Horizontal offset (to prevent center fixation)
  anchorSide: 'left' | 'right';
}

export const Negt: React.FC<NegtProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [phase, setPhase] = useState<Phase>('anchor');
  const [task, setTask] = useState<TaskConfig | null>(null);
  
  // Feedback Data
  const [userClickX, setUserClickX] = useState<number>(0); // Percentage relative to line start
  const [deviation, setDeviation] = useState<number>(0); // Pixel deviation

  const startTrial = () => {
    setPhase('anchor');
    setUserClickX(0);
    setDeviation(0);

    // Neglect is usually Left-sided, but user requested variety.
    // Setting to 50% chance for left/right to ensure it doesn't always say "Look Left".
    const isLeft = Math.random() < 0.5;

    setTask({
      id: Date.now(),
      widthPercent: 30 + Math.random() * 50, // 30% to 80% screen width
      topPercent: 20 + Math.random() * 60,   // Avoid very top/bottom
      leftPercent: 10 + Math.random() * 10,  // Slight randomization of line start
      anchorSide: isLeft ? 'left' : 'right'
    });
  };

  useEffect(() => {
    startTrial();
  }, [gameState.level]);

  const handleAnchorClick = () => {
    if (phase === 'anchor') {
      setPhase('task');
    }
  };

  const handleLineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== 'task' || !task) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left; // Pixels from left start of line
    const totalWidth = rect.width;
    
    const centerPx = totalWidth / 2;
    const currentDeviation = clickX - centerPx; // Negative = Left bias, Positive = Right bias
    
    // Calculate click position as percentage for the red marker
    const clickPercent = (clickX / totalWidth) * 100;
    setUserClickX(clickPercent);
    setDeviation(currentDeviation);

    // Calculate accuracy score
    // Acceptable margin decreases with level: Level 1 = 15%, Level 20 = 2%
    const deviationPercent = Math.abs(currentDeviation / totalWidth) * 100;
    const threshold = Math.max(2, 15 - (gameState.level * 0.5));

    if (deviationPercent <= threshold) {
      setGameState(p => ({
        ...p,
        score: p.score + 1,
        trials: p.trials + 1,
        level: p.score > 0 && p.score % 5 === 0 ? p.level + 1 : p.level
      }));
    } else {
      setGameState(p => ({
        ...p,
        errors: p.errors + 1,
        trials: p.trials + 1
      }));
    }

    setPhase('feedback');
    setTimeout(startTrial, 2000); // 2 seconds to view feedback
  };

  const finishSession = () => {
    onComplete({
      moduleId: ModuleID.NEGT,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  return (
    <ModuleShell title={t.modInfo.NEGT.name} language={language} gameState={gameState} onPauseToggle={() => {}} onStop={finishSession}>
      <div className="w-full h-full relative bg-slate-100 overflow-hidden select-none cursor-crosshair">
        
        {/* Header Instruction */}
        <div className="absolute top-4 w-full text-center z-10 pointer-events-none">
           <div className="inline-block bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm text-slate-600 font-bold border border-slate-200">
             {phase === 'anchor' 
                ? (language === Language.EN ? `Look to the ${task?.anchorSide.toUpperCase()}!` : (task?.anchorSide === 'left' ? 'به سمت چپ نگاه کنید' : 'به سمت راست نگاه کنید')) 
                : t.game.negt_instr
             }
           </div>
        </div>

        {/* Phase 1: Anchor */}
        {phase === 'anchor' && task && (
           <button
             onClick={handleAnchorClick}
             className={`absolute top-1/2 -translate-y-1/2 p-4 md:p-6 rounded-2xl bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-pulse hover:scale-110 transition-transform
               ${task.anchorSide === 'left' ? 'left-4 md:left-12' : 'right-4 md:right-12'}
             `}
           >
             {task.anchorSide === 'left' ? <ArrowLeft size={32} strokeWidth={3} /> : <ArrowRight size={32} strokeWidth={3} />}
           </button>
        )}

        {/* Phase 2 & 3: Line & Feedback */}
        {(phase === 'task' || phase === 'feedback') && task && (
          <div 
            className="absolute h-12 md:h-16 flex items-center cursor-crosshair group"
            style={{
              width: `${task.widthPercent}%`,
              top: `${task.topPercent}%`,
              left: `${task.leftPercent}%`, // Dynamic offset
              // Centering horizontal relative to its own width is handled by flow, 
              // but we want to position it specifically.
              // Let's use left + transform to center it roughly if we wanted, 
              // but here we use leftPercent as a distinct start point to vary scanning.
            }}
            onClick={phase === 'task' ? handleLineClick : undefined}
          >
             {/* The Visible Line */}
             <div className="w-full h-2 md:h-3 bg-slate-800 rounded-full shadow-xl relative overflow-visible group-hover:h-3 md:group-hover:h-4 transition-all duration-200">
                
                {/* Decor: Endpoints to make it look like a physical bar */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 md:h-8 bg-slate-800 rounded-full"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 md:h-8 bg-slate-800 rounded-full"></div>

                {/* Feedback Markers */}
                {phase === 'feedback' && (
                  <>
                    {/* True Center (Green) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-10 md:h-14 bg-emerald-500 z-20 shadow-[0_0_10px_rgba(16,185,129,1)]">
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                         Center
                       </div>
                    </div>

                    {/* User Click (Red) */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-8 md:h-12 bg-rose-500 z-20 shadow-[0_0_10px_rgba(244,63,94,1)] transition-all duration-500"
                      style={{ left: `${userClickX}%` }}
                    >
                       <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                         You
                       </div>
                    </div>

                    {/* Deviation Visualization Area */}
                    <div 
                       className="absolute h-full top-0 bg-rose-500/20"
                       style={{
                         left: deviation < 0 ? `${userClickX}%` : '50%',
                         width: `${Math.abs(50 - userClickX)}%`
                       }}
                    ></div>
                  </>
                )}
             </div>
          </div>
        )}

      </div>
    </ModuleShell>
  );
};