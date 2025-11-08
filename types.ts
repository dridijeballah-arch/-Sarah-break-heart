// Fix: Create types.ts to define all data structures for the game.
export enum CrystalType {
  Red = 'Red',
  Green = 'Green',
  Blue = 'Blue',
  Yellow = 'Yellow',
  Purple = 'Purple',
  Orange = 'Orange',
}

export enum SpecialType {
  StripedVertical = 'StripedVertical',
  StripedHorizontal = 'StripedHorizontal',
  Wrapped = 'Wrapped',
  ColorBomb = 'ColorBomb',
}

export enum BackgroundType {
  Jelly = 'Jelly',
  Blocker = 'Blocker',
}

export interface Crystal {
  id: string;
  type: CrystalType;
  special?: SpecialType;
}

export interface Tile {
  id: string; // Unique ID for the tile itself for React keys
  crystal: Crystal | null;
  background: BackgroundType | null;
}

export type GridType = Tile[][];

export interface Position {
  row: number;
  col: number;
}

export enum GameState {
  LevelSelection = 'LevelSelection',
  Playing = 'Playing',
  Paused = 'Paused',
  Won = 'Won',
  Lost = 'Lost',
}

export interface FloatingScore {
  id: string;
  score: number;
  position: Position;
}

export interface Level {
  level: number;
  moves: number;
  targetScore?: number;
  starScores: [number, number, number];
  targetColors?: Partial<Record<CrystalType, number>>;
  targetJelly?: number;
  targetBlockers?: number;
  layout?: string[];
}

export enum SpecialEffectType {
    StripedBeam = 'StripedBeam',
    WrappedExplosion = 'WrappedExplosion',
    ColorBombArcs = 'ColorBombArcs',
    StripedWrappedBlast = 'StripedWrappedBlast',
    DoubleColorBombClear = 'DoubleColorBombClear',
    DoubleWrappedBlast = 'DoubleWrappedBlast',
}

export interface ActiveEffect {
    id: string;
    type: SpecialEffectType;
    position?: Position; // Center of the effect
    // For StripedBeam
    direction?: 'horizontal' | 'vertical';
    // For ColorBombArcs
    targets?: Position[];
    color?: string; // e.g. 'Red'
}