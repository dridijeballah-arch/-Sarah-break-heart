import React from 'react';
import { FloatingScore } from '../types';

interface FloatingScoresProps {
  floatingScores: FloatingScore[];
}

export const FloatingScores: React.FC<FloatingScoresProps> = ({ floatingScores }) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-2" style={{ zIndex: 20 }}>
      {floatingScores.map(fs => (
        <div
          key={fs.id}
          className="absolute text-yellow-300 font-bold text-lg md:text-2xl animate-float-up"
          style={{
            left: `${fs.position.col * 12.5}%`,
            top: `${fs.position.row * 12.5}%`,
            transform: `translate(50%, 25%)`,
            textShadow: '0px 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          +{fs.score}
        </div>
      ))}
    </div>
  );
};
