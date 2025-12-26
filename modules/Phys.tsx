import React, { useState, useEffect } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { 
  Smile, Frown, Meh, Angry, Laugh, Annoyed, 
  User, UserCheck, UserMinus, UserPlus, UserX,
  Baby, Ghost, Bot, Skull, Globe, VenetianMask,
  ScanFace, Ear, Eye, Fingerprint
} from 'lucide-react';

interface PhysProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

// Expanded list of "faces" or character-like icons for more variety
const FACES = [
  Smile, Frown, Meh, Angry, Laugh, Annoyed,
  User, UserCheck, UserMinus, UserPlus, UserX,
  Baby, Ghost, Bot, Skull, Globe, VenetianMask,
  ScanFace, Ear, Eye, Fingerprint
];

export const Phys: React.FC<PhysProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [phase, setPhase] = useState<'memorize' | 'wait' | 'select'>('memorize');
  const [targetFace, setTargetFace] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);

  const startTrial = () => {
    setPhase('memorize');
    const target = FACES[Math.floor(Math.random() * FACES.length)];
    setTargetFace(() => target);

    setTimeout(() => {
      setPhase('wait');
      setTimeout(() => {
        // Generate options
        const opts = new Set([target]);
        while(opts.size < 3) {
          opts.add(FACES[Math.floor(Math.random() * FACES.length)]);
        }
        setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
        setPhase('select');
      }, 1000); // 1s delay
    }, 2000); // 2s view time
  };

  useEffect(() => {
    startTrial();
  }, []);

  const handleSelect = (face: any) => {
    if (face === targetFace) {
       setGameState(p => ({...p, score: p.score + 1, trials: p.trials + 1, level: p.level < 20 ? p.level + 1 : 20}));
    } else {
       setGameState(p => ({...p, errors: p.errors + 1, trials: p.trials + 1}));
    }
    setTimeout(startTrial, 500);
  };

  const finishSession = () => {
    onComplete({
      moduleId: ModuleID.PHYS,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  const Target = targetFace;

  return (
    <ModuleShell title={t.modInfo.PHYS.name} language={language} gameState={gameState} onPauseToggle={() => {}} onStop={finishSession}>
      <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 gap-8 md:gap-12 bg-orange-50">
        {phase === 'memorize' && Target && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <h2 className="text-lg md:text-xl mb-4 text-orange-800 font-bold">{t.game.phys_mem}</h2>
            <div className="w-32 h-32 md:w-48 md:h-48 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-orange-200">
               <Target className="w-20 h-20 md:w-32 md:h-32 text-slate-700" strokeWidth={1.5} />
            </div>
          </div>
        )}

        {phase === 'wait' && <div className="text-slate-400">...</div>}

        {phase === 'select' && (
          <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-lg md:text-xl mb-4 md:mb-8 text-orange-800 font-bold">{t.game.phys_which}</h2>
            <div className="flex gap-4 md:gap-8 flex-wrap justify-center">
              {options.map((Face, i) => (
                <button 
                  key={i}
                  onClick={() => handleSelect(Face)}
                  className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border-2 border-orange-100"
                >
                  <Face className="w-14 h-14 md:w-20 md:h-20 text-slate-700" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModuleShell>
  );
};