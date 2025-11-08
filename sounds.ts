// New file: sounds.ts
export enum SoundType {
  Click = 'Click',
  Swap = 'Swap',
  InvalidSwap = 'InvalidSwap',
  Match1 = 'Match1', // Base match sound
  Match2 = 'Match2',
  Match3 = 'Match3',
  Match4 = 'Match4', // For combos
  StripedActivate = 'StripedActivate',
  WrappedActivate = 'WrappedActivate',
  ColorBombActivate = 'ColorBombActivate',
  Win = 'Win',
  Lose = 'Lose',
  LevelStart = 'LevelStart',
}

// Base64 encoded audio data URIs for various sound effects.
// This approach embeds the audio directly into the application bundle.
export const SOUNDS: Record<SoundType, string> = {
  [SoundType.Click]: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV/IT19J3/q/+/8A',
  [SoundType.Swap]: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhBAAAAAEA',
  [SoundType.InvalidSwap]: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
  [SoundType.Match1]: 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAUSsAANEPAAABAAgAZGF0YTgAAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.Match2]: 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAUSsAANEPAAABAAgAZGF0YTgAAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.Match3]: 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAUSsAANEPAAABAAgAZGF0YTgAAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.Match4]: 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAUSsAANEPAAABAAgAZGF0YTgAAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.StripedActivate]: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
  [SoundType.WrappedActivate]: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
  [SoundType.ColorBombActivate]: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
  [SoundType.Win]: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
  [SoundType.Lose]: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
  [SoundType.LevelStart]: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
};
