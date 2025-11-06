import React, { useEffect, useState } from 'react';

interface ComboDisplayProps {
  comboCount: number;
}

export const ComboDisplay: React.FC<ComboDisplayProps> = ({ comboCount }) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (comboCount > 1) {
      // En changeant la clé, nous forçons React à remonter le composant, redéclenchant ainsi l'animation
      setKey(prevKey => prevKey + 1);
    }
  }, [comboCount]);

  if (comboCount <= 1) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-[-60px] md:top-[-70px] flex justify-center pointer-events-none z-40">
      <div key={key} className="text-4xl md:text-5xl font-bold text-yellow-300 animate-combo-pop" style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>
        Combo x{comboCount}!
      </div>
    </div>
  );
};
