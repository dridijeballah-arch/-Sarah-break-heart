import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameBoard } from './components/GameBoard';
import { GameInfo } from './components/GameInfo';
import { GameOverModal } from './components/GameOverModal';
import { LevelSelectionScreen } from './components/LevelSelectionScreen';
import { PauseMenu } from './components/PauseMenu';
import { FloatingScores } from './components/FloatingScores';
import { SpecialEffects } from './components/SpecialEffects';
import { ComboDisplay } from './components/ComboDisplay';
import {
  Crystal,
  GridType,
  Position,
  GameState,
  CrystalType,
  SpecialType,
  FloatingScore,
  ActiveEffect,
  SpecialEffectType,
  BackgroundType,
  Tile,
  Level
} from './types';
import {
  GRID_SIZE,
  CRYSTAL_TYPES,
  LEVELS,
  SWAP_ANIMATION_DURATION,
  CLEAR_ANIMATION_DURATION,
  FALL_ANIMATION_DURATION,
  EFFECT_ANIMATION_DURATION,
  BASE_SCORE,
  SPECIAL_CRYSTAL_SCORE,
  MAX_LIVES,
  LIFE_REGEN_TIME_MS,
  JELLY_CLEAR_SCORE,
  BLOCKER_CLEAR_SCORE
} from './constants';
import { playSound } from './utils/soundManager';
import { SoundType } from './sounds';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createNewCrystal = (row: number, col: number, type?: CrystalType): Crystal => ({
  id: `crystal-${row}-${col}-${Date.now()}-${Math.random()}`,
  type: type || CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)],
});

