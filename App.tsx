
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

  // AI Hint states
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [hintedTiles, setHintedTiles] = useState<[Position, Position] | null>(null);

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

  const loseLife = useCallback(() => {
    if (lives > 0) {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives < MAX_LIVES && !nextLifeTimestamp) {
        setNextLifeTimestamp(Date.now() + LIFE_REGEN_TIME_MS);
      }
    }
  }, [lives, nextLifeTimestamp]);


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

          // For special formations, we prioritize the swapped crystal's position if applicable
          // This is a simplification; a more robust system might track the swapped crystal
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
  }, [initializeGrid, lives, loseLife]);

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
    let combo = comboCount;
    
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

                if (!colorToClear) colorToClear = CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)];

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
        
        const visuallyClearingTiles = new Set(tilesToClear);
        specialFormations.forEach((_, key) => visuallyClearingTiles.delete(key));

        setClearingTiles(visuallyClearingTiles);
        setNewlyFormedCrystals(new Set(specialFormations.keys()));
        await sleep(CLEAR_ANIMATION_DURATION);
        
        setTimeout(() => {
          setActivatingCrystals(new Set());
          setNewlyFormedCrystals(new Set());
        }, CLEAR_ANIMATION_DURATION);
        
        let gridAfterClearAndTransform = gridToProcess.map((row, r) => row.map((tile, c) => {
            const key = `${r}-${c}`;
            if (tilesToClear.has(key)) {
                const newBackground = (tile.background === BackgroundType.Blocker || tile.background === BackgroundType.Jelly) ? null : tile.background;
                if (specialFormations.has(key)) {
                    // Transform
                    return {
                        ...tile,
                        crystal: { ...tile.crystal!, special: specialFormations.get(key)! },
                        background: newBackground,
                    };
                } else {
                    // Clear
                    return { ...tile, crystal: null, background: newBackground };
                }
            }
            return tile;
        }));

        const gridAfterFall = gridAfterClearAndTransform.map(row => [...row]);
        for (let c = 0; c < GRID_SIZE; c++) {
            let emptyRow = GRID_SIZE - 1;
            for (let r = GRID_SIZE - 1; r >= 0; r--) {
                 const tile = gridAfterFall[r][c];
                if (tile.background === BackgroundType.Blocker) {
                    emptyRow = r - 1;
                } else if (tile.crystal) {
                    if (emptyRow !== r) {
                        gridAfterFall[emptyRow][c].crystal = tile.crystal;
                        gridAfterFall[r][c].crystal = null;
                    }
                    emptyRow--;
                }
            }
        }
        
        for (let c = 0; c < GRID_SIZE; c++) {
            for (let r = GRID_SIZE - 1; r >= 0; r--) {
                const tile = gridAfterFall[r][c];
                if (tile.crystal === null && tile.background !== BackgroundType.Blocker) {
                    gridAfterFall[r][c].crystal = createCrystal(r, c);
                }
            }
        }
        
        setGrid(gridAfterFall);
        gridToProcess = gridAfterFall;
        await sleep(FALL_ANIMATION_DURATION);
    }
    
    if (isMove) setComboCount(0);
    checkWinLossConditions(initialMoves, tempScore, tempCollectedColors, tempClearedJelly, tempClearedBlockers);
    isProcessingRef.current = false;
    setIsInputDisabled(false);
  }, [
    score, collectedColors, clearedJelly, clearedBlockers, moves, findMatches, 
    addFloatingScore, addActiveEffect, createCrystal, checkWinLossConditions, comboCount
  ]);


  const handleCrystalClick = useCallback(async (row: number, col: number) => {
    if (isInputDisabled || !grid[row][col].crystal) return;
    setHintedTiles(null);

    if (selectedCrystal) {
      if (selectedCrystal.row === row && selectedCrystal.col === col) {
        setSelectedCrystal(null);
        return;
      }

      const isAdjacent = Math.abs(selectedCrystal.row - row) + Math.abs(selectedCrystal.col - col) === 1;
      
      if (isAdjacent) {
        setIsInputDisabled(true);
        const p1 = selectedCrystal;
        const p2 = { row, col };
        
        const c1 = grid[p1.row][p1.col].crystal;
        const c2 = grid[p2.row][p2.col].crystal;

        // Handle special crystal swaps
        if (c1?.special || c2?.special) {
            let initialClears = new Set<string>();
            let specialHandled = false;

            const bomb = c1?.special === SpecialType.ColorBomb ? {crystal: c1, pos: p1} : (c2?.special === SpecialType.ColorBomb ? {crystal: c2, pos: p2} : null);
            const other = bomb ? (bomb.pos === p1 ? {crystal: c2, pos: p2} : {crystal: c1, pos: p1}) : null;

            if (bomb && other) {
                specialHandled = true;
                initialClears.add(`${bomb.pos.row}-${bomb.pos.col}`);
                if (other.crystal?.special === SpecialType.ColorBomb) { // Double Color Bomb
                    addActiveEffect({ type: SpecialEffectType.DoubleColorBombClear, position: bomb.pos });
                    for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) initialClears.add(`${r}-${c}`);
                } else if (other.crystal?.special?.includes('Striped')) { // Bomb + Striped
                    addActiveEffect({ type: SpecialEffectType.ColorBombArcs, position: bomb.pos, color: other.crystal.type });
                    for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) {
                        if (grid[r][c].crystal?.type === other.crystal.type) {
                           grid[r][c].crystal!.special = Math.random() > 0.5 ? SpecialType.StripedHorizontal : SpecialType.StripedVertical;
                           initialClears.add(`${r}-${c}`);
                        }
                    }
                } else { // Bomb + regular
                    const colorToClear = other.crystal?.type;
                    if (colorToClear) {
                        const targets: Position[] = [];
                        for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) {
                            if (grid[r][c].crystal?.type === colorToClear) {
                                initialClears.add(`${r}-${c}`);
                                targets.push({ row: r, col: c });
                            }
                        }
                        addActiveEffect({ type: SpecialEffectType.ColorBombArcs, position: bomb.pos, color: colorToClear, targets });
                    }
                }
            } else if ((c1?.special?.includes('Striped') && c2?.special === SpecialType.Wrapped) || (c2?.special?.includes('Striped') && c1?.special === SpecialType.Wrapped)) {
                specialHandled = true;
                initialClears.add(`${p1.row}-${p1.col}`);
                initialClears.add(`${p2.row}-${p2.col}`);
                for (let i = -1; i <= 1; i++) {
                    if (p1.row + i >= 0 && p1.row + i < GRID_SIZE) for (let c = 0; c < GRID_SIZE; c++) initialClears.add(`${p1.row + i}-${c}`);
                    if (p1.col + i >= 0 && p1.col + i < GRID_SIZE) for (let r = 0; r < GRID_SIZE; r++) initialClears.add(`${r}-${p1.col + i}`);
                }
                addActiveEffect({type: SpecialEffectType.StripedWrappedBlast, position: p1});
            }

            if (specialHandled) {
                setSelectedCrystal(null);
                setSwappingCrystals([p1, p2]); await sleep(SWAP_ANIMATION_DURATION); setSwappingCrystals(null);
                processMatchesAndCascades(grid, true, initialClears);
                return;
            }
        }
        
        // Normal swap logic
        let newGrid = grid.map(r => r.map(t => ({...t, crystal: t.crystal ? {...t.crystal} : null })));
        newGrid[p1.row][p1.col].crystal = c2;
        newGrid[p2.row][p2.col].crystal = c1;

        setSwappingCrystals([p1, p2]);
        setGrid(newGrid);
        await sleep(SWAP_ANIMATION_DURATION);
        
        const { matches } = findMatches(newGrid);
        if (matches.size > 0) {
            setLastNonMatchingSwap(null);
            setSelectedCrystal(null);
            processMatchesAndCascades(newGrid, true);
        } else {
            setLastNonMatchingSwap([p1, p2]);
            setGrid(grid);
            await sleep(SWAP_ANIMATION_DURATION);
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            setIsInputDisabled(false);
            setSelectedCrystal(null);
        }
        setSwappingCrystals(null);

      } else {
        setSelectedCrystal({ row, col });
      }
    } else {
      setSelectedCrystal({ row, col });
    }
  }, [selectedCrystal, grid, isInputDisabled, findMatches, processMatchesAndCascades, addActiveEffect]);
  
  const handleGetHint = useCallback(async () => {
    if (isHintLoading || moves <= 1 || isInputDisabled) return;

    setIsHintLoading(true);
    setIsInputDisabled(true);
    setHintedTiles(null);

    const findPossibleMove = (currentGrid: GridType): [Position, Position] | null => {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                // Test swap right
                if (c < GRID_SIZE - 1) {
                    const tempGrid = currentGrid.map(row => row.map(tile => ({ ...tile, crystal: tile.crystal ? { ...tile.crystal } : null })));
                    const c1 = tempGrid[r][c].crystal;
                    const c2 = tempGrid[r][c + 1].crystal;
                    if (c1 && c2) {
                        tempGrid[r][c].crystal = c2;
                        tempGrid[r][c + 1].crystal = c1;
                        if (findMatches(tempGrid).matches.size > 0) {
                            return [{ row: r, col: c }, { row: r, col: c + 1 }];
                        }
                    }
                }
                // Test swap down
                if (r < GRID_SIZE - 1) {
                    const tempGrid = currentGrid.map(row => row.map(tile => ({ ...tile, crystal: tile.crystal ? { ...tile.crystal } : null })));
                    const c1 = tempGrid[r][c].crystal;
                    const c2 = tempGrid[r + 1][c].crystal;
                    if (c1 && c2) {
                        tempGrid[r][c].crystal = c2;
                        tempGrid[r + 1][c].crystal = c1;
                        if (findMatches(tempGrid).matches.size > 0) {
                            return [{ row: r, col: c }, { row: r + 1, col: c }];
                        }
                    }
                }
            }
        }
        return null;
    };

    // Small delay for UX
    await sleep(250);

    const move = findPossibleMove(grid);

    if (move) {
        setMoves(prev => prev - 1);
        setHintedTiles(move);
        setTimeout(() => setHintedTiles(null), 3000);
    } else {
        console.warn('No possible moves found by local hint finder.');
    }

    setIsHintLoading(false);
    setIsInputDisabled(false);
  }, [grid, isHintLoading, moves, isInputDisabled, findMatches]);

  const level = LEVELS[currentLevelIndex];

  if (gameState === GameState.LevelSelection) {
    return <LevelSelectionScreen onSelectLevel={startGame} lives={lives} nextLifeTimestamp={nextLifeTimestamp} />;
  }

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        <GameInfo 
            level={level.level}
            score={score}
            moves={moves}
            targetScore={level.targetScore}
            targetColors={level.targetColors}
            targetJelly={level.targetJelly}
            targetBlockers={level.targetBlockers}
            collectedColors={collectedColors}
            clearedJelly={clearedJelly}
            clearedBlockers={clearedBlockers}
            onBack={() => setGameState(GameState.LevelSelection)}
            onPause={() => setGameState(GameState.Paused)}
            onGetHint={handleGetHint}
            isHintLoading={isHintLoading}
        />
        <div className="relative">
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
            onReplayLevel={() => startGame(currentLevelIndex, true)}
            onRestartGame={() => setGameState(GameState.LevelSelection)}
            onNextLevel={() => { if (currentLevelIndex + 1 < LEVELS.length) startGame(currentLevelIndex + 1) }}
            onGoToLevels={() => setGameState(GameState.LevelSelection)}
            isLastLevel={currentLevelIndex === LEVELS.length - 1}
        />
        {gameState === GameState.Paused && (
            <PauseMenu
                onResume={() => setGameState(GameState.Playing)}
                onRestart={() => startGame(currentLevelIndex, true)}
                onQuit={() => setGameState(GameState.LevelSelection)}
                onSwapBack={() => {
                    if (lastNonMatchingSwap) {
                        setGrid(grid);
                        setGameState(GameState.Playing);
                    }
                }}
                canSwapBack={!!lastNonMatchingSwap}
            />
        )}
    </div>
  );
};

export default App;