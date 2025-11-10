import React from 'react';
import { ActiveEffect, CrystalType, SpecialEffectType } from '../types';
import { CRYSTAL_EFFECT_COLORS, EFFECT_ANIMATION_DURATION } from '../constants';

interface SpecialEffectsProps {
  activeEffects: ActiveEffect[];
}

const StripedBeamEffect: React.FC<{ effect: ActiveEffect }> = ({ effect }) => {
  if (!effect.position) return null;
  const isHorizontal = effect.direction === 'horizontal';
  const style: React.CSSProperties = {
    position: 'absolute',
    background: 'linear-gradient(to right, transparent, white, transparent)',
    borderRadius: '9999px',
    boxShadow: '0 0 15px white',
  };

  if (isHorizontal) {
    style.top = `${effect.position.row * 12.5 + 6.25}%`;
    style.left = '0%';
    style.width = '100%';
    style.height = '12.5%';
    style.transform = 'scaleX(0) translateY(-50%)';
    style.transformOrigin = 'left';
    style.animation = `striped-beam-travel-x ${EFFECT_ANIMATION_DURATION}ms ease-out forwards`;
  } else {
    style.left = `${effect.position.col * 12.5 + 6.25}%`;
    style.top = '0%';
    style.height = '100%';
    style.width = '12.5%';
    style.transform = 'scaleY(0) translateX(-50%)';
    style.transformOrigin = 'top';
    style.background = 'linear-gradient(to bottom, transparent, white, transparent)';
    style.animation = `striped-beam-travel-y ${EFFECT_ANIMATION_DURATION}ms ease-out forwards`;
  }

  return <div style={style} />;
};