const getValidCrystalTypes = (grid: GridType, currentRow: Tile[], row: number, col: number): CrystalType[] => {
  let possibleTypes = [...CRYSTAL_TYPES];
  // Check left
  if (col > 1 && currentRow[col - 1].crystal?.type === currentRow[col - 2].crystal?.type) {
    possibleTypes = possibleTypes.filter(t => t !== currentRow[col - 1].crystal!.type);
  }
  // Check up
  if (row > 1 && grid[row - 1][col].crystal?.type === grid[row - 2][col].crystal?.type) {
    possibleTypes = possibleTypes.filter(t => t !== grid[row - 1][col].crystal!.type);
  }
  if (possibleTypes.length === 0) return [CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)]];
  return possibleTypes;
};

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LevelSelection);
  const [grid, setGrid] = useState<GridType>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [selectedCrystal, setSelectedCrystal] = useState<Position | null>(null);
  const [lastNonInteractiveGrid, setLastNonInteractiveGrid] = useState<{grid: GridType, score: number, moves: number, collectedColors: Partial<Record<CrystalType, number>>, clearedJelly: number, clearedBlockers: number} | null>(null);

  const [swappingCrystals, setSwappingCrystals] = useState<[Position, Position] | null>(null);
  const [clearingTiles, setClearingTiles] = useState<Set<string>>(new Set());
  const [shockwaveCrystals, setShockwaveCrystals] = useState<Set<string>>(new Set());
  const [newlyFormedCrystals, setNewlyFormedCrystals] = useState<Set<string>>(new Set());
  const [activatingCrystals, setActivatingCrystals] = useState<Set<string>>(new Set());
  
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [comboCount, setComboCount] = useState(0);

  const [collectedColors, setCollectedColors] = useState<Partial<Record<CrystalType, number>>>({});
  const [clearedJelly, setClearedJelly] = useState(0);
  const [clearedBlockers, setClearedBlockers] = useState(0);
  
  const [isShaking, setIsShaking] = useState(false);
  const [hintedTiles, setHintedTiles] = useState<[Position, Position] | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  
  const [lives, setLives] = useState(() => {
    const savedLives = localStorage.getItem('lives');
    return savedLives ? parseInt(savedLives, 10) : MAX_LIVES;
  });
  const [nextLifeTimestamp, setNextLifeTimestamp] = useState<number | null>(() => {
    const savedTimestamp = localStorage.getItem('nextLifeTimestamp');
    return savedTimestamp ? parseInt(savedTimestamp, 10) : null;
  });
  const [levelProgress, setLevelProgress] = useState<Record<number, number>>(() => {
    const savedProgress = localStorage.getItem('sarah-heart-progress');
    return savedProgress ? JSON.parse(savedProgress) : {};
  });

  const isProcessing = useRef(false);

  const createInitialGrid = useCallback((level: Level): GridType => {
    let newGrid: GridType = [];
    do {
      newGrid = [];
      for (let row = 0; row < GRID_SIZE; row++) {
        const newRow: Tile[] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
          const layoutChar = level.layout?.[row]?.[col * 2];
          let background: BackgroundType | null = null;
          if (layoutChar === 'j') background = BackgroundType.Jelly;
          else if (layoutChar === 'X') background = BackgroundType.Blocker;
          
          const validTypes = getValidCrystalTypes(newGrid, newRow, row, col);
          const crystalType = validTypes[Math.floor(Math.random() * validTypes.length)];
          const crystal = background === BackgroundType.Blocker ? null : createNewCrystal(row, col, crystalType);
          newRow.push({ id: `tile-${row}-${col}`, crystal, background });
        }
        newGrid.push(newRow);
      }
    } while (findPossibleMoves(newGrid).length === 0 || findMatches(newGrid).length > 0);
    return newGrid;
  }, []);

  const findMatches = (currentGrid: GridType): Position[][] => {
      const allMatches: Position[][] = [];
      const checked = new Set<string>();

      for (let row = 0; row < GRID_SIZE; row++) {
          for (let col = 0; col < GRID_SIZE; col++) {
              const crystal = currentGrid[row][col].crystal;
              if (!crystal || checked.has(`${row}-${col}`)) continue;

              const match: Position[] = [];
              const stack: Position[] = [{row, col}];
              const visited = new Set<string>([`${row}-${col}`]);

              while(stack.length > 0) {
                  const pos = stack.pop()!;
                  match.push(pos);
                  [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                      const newR = pos.row + dr;
                      const newC = pos.col + dc;
                      if(newR >= 0 && newR < GRID_SIZE && newC >=0 && newC < GRID_SIZE && !visited.has(`${newR}-${newC}`) && currentGrid[newR][newC].crystal?.type === crystal.type) {
                          stack.push({row: newR, col: newC});
                          visited.add(`${newR}-${newC}`);
                      }
                  });
              }

              const rows = new Map<number, Position[]>();
              const cols = new Map<number, Position[]>();
              match.forEach(p => {
                  if(!rows.has(p.row)) rows.set(p.row, []);
                  if(!cols.has(p.col)) cols.set(p.col, []);
                  rows.get(p.row)!.push(p);
                  cols.get(p.col)!.push(p);
              });

              visited.forEach(v => checked.add(v));
              
              rows.forEach(rMatch => { if(rMatch.length >= 3) allMatches.push(rMatch) });
              cols.forEach(cMatch => { if(cMatch.length >= 3) allMatches.push(cMatch) });
          }
      }

      const uniqueMatches: Position[][] = [];
      const matchedPositions = new Set<string>();
      allMatches.sort((a, b) => b.length - a.length);
      for (const match of allMatches) {
          const newMatch = match.filter(p => !matchedPositions.has(`${p.row}-${p.col}`));
          if (newMatch.length >= 3) {
              uniqueMatches.push(match); // Push original match to check for L/T shapes
              newMatch.forEach(p => matchedPositions.add(`${p.row}-${p.col}`));
          }
      }
      return uniqueMatches;
  };

  const findPossibleMoves = (currentGrid: GridType): [Position, Position][] => {
    const moves: [Position, Position][] = [];
    const testSwap = (r1: number, c1: number, r2: number, c2: number) => {
        const tempGrid = JSON.parse(JSON.stringify(currentGrid));
        const c_1 = tempGrid[r1][c1].crystal;
        const c_2 = tempGrid[r2][c2].crystal;
        if (!c_1 || !c_2) return;
        if (c_1.special === SpecialType.ColorBomb || c_2.special === SpecialType.ColorBomb) {
            moves.push([{ row: r1, col: c1 }, { row: r2, col: c2 }]);
            return;
        }
        [tempGrid[r1][c1].crystal, tempGrid[r2][c2].crystal] = [c_2, c_1];
        if (findMatches(tempGrid).length > 0) {
            moves.push([{ row: r1, col: c1 }, { row: r2, col: c2 }]);
        }
    };
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (c < GRID_SIZE - 1) testSwap(r, c, r, c + 1);
        if (r < GRID_SIZE - 1) testSwap(r, c, r + 1, c);
      }
    }
    return moves;
  };
  
  const handleStartLevel = useCallback((levelIndex: number) => {
    if (lives <= 0 && gameState === GameState.LevelSelection) return;

    if (gameState === GameState.Playing || (gameState === GameState.LevelSelection && lives > 0)) {
        if (gameState === GameState.LevelSelection) {
            setLives(prev => {
                const newLives = prev - 1;
                if (newLives < MAX_LIVES && nextLifeTimestamp === null) {
                    setNextLifeTimestamp(Date.now() + LIFE_REGEN_TIME_MS);
                }
                return newLives;
            });
        }
    } else {
        return;
    }

    playSound(SoundType.LevelStart, 0.5);
    const level = LEVELS[levelIndex];
    setCurrentLevelIndex(levelIndex);
    setScore(0);
    setMoves(level.moves);
    setGameState(GameState.Playing);
    setGrid(createInitialGrid(level));
    setCollectedColors({});
    setClearedJelly(0);
    setClearedBlockers(0);
    setLastNonInteractiveGrid(null);
    setComboCount(0);
    setSelectedCrystal(null);
    setActiveEffects([]);
    setFloatingScores([]);
  }, [lives, gameState, createInitialGrid, nextLifeTimestamp]);

  const checkWinLossConditions = useCallback(() => {
    const level = LEVELS[currentLevelIndex];
    if (!level) return;

    let scoreMet = !level.targetScore || score >= level.targetScore;
    let colorsMet = !level.targetColors || (Object.keys(level.targetColors) as CrystalType[]).every(color => (collectedColors[color] || 0) >= level.targetColors![color]!);
    let jellyMet = !level.targetJelly || clearedJelly >= level.targetJelly;
    let blockersMet = !level.targetBlockers || clearedBlockers >= level.targetBlockers;
    
    if (scoreMet && colorsMet && jellyMet && blockersMet) {
      playSound(SoundType.Win, 0.7);
      setGameState(GameState.Won);
       let stars = 0;
      if (score >= level.starScores[0]) stars = 1;
      if (score >= level.starScores[1]) stars = 2;
      if (score >= level.starScores[2]) stars = 3;
      setLevelProgress(prev => {
          const newProgress = {...prev};
          if(stars > (newProgress[currentLevelIndex] || 0)) {
              newProgress[currentLevelIndex] = stars;
          }
          return newProgress;
      });
    } else if (moves <= 0) {
      playSound(SoundType.Lose, 0.7);
      setGameState(GameState.Lost);
    }
  }, [score, moves, currentLevelIndex, collectedColors, clearedJelly, clearedBlockers]);

    const processBoardStateUpdate = useCallback(async (
        clearedPositions: Set<string>,
        newlyFormedSpecials: {position: Position, special: SpecialType, type: CrystalType}[],
        currentGrid: GridType
    ) => {
        let turnScore = 0;
        let turnCollectedColors: Partial<Record<CrystalType, number>> = {};
        let turnClearedJelly = 0;
        let turnClearedBlockers = 0;
        const combo = comboCount + 1;

        const addScore = (amount: number, position: Position) => {
            turnScore += amount;
            setFloatingScores(prev => [...prev, { id: `fs-${Date.now()}-${Math.random()}`, score: amount, position }]);
        };

        clearedPositions.forEach(posStr => {
            const [row, col] = posStr.split('-').map(Number);
            const tile = currentGrid[row][col];
            if (tile.crystal) {
                const type = tile.crystal.type;
                turnCollectedColors[type] = (turnCollectedColors[type] || 0) + 1;
                addScore(BASE_SCORE * combo, { row, col });
                if (tile.crystal.special) addScore(SPECIAL_CRYSTAL_SCORE * combo, { row, col });
            }
            if (tile.background === BackgroundType.Jelly) {
                tile.background = null;
                turnClearedJelly++;
                addScore(JELLY_CLEAR_SCORE * combo, { row, col });
            } else if (tile.background === BackgroundType.Blocker) {
                tile.background = null;
                turnClearedBlockers++;
                addScore(BLOCKER_CLEAR_SCORE * combo, { row, col });
            }
            tile.crystal = null;
        });

        setClearingTiles(clearedPositions);
        setShockwaveCrystals(clearedPositions);
        setComboCount(combo);
        if (combo > 1) playSound(SoundType[`Match${Math.min(combo, 4) as 2 | 3 | 4}`], 0.6);
        else playSound(SoundType.Match1, 0.6);

        await sleep(CLEAR_ANIMATION_DURATION);

        const newlyFormedIds = new Set<string>();
        newlyFormedSpecials.forEach(({ position, special, type }) => {
            currentGrid[position.row][position.col].crystal = { ...createNewCrystal(position.row, position.col, type), special };
            newlyFormedIds.add(`${position.row}-${position.col}`);
        });
        setNewlyFormedCrystals(newlyFormedIds);

        setGrid(JSON.parse(JSON.stringify(currentGrid)));
        setClearingTiles(new Set());
        setActivatingCrystals(new Set());
        setShockwaveCrystals(new Set());

        await sleep(100);

        // Gravity
        for (let col = 0; col < GRID_SIZE; col++) {
            const crystalsInCol: Crystal[] = [];
            // Step 1: Collect all crystals in the column and clear them from the grid
            for (let row = 0; row < GRID_SIZE; row++) {
                if (currentGrid[row][col].crystal) {
                    crystalsInCol.push(currentGrid[row][col].crystal!);
                    currentGrid[row][col].crystal = null;
                }
            }

            // Step 2: Place crystals back, starting from the bottom, skipping blockers
            let crystalIdx = crystalsInCol.length - 1;
            for (let row = GRID_SIZE - 1; row >= 0; row--) {
                if (currentGrid[row][col].background !== BackgroundType.Blocker) {
                    if (crystalIdx >= 0) {
                        currentGrid[row][col].crystal = crystalsInCol[crystalIdx];
                        crystalIdx--;
                    }
                }
            }
        }
        setGrid(JSON.parse(JSON.stringify(currentGrid)));
        await sleep(FALL_ANIMATION_DURATION);

        // Refill
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (!currentGrid[row][col].crystal && currentGrid[row][col].background !== BackgroundType.Blocker) {
                    currentGrid[row][col].crystal = createNewCrystal(row, col);
                }
            }
        }
        setGrid(JSON.parse(JSON.stringify(currentGrid)));
        setNewlyFormedCrystals(new Set());
        await sleep(FALL_ANIMATION_DURATION / 2);

        setScore(s => s + turnScore);
        setCollectedColors(prev => {
            const newCollected = { ...prev };
            for (const color in turnCollectedColors) {
                newCollected[color as CrystalType] = (newCollected[color as CrystalType] || 0) + turnCollectedColors[color as CrystalType]!;
            }
            return newCollected;
        });
        setClearedJelly(j => j + turnClearedJelly);
        setClearedBlockers(b => b + turnClearedBlockers);
        
        return currentGrid;
    }, [comboCount]);

    const processMatchesAndRefill = useCallback(async (currentGrid: GridType) => {
        isProcessing.current = true;
        let matches = findMatches(currentGrid);
        
        while (matches.length > 0) {
            const specialActivations: { pos: Position, special: SpecialType, type: CrystalType }[] = [];
            const allClearPositions = new Set<string>();
            const newlyFormedSpecials: {position: Position, special: SpecialType, type: CrystalType}[] = [];

            matches.forEach(match => {
                match.forEach(p => {
                    const crystal = currentGrid[p.row][p.col].crystal;
                    if(crystal?.special) {
                        specialActivations.push({ pos: p, special: crystal.special, type: crystal.type });
                    }
                    allClearPositions.add(`${p.row}-${p.col}`);
                });

                const pos = match[0];
                const crystalType = currentGrid[pos.row][pos.col].crystal?.type;
                if(!crystalType) return;

                if (match.some(p => newlyFormedCrystals.has(`${p.row}-${p.col}`))) return;
                
                const isTOrLShape = match.some(p1 => match.some(p2 => p1.row === p2.row && p1.col !== p2.col) && match.some(p3 => p1.col === p3.col && p1.row !== p3.row));

                if (isTOrLShape || match.length >= 5) {
                    newlyFormedSpecials.push({ position: pos, special: SpecialType.Wrapped, type: crystalType });
                } else if (match.length >= 4) {
                     const isHorizontal = match[0].row === match[1].row;
                     newlyFormedSpecials.push({ position: pos, special: isHorizontal ? SpecialType.StripedVertical : SpecialType.StripedHorizontal, type: crystalType });
                }
            });

            for (const { pos, special, type } of specialActivations) {
                setActivatingCrystals(prev => new Set(prev).add(`${pos.row}-${pos.col}`));
                switch (special) {
                    case SpecialType.StripedHorizontal:
                        playSound(SoundType.StripedActivate, 0.7);
                        setActiveEffects(prev => [...prev, { id: `eff-${Date.now()}-${Math.random()}`, type: SpecialEffectType.StripedBeam, position: pos, direction: 'horizontal' }]);
                        for (let c = 0; c < GRID_SIZE; c++) allClearPositions.add(`${pos.row}-${c}`);
                        break;
                    case SpecialType.StripedVertical:
                        playSound(SoundType.StripedActivate, 0.7);
                        setActiveEffects(prev => [...prev, { id: `eff-${Date.now()}-${Math.random()}`, type: SpecialEffectType.StripedBeam, position: pos, direction: 'vertical' }]);
                        for (let r = 0; r < GRID_SIZE; r++) allClearPositions.add(`${r}-${pos.col}`);
                        break;
                    case SpecialType.Wrapped:
                        playSound(SoundType.WrappedActivate, 0.7);
                        setActiveEffects(prev => [...prev, { id: `eff-${Date.now()}-${Math.random()}`, type: SpecialEffectType.WrappedExplosion, position: pos }]);
                        for (let r = Math.max(0, pos.row - 1); r <= Math.min(GRID_SIZE - 1, pos.row + 1); r++) {
                            for (let c = Math.max(0, pos.col - 1); c <= Math.min(GRID_SIZE - 1, pos.col + 1); c++) {
                                allClearPositions.add(`${r}-${c}`);
                            }
                        }
                        break;
                    case SpecialType.ColorBomb:
                        playSound(SoundType.ColorBombActivate, 0.8);
                        const targets: Position[] = [];
                        for (let r = 0; r < GRID_SIZE; r++) {
                            for (let c = 0; c < GRID_SIZE; c++) {
                                if (currentGrid[r][c].crystal?.type === type) {
                                    allClearPositions.add(`${r}-${c}`);
                                    targets.push({ row: r, col: c });
                                }
                            }
                        }
                        setActiveEffects(prev => [...prev, { id: `eff-${Date.now()}-${Math.random()}`, type: SpecialEffectType.ColorBombArcs, position: pos, targets, color: type }]);
                        break;
                }
            }
            await sleep(EFFECT_ANIMATION_DURATION / 2);
            
            currentGrid = await processBoardStateUpdate(allClearPositions, newlyFormedSpecials, currentGrid);
            matches = findMatches(currentGrid);
        }

        setGrid(currentGrid);
        setComboCount(0);

        if (findPossibleMoves(currentGrid).length === 0) {
            await sleep(500);
            setGrid(createInitialGrid(LEVELS[currentLevelIndex]));
        }
        
        isProcessing.current = false;
        checkWinLossConditions();
    }, [processBoardStateUpdate, checkWinLossConditions, currentLevelIndex, createInitialGrid, newlyFormedCrystals]);

  const handleSpecialCombo = useCallback(async (p1: Position, p2: Position) => {
    isProcessing.current = true;
    const c1 = grid[p1.row][p1.col].crystal;
    const c2 = grid[p2.row][p2.col].crystal;
    if (!c1?.special || !c2?.special) {
        isProcessing.current = false;
        return;
    }

    setLastNonInteractiveGrid({grid: JSON.parse(JSON.stringify(grid)), score, moves, collectedColors, clearedJelly, clearedBlockers});
    setMoves(m => m - 1);
    setComboCount(0);
    
    let currentGrid = JSON.parse(JSON.stringify(grid));
    const allClearPositions = new Set<string>();
    currentGrid[p1.row][p1.col].crystal = null;
    currentGrid[p2.row][p2.col].crystal = null;
    allClearPositions.add(`${p1.row}-${p1.col}`);
    allClearPositions.add(`${p2.row}-${p2.col}`);
    
    const specials = [c1.special, c2.special].sort();
    const centerPos = p1;

    if(specials.includes(SpecialType.ColorBomb)) {
        playSound(SoundType.ComboColorBomb, 0.9);
        const otherCrystal = c1.special === SpecialType.ColorBomb ? c2 : c1;
        
        if(otherCrystal.special === SpecialType.ColorBomb) { // Double Color Bomb
            setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}`, type: SpecialEffectType.DoubleColorBombClear, position: centerPos}]);
             for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) allClearPositions.add(`${r}-${c}`);
        } else { // Color Bomb + Other Special
            const targetType = otherCrystal.type;
            const targets: Position[] = [];
            for (let r = 0; r < GRID_SIZE; r++) {
              for (let c = 0; c < GRID_SIZE; c++) {
                if (currentGrid[r][c].crystal?.type === targetType) {
                  targets.push({row: r, col: c});
                }
              }
            }
            setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}-arcs`, type: SpecialEffectType.ColorBombArcs, position: centerPos, targets, color: targetType}]);
            setActivatingCrystals(prev => new Set([...prev, ...targets.map(p => `${p.row}-${p.col}`)]));
            await sleep(EFFECT_ANIMATION_DURATION);
            
            targets.forEach(pos => {
                if (otherCrystal.special.startsWith('Striped')) {
                    const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                    setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}-${pos.row}-${pos.col}`, type: SpecialEffectType.StripedBeam, position: pos, direction}]);
                    if (direction === 'horizontal') for(let c=0; c<GRID_SIZE; c++) allClearPositions.add(`${pos.row}-${c}`);
                    else for(let r=0; r<GRID_SIZE; r++) allClearPositions.add(`${r}-${pos.col}`);
                } else if (otherCrystal.special === SpecialType.Wrapped) {
                    setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}-${pos.row}-${pos.col}`, type: SpecialEffectType.WrappedExplosion, position: pos}]);
                    for(let r = Math.max(0, pos.row-1); r<=Math.min(GRID_SIZE-1, pos.row+1); r++) for(let c = Math.max(0, pos.col-1); c<=Math.min(GRID_SIZE-1, pos.col+1); c++) allClearPositions.add(`${r}-${c}`);
                }
            });
        }
    } else if (specials[0].startsWith('Striped') && specials[1].startsWith('Striped')) { // Double Striped
        playSound(SoundType.StripedActivate, 0.8);
        setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}-h`, type: SpecialEffectType.StripedBeam, position: centerPos, direction: 'horizontal'}]);
        setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}-v`, type: SpecialEffectType.StripedBeam, position: centerPos, direction: 'vertical'}]);
        for (let i = 0; i < GRID_SIZE; i++) {
            allClearPositions.add(`${centerPos.row}-${i}`);
            allClearPositions.add(`${i}-${centerPos.col}`);
        }
    } else if (specials.includes(SpecialType.Wrapped) && specials.some(s => s.startsWith('Striped'))) { // Striped + Wrapped
        playSound(SoundType.ComboStripedWrapped, 0.9);
        setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}`, type: SpecialEffectType.StripedWrappedBlast, position: centerPos}]);
        for(let i = 0; i < GRID_SIZE; i++) {
            for(let d = -1; d <= 1; d++) {
                allClearPositions.add(`${centerPos.row+d}-${i}`);
                allClearPositions.add(`${i}-${centerPos.col+d}`);
            }
        }
    } else if (specials[0] === SpecialType.Wrapped && specials[1] === SpecialType.Wrapped) { // Double Wrapped
        playSound(SoundType.ComboDoubleWrapped, 0.9);
        setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}`, type: SpecialEffectType.DoubleWrappedBlast, position: centerPos}]);
        for(let r = Math.max(0, centerPos.row-2); r<=Math.min(GRID_SIZE-1, centerPos.row+2); r++) {
            for(let c = Math.max(0, centerPos.col-2); c<=Math.min(GRID_SIZE-1, centerPos.col+2); c++) {
                allClearPositions.add(`${r}-${c}`);
            }
        }
    }
    
    await sleep(EFFECT_ANIMATION_DURATION);
    const updatedGrid = await processBoardStateUpdate(allClearPositions, [], currentGrid);
    await processMatchesAndRefill(updatedGrid);
    
  }, [grid, score, moves, collectedColors, clearedJelly, clearedBlockers, processBoardStateUpdate, processMatchesAndRefill]);
  
  const processMove = useCallback(async (p1: Position, p2: Position) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    
    const c1 = grid[p1.row][p1.col].crystal;
    const c2 = grid[p2.row][p2.col].crystal;

    if (c1?.special && c2?.special) {
        await handleSpecialCombo(p1, p2);
        return;
    }
    
    setLastNonInteractiveGrid({grid: JSON.parse(JSON.stringify(grid)), score, moves, collectedColors, clearedJelly, clearedBlockers});
    setSelectedCrystal(null);
    setSwappingCrystals([p1, p2]);
    playSound(SoundType.Swap);

    let newGrid = JSON.parse(JSON.stringify(grid));
    [newGrid[p1.row][p1.col].crystal, newGrid[p2.row][p2.col].crystal] = [newGrid[p2.row][p2.col].crystal, newGrid[p1.row][p1.col].crystal];

    await sleep(SWAP_ANIMATION_DURATION);
    setGrid(newGrid);
    setSwappingCrystals(null);
    
    const matches = findMatches(newGrid);
    if (matches.length === 0) {
        playSound(SoundType.InvalidSwap);
        setSwappingCrystals([p1, p2]);
        setIsShaking(true);
        await sleep(SWAP_ANIMATION_DURATION);
        setGrid(grid);
        setSwappingCrystals(null);
        setLastNonInteractiveGrid(null);
        setIsShaking(false);
        isProcessing.current = false;
        return;
    }
    
    setMoves(m => m - 1);
    await processMatchesAndRefill(newGrid);
  }, [grid, score, moves, collectedColors, clearedJelly, clearedBlockers, processMatchesAndRefill, handleSpecialCombo]);

  const handleCrystalClick = useCallback(async (row: number, col: number) => {
    if (isProcessing.current || gameState !== GameState.Playing) return;
    
    const clickedCrystal = grid[row]?.[col]?.crystal;
    if (!clickedCrystal) return;

    setHintedTiles(null);

    if (selectedCrystal) {
        if (selectedCrystal.row === row && selectedCrystal.col === col) {
            setSelectedCrystal(null);
            return;
        }
        const dx = Math.abs(selectedCrystal.col - col);
        const dy = Math.abs(selectedCrystal.row - row);
        if (dx + dy === 1) {
            await processMove(selectedCrystal, { row, col });
        } else {
            playSound(SoundType.Click, 0.4);
            setSelectedCrystal({ row, col });
        }
    } else {
        playSound(SoundType.Click, 0.4);
        setSelectedCrystal({ row, col });
    }
  }, [grid, gameState, selectedCrystal, processMove]);
  
    // Effet pour montrer une suggestion après 5 secondes d'inactivité
    useEffect(() => {
        let timer: number | undefined;
        if (gameState === GameState.Playing && !isProcessing.current && !selectedCrystal && !hintedTiles) {
            timer = window.setTimeout(() => {
                const possibleMoves = findPossibleMoves(grid);
                if (possibleMoves.length > 0) {
                    setHintedTiles(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
                }
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [grid, gameState, isProcessing.current, selectedCrystal, hintedTiles]);
    
    // Effet pour faire disparaître la suggestion après 3 secondes
    useEffect(() => {
        if (!hintedTiles) {
            return;
        }
        const timerId = window.setTimeout(() => {
            setHintedTiles(null);
        }, 3000); // La suggestion est visible pendant 3 secondes
        return () => clearTimeout(timerId);
    }, [hintedTiles]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            if (nextLifeTimestamp && Date.now() >= nextLifeTimestamp) {
                setLives(prevLives => {
                    const newLives = Math.min(MAX_LIVES, prevLives + 1);
                    if (newLives < MAX_LIVES) {
                        setNextLifeTimestamp(Date.now() + LIFE_REGEN_TIME_MS);
                    } else {
                        setNextLifeTimestamp(null);
                    }
                    return newLives;
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [nextLifeTimestamp]);

    useEffect(() => {
        localStorage.setItem('lives', lives.toString());
        if (nextLifeTimestamp) {
            localStorage.setItem('nextLifeTimestamp', nextLifeTimestamp.toString());
        } else {
            localStorage.removeItem('nextLifeTimestamp');
        }
        localStorage.setItem('sarah-heart-progress', JSON.stringify(levelProgress));
    }, [lives, nextLifeTimestamp, levelProgress]);

    const level = LEVELS[currentLevelIndex];

    useEffect(() => {
      if (gameState !== GameState.LevelSelection && !level) {
        console.error(`Invalid level index: ${currentLevelIndex}. Resetting to level selection.`);
        setGameState(GameState.LevelSelection);
      }
    }, [gameState, level, currentLevelIndex]);

  const handlePause = () => setGameState(GameState.Paused);
  const handleResume = () => setGameState(GameState.Playing);
  const handleQuit = () => setGameState(GameState.LevelSelection);
  const handleRestart = () => handleStartLevel(currentLevelIndex);
  const handleNextLevel = () => handleStartLevel(Math.min(currentLevelIndex + 1, LEVELS.length - 1));
  const handleGoToLevels = () => setGameState(GameState.LevelSelection);

  const handleSwapBack = () => {
      if (lastNonInteractiveGrid) {
          setGrid(lastNonInteractiveGrid.grid);
          setScore(lastNonInteractiveGrid.score);
          setMoves(lastNonInteractiveGrid.moves);
          setCollectedColors(lastNonInteractiveGrid.collectedColors);
          setClearedJelly(lastNonInteractiveGrid.clearedJelly);
          setClearedBlockers(lastNonInteractiveGrid.clearedBlockers);
          setLastNonInteractiveGrid(null);
          setGameState(GameState.Playing);
          playSound(SoundType.Click, 0.6);
      }
  };

  const handleGetHint = () => {
      if(isHintLoading) return;
      setIsHintLoading(true);
      setHintedTiles(null); // Efface la suggestion précédente immédiatement
      setTimeout(() => {
          const possibleMoves = findPossibleMoves(grid);
          if (possibleMoves.length > 0) {
              setHintedTiles(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
          }
          setIsHintLoading(false);
      }, 300);
  };
  
  if (gameState === GameState.LevelSelection) {
    return <LevelSelectionScreen onSelectLevel={handleStartLevel} lives={lives} nextLifeTimestamp={nextLifeTimestamp} levelProgress={levelProgress}/>;
  }
  
  if (!level) {
    // This will be shown for a single frame before the useEffect kicks in to reset the state.
    return null; 
  }

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col items-center justify-center p-2 font-sans overflow-hidden">
        <div className="relative">
            <GameInfo
              score={score}
              moves={moves}
              level={level.level}
              targetScore={level.targetScore}
              targetColors={level.targetColors}
              targetJelly={level.targetJelly}
              targetBlockers={level.targetBlockers}
              collectedColors={collectedColors}
              clearedJelly={clearedJelly}
              clearedBlockers={clearedBlockers}
              onBack={handleQuit}
              onPause={handlePause}
              onGetHint={handleGetHint}
              isHintLoading={isHintLoading}
            />
            <GameBoard
              grid={grid}
              selectedCrystal={selectedCrystal}
              onCrystalClick={handleCrystalClick}
              swappingCrystals={swappingCrystals}
              clearingTiles={clearingTiles}
              shockwaveCrystals={shockwaveCrystals}
              newlyFormedCrystals={newlyFormedCrystals}
              activatingCrystals={activatingCrystals}
              isShaking={isShaking}
              hintedTiles={hintedTiles}
            />
            <FloatingScores floatingScores={floatingScores} />
            <SpecialEffects activeEffects={activeEffects} />
            <ComboDisplay comboCount={comboCount} />
        </div>
      
      <GameOverModal
        gameState={gameState}
        score={score}
        currentLevelIndex={currentLevelIndex}
        onReplayLevel={handleRestart}
        onRestartGame={() => handleStartLevel(0)}
        onNextLevel={handleNextLevel}
        onGoToLevels={handleGoToLevels}
        isLastLevel={currentLevelIndex === LEVELS.length - 1}
      />

      {gameState === GameState.Paused && (
        <PauseMenu 
            onResume={handleResume} 
            onRestart={handleRestart} 
            onQuit={handleQuit}
            onSwapBack={handleSwapBack}
            canSwapBack={!!lastNonInteractiveGrid}
        />
      )}
    </div>
  );
};