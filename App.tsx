
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
  const hintTimeoutRef = useRef<number | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  
  const [lives, setLives] = useState(() => {
    const savedLives = localStorage.getItem('lives');
    return savedLives ? parseInt(savedLives, 10) : MAX_LIVES;
  });
  const [nextLifeTimestamp, setNextLifeTimestamp] = useState<number | null>(() => {
    const savedTimestamp = localStorage.getItem('nextLifeTimestamp');
    return savedTimestamp ? parseInt(savedTimestamp, 10) : null;
  });

  const isProcessing = useRef(false);

  const getValidCrystalTypes = (currentGrid: GridType, row: number, col: number): CrystalType[] => {
    let possibleTypes = [...CRYSTAL_TYPES];
    // Check left
    if (col > 1 && currentGrid[row][col - 1].crystal?.type === currentGrid[row][col - 2].crystal?.type) {
      possibleTypes = possibleTypes.filter(t => t !== currentGrid[row][col - 1].crystal!.type);
    }
    // Check up
    if (row > 1 && currentGrid[row - 1][col].crystal?.type === currentGrid[row - 2][col].crystal?.type) {
      possibleTypes = possibleTypes.filter(t => t !== currentGrid[row - 1][col].crystal!.type);
    }
    if (possibleTypes.length === 0) return [CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)]];
    return possibleTypes;
  };

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
          
          const validTypes = getValidCrystalTypes(newGrid, row, col);
          const crystalType = validTypes[Math.floor(Math.random() * validTypes.length)];
          const crystal = background === BackgroundType.Blocker ? null : createNewCrystal(row, col, crystalType);
          newRow.push({ id: `tile-${row}-${col}`, crystal, background });
        }
        newGrid.push(newRow);
      }
    } while (findPossibleMoves(newGrid).length === 0);
    return newGrid;
  }, []);

  const findMatches = (currentGrid: GridType): Position[][] => {
      const allMatches: Position[][] = [];
      for (let row = 0; row < GRID_SIZE; row++) {
          for (let col = 0; col < GRID_SIZE; col++) {
              const crystal = currentGrid[row][col].crystal;
              if (!crystal) continue;
              
              // Horizontal
              if (col < GRID_SIZE - 2 && crystal.type === currentGrid[row][col + 1].crystal?.type && crystal.type === currentGrid[row][col + 2].crystal?.type) {
                  const match = [{ row, col }];
                  let i = col + 1;
                  while (i < GRID_SIZE && currentGrid[row][i].crystal?.type === crystal.type) {
                      match.push({ row, col: i });
                      i++;
                  }
                  allMatches.push(match);
              }

              // Vertical
              if (row < GRID_SIZE - 2 && crystal.type === currentGrid[row + 1][col].crystal?.type && crystal.type === currentGrid[row + 2][col].crystal?.type) {
                  const match = [{ row, col }];
                  let i = row + 1;
                  while (i < GRID_SIZE && currentGrid[i][col].crystal?.type === crystal.type) {
                      match.push({ row: i, col });
                      i++;
                  }
                  allMatches.push(match);
              }
          }
      }
      // Deduplicate matches
      const uniqueMatches: Position[][] = [];
      const matchedPositions = new Set<string>();
      allMatches.sort((a, b) => b.length - a.length);
      for (const match of allMatches) {
          const newMatch = match.filter(p => !matchedPositions.has(`${p.row}-${p.col}`));
          if (newMatch.length >= 3) {
              uniqueMatches.push(newMatch);
              newMatch.forEach(p => matchedPositions.add(`${p.row}-${p.col}`));
          }
      }
      return uniqueMatches;
  };

  const findPossibleMoves = (currentGrid: GridType): [Position, Position][] => {
    const moves: [Position, Position][] = [];
    const testSwap = (r1: number, c1: number, r2: number, c2: number) => {
        const tempGrid = JSON.parse(JSON.stringify(currentGrid));
        if (!tempGrid[r1][c1].crystal || !tempGrid[r2][c2].crystal) return;
        [tempGrid[r1][c1].crystal, tempGrid[r2][c2].crystal] = [tempGrid[r2][c2].crystal, tempGrid[r1][c1].crystal];
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
  }, [lives, gameState, createInitialGrid, nextLifeTimestamp]);

  const checkWinLossConditions = useCallback(() => {
    const level = LEVELS[currentLevelIndex];
    let scoreMet = !level.targetScore || score >= level.targetScore;
    let colorsMet = !level.targetColors || (Object.keys(level.targetColors) as CrystalType[]).every(color => (collectedColors[color] || 0) >= level.targetColors![color]!);
    let jellyMet = !level.targetJelly || clearedJelly >= level.targetJelly;
    let blockersMet = !level.targetBlockers || clearedBlockers >= level.targetBlockers;
    
    if (scoreMet && colorsMet && jellyMet && blockersMet) {
      playSound(SoundType.Win, 0.7);
      setGameState(GameState.Won);
    } else if (moves <= 0) {
      playSound(SoundType.Lose, 0.7);
      setGameState(GameState.Lost);
    }
  }, [score, moves, currentLevelIndex, collectedColors, clearedJelly, clearedBlockers]);

    const processMatchesAndRefill = useCallback(async (initialMatches: Position[][]) => {
    isProcessing.current = true;
    let currentGrid = JSON.parse(JSON.stringify(grid));
    let matches = initialMatches;
    let turnScore = 0;
    let turnCollectedColors: Partial<Record<CrystalType, number>> = {};
    let turnClearedJelly = 0;
    let turnClearedBlockers = 0;
    let combo = 0;

    const addScore = (amount: number, position: Position) => {
        turnScore += amount;
        setFloatingScores(prev => [...prev, { id: `fs-${Date.now()}-${Math.random()}`, score: amount, position }]);
    };
    
    while (matches.length > 0) {
        combo++;
        setComboCount(combo);
        if (combo > 1) playSound(SoundType[`Match${Math.min(combo, 4) as 2|3|4}`], 0.6);
        else playSound(SoundType.Match1, 0.6);

        const tilesToClear = new Set<string>();
        const specialActivations: { pos: Position, special: SpecialType }[] = [];
        
        matches.flat().forEach(p => {
            const crystal = currentGrid[p.row][p.col].crystal;
            if (crystal?.special) {
                specialActivations.push({ pos: p, special: crystal.special });
            }
        });

        const allClearPositions = new Set<string>(matches.flat().map(p => `${p.row}-${p.col}`));

        for(const {pos, special} of specialActivations) {
            setActivatingCrystals(prev => new Set(prev).add(`${pos.row}-${pos.col}`));
            switch(special) {
                case SpecialType.StripedHorizontal:
                    playSound(SoundType.StripedActivate, 0.7);
                    setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}`, type: SpecialEffectType.StripedBeam, position: pos, direction: 'horizontal'}]);
                    for(let c = 0; c < GRID_SIZE; c++) allClearPositions.add(`${pos.row}-${c}`);
                    break;
                case SpecialType.StripedVertical:
                     playSound(SoundType.StripedActivate, 0.7);
                    setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}`, type: SpecialEffectType.StripedBeam, position: pos, direction: 'vertical'}]);
                    for(let r = 0; r < GRID_SIZE; r++) allClearPositions.add(`${r}-${pos.col}`);
                    break;
                case SpecialType.Wrapped:
                    playSound(SoundType.WrappedActivate, 0.7);
                    setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}`, type: SpecialEffectType.WrappedExplosion, position: pos}]);
                    for(let r = Math.max(0, pos.row-1); r <= Math.min(GRID_SIZE-1, pos.row+1); r++) {
                        for(let c = Math.max(0, pos.col-1); c <= Math.min(GRID_SIZE-1, pos.col+1); c++) {
                            allClearPositions.add(`${r}-${c}`);
                        }
                    }
                    break;
                case SpecialType.ColorBomb:
                    playSound(SoundType.ColorBombActivate, 0.8);
                    const targetType = currentGrid[pos.row][pos.col].crystal?.type;
                    const targets: Position[] = [];
                    if(targetType) {
                        for(let r = 0; r < GRID_SIZE; r++) {
                            for(let c = 0; c < GRID_SIZE; c++) {
                                if(currentGrid[r][c].crystal?.type === targetType) {
                                    allClearPositions.add(`${r}-${c}`);
                                    targets.push({row:r, col:c});
                                }
                            }
                        }
                    }
                     setActiveEffects(prev => [...prev, {id: `eff-${Date.now()}`, type: SpecialEffectType.ColorBombArcs, position: pos, targets, color: targetType}]);
                    break;
            }
        }
        await sleep(EFFECT_ANIMATION_DURATION / 2);

        allClearPositions.forEach(posStr => {
            const [row, col] = posStr.split('-').map(Number);
            const tile = currentGrid[row][col];
            if(tile.crystal) {
                const type = tile.crystal.type;
                turnCollectedColors[type] = (turnCollectedColors[type] || 0) + 1;
                addScore(BASE_SCORE * combo, {row, col});
                if (tile.crystal.special) addScore(SPECIAL_CRYSTAL_SCORE * combo, {row, col});
            }
            if(tile.background === BackgroundType.Jelly) {
                tile.background = null;
                turnClearedJelly++;
                addScore(JELLY_CLEAR_SCORE * combo, {row, col});
            } else if (tile.background === BackgroundType.Blocker) {
                 tile.background = null;
                 turnClearedBlockers++;
                 addScore(BLOCKER_CLEAR_SCORE * combo, {row, col});
            }
            tile.crystal = null;
            tilesToClear.add(posStr);
        });

        setClearingTiles(tilesToClear);
        setShockwaveCrystals(tilesToClear);
        await sleep(CLEAR_ANIMATION_DURATION);
        
        const newlyFormed = new Set<string>();
        for (const match of matches) {
            const pos = match[0];
            if (match.length >= 5) {
                currentGrid[pos.row][pos.col].crystal = { ...createNewCrystal(pos.row, pos.col), special: SpecialType.ColorBomb };
                newlyFormed.add(`${pos.row}-${pos.col}`);
            } else if (match.length >= 4) {
                currentGrid[pos.row][pos.col].crystal = { ...createNewCrystal(pos.row, pos.col), special: Math.random() > 0.5 ? SpecialType.StripedHorizontal : SpecialType.StripedVertical };
                newlyFormed.add(`${pos.row}-${pos.col}`);
            }
        }
        setNewlyFormedCrystals(newlyFormed);

        setGrid(JSON.parse(JSON.stringify(currentGrid)));
        setClearingTiles(new Set());
        setActivatingCrystals(new Set());
        setShockwaveCrystals(new Set());
        
        await sleep(100);

        for (let col = 0; col < GRID_SIZE; col++) {
            let emptyRow = GRID_SIZE - 1;
            for (let row = GRID_SIZE - 1; row >= 0; row--) {
                if (currentGrid[row][col].crystal) {
                    [currentGrid[emptyRow][col].crystal, currentGrid[row][col].crystal] = [currentGrid[row][col].crystal, currentGrid[emptyRow][col].crystal];
                    emptyRow--;
                }
            }
        }
        setGrid(JSON.parse(JSON.stringify(currentGrid)));
        await sleep(FALL_ANIMATION_DURATION);

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

        matches = findMatches(currentGrid);
    }
    
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
    setGrid(currentGrid);
    setComboCount(0);
    
    if (findPossibleMoves(currentGrid).length === 0) {
        // Reshuffle logic
        await sleep(500);
        setGrid(createInitialGrid(LEVELS[currentLevelIndex]));
    }
    
    isProcessing.current = false;
    checkWinLossConditions();
  }, [grid, checkWinLossConditions, currentLevelIndex, createInitialGrid]);
  
  const processMove = useCallback(async (p1: Position, p2: Position) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    
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
    await processMatchesAndRefill(matches);
  }, [grid, score, moves, collectedColors, clearedJelly, clearedBlockers, processMatchesAndRefill]);

  const handleCrystalClick = useCallback(async (row: number, col: number) => {
    if (isProcessing.current || gameState !== GameState.Playing) return;
    
    const clickedCrystal = grid[row]?.[col]?.crystal;
    if (!clickedCrystal) return;

    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
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
  
    useEffect(() => {
        // Fix: The type for a timeout ID in the browser is `number`. `NodeJS.Timeout` is for Node.js environments.
        // Declaring it as `number | undefined` also prevents a potential "used before assigned" error.
        let timer: number | undefined;
        if (gameState === GameState.Playing && !isProcessing.current) {
            timer = setTimeout(() => {
                const possibleMoves = findPossibleMoves(grid);
                if (possibleMoves.length > 0) {
                    setHintedTiles(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
                }
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [grid, gameState, isProcessing.current]);
    
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
    }, [lives, nextLifeTimestamp]);

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
      setTimeout(() => {
          const possibleMoves = findPossibleMoves(grid);
          if (possibleMoves.length > 0) {
              setHintedTiles(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
          }
          setIsHintLoading(false);
      }, 300);
  };
  
  if (gameState === GameState.LevelSelection) {
    return <LevelSelectionScreen onSelectLevel={handleStartLevel} lives={lives} nextLifeTimestamp={nextLifeTimestamp} />;
  }

  const level = LEVELS[currentLevelIndex];

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