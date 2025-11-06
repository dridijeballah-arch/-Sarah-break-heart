// Fix: Create constants.ts to hold game configuration and constants.
import { CrystalType, Level } from './types';

export const GRID_SIZE = 8;
export const CRYSTAL_TYPES: CrystalType[] = Object.values(CrystalType);

export const CRYSTAL_COLORS: Record<CrystalType, string> = {
  [CrystalType.Red]: 'bg-red-500 border-red-800',
  [CrystalType.Green]: 'bg-green-500 border-green-800',
  [CrystalType.Blue]: 'bg-blue-500 border-blue-800',
  [CrystalType.Yellow]: 'bg-yellow-500 border-yellow-800',
  [CrystalType.Purple]: 'bg-purple-500 border-purple-800',
  [CrystalType.Orange]: 'bg-orange-500 border-orange-800',
};

export const CRYSTAL_EFFECT_COLORS: Record<CrystalType, string> = {
    [CrystalType.Red]: '#ef4444',
    [CrystalType.Green]: '#22c55e',
    [CrystalType.Blue]: '#3b82f6',
    [CrystalType.Yellow]: '#eab308',
    [CrystalType.Purple]: '#a855f7',
    [CrystalType.Orange]: '#f97316',
};

export const CRYSTAL_ICONS: Record<CrystalType, string> = {
    [CrystalType.Red]: '❤️',
    [CrystalType.Green]: '💚',
    [CrystalType.Blue]: '💙',
    [CrystalType.Yellow]: '💛',
    [CrystalType.Purple]: '💜',
    [CrystalType.Orange]: '🧡',
};

export const SWAP_ANIMATION_DURATION = 200;
export const CLEAR_ANIMATION_DURATION = 300;
export const FALL_ANIMATION_DURATION = 400;
export const FLOATING_SCORE_ANIMATION_DURATION = 1000;
export const EFFECT_ANIMATION_DURATION = 400;

export const BASE_SCORE = 10;
export const SPECIAL_CRYSTAL_SCORE = 50;
export const JELLY_CLEAR_SCORE = 100;
export const BLOCKER_CLEAR_SCORE = 200;

export const MAX_LIVES = 5;
export const LIFE_REGEN_TIME_MS = 15 * 60 * 1000; // 15 minutes

export const LEVELS: Level[] = [
  { 
    level: 1, 
    moves: 20, 
    targetScore: 1000,
    targetColors: { [CrystalType.Red]: 25 }
  },
  { 
    level: 2, 
    moves: 25, 
    targetScore: 2000,
    targetColors: { [CrystalType.Blue]: 30, [CrystalType.Green]: 30 } 
  },
  { 
    level: 3, 
    moves: 25, 
    targetJelly: 16,
    layout: [
      '. j . j . j . j',
      'j . j . j . j .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      'j . j . j . j .',
      '. j . j . j . j',
    ] 
  },
  { 
    level: 4, 
    moves: 30, 
    targetJelly: 32,
    layout: [
      'j . j . j . j .',
      '. j . j . j . j',
      'j . j . j . j .',
      '. j . j . j . j',
      'j . j . j . j .',
      '. j . j . j . j',
      'j . j . j . j .',
      '. j . j . j . j',
    ]
  },
  { 
    level: 5, 
    moves: 30, 
    targetBlockers: 8,
    targetColors: { [CrystalType.Green]: 40, [CrystalType.Yellow]: 40 },
    layout: [
      'X . . . . . . X',
      'X . . . . . . X',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      'X . . . . . . X',
      'X . . . . . . X',
    ]
  },
  { 
    level: 6, 
    moves: 35, 
    targetJelly: 16,
    targetBlockers: 16,
    layout: [
      '. . X j j X . .',
      '. . X j j X . .',
      'X X . . . . X X',
      'j j . . . . j j',
      'j j . . . . j j',
      'X X . . . . X X',
      '. . X j j X . .',
      '. . X j j X . .',
    ]
  },
  { 
    level: 7, 
    moves: 35, 
    targetBlockers: 16, 
    targetColors: { [CrystalType.Orange]: 50, [CrystalType.Purple]: 50 },
    layout: [
      '. . . . . . . .',
      '. X X . . X X .',
      '. X X . . X X .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. X X . . X X .',
      '. X X . . X X .',
      '. . . . . . . .',
    ]
  },
  { 
    level: 8, 
    moves: 40, 
    targetJelly: 20,
    targetBlockers: 24,
    layout: [
      'X X j j j j X X',
      'X j . . . . j X',
      'j . X X X X . j',
      'j . X . . X . j',
      'j . X . . X . j',
      'j . X X X X . j',
      'X j . . . . j X',
      'X X j j j j X X',
    ]
  },
];