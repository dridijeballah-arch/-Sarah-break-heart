
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
} from './types';
import {
  GRID_SIZE,
  CRYSTAL_TYPES,
  LEVELS,
  SWAP_ANIMATION_DURATION,
  CLEAR_ANIMATION_DURATION,
  FALL_ANIMATION_DURATION,
  FLOATING_SCORE_ANIMATION_DURATION,
  EFFECT_ANIMATION_DURATION,
  BASE_SCORE,
  SPECIAL_CRYSTAL_SCORE,
  MAX_LIVES,
  LIFE_REGEN_TIME_MS,
  JELLY_CLEAR_SCORE,
  BLOCKER_CLEAR_SCORE,
} from './constants';

// Helper function to sleep for a duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LevelSelection);
  const [grid, setGrid] = useState<GridType>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [selectedCrystal, setSelectedCrystal] = useState<Position | null>(null);
  const [lastNonMatchingSwap, setLastNonMatchingSwap] = useState<[Position, Position] | null>(null);

  // Animation states
  const [swappingCrystals, setSwappingCrystals] = useState<[Position, Position] | null>(null);
  const [clearingTiles, setClearingTiles] = useState<Set<string>>(new Set());
  const [shockwaveCrystals, setShockwaveCrystals] = useState<Set<string>>(new Set());
  const [newlyFormedCrystals, setNewlyFormedCrystals] = useState<Set<string>>(new Set());
  const [activatingCrystals, setActivatingCrystals] = useState<Set<string>>(new Set());
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  
  // Objective states
  const [collectedColors, setCollectedColors] = useState<Partial<Record<CrystalType, number>>>({});
  const [clearedJelly, setClearedJelly] = useState(0);
  const [clearedBlockers, setClearedBlockers] = useState(0);

  const [comboCount, setComboCount] = useState(0);

  const isProcessingRef = useRef(false);
  const [isInputDisabled, setIsInputDisabled] = useState(false);

  // Lives Management
  const [lives, setLives] = useState<number>(() => {
    const savedLives = localStorage.getItem('crystalCrushLives');
    return savedLives ? parseInt(savedLives, 10) : MAX_LIVES;
  });
  const [nextLifeTimestamp, setNextLifeTimestamp] = useState<number | null>(() => {
    const savedTimestamp = localStorage.getItem('crystalCrushNextLifeTimestamp');
    return savedTimestamp ? parseInt(savedTimestamp, 10) : null;
  });

  // Persist lives state
  useEffect(() => {
    localStorage.setItem('crystalCrushLives', lives.toString());
    if (nextLifeTimestamp) {
      localStorage.setItem('crystalCrushNextLifeTimestamp', nextLifeTimestamp.toString());
    } else {
      localStorage.removeItem('crystalCrushNextLifeTimestamp');
    }
  }, [lives, nextLifeTimestamp]);

  // Life regeneration timer
  useEffect(() => {
    if (lives >= MAX_LIVES) {
      if(nextLifeTimestamp) setNextLifeTimestamp(null);
      return;
    };

    const timer = setInterval(() => {
      if (nextLifeTimestamp && Date.now() >= nextLifeTimestamp) {
        setLives(prevLives => {
            const newLives = prevLives + 1;
            if (newLives < MAX_LIVES) {
                setNextLifeTimestamp(Date.now() + LIFE_REGEN_TIME_MS);
            } else {
                setNextLifeTimestamp(null);
            }
            return newLives;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lives, nextLifeTimestamp]);

  const loseLife = () => {
    if (lives > 0) {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives < MAX_LIVES && !nextLifeTimestamp) {
        setNextLifeTimestamp(Date.now() + LIFE_REGEN_TIME_MS);
      }
    }
  };


  const createCrystal = (row: number, col: number, type?: CrystalType): Crystal => ({
    id: `${row}-${col}-${Date.now()}-${Math.random()}`,
    type: type || CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)],
  });

  const findMatches = useCallback((currentGrid: GridType): { matches: Set<string>, specialFormations: Map<string, SpecialType> } => {
    const matches = new Set<string>();
    const specialFormations = new Map<string, SpecialType>();

    const checkLine = (startRow: number, startCol: number, dRow: number, dCol: number) => {
      const line: {pos: Position, type: CrystalType}[] = [];
      let r = startRow, c = startCol;
      while(r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && currentGrid[r][c]?.crystal) {
        line.push({pos: {row: r, col: c}, type: currentGrid[r][c]!.crystal!.type});
        r += dRow;
        c += dCol;
      }

      for (let i = 0; i < line.length; i++) {
        const match = [line[i]];
        for (let j = i + 1; j < line.length; j++) {
          if (line[j].type === match[0].type) {
            match.push(line[j]);
          } else {
            break;
          }
        }

        if (match.length >= 3) {
          const keyPositions = match.map(m => m.pos);
          keyPositions.forEach(p => matches.add(`${p.row}-${p.col}`));

          if (match.length === 4) {
             const formationKey = `${keyPositions[1].row}-${keyPositions[1].col}`;
             specialFormations.set(formationKey, dRow === 0 ? SpecialType.StripedVertical : SpecialType.StripedHorizontal);
          }
          if (match.length >= 5) {
            const formationKey = `${keyPositions[2].row}-${keyPositions[2].col}`;
            specialFormations.set(formationKey, SpecialType.ColorBomb);
          }
          i += match.length - 1;
        }
      }
    };
    
    for(let i = 0; i < GRID_SIZE; i++) {
      checkLine(i, 0, 0, 1);
      checkLine(0, i, 1, 0);
    }
    
    const potentialWrapped = new Map<string, number>();
    matches.forEach(key => {
        const [r, c] = key.split('-').map(Number);
        const rowKey = `r-${r}`;
        const colKey = `c-${c}`;
        potentialWrapped.set(rowKey, (potentialWrapped.get(rowKey) || 0) + 1);
        potentialWrapped.set(colKey, (potentialWrapped.get(colKey) || 0) + 1);
    });

    matches.forEach(key => {
        const [r, c] = key.split('-').map(Number);
        if ((potentialWrapped.get(`r-${r}`) || 0) >= 3 && (potentialWrapped.get(`c-${c}`) || 0) >= 3) {
            specialFormations.set(`${r}-${c}`, SpecialType.Wrapped);
        }
    });

    return { matches, specialFormations };
  }, []);

  const initializeGrid = useCallback((levelIndex: number): GridType => {
    const newGrid: GridType = [];
    const levelLayout = LEVELS[levelIndex]?.layout;

    for (let row = 0; row < GRID_SIZE; row++) {
      newGrid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const tileId = `${row}-${col}`;
        let crystal: Crystal | null = null;
        let background: BackgroundType | null = null;

        const layoutString = levelLayout ? levelLayout[row]?.split(' ')[col] : '.';
        
        if (layoutString === 'X') {
            background = BackgroundType.Blocker;
        } else {
            if (layoutString?.includes('j')) background = BackgroundType.Jelly;
            crystal = createCrystal(row, col);
        }
        
        newGrid[row][col] = { id: tileId, crystal, background };
      }
    }
    
    let hasMatches = true;
    while (hasMatches) {
        const { matches } = findMatches(newGrid);
        if (matches.size === 0) {
            hasMatches = false;
        } else {
            matches.forEach(key => {
                const [row, col] = key.split('-').map(Number);
                if (newGrid[row][col].crystal) {
                    newGrid[row][col].crystal = createCrystal(row, col);
                }
            });
        }
    }
    return newGrid;
  }, [findMatches]);

  const startGame = useCallback((levelIndex: number, isRetry = false) => {
    if (lives <= 0 && !isRetry) return;
    if (!isRetry) loseLife();

    const level = LEVELS[levelIndex];
    setCurrentLevelIndex(levelIndex);
    setScore(0);
    setMoves(level.moves);
    setCollectedColors({});
    setClearedJelly(0);
    setClearedBlockers(0);
    setGrid(initializeGrid(levelIndex));
    setGameState(GameState.Playing);
    setSelectedCrystal(null);
    setLastNonMatchingSwap(null);
    isProcessingRef.current = false;
    setIsInputDisabled(false);
  }, [initializeGrid, lives]);

  const addFloatingScore = useCallback((score: number, position: Position) => {
    const id = `fs-${Date.now()}-${Math.random()}`;
    setFloatingScores(prev => [...prev, { id, score, position }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(fs => fs.id !== id));
    }, FLOATING_SCORE_ANIMATION_DURATION);
  }, []);
  
  const addActiveEffect = useCallback((effect: Omit<ActiveEffect, 'id'>) => {
    const id = `ae-${Date.now()}-${Math.random()}`;
    setActiveEffects(prev => [...prev, { ...effect, id }]);
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(ae => ae.id !== id));
    }, EFFECT_ANIMATION_DURATION);
  }, []);

  const checkWinLossConditions = useCallback((updatedMoves: number, updatedScore: number, updatedCollectedColors: Partial<Record<CrystalType, number>>, updatedClearedJelly: number, updatedClearedBlockers: number) => {
    const level = LEVELS[currentLevelIndex];
    let isWon = true;

    if (level.targetScore && updatedScore < level.targetScore) isWon = false;
    if (level.targetJelly && updatedClearedJelly < level.targetJelly) isWon = false;
    if (level.targetBlockers && updatedClearedBlockers < level.targetBlockers) isWon = false;

    if (level.targetColors) {
      for (const color in level.targetColors) {
        if ((updatedCollectedColors[color as CrystalType] || 0) < level.targetColors[color as CrystalType]!) {
          isWon = false;
          break;
        }
      }
    }

    if (isWon) {
      setGameState(GameState.Won);
      isProcessingRef.current = false; setIsInputDisabled(false);
      return;
    }

    if (updatedMoves <= 0) {
      setGameState(GameState.Lost);
      isProcessingRef.current = false; setIsInputDisabled(false);
    }
  }, [currentLevelIndex]);

  const processMatchesAndCascades = useCallback(async (currentGrid: GridType, isMove: boolean = false, initialClears: Set<string> = new Set()) => {
    if (isProcessingRef.current && !isMove) return;
    isProcessingRef.current = true;
    setIsInputDisabled(true);

    let gridToProcess = currentGrid;
    let combo = 0;
    
    let tempScore = score;
    let tempCollectedColors = { ...collectedColors };
    let tempClearedJelly = clearedJelly;
    let tempClearedBlockers = clearedBlockers;

    const initialMoves = isMove ? moves - 1 : moves;
    if (isMove) setMoves(initialMoves);

    const activatedSpecialsInTurn = new Set<string>();
    const initialClearsCopy = new Set(initialClears);


    while(true) {
        const tilesToClear = new Set<string>(initialClearsCopy);
        initialClearsCopy.clear(); // Only use on the first iteration
        const activationQueue: {crystal: Crystal, position: Position}[] = [];

        const { matches, specialFormations } = findMatches(gridToProcess);
        matches.forEach(key => tilesToClear.add(key));

        matches.forEach(key => {
            const [r, c] = key.split('-').map(Number);
            const tile = gridToProcess[r][c];
            if (tile.crystal?.special && !activatedSpecialsInTurn.has(key)) {
                activationQueue.push({ crystal: tile.crystal, position: { row: r, col: c }});
                activatedSpecialsInTurn.add(key);
            }
        });

        gridToProcess.forEach((row, r) => row.forEach((tile, c) => {
            if (tile.crystal?.special && tilesToClear.has(`${r}-${c}`) && !activatedSpecialsInTurn.has(`${r}-${c}`)) {
                 activationQueue.push({ crystal: tile.crystal, position: { row: r, col: c }});
                 activatedSpecialsInTurn.add(`${r}-${c}`);
            }
        }));
        
        while (activationQueue.length > 0) {
            const { crystal, position } = activationQueue.shift()!;
            setActivatingCrystals(prev => new Set(prev).add(`${position.row}-${position.col}`));

            if (crystal.special === SpecialType.StripedHorizontal) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const key = `${position.row}-${c}`;
                    tilesToClear.add(key);
                    const targetTile = gridToProcess[position.row][c];
                    if (targetTile.crystal?.special && !activatedSpecialsInTurn.has(key)) {
                        activationQueue.push({ crystal: targetTile.crystal, position: { row: position.row, col: c }});
                        activatedSpecialsInTurn.add(key);
                    }
                }
                addActiveEffect({ type: SpecialEffectType.StripedBeam, position, direction: 'horizontal' });
            } else if (crystal.special === SpecialType.StripedVertical) {
                 for (let r = 0; r < GRID_SIZE; r++) {
                    const key = `${r}-${position.col}`;
                    tilesToClear.add(key);
                    const targetTile = gridToProcess[r][position.col];
                    if (targetTile.crystal?.special && !activatedSpecialsInTurn.has(key)) {
                        activationQueue.push({ crystal: targetTile.crystal, position: { row: r, col: position.col }});
                        activatedSpecialsInTurn.add(key);
                    }
                }
                addActiveEffect({ type: SpecialEffectType.StripedBeam, position, direction: 'vertical' });
            } else if (crystal.special === SpecialType.Wrapped) {
                addActiveEffect({ type: SpecialEffectType.WrappedExplosion, position });
                for(let r = -1; r <= 1; r++) for(let c = -1; c <= 1; c++) {
                    const newRow = position.row + r, newCol = position.col + c;
                    if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                        const key = `${newRow}-${newCol}`;
                        tilesToClear.add(key);
                        const targetTile = gridToProcess[newRow][newCol];
                        if (targetTile.crystal?.special && !activatedSpecialsInTurn.has(key)) {
                            activationQueue.push({ crystal: targetTile.crystal, position: { row: newRow, col: newCol }});
                            activatedSpecialsInTurn.add(key);
                        }
                    }
                }
            } else if (crystal.special === SpecialType.ColorBomb) {
                const colorCounts: Partial<Record<CrystalType, number>> = {};
                let maxCount = 0;
                let colorToClear: CrystalType | null = null;
                gridToProcess.forEach(row => row.forEach(tile => {
                    if (tile.crystal && tile.crystal.special !== SpecialType.ColorBomb) {
                        colorCounts[tile.crystal.type] = (colorCounts[tile.crystal.type] || 0) + 1;
                    }
                }));
                (Object.keys(colorCounts) as CrystalType[]).forEach(color => {
                    if (colorCounts[color]! > maxCount) { maxCount = colorCounts[color]!; colorToClear = color; }
                });

                if (colorToClear) {
                    const targets: Position[] = [];
                    for(let r = 0; r < GRID_SIZE; r++) for(let c = 0; c < GRID_SIZE; c++) {
                        const currentTile = gridToProcess[r][c];
                        if (currentTile.crystal?.type === colorToClear) {
                            const key = `${r}-${c}`;
                            targets.push({ row: r, col: c });
                            tilesToClear.add(key);
                            if (currentTile.crystal.special && !activatedSpecialsInTurn.has(key)) {
                                activationQueue.push({ crystal: currentTile.crystal, position: { row: r, col: c }});
                                activatedSpecialsInTurn.add(key);
                            }
                        }
                    }
                    addActiveEffect({ type: SpecialEffectType.ColorBombArcs, position, color: colorToClear, targets });
                }
            }
        }

        const blockersToClear = new Set<string>();
        tilesToClear.forEach(key => {
            const [r, c] = key.split('-').map(Number);
            [[r-1,c], [r+1,c], [r,c-1], [r,c+1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                    if (gridToProcess[nr][nc].background === BackgroundType.Blocker) {
                        blockersToClear.add(`${nr}-${nc}`);
                    }
                }
            });
        });
        blockersToClear.forEach(key => tilesToClear.add(key));

        if (tilesToClear.size === 0) break;
        
        combo++;
        if (combo >= 2) setComboCount(combo);

        let points = 0;
        
        tilesToClear.forEach(key => {
            const [row, col] = key.split('-').map(Number);
            const tile = gridToProcess[row][col];
            if (tile.background === BackgroundType.Jelly) {
                points += JELLY_CLEAR_SCORE;
                tempClearedJelly++;
                addFloatingScore(JELLY_CLEAR_SCORE, { row, col });
            }
            if (tile.background === BackgroundType.Blocker) {
                points += BLOCKER_CLEAR_SCORE;
                tempClearedBlockers++;
                addFloatingScore(BLOCKER_CLEAR_SCORE, { row, col });
            }
            if(tile.crystal) {
                points += BASE_SCORE;
                tempCollectedColors[tile.crystal.type] = (tempCollectedColors[tile.crystal.type] || 0) + 1;
                if (tile.crystal.special) points += SPECIAL_CRYSTAL_SCORE;
                addFloatingScore(BASE_SCORE, { row, col });
            }
        });
        
        tempScore += points * combo;
        setScore(tempScore);
        setCollectedColors(tempCollectedColors);
        setClearedJelly(tempClearedJelly);
        setClearedBlockers(tempClearedBlockers);
        
        setClearingTiles(new Set(tilesToClear));
        await sleep(CLEAR_ANIMATION_DURATION);
        setTimeout(() => setActivatingCrystals(new Set()), CLEAR_ANIMATION_DURATION);
        
        let gridAfterClear = gridToProcess.map(row => row.map(tile => ({...tile, crystal: tile.crystal ? {...tile.crystal} : null})));
        tilesToClear.forEach(key => {
            const [row, col] = key.split('-').map(Number);
            gridAfterClear[row][col].crystal = null;
            if (gridAfterClear[row][col].background) {
                gridAfterClear[row][col].background = null;
            }
        });
        
        specialFormations.forEach((type, key) => {
            if (tilesToClear.has(key)) {
                const [row, col] = key.split('-').map(Number);
                const originalTile = gridToProcess[row][col];
                if (originalTile.crystal) {
                    gridAfterClear[row][col].crystal = { ...originalTile.crystal, id: `crystal-${row}-${col}-${Date.now()}`, special: type };
                    setNewlyFormedCrystals(prev => new Set(prev).add(`${row}-${col}`));
                }
            }
        });

        setGrid(gridAfterClear);
        setClearingTiles(new Set());
        
        let gridAfterDrop = gridAfterClear.map(row => row.map(tile => ({...tile, crystal: tile.crystal ? {...tile.crystal} : null})));
        for (let col = 0; col < GRID_SIZE; col++) {
            let emptyRow = GRID_SIZE - 1;
            for (let row = GRID_SIZE - 1; row >= 0; row--) {
                if (gridAfterDrop[row][col].background === BackgroundType.Blocker) continue;
                if (gridAfterDrop[row][col].crystal) {
                    if (row !== emptyRow) {
                        gridAfterDrop[emptyRow][col].crystal = gridAfterDrop[row][col].crystal;
                        gridAfterDrop[row][col].crystal = null;
                    }
                    emptyRow--;
                }
            }
        }

        await sleep(FALL_ANIMATION_DURATION);
        setGrid(gridAfterDrop);
        
        let gridAfterRefill = gridAfterDrop.map(row => row.map(tile => ({...tile, crystal: tile.crystal ? {...tile.crystal} : null})));
        const newlyRefilledCrystals = new Set<string>();
        for (let col = 0; col < GRID_SIZE; col++) {
            for (let row = 0; row < GRID_SIZE; row++) {
                if (gridAfterRefill[row][col].crystal === null && gridAfterRefill[row][col].background !== BackgroundType.Blocker) {
                    gridAfterRefill[row][col].crystal = createCrystal(row, col);
                    newlyRefilledCrystals.add(`${row}-${col}`);
                }
            }
        }
        
        if (newlyRefilledCrystals.size > 0) {
            setNewlyFormedCrystals(prev => new Set([...prev, ...newlyRefilledCrystals]));
        }
        
        await sleep(FALL_ANIMATION_DURATION);
        setGrid(gridAfterRefill);
        
        setTimeout(() => setNewlyFormedCrystals(new Set()), 400);

        gridToProcess = gridAfterRefill;
    }

    setComboCount(0);
    checkWinLossConditions(initialMoves, tempScore, tempCollectedColors, tempClearedJelly, tempClearedBlockers);
    
    isProcessingRef.current = false;
    setIsInputDisabled(false);
  }, [findMatches, addFloatingScore, collectedColors, score, moves, checkWinLossConditions, addActiveEffect, clearedJelly, clearedBlockers]);
  
  const handleSpecialSwap = useCallback(async (pos1: Position, pos2: Position) => {
      setLastNonMatchingSwap(null);
      isProcessingRef.current = true;
      setIsInputDisabled(true);

      const newMoves = moves - 1;
      setMoves(newMoves);
      
      const c1 = grid[pos1.row][pos1.col]!.crystal!;
      const c2 = grid[pos2.row][pos2.col]!.crystal!;

      setSwappingCrystals([pos1, pos2]);
      await sleep(SWAP_ANIMATION_DURATION);
      
      let tempGrid = grid.map(r => r.map(t => ({...t})));
      // The swapped specials disappear
      tempGrid[pos1.row][pos1.col].crystal = null;
      tempGrid[pos2.row][pos2.col].crystal = null;

      setGrid(tempGrid);
      setSwappingCrystals(null);

      setActivatingCrystals(new Set([`${pos1.row}-${pos1.col}`, `${pos2.row}-${pos2.col}`]));
      setTimeout(() => setActivatingCrystals(new Set()), EFFECT_ANIMATION_DURATION);

      const comboTilesToClear = new Set<string>([`${pos1.row}-${pos1.col}`, `${pos2.row}-${pos2.col}`]);
      const c1_type = c1.special;
      const c2_type = c2.special;

      const isStriped = (s?: SpecialType) => s === SpecialType.StripedHorizontal || s === SpecialType.StripedVertical;
      const isWrapped = (s?: SpecialType) => s === SpecialType.Wrapped;
      const isColorBomb = (s?: SpecialType) => s === SpecialType.ColorBomb;

      if (isColorBomb(c1_type) && isColorBomb(c2_type)) {
          addActiveEffect({ type: SpecialEffectType.DoubleColorBombClear });
          for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) {
              comboTilesToClear.add(`${r}-${c}`);
          }
      } else if ((isColorBomb(c1_type) && isStriped(c2_type)) || (isStriped(c1_type) && isColorBomb(c2_type))) {
          const striped = isStriped(c1_type) ? c1 : c2;
          const colorToTransform = striped.type;
          tempGrid.forEach((row, r) => row.forEach((tile, c) => {
              if (tile.crystal?.type === colorToTransform) {
                  const newStriped = { ...tile.crystal, special: Math.random() > 0.5 ? SpecialType.StripedHorizontal : SpecialType.StripedVertical };
                  tempGrid[r][c].crystal = newStriped;
                  comboTilesToClear.add(`${r}-${c}`);
              }
          }));
      } else if ((isColorBomb(c1_type) && isWrapped(c2_type)) || (isWrapped(c1_type) && isColorBomb(c2_type))) {
          const wrapped = isWrapped(c1_type) ? c1 : c2;
          const colorToClear1 = wrapped.type;
          const colorToClear2 = CRYSTAL_TYPES.filter(c => c !== colorToClear1)[Math.floor(Math.random() * (CRYSTAL_TYPES.length - 1))];
          tempGrid.forEach((row, r) => row.forEach((tile, c) => {
              if (tile.crystal?.type === colorToClear1 || tile.crystal?.type === colorToClear2) {
                  comboTilesToClear.add(`${r}-${c}`);
              }
          }));
      } else if ((isStriped(c1_type) && isWrapped(c2_type)) || (isWrapped(c1_type) && isStriped(c2_type))) {
          const center = pos1;
          addActiveEffect({ type: SpecialEffectType.StripedWrappedBlast, position: center });
          for (let i = -1; i <= 1; i++) {
              const r = center.row + i, c = center.col + i;
              if (r >= 0 && r < GRID_SIZE) for (let col = 0; col < GRID_SIZE; col++) comboTilesToClear.add(`${r}-${col}`);
              if (c >= 0 && c < GRID_SIZE) for (let row = 0; row < GRID_SIZE; row++) comboTilesToClear.add(`${row}-${c}`);
          }
      } else { // Default for striped+striped, wrapped+wrapped
          comboTilesToClear.add(`${pos1.row}-${pos1.col}`);
          comboTilesToClear.add(`${pos2.row}-${pos2.col}`);
      }

      await processMatchesAndCascades(tempGrid, false, comboTilesToClear);

  }, [grid, moves, addActiveEffect, processMatchesAndCascades]);


  const handleCrystalClick = useCallback(async (row: number, col: number) => {
    if (isProcessingRef.current || isInputDisabled) return;

    const clickedTile = grid[row][col];
    if (!clickedTile.crystal || clickedTile.background === BackgroundType.Blocker) return;

    if (!selectedCrystal) {
      setSelectedCrystal({ row, col });
      return;
    }

    if (selectedCrystal.row === row && selectedCrystal.col === col) {
      setSelectedCrystal(null);
      return;
    }

    const dx = Math.abs(selectedCrystal.row - row);
    const dy = Math.abs(selectedCrystal.col - col);
    const pos1 = selectedCrystal;
    const pos2 = { row, col };
    setSelectedCrystal(null);

    if (dx + dy === 1) { // Is adjacent
      const tile1 = grid[pos1.row][pos1.col];
      const tile2 = grid[pos2.row][pos2.col];
      
      if (!tile1.crystal || !tile2.crystal) return;

      if (tile1.crystal.special || tile2.crystal.special) {
          handleSpecialSwap(pos1, pos2);
          return;
      }
      
      isProcessingRef.current = true;
      setIsInputDisabled(true);
      
      const newGrid = grid.map(r => r.map(t => ({...t})));
      newGrid[pos1.row][pos1.col].crystal = tile2.crystal;
      newGrid[pos2.row][pos2.col].crystal = tile1.crystal;
      
      setSwappingCrystals([pos1, pos2]);
      await sleep(SWAP_ANIMATION_DURATION);
      setGrid(newGrid);
      setSwappingCrystals(null);
      
      const { matches } = findMatches(newGrid);
      if (matches.size > 0) {
        setLastNonMatchingSwap(null);
        processMatchesAndCascades(newGrid, true);
      } else {
        const newMoves = moves - 1;
        setMoves(newMoves);
        setLastNonMatchingSwap([pos1, pos2]);
        isProcessingRef.current = false;
        setIsInputDisabled(false);
        checkWinLossConditions(newMoves, score, collectedColors, clearedJelly, clearedBlockers);
      }
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      setSelectedCrystal({ row, col });
    }
  }, [grid, selectedCrystal, processMatchesAndCascades, isInputDisabled, findMatches, handleSpecialSwap, moves, score, collectedColors, checkWinLossConditions, clearedJelly, clearedBlockers]);

  const handlePause = () => setGameState(GameState.Paused);
  const handleResume = () => setGameState(GameState.Playing);
  const handleBackToLevels = () => setGameState(GameState.LevelSelection);
  const handleRestartLevel = () => startGame(currentLevelIndex, true);
  const handleNextLevel = () => startGame(currentLevelIndex + 1);

  const handleSwapBack = useCallback(async () => {
    if (!lastNonMatchingSwap || isProcessingRef.current) return;

    setGameState(GameState.Playing);
    isProcessingRef.current = true;
    setIsInputDisabled(true);

    const [pos1, pos2] = lastNonMatchingSwap;

    const tile1 = grid[pos1.row][pos1.col];
    const tile2 = grid[pos2.row][pos2.col];
    
    const newGrid = grid.map(r => r.map(t => ({...t})));
    newGrid[pos1.row][pos1.col].crystal = tile2.crystal;
    newGrid[pos2.row][pos2.col].crystal = tile1.crystal;

    setSwappingCrystals([pos1, pos2]);
    await sleep(SWAP_ANIMATION_DURATION);
    
    setGrid(newGrid);
    setSwappingCrystals(null);
    setLastNonMatchingSwap(null);
    setMoves(m => m + 1);

    isProcessingRef.current = false;
    setIsInputDisabled(false);
  }, [grid, lastNonMatchingSwap]);

  if (gameState === GameState.LevelSelection) {
    return <LevelSelectionScreen onSelectLevel={(level) => startGame(level)} lives={lives} nextLifeTimestamp={nextLifeTimestamp} />;
  }

  const currentLevel = LEVELS[currentLevelIndex];
  const isLastLevel = currentLevelIndex === LEVELS.length - 1;

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col items-center justify-center p-2 font-sans relative overflow-hidden">
      <div className="relative">
        <GameInfo 
          score={score}
          moves={moves}
          level={currentLevel.level}
          targetScore={currentLevel.targetScore}
          targetColors={currentLevel.targetColors}
          targetJelly={currentLevel.targetJelly}
          targetBlockers={currentLevel.targetBlockers}
          collectedColors={collectedColors}
          clearedJelly={clearedJelly}
          clearedBlockers={clearedBlockers}
          onBack={handleBackToLevels}
          onPause={handlePause}
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
        />
        <FloatingScores floatingScores={floatingScores} />
        <SpecialEffects activeEffects={activeEffects} />
        <ComboDisplay comboCount={comboCount} />
      </div>

      <GameOverModal
        gameState={gameState}
        score={score}
        onReplayLevel={() => startGame(currentLevelIndex, true)}
        onRestartGame={() => startGame(0)}
        onNextLevel={handleNextLevel}
        onGoToLevels={handleBackToLevels}
        isLastLevel={isLastLevel}
      />

      {gameState === GameState.Paused && (
        <PauseMenu 
          onResume={handleResume}
          onRestart={handleRestartLevel}
          onQuit={handleBackToLevels}
          onSwapBack={handleSwapBack}
          canSwapBack={lastNonMatchingSwap !== null}
        />
      )}
    </div>
  );
};

export default App;