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
  ComboStripedWrapped = 'ComboStripedWrapped',
  ComboDoubleWrapped = 'ComboDoubleWrapped',
  ComboColorBomb = 'ComboColorBomb',
}

// Base64 encoded audio data URIs for various sound effects.
export const SOUNDS: Record<SoundType, string> = {
  [SoundType.Click]: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV/IT19J3/q/+/8A',
  [SoundType.Swap]: 'data:audio/wav;base64,UklGRlAAAABXQVZFZm10IBAAAAABAAEAwAEAAcABAAEAggAZGF0YUgAAACAgP/+/fwA/gD9AP4A/AD9AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.InvalidSwap]: 'data:audio/wav;base64,UklGRoAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZwAAABo/vz++/36/vr+8f7l/uX+6f7k/uH+5P7j/uP+5f7p/vD/AP8O/yT/Mf9D/1H/Wf9n/3H/ef94/3X/c/9v/2j/Zv9k/2H/WP9U/07/S/9E/z3/Nv8v/yn/J/8f/xb/E/8P/wn/B/8D/wH/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.Match1]: 'data:audio/wav;base64,UklGRiwaAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSIaAAD2/Pn5+ff4+Pb29fX09PTz8/Ly8fHx8O/v7u3t6+rp6ujo5+fn5eTk4+Pj4eHh39/f3d3d29vb2tra2dnY2NjY19fX19fX19fY2dnZ2tra29vb3d3d39/f4eHh4+Pj5OTl5ubn6Ojp6err7O3u7u/w8fHy8vPz9PT19vf4+fn6+/z9/v8=',
  [SoundType.Match2]: 'data:audio/wav;base64,UklGRiwaAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSIaAADb/v7+/v38/Pn49/f29vX08/Py8fDu7e3r6uno5+bl5OTj4+Hg39/d3dva2trZ2djY19fX19fX19jY2dnZ2tra29vd3d/f4OHh4+Pk5OXm5+jp6uvs7e7v8PHy8/T19vb3+Pj5+fr7/P3+/v8=',
  [SoundType.Match3]: 'data:audio/wav;base64,UklGRiwaAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSIaAADW/v7+/v79/Pz5+Pf39vb19PPz8vHw7u3t6+rp6Ofm5eTk4+Ph4N/f3d3b2tra2dnY2NfX19fX19jY2dnZ2tra293d39/g4eHj4+Tk5ebn6Ojq6+zt7u/w8fLz9PX29/j4+fn6+/z9/v7+/v8=',
  [SoundType.Match4]: 'data:audio/wav;base64,UklGRiwaAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSIaAADC/v7+/v7+/v78/Pz5+Pf39vb19PPz8vHw7u3t6+rp6Ofm5eTk4+Ph4N/f3d3b2tra2dnY2NfX19fX19jY2dnZ2tra293d39/g4eHj4+Tk5ebn6Ojq6+zt7u/w8fLz9PX29/j4+fn6+/z9/v7+/v8=',
  [SoundType.StripedActivate]: 'data:audio/wav;base64,UklGRjAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAAD1/v3+/v39/f39/f39/f39/f39/f0=',
  [SoundType.WrappedActivate]: 'data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT4AAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.ColorBombActivate]: 'data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT4AAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.Win]: 'data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT4AAAD1/Pn49/f29vX08/Py8fDu7e3r6uno5+bl5OTj4+Hg39/d3dva2trZ2djY19fX19fX19jY2dnZ2tra29vd3d/f4OHh4+Pk5OXm5+jp6uvs7e7v8PHy8/T19vb3+Pj5+fr7/P3+/v8=',
  [SoundType.Lose]: 'data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT4AAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.LevelStart]: 'data:audio/wav;base64,UklGRiwaAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSIaAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.ComboStripedWrapped]: 'data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT4AAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.ComboDoubleWrapped]: 'data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT4AAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
  [SoundType.ComboColorBomb]: 'data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT4AAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A',
};