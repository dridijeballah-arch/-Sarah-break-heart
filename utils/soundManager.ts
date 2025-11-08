// New file: utils/soundManager.ts
import { SOUNDS, SoundType } from '../sounds';

const audioPool: { [key in SoundType]?: HTMLAudioElement[] } = {};
const MAX_POOL_SIZE = 10;
let audioContext: AudioContext | null = null;

// Function to unlock audio on the first user interaction
const unlockAudio = () => {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
};

// Initialize and unlock audio context
if (typeof window !== 'undefined') {
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchend', unlockAudio, { once: true });
}

export const playSound = (sound: SoundType, volume: number = 0.5) => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (!audioPool[sound]) {
      audioPool[sound] = [];
    }
    
    let audio = audioPool[sound]?.find(a => a.paused);

    if (!audio) {
      if ((audioPool[sound]?.length ?? 0) < MAX_POOL_SIZE) {
        audio = new Audio(SOUNDS[sound]);
        audioPool[sound]?.push(audio);
      } else {
        // Reuse the oldest audio element
        audio = audioPool[sound]?.[0];
        if (audio) {
            // Move to end of queue
            audioPool[sound]?.shift();
            audioPool[sound]?.push(audio);
        }
      }
    }
    
    if (audio) {
      audio.volume = volume;
      audio.currentTime = 0;
      audio.play().catch(error => console.error(`Error playing sound ${sound}:`, error));
    }

  } catch (error) {
    console.error('Failed to play sound:', error);
  }
};
