

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Crystal, GridType, Position, SpecialType, Tile, BackgroundType } from '../types';
import { CRYSTAL_COLORS, CRYSTAL_ICONS, FALL_ANIMATION_DURATION, SWAP_ANIMATION_DURATION } from '../constants';

interface GameBoardProps {
  grid: GridType;
  selectedCrystal: Position | null;
  onCrystalClick: (row: number, col: number) => void;
  swappingCrystals: [Position, Position] | null;
  clearingTiles: Set<string>;
  shockwaveCrystals: Set<string>;
  newlyFormedCrystals: Set<string>;
  activatingCrystals: Set<string>;
  isShaking: boolean;
  hintedTiles: [Position, Position] | null;
}

const SpecialCrystalIndicator: React.FC<{ crystal: Crystal }> = ({ crystal }) => {
  if (!crystal.special) return null;

  switch (crystal.special) {
    case SpecialType.StripedVertical:
      return <div className="absolute w-2 h-full bg-white/50 rounded-full left-1/2 -translate-x-1/2" />;
    case SpecialType.StripedHorizontal:
      return <div className="absolute h-2 w-full bg-white/50 rounded-full top-1/2 -translate-y-1/2" />;
    case SpecialType.Wrapped:
      return <div className="absolute w-full h-full rounded-lg border-4 border-white/80 wrapped-animation" />;
    case SpecialType.ColorBomb:
      return null; // Handled by main div
    default:
        return null;
  }
};

const TileBackground: React.FC<{ tile: Tile, isClearing: boolean }> = ({ tile, isClearing }) => {
    if (!tile.background) return null;
    
    switch (tile.background) {
        case BackgroundType.Jelly:
            return <div className={`jelly-bg ${isClearing ? 'jelly-clearing' : ''}`} />;
        case BackgroundType.Blocker:
            return <div className={`blocker-bg ${isClearing ? 'blocker-clearing' : ''}`} />;
        default:
            return null;
    }
}