const WrappedExplosionEffect: React.FC<{ effect: ActiveEffect }> = ({ effect }) => {
  if (!effect.position) return null;
  const particles = Array.from({ length: 12 });
  const centerX = (effect.position.col + 0.5) * 12.5;
  const centerY = (effect.position.row + 0.5) * 12.5;

  return (
    <>
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360;
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${centerX}%`,
          top: `${centerY}%`,
          width: '10px',
          height: '10px',
          background: 'white',
          borderRadius: '50%',
          transform: `rotate(${angle}deg) translateX(0) scale(1)`,
          animation: `explosion-particle ${EFFECT_ANIMATION_DURATION}ms ease-out forwards`,
          animationName: 'explosion-particle-move, explosion-particle-fade',
          animationDuration: `${EFFECT_ANIMATION_DURATION}ms, ${EFFECT_ANIMATION_DURATION}ms`,
          animationTimingFunction: 'ease-out, ease-in',
        };

        const keyframes = `
          @keyframes explosion-particle-move {
            to { transform: rotate(${angle}deg) translateX(60px); }
          }
          @keyframes explosion-particle-fade {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `;

        return (
          <React.Fragment key={i}>
            <style>{keyframes}</style>
            <div style={style}></div>
          </React.Fragment>
        )
      })}
    </>
  );
};

const ColorBombArcsEffect: React.FC<{ effect: ActiveEffect }> = ({ effect }) => {
    if (!effect.position) return null;
    const fromX = (effect.position.col + 0.5) * 12.5;
    const fromY = (effect.position.row + 0.5) * 12.5;
  
    return (
      <svg className="absolute top-0 left-0 w-full h-full" style={{ overflow: 'visible' }}>
        {effect.targets?.map((target, i) => {
          const toX = (target.col + 0.5) * 12.5;
          const toY = (target.row + 0.5) * 12.5;
          const d = `M ${fromX}% ${fromY}% Q ${fromX}% ${toY}% ${toX}% ${toY}%`;
          const pathLength = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
  
          return (
            <path
              key={i}
              d={d}
              stroke={CRYSTAL_EFFECT_COLORS[effect.color as CrystalType]}
              strokeWidth="3"
              fill="transparent"
              strokeDasharray={pathLength}
              strokeDashoffset={pathLength}
              style={{
                animation: `arc-draw ${EFFECT_ANIMATION_DURATION * 0.8}ms ease-out forwards`,
                animationDelay: `${i * 10}ms`,
                filter: `drop-shadow(0 0 5px ${CRYSTAL_EFFECT_COLORS[effect.color as CrystalType]})`
              }}
            />
          );
        })}
      </svg>
    );
};
  
const StripedWrappedBlastEffect: React.FC<{ effect: ActiveEffect }> = ({ effect }) => {
  if (!effect.position) return null;
  const beamStyle: React.CSSProperties = {
    position: 'absolute',
    background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
    borderRadius: '9999px',
    transformOrigin: 'center',
  };
  
  const horizontalBeamStyle: React.CSSProperties = { 
      ...beamStyle, 
      top: `${(effect.position.row - 1) * 12.5}%`,
      left: '0%', 
      width: '100%', 
      height: '37.5%',
      animation: `energy-pulse-x ${EFFECT_ANIMATION_DURATION * 1.2}ms ease-out forwards` 
  };
  const verticalBeamStyle: React.CSSProperties = { 
      ...beamStyle, 
      left: `${(effect.position.col - 1) * 12.5}%`,
      top: '0%', 
      height: '100%', 
      width: '37.5%',
      animation: `energy-pulse-y ${EFFECT_ANIMATION_DURATION * 1.2}ms ease-out forwards` 
  };

  return (
    <>
      <div style={horizontalBeamStyle}></div>
      <div style={verticalBeamStyle}></div>
    </>
  );
};

const DoubleColorBombClearEffect: React.FC<{ effect: ActiveEffect }> = ({ effect }) => {
    if (!effect.position) return null;
    const style: React.CSSProperties = {
        position: 'absolute',
        top: `${(effect.position.row + 0.5) * 12.5}%`,
        left: `${(effect.position.col + 0.5) * 12.5}%`,
        width: '12.5%',
        height: '12.5%',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%) scale(0)',
        animation: `rainbow-shockwave ${EFFECT_ANIMATION_DURATION * 2}ms ease-out forwards, rainbow-colors 4s linear infinite`,
    };

    return <div style={style}></div>;
};

const DoubleWrappedBlastEffect: React.FC<{ effect: ActiveEffect }> = ({ effect }) => {
    if (!effect.position) return null;
    const style: React.CSSProperties = {
      position: 'absolute',
      top: `${(effect.position.row + 0.5) * 12.5}%`,
      left: `${(effect.position.col + 0.5) * 12.5}%`,
      width: '25%', // 2 cells wide initially
      height: '25%',
      borderRadius: '50%',
      transform: 'translate(-50%, -50%) scale(0)',
      animation: `mega-explosion-shockwave ${EFFECT_ANIMATION_DURATION * 1.5}ms ease-out forwards`,
    };
    return <div style={style}></div>;
};

export const SpecialEffects: React.FC<SpecialEffectsProps> = ({ activeEffects }) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-2" style={{ zIndex: 30 }}>
      {activeEffects.map(effect => {
        switch (effect.type) {
            case SpecialEffectType.StripedBeam:
                return <StripedBeamEffect key={effect.id} effect={effect} />;
            case SpecialEffectType.WrappedExplosion:
                return <WrappedExplosionEffect key={effect.id} effect={effect} />;
            case SpecialEffectType.ColorBombArcs:
                return <ColorBombArcsEffect key={effect.id} effect={effect} />;
            case SpecialEffectType.StripedWrappedBlast:
                return <StripedWrappedBlastEffect key={effect.id} effect={effect} />;
            case SpecialEffectType.DoubleColorBombClear:
                return <DoubleColorBombClearEffect key={effect.id} effect={effect} />;
            case SpecialEffectType.DoubleWrappedBlast:
                return <DoubleWrappedBlastEffect key={effect.id} effect={effect} />;
          default:
            return null;
        }
      })}
    </div>
  );
};