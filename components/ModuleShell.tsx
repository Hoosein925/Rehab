import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pause, Play, Maximize2, Minimize2, Timer, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { translations, dir } from '../services/localization';
import { Language, GameState } from '../types';

interface ModuleShellProps {
  title: string;
  language: Language;
  gameState: GameState;
  onPauseToggle: () => void;
  onStop: () => void;
  children: React.ReactNode;
}

export const ModuleShell: React.FC<ModuleShellProps> = ({
  title,
  language,
  gameState,
  onPauseToggle,
  onStop,
  children
}) => {
  const t = translations[language];
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let interval: number;
    if (gameState.isPlaying && !gameState.isPaused) {
      interval = window.setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isPlaying, gameState.isPaused]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden font-sans text-slate-800" dir={dir(language)}>
      
      {/* Header - Compact on mobile */}
      <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 z-20 relative mt-2 mx-2 md:mx-4 rounded-xl glass-panel shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="sm" onClick={onStop} className="!p-1.5 md:!p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm md:text-lg font-bold text-slate-800 leading-tight truncate max-w-[150px] md:max-w-none">{title}</h1>
            <span className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-wider uppercase hidden md:block">Cognitive Module</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
           <div className="bg-white/50 px-3 py-1 md:px-4 md:py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200/50 shadow-inner">
             <Timer className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
             <span className="font-mono font-bold text-slate-700 text-sm">{formatTime(elapsed)}</span>
           </div>
           <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="hidden md:flex !p-2">
              {isFullscreen ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>}
           </Button>
        </div>
      </header>

      {/* Main Game Area - Dynamic Height */}
      <main className="flex-1 relative flex items-center justify-center p-2 md:p-6 overflow-hidden">
        
        {/* Pause Overlay */}
        {gameState.isPaused && (
          <div className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full mx-auto transform transition-all scale-100 border-4 border-slate-100">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 text-blue-600 shadow-inner">
                <Pause className="w-8 h-8 md:w-10 md:h-10 fill-current" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 text-slate-800">{t.pause}</h2>
              <p className="text-slate-500 mb-6 md:mb-8 font-medium text-sm md:text-base">Session paused. Ready to continue?</p>
              <Button variant="primary" size="lg" onClick={onPauseToggle} className="w-full shadow-xl shadow-blue-500/20">
                <Play className="w-5 h-5 mr-2 inline fill-current" />
                {t.resume}
              </Button>
            </div>
          </div>
        )}
        
        {/* Game Container - Solid Board on Background */}
        <div className="w-full h-full max-w-7xl bg-white rounded-2xl md:rounded-3xl game-container overflow-hidden relative border-2 md:border-4 border-slate-100/50 flex flex-col z-10">
           {children}
        </div>
      </main>

      {/* Footer - Floating Glass HUD - Responsive */}
      <footer className="h-16 md:h-20 mb-2 md:mb-4 mx-2 md:mx-4 rounded-xl md:rounded-2xl glass-panel flex items-center justify-between px-3 md:px-6 z-20 shrink-0">
        <div className="flex items-center justify-around w-full max-w-4xl mr-2 md:mr-0 gap-2 md:gap-12">
           
           {/* Level Indicator */}
           <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                 <span className="font-bold text-sm md:text-xl">{gameState.level}</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] md:text-[10px] uppercase text-slate-500 font-bold tracking-wider">{t.level}</span>
                 {/* Limit indicator removed for infinite/adaptive feel */}
              </div>
           </div>

           <div className="h-6 md:h-10 w-px bg-slate-300/50"></div>

           {/* Score Indicator */}
           <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2.5 rounded-lg md:rounded-xl bg-emerald-100 text-emerald-700 shadow-sm hidden sm:block">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] md:text-[10px] uppercase text-slate-500 font-bold tracking-wider">{t.score}</span>
                 <span className="font-bold text-lg md:text-2xl text-slate-800 leading-none">{gameState.score}</span>
              </div>
           </div>

           <div className="h-6 md:h-10 w-px bg-slate-300/50"></div>

           {/* Errors Indicator */}
           <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2.5 rounded-lg md:rounded-xl bg-rose-100 text-rose-700 shadow-sm hidden sm:block">
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] md:text-[10px] uppercase text-slate-500 font-bold tracking-wider">{t.errors}</span>
                 <span className="font-bold text-lg md:text-2xl text-slate-800 leading-none">{gameState.errors}</span>
              </div>
           </div>

        </div>

        <div className="flex gap-4">
          <Button variant="secondary" onClick={onPauseToggle} className="rounded-full w-10 h-10 md:w-14 md:h-14 flex items-center justify-center !p-0 shadow-lg border-2 border-white">
             {gameState.isPaused ? <Play className="w-4 h-4 md:w-6 md:h-6 fill-slate-700 ml-1"/> : <Pause className="w-4 h-4 md:w-6 md:h-6 fill-slate-700"/>}
          </Button>
        </div>
      </footer>
    </div>
  );
};