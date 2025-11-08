import React from 'react';
import { GameState, Level } from '../types';
import { LEVELS } from '../constants';

interface GameOverModalProps {
  gameState: GameState;
  score: number;
  currentLevelIndex: number;
  onReplayLevel: () => void;
  onRestartGame: () => void;
  onNextLevel: () => void;
  onGoToLevels: () => void;
  isLastLevel: boolean;
}

const Star: React.FC<{ filled: boolean; index: number }> = ({ filled, index }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={`w-12 h-12 transition-all duration-500 ${filled ? 'text-yellow-400 drop-shadow-[0_2px_4px_rgba(250,204,21,0.5)]' : 'text-slate-600'}`}
    style={{ transitionDelay: `${index * 150}ms` }}
  >
    <path
      fill="currentColor"
      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
    />
  </svg>
);

export const GameOverModal: React.FC<GameOverModalProps> = ({ gameState, score, currentLevelIndex, onReplayLevel, onRestartGame, onNextLevel, onGoToLevels, isLastLevel }) => {
  if (gameState === GameState.Playing || gameState === GameState.LevelSelection || gameState === GameState.Paused) {
    return null;
  }

  const isWin = gameState === GameState.Won;
  const level: Level | undefined = LEVELS[currentLevelIndex];
  const starScores = level?.starScores || [Infinity, Infinity, Infinity];
  
  let stars = 0;
  if (isWin) {
    if (score >= starScores[0]) stars = 1;
    if (score >= starScores[1]) stars = 2;
    if (score >= starScores[2]) stars = 3;
  }
  
  let title = '';
  let message = '';
  let primaryButtonText = '';
  let primaryButtonAction = onReplayLevel;
  let titleColor = '';
  let primaryButtonColor = '';

  if (isWin) {
    if (isLastLevel) {
      title = 'Jeu Terminé !';
      message = `Félicitations ! Vous avez conquis tous les niveaux avec un score final de ${score.toLocaleString()}.`;
      primaryButtonText = 'Rejouer le jeu';
      primaryButtonAction = onRestartGame;
      titleColor = 'text-yellow-400';
      primaryButtonColor = 'bg-yellow-500 hover:bg-yellow-600';
    } else {
      title = 'Niveau Terminé !';
      message = `Bravo ! Votre score est de ${score.toLocaleString()}. Prêt pour le prochain défi ?`;
      primaryButtonText = 'Niveau Suivant';
      primaryButtonAction = onNextLevel;
      titleColor = 'text-green-400';
      primaryButtonColor = 'bg-green-500 hover:bg-green-600';
    }
  } else { // Lost
    title = 'Échec !';
    message = 'Vous n\'avez plus de coups. Essayez encore !';
    primaryButtonText = 'Rejouer';
    primaryButtonAction = onReplayLevel;
    titleColor = 'text-red-400';
    primaryButtonColor = 'bg-red-500 hover:bg-red-600';
  }

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-600 text-center text-white w-11/12 max-w-sm animate-fade-in flex flex-col gap-4">
        <h2 className={`text-4xl font-bold mb-2 ${titleColor}`}>{title}</h2>

        {isWin && (
            <div className="flex justify-center my-2">
                {[...Array(3)].map((_, i) => (
                    <Star key={i} filled={i < stars} index={i} />
                ))}
            </div>
        )}

        <p className="text-lg">{message}</p>
        <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={primaryButtonAction}
              className={`w-full px-6 py-3 rounded-lg text-white font-bold text-lg ${primaryButtonColor} transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white`}
            >
              {primaryButtonText}
            </button>
            <button
              onClick={onGoToLevels}
              className={`w-full px-6 py-3 rounded-lg text-white font-bold text-lg bg-slate-600 hover:bg-slate-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white`}
            >
              Choisir un niveau
            </button>
        </div>
      </div>
    </div>
  );
};