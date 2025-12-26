export enum Language {
  EN = 'en',
  AR = 'ar',
  FA = 'fa'
}

export enum ModuleID {
  SACC = 'SACC', // Attention
  DIVI = 'DIVI',
  VIGI = 'VIGI',
  TOPO = 'TOPO', // Memory
  PHYS = 'PHYS',
  VERB = 'VERB',
  PLAN = 'PLAN', // Executive
  LOGI = 'LOGI',
  REAK = 'REAK',
  VIST = 'VIST', // Visual Field
  EXPL = 'EXPL',
  NEGT = 'NEGT',
  CORSI = 'CORSI', // Working Memory
  NBACK = 'NBACK',
  SAGU = 'SAGU'
}

export interface User {
  id: string;
  name: string;
  createdAt: number;
}

export interface SessionResult {
  id: string;
  userId: string;
  moduleId: ModuleID;
  timestamp: number;
  durationSeconds: number;
  level: number;
  correctCount: number;
  errorCount: number;
  totalTrials: number;
  averageReactionTimeMs: number;
}

export interface ModuleConfig {
  id: ModuleID;
  name: string;
  category: 'Attention' | 'Memory' | 'Executive' | 'Visual Field' | 'Working Memory';
  description: string;
}

export interface GameState {
  level: number;
  score: number;
  errors: number;
  trials: number;
  isPlaying: boolean;
  isPaused: boolean;
}