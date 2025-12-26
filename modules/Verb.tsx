import React, { useState, useEffect } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';
import { Button } from '../components/Button';

interface VerbProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

export const Verb: React.FC<VerbProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [phase, setPhase] = useState<'memorize' | 'recall'>('memorize');
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const startTrial = () => {
    setPhase('memorize');
    setSelectedOptions([]);
    
    // Level determines number of words to memorize (3 to 7)
    const count = Math.min(3 + Math.floor((gameState.level - 1) / 5), 7);
    const pool = [...t.words]; // Copy array
    const targets: string[] = [];
    
    // Select targets
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      targets.push(pool[idx]);
      pool.splice(idx, 1); // Remove used word
    }
    setTargetWords(targets);

    // Generate options (Targets + Distractors)
    const opts = [...targets];
    while (opts.length < count * 2) { // 50% chance
      const idx = Math.floor(Math.random() * pool.length);
      opts.push(pool[idx]);
      pool.splice(idx, 1);
    }
    setOptions(opts.sort(() => Math.random() - 0.5));

    // Show for 5 seconds + level adjustment
    setTimeout(() => {
      setPhase('recall');
    }, 3000 + (count * 1000));
  };

  useEffect(() => {
    startTrial();
  }, [gameState.level]);

  const toggleOption = (word: string) => {
    if (selectedOptions.includes(word)) {
      setSelectedOptions(prev => prev.filter(w => w !== word));
    } else {
      setSelectedOptions(prev => [...prev, word]);
    }
  };

  const submitRecall = () => {
    let correct = 0;
    let wrong = 0;

    selectedOptions.forEach(w => {
      if (targetWords.includes(w)) correct++;
      else wrong++;
    });

    // Missed words also count as errors (optional logic, keeping simple here)
    const missed = targetWords.length - correct;
    
    if (correct === targetWords.length && wrong === 0) {
      setGameState(p => ({
        ...p, 
        score: p.score + 1, 
        trials: p.trials + 1, 
        level: p.level < 20 ? p.level + 1 : 20
      }));
    } else {
      setGameState(p => ({
        ...p, 
        errors: p.errors + 1, 
        trials: p.trials + 1
      }));
    }

    startTrial();
  };

  const finishSession = () => {
     onComplete({
      moduleId: ModuleID.VERB,
      durationSeconds: 0,
      level: gameState.level,
      correctCount: gameState.score,
      errorCount: gameState.errors,
      totalTrials: gameState.trials,
      averageReactionTimeMs: 0
    });
  };

  return (
    <ModuleShell title={t.modInfo.VERB.name} language={language} gameState={gameState} onPauseToggle={() => {}} onStop={finishSession}>
      <div className="flex flex-col items-center justify-center h-full p-8 gap-8">
        
        {phase === 'memorize' && (
          <div className="text-center animate-in fade-in zoom-in">
            <h2 className="text-2xl font-bold text-slate-700 mb-8">{t.game.verb_mem}</h2>
            <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
              {targetWords.map((word, i) => (
                <div key={i} className="bg-blue-100 text-blue-800 text-xl font-bold px-6 py-4 rounded-lg shadow-md border border-blue-200">
                  {word}
                </div>
              ))}
            </div>
            <div className="mt-8 text-slate-400 text-sm animate-pulse">
              Memorizing...
            </div>
          </div>
        )}

        {phase === 'recall' && (
          <div className="text-center w-full max-w-4xl">
             <h2 className="text-2xl font-bold text-slate-700 mb-8">{t.game.verb_recall}</h2>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
               {options.map((word, i) => (
                 <button
                   key={i}
                   onClick={() => toggleOption(word)}
                   className={`text-lg font-bold px-4 py-6 rounded-lg shadow-sm border-2 transition-all
                     ${selectedOptions.includes(word) 
                       ? 'bg-blue-600 text-white border-blue-700' 
                       : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                     }
                   `}
                 >
                   {word}
                 </button>
               ))}
             </div>
             <Button size="lg" onClick={submitRecall} disabled={selectedOptions.length === 0}>
               Submit
             </Button>
          </div>
        )}

      </div>
    </ModuleShell>
  );
};