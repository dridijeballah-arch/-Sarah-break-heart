
// Fix: Create GameInfo.tsx component to display game stats.
import React, { useState, useEffect, useRef } from 'react';
import { CrystalType } from '../types';
import { CRYSTAL_ICONS } from '../constants';

interface GameInfoProps {
  score: number;
  moves: number;
  level: number;
  targetScore?: number;
  targetColors?: Partial<Record<CrystalType, number>>;
  targetJelly?: number;
  targetBlockers?: number;
  collectedColors: Partial<Record<CrystalType, number>>;
  clearedJelly: number;
  clearedBlockers: number;
  onBack: () => void;
  onPause: () => void;
}

export const GameInfo: React.FC<GameInfoProps> = ({ score, moves, level, targetScore, targetColors, targetJelly, targetBlockers, collectedColors, clearedJelly, clearedBlockers, onBack, onPause }) => {
  const scoreProgress = targetScore ? Math.min((score / targetScore) * 100, 100) : 100;
  const [updatedObjectives, setUpdatedObjectives] = useState<Set<string>>(new Set());
  const prevCollectedColorsRef = useRef<Partial<Record<CrystalType, number>>>(collectedColors);
  const prevClearedJellyRef = useRef(clearedJelly);
  const prevClearedBlockersRef = useRef(clearedBlockers);

  useEffect(() => {
    const updated = new Set<string>();
    const prevCollected = prevCollectedColorsRef.current;

    if (targetColors) {
      (Object.keys(targetColors) as CrystalType[]).forEach(color => {
        if ((collectedColors[color] || 0) > (prevCollected[color] || 0)) {
          updated.add(color);
        }
      });
    }
    if (targetJelly && clearedJelly > prevClearedJellyRef.current) {
        updated.add('jelly');
    }
    if (targetBlockers && clearedBlockers > prevClearedBlockersRef.current) {
        updated.add('blockers');
    }

    if (updated.size > 0) {
      setUpdatedObjectives(updated);
      const timer = setTimeout(() => setUpdatedObjectives(new Set()), 500);
      return () => clearTimeout(timer);
    }
    
    prevCollectedColorsRef.current = collectedColors;
    prevClearedJellyRef.current = clearedJelly;
    prevClearedBlockersRef.current = clearedBlockers;
  }, [collectedColors, clearedJelly, clearedBlockers, targetColors, targetJelly, targetBlockers]);

  const otherObjectives = [
      { key: 'jelly', target: targetJelly, cleared: clearedJelly, icon: '🧊' },
      { key: 'blockers', target: targetBlockers, cleared: clearedBlockers, icon: '🧱' }
  ].filter(obj => obj.target);

  return (
    <div className="w-full max-w-md mx-auto bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-700 shadow-lg text-white mb-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-sm font-bold text-cyan-300 hover:text-white transition-colors">
                &larr; Retour
            </button>
            <div className="text-3xl font-bold">{level}</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-cyan-300">COUPS RESTANTS</div>
          <div className="text-3xl font-bold">{moves}</div>
        </div>
         <button onClick={onPause} className="text-3xl hover:text-cyan-300 transition-colors p-2 rounded-full hover:bg-slate-700/50">
            ⏸️
        </button>
      </div>
      
      {/* Objectives Display */}
      <div className="flex flex-col gap-2">
        {targetScore && (
          <div>
            <div className="flex justify-between items-center mb-1 text-sm">
              <span>Score: {score.toLocaleString()}</span>
              <span>Objectif: {targetScore.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-cyan-400 h-4 rounded-full transition-all duration-500 ease-out progress-bar-animated shadow-[0_0_10px_#22c55e]"
                style={{ width: `${scoreProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {(targetColors || otherObjectives.length > 0) && (
            <div className="mt-2">
            <div className="text-sm font-bold text-cyan-300 mb-1">OBJECTIFS</div>
            <div className="flex gap-4 justify-center flex-wrap">
                {targetColors && (Object.keys(targetColors) as CrystalType[]).map(color => {
                    const target = targetColors[color]!;
                    const collected = collectedColors[color] || 0;
                    const remaining = Math.max(0, target - collected);
                    const classes = ['flex items-center gap-2 p-2 rounded-lg transition-all', remaining === 0 ? 'bg-green-500/30' : 'bg-slate-700', updatedObjectives.has(color) ? 'shockwave' : ''].join(' ');
                    return (
                        <div key={color} className={classes}>
                            <span className="text-2xl">{CRYSTAL_ICONS[color]}</span>
                            <span className={`font-bold text-lg ${remaining === 0 ? 'line-through text-slate-400' : ''}`}>{remaining}</span>
                        </div>
                    );
                })}
                {otherObjectives.map(obj => {
                     const remaining = Math.max(0, obj.target! - obj.cleared);
                     const classes = ['flex items-center gap-2 p-2 rounded-lg transition-all', remaining === 0 ? 'bg-green-500/30' : 'bg-slate-700', updatedObjectives.has(obj.key) ? 'shockwave' : ''].join(' ');
                     return (
                        <div key={obj.key} className={classes}>
                            <span className="text-2xl">{obj.icon}</span>
                            <span className={`font-bold text-lg ${remaining === 0 ? 'line-through text-slate-400' : ''}`}>{remaining}</span>
                        </div>
                    );
                })}
            </div>
            </div>
        )}
      </div>
    </div>
  );
};