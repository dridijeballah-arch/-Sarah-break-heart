
import React from 'react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onSwapBack: () => void;
  canSwapBack: boolean;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onRestart, onQuit, onSwapBack, canSwapBack }) => {
  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-600 text-center text-white w-11/12 max-w-xs flex flex-col gap-4">
        <h2 className="text-4xl font-bold mb-2 text-cyan-300">Pause</h2>
        <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={onResume}
              className="w-full px-6 py-3 rounded-lg text-white font-bold text-lg bg-green-500 hover:bg-green-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
            >
              Reprendre
            </button>
            <button
              onClick={onSwapBack}
              disabled={!canSwapBack}
              className="w-full px-6 py-3 rounded-lg text-white font-bold text-lg bg-orange-500 hover:bg-orange-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white disabled:bg-slate-600 disabled:hover:bg-slate-600 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
            >
              Annuler le coup
            </button>
            <button
              onClick={onRestart}
              className="w-full px-6 py-3 rounded-lg text-white font-bold text-lg bg-blue-500 hover:bg-blue-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
            >
              Recommencer
            </button>
            <button
              onClick={onQuit}
              className="w-full px-6 py-3 rounded-lg text-white font-bold text-lg bg-red-500 hover:bg-red-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
            >
              Quitter
            </button>
        </div>
      </div>
    </div>
  );
};
