import React from 'react';
import { GameState } from '../types';

interface GameOverModalProps {
  gameState: GameState;
  score: number;
  onReplayLevel: () => void;
  onRestartGame: () => void;
  onNextLevel: () => void;
  onGoToLevels: () => void;
  isLastLevel: boolean;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ gameState, score, onReplayLevel, onRestartGame, onNextLevel, onGoToLevels, isLastLevel }) => {
  if (gameState === GameState.Playing || gameState === GameState.LevelSelection || gameState === GameState.Paused) {
    return null;
  }

  const isWin = gameState === GameState.Won;
  
  let title = '';
  let message = '';
  let primaryButtonText = '';
  let primaryButtonAction = onReplayLevel;
  let titleColor = '';
  let primaryButtonColor = '';

  if (isWin) {
    if (isLastLevel) {
      title = 'Jeu Terminé !';
      message = `Félicitations ! Vous avez conquis tous les niveaux avec un score final de ${score}.`;
      primaryButtonText = 'Rejouer le jeu';
      primaryButtonAction = onRestartGame;
      titleColor = 'text-yellow-400';
      primaryButtonColor = 'bg-yellow-500 hover:bg-yellow-600';
    } else {
      title = 'Niveau Terminé !';
      message = `Bravo ! Votre score est de ${score}. Prêt pour le prochain défi ?`;
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