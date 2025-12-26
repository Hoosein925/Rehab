import React, { useState, useEffect, useRef } from 'react';
import { ModuleShell } from '../components/ModuleShell';
import { Language, GameState, SessionResult, ModuleID } from '../types';
import { translations } from '../services/localization';

interface CorsiProps {
  language: Language;
  onComplete: (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => void;
}

interface Block {
  id: number;
  x: number;
  y: number;
}

const COLORS = [
  'bg-blue-500 border-blue-400',
  'bg-emerald-500 border-emerald-400',
  'bg-rose-500 border-rose-400',
  'bg-purple-500 border-purple-400',
  'bg-amber-500 border-amber-400'
];

export const Corsi: React.FC<CorsiProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<GameState>({
    level: 1, // Determines sequence length
    score: 0,
    errors: 0,
    trials: 0,
    isPlaying: true,
    isPaused: false
  });

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [phase, setPhase] = useState<'showing' | 'input' | 'feedback'>('showing');
  const [message, setMessage] = useState('');
  const [isReverse, setIsReverse] = useState(false);
  const [blockColor, setBlockColor] = useState(COLORS[0]);

  // Generate random block positions
  useEffect(() => {
    const newBlocks: Block[] = [];
    const minDist = 18; // Minimum distance %
    
    for (let i = 0; i < 9; i++) {
      let valid = false;
      let x = 0, y = 0;
      let attempts = 0;
      
      while (!valid && attempts < 100) {
        x = 10 + Math.random() * 80;
        y = 10 + Math.random() * 80;
        
        valid = true;
        for (const b of newBlocks) {
          const dx = b.x - x;
          const dy = b.y - y;
          if (Math.sqrt(dx*dx + dy*dy) < minDist) {
            valid = false;
            break;
          }
        }
        attempts++;
      }
      newBlocks.push({ id: i, x, y });
    }
    setBlocks(newBlocks);
    startTrial(1, newBlocks);
  }, []);

  const startTrial = (level: number, currentBlocks: Block[]) => {
    // Reverse mode activates at level 5
    const reverseMode = level >= 5;
    setIsReverse(reverseMode);
    
    // Change color for variety
    setBlockColor(COLORS[(level - 1) % COLORS.length]);

    setPhase('showing');
    setUserSequence([]);
    setMessage(reverseMode ? t.game.corsi_reverse : t.game.corsi_watch);
    
    const length = Math.floor(level/2) + 2;
    const newSeq: number[] = [];
    
    for(let i=0; i<length; i++) {
      const randomId = currentBlocks[Math.floor(Math.random() * currentBlocks.length)].id;
      newSeq.push(randomId);
    }
    
    setSequence(newSeq);

    // Play Sequence
    let step = 0;
    const interval = setInterval(() => {
      if (step >= newSeq.length) {
        clearInterval(interval);
        setActiveBlock(null);
        setPhase('input');
        setMessage(t.game.corsi_turn);
        return;
      }
      
      setActiveBlock(newSeq[step]);
      
      // Turn off highlight
      setTimeout(() => {
        setActiveBlock(null);
      }, 700);

      step++;
    }, 1000);
  };

  const handleBlockClick = (id: number) => {
    if (phase !== 'input' || gameState.isPaused) return;

    const newUserSeq = [...userSequence, id];
    setUserSequence(newUserSeq);

    // Light up clicked block
    setActiveBlock(id);
    setTimeout(() => setActiveBlock(null), 200);

    // Check correctness
    // Normal: Match index to index
    // Reverse: Match index to (length - 1 - index)
    const currentIndex = newUserSeq.length - 1;
    const targetId = isReverse ? sequence[sequence.length - 1 - currentIndex] : sequence[currentIndex];

    if (id !== targetId) {
      // Wrong click
      setPhase('feedback');
      setMessage(t.incorrect);
      setGameState(prev => ({
        ...prev,
        errors: prev.errors + 1,
        trials: prev.trials + 1,
        level: Math.max(1, prev.level - 1)
      }));
      setTimeout(() => startTrial(Math.max(1, gameState.level - 1), blocks), 1500);
    } else if (newUserSeq.length === sequence.length) {
      // Full sequence correct
      setPhase('feedback');
      setMessage(t.correct);
      const newLevel = gameState.level + 1;
      setGameState(prev => ({
        ...prev,
        score: prev.score + 1,
        trials: prev.trials + 1,
        level: newLevel
      }));
      setTimeout(() => startTrial(newLevel, blocks), 1500);
    }
  };

  const finishSession = () => {
    onComplete({
      moduleId: ModuleID.CORSI,
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
      title={t.modInfo.CORSI.name} 
      language={language}
      gameState={gameState}
      onPauseToggle={() => setGameState(p => ({...p, isPaused: !p.isPaused}))}
      onStop={finishSession}
    >
      <div className="w-full h-full relative bg-slate-900 p-4 select-none">
        <div className={`absolute top-4 left-0 w-full text-center text-xl font-bold animate-pulse z-10 
          ${isReverse ? 'text-rose-400' : 'text-emerald-400'}`}>
          {message}
        </div>

        {blocks.map((block) => (
          <div
            key={block.id}
            onClick={() => handleBlockClick(block.id)}
            className={`absolute w-16 h-16 md:w-24 md:h-24 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-150 cursor-pointer border-4
              ${activeBlock === block.id 
                ? 'bg-yellow-300 border-yellow-100 scale-110 shadow-[0_0_30px_rgba(253,224,71,0.6)] z-20' 
                : `${blockColor} hover:brightness-125 hover:scale-105`
              }
            `}
            style={{
              left: `${block.x}%`,
              top: `${block.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
      </div>
    </ModuleShell>
  );
};