export const GameBoard: React.FC<GameBoardProps> = ({ grid, selectedCrystal, onCrystalClick, swappingCrystals, clearingTiles, shockwaveCrystals, newlyFormedCrystals, activatingCrystals, isShaking, hintedTiles }) => {
  const [fallTransforms, setFallTransforms] = useState<Map<string, string>>(new Map());
  const prevGridRef = useRef<GridType>(grid);

  useLayoutEffect(() => {
    const prevCrystalPositions = new Map<string, { row: number }>();
    prevGridRef.current?.forEach((row) => {
        row.forEach((tile) => {
            if (tile.crystal) {
                prevCrystalPositions.set(tile.crystal.id, { row: grid.indexOf(row) });
            }
        });
    });

    const newTransforms = new Map<string, string>();
    let hasChanges = false;

    grid.forEach((row, r) => {
        row.forEach((tile) => {
            if (tile.crystal) {
                const prevPos = prevCrystalPositions.get(tile.crystal.id);
                if (prevPos && prevPos.row !== r) { // Crystal fell
                    const dy = (prevPos.row - r) * 100;
                    newTransforms.set(tile.crystal.id, `translateY(${dy}%)`);
                    hasChanges = true;
                } else if (!prevPos) { // New crystal
                    const dy = (- (r + 1)) * 100; // Animate from above the board
                    newTransforms.set(tile.crystal.id, `translateY(${dy}%)`);
                    hasChanges = true;
                }
            }
        });
    });
    
    if (hasChanges) {
        setFallTransforms(newTransforms);
        requestAnimationFrame(() => {
            setFallTransforms(new Map());
        });
    }

    prevGridRef.current = grid;
  }, [grid]);
  
  const getCrystalStyle = (row: number, col: number, crystal: Crystal | null): React.CSSProperties => {
    if (!crystal) return {};

    const initialTransform = fallTransforms.get(crystal.id);
    if (initialTransform) {
        return { transform: initialTransform, transition: 'transform 0s' };
    }

    if (swappingCrystals) {
        const [p1, p2] = swappingCrystals;
        let swapTransform = '';

        if (row === p1.row && col === p1.col) {
            swapTransform = `translate(${(p2.col - p1.col) * 100}%, ${(p2.row - p1.row) * 100}%) rotate(180deg)`;
        } else if (row === p2.row && col === p2.col) {
            swapTransform = `translate(${(p1.col - p2.col) * 100}%, ${(p1.row - p2.row) * 100}%) rotate(-180deg)`;
        }

        if (swapTransform) {
            return { 
                transform: swapTransform, 
                zIndex: 10, 
                transition: `transform ${SWAP_ANIMATION_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)` 
            };
        }
    }

    return {
        transition: `transform ${FALL_ANIMATION_DURATION}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
    };
  };

  return (
    <div className={`grid grid-cols-8 gap-1 p-2 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 shadow-2xl ${isShaking ? 'shake-board' : ''}`}>
      {grid.map((row, rowIndex) =>
        row.map((tile, colIndex) => {
          const key = tile.id;
          const { crystal } = tile;
          const isClearing = clearingTiles.has(`${rowIndex}-${colIndex}`);
          
          if (!crystal && tile.background !== BackgroundType.Blocker) {
            return (
              <div
                key={key}
                className="w-12 h-12 md:w-16 md:h-16 relative"
              >
                <TileBackground tile={tile} isClearing={isClearing} />
              </div>
            );
          }

          const isSelected = selectedCrystal?.row === rowIndex && selectedCrystal?.col === colIndex;
          const isHinted = hintedTiles?.some(p => p.row === rowIndex && p.col === colIndex);
          const isShockwave = shockwaveCrystals.has(`${rowIndex}-${colIndex}`);
          const isNewlyFormed = newlyFormedCrystals.has(`${rowIndex}-${colIndex}`);
          const isActivating = activatingCrystals.has(`${rowIndex}-${colIndex}`);
          
          const isStriped = crystal?.special === SpecialType.StripedHorizontal || crystal?.special === SpecialType.StripedVertical;
          const shouldAnimateLightning = isStriped && (isClearing || isActivating);


          const crystalClasses = [
            'w-full h-full rounded-lg flex items-center justify-center text-2xl md:text-3xl border-2 shadow-inner transition-all duration-300 relative overflow-hidden',
            crystal?.special === SpecialType.ColorBomb ? 'bg-gray-200 border-gray-800 color-bomb-animation' : crystal ? CRYSTAL_COLORS[crystal.type] : '',
            (crystal?.special === SpecialType.StripedVertical || crystal?.special === SpecialType.StripedHorizontal) ? 'striped-shine' : '',
            isSelected ? 'selected-crystal-halo border-orange-400 transform scale-110' : 'hover:scale-105',
            isHinted ? 'hint-halo' : '',
            isClearing && crystal ? 'clearing' : '',
            isShockwave ? 'shockwave' : '',
            isNewlyFormed ? 'crystal-formation' : '',
            isActivating ? 'crystal-activating' : '',
            shouldAnimateLightning && crystal.special === SpecialType.StripedHorizontal ? 'lightning-horizontal-effect' : '',
            shouldAnimateLightning && crystal.special === SpecialType.StripedVertical ? 'lightning-vertical-effect' : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={key}
              className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center cursor-pointer relative"
              onClick={() => onCrystalClick(rowIndex, colIndex)}
            >
              <TileBackground tile={tile} isClearing={isClearing} />
              {crystal && (
                <div
                    style={getCrystalStyle(rowIndex, colIndex, crystal)}
                    className={crystalClasses}
                >
                    {crystal.special === SpecialType.ColorBomb ? '💣' : CRYSTAL_ICONS[crystal.type]}
                    <SpecialCrystalIndicator crystal={crystal} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};