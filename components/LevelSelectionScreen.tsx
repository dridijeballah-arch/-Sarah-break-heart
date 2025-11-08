import React, { useState, useEffect } from 'react';
import { LEVELS, CRYSTAL_ICONS, MAX_LIVES } from '../constants';
import { CrystalType } from '../types';

interface LevelSelectionScreenProps {
  onSelectLevel: (levelIndex: number) => void;
  lives: number;
  nextLifeTimestamp: number | null;
  levelProgress: Record<number, number>;
}

const Star: React.FC<{ filled: boolean }> = ({ filled }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-slate-600'}`}
    >
      <path 
        fill="currentColor" 
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" 
      />
    </svg>
);


export const LevelSelectionScreen: React.FC<LevelSelectionScreenProps> = ({ onSelectLevel, lives, nextLifeTimestamp, levelProgress }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!nextLifeTimestamp) {
        setTimeLeft('');
        return;
    }

    const updateTimer = () => {
        const remaining = Math.max(0, nextLifeTimestamp - Date.now());
        if (remaining === 0) {
            setTimeLeft('00:00');
            return;
        }
        const minutes = Math.floor((remaining / 1000) / 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextLifeTimestamp]);


  return (
    <div className="bg-slate-900 min-h-screen flex flex-col items-center justify-center p-4 font-sans text-white relative">
      {/* Lives Display */}
      <div className="absolute top-4 right-4 flex items-center gap-4 bg-slate-800/70 p-3 rounded-lg border border-slate-700 z-10">
        <div className="flex items-center gap-1">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <span key={i} className={`text-3xl ${i < lives ? 'text-red-500' : 'text-slate-600'}`}>♥</span>
            ))}
        </div>
        {lives < MAX_LIVES && timeLeft && (
            <div className="text-lg font-mono text-cyan-300 w-16 text-center">{timeLeft}</div>
        )}
        {lives === MAX_LIVES && (
            <div className="text-lg font-bold text-green-400">Vies pleines</div>
        )}
      </div>

      <h1 className="text-5xl font-bold mb-8 text-cyan-300 tracking-wider">Choisissez un niveau</h1>

      {lives <= 0 && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6 text-center max-w-md">
            <p className="font-bold text-lg">Vous n'avez plus de vies !</p>
            <p>Revenez plus tard ou attendez que vos vies se régénèrent.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
        {LEVELS.map((level, index) => (
          <button
            key={level.level}
            onClick={() => onSelectLevel(index)}
            disabled={lives <= 0}
            className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700 shadow-lg text-white text-left hover:bg-slate-700/70 hover:border-cyan-400 transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-slate-800/50 disabled:hover:border-slate-700"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-3xl font-bold text-cyan-300">Niveau {level.level}</h2>
               <div className="flex">
                  {[...Array(3)].map((_, i) => (
                      <Star key={i} filled={i < (levelProgress[index] || 0)} />
                  ))}
              </div>
            </div>
            <div className="space-y-2 text-slate-300">
                <p><strong>Coups :</strong> {level.moves}</p>
                <div>
                  <strong>Objectifs :</strong>
                  <div className="flex gap-3 mt-1 flex-wrap items-center">
                    {level.targetScore && <span>Score: {level.starScores[0].toLocaleString()}</span>}
                    {level.targetColors && (Object.keys(level.targetColors) as CrystalType[]).map(color => (
                      <div key={color} className="flex items-center gap-1">
                        <span className="text-xl">{CRYSTAL_ICONS[color]}</span>
                        <span>{level.targetColors![color]}</span>
                      </div>
                    ))}
                    {level.targetJelly && <div className="flex items-center gap-1"><span className="text-xl">🧊</span><span>{level.targetJelly}</span></div>}
                    {level.targetBlockers && <div className="flex items-center gap-1"><span className="text-xl">🧱</span><span>{level.targetBlockers}</span></div>}
                  </div>
                </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};