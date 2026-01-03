/**
 * Franchise Intro
 *
 * Ken Burns style slideshow with owner monologue.
 * 6 beats with crossfade transitions and typewriter subtitles.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';

// Beat data for Tex owner
interface IntroBeat {
  id: number;
  image: string; // placeholder - will be image path
  duration: number;
  text: string;
  effect: 'zoomIn' | 'panLeft' | 'panRight' | 'zoomOut';
}

const TEX_BEATS: IntroBeat[] = [
  {
    id: 1,
    image: 'tex_beat_1',
    duration: 8000,
    text: "Thirty-one years I've owned this team. Three championships. And more bodies than I care to count. That's a joke, son. Mostly.",
    effect: 'zoomIn',
  },
  {
    id: 2,
    image: 'tex_beat_2',
    duration: 13000,
    text: "Now my last GM... poor bastard thought he was smart. Thought he could skim a little off the top. Thought Big Oil wouldn't notice. They found his car at the border. Never did find him.",
    effect: 'panLeft',
  },
  {
    id: 3,
    image: 'tex_beat_3',
    duration: 12000,
    text: "Let's get one thing straight. You don't deserve this job. Hell, you're nobody. But I like nobodies. Nobodies are grateful. Nobodies are loyal. And nobodies don't ask stupid goddamn questions.",
    effect: 'zoomIn',
  },
  {
    id: 4,
    image: 'tex_beat_4',
    duration: 13000,
    text: "Here's how this works. When we win - and we will win - I'm the genius who built this thing. I'm the one on camera. I'm the one shaking hands with the commissioner. You? You're in the background where you belong.",
    effect: 'panRight',
  },
  {
    id: 5,
    image: 'tex_beat_5',
    duration: 12000,
    text: "But when shit goes sideways? That's your name in the papers. Your face on the news. You're the fall guy, son. That's the job. That's the only job.",
    effect: 'zoomOut',
  },
  {
    id: 6,
    image: 'tex_beat_6',
    duration: 15000,
    text: "Now. You can walk outta here right now. No hard feelings. Or you can stay, get rich, and maybe - maybe - earn yourself a seat at the big boy table. So what's it gonna be, partner?",
    effect: 'zoomIn',
  },
];

// Get image URL for each beat (case-insensitive - use lowercase)
const getImageUrl = (imageName: string): string => {
  return `/images/${imageName}.png`;
};

// Typewriter hook
function useTypewriter(text: string, speed: number = 30) {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setIsComplete(false);
    let index = 0;

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayed(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, isComplete };
}

export const FranchiseIntro: React.FC = () => {
  const { setPhase, ownerType } = useGameStore();
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);

  // Preloaded audio refs
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const beat = TEX_BEATS[currentBeat];
  const { displayed: subtitleText } = useTypewriter(beat?.text || '', 35);

  // Preload all audio files on mount
  useEffect(() => {
    const loadAudio = async () => {
      const audioPromises = TEX_BEATS.map((b) => {
        return new Promise<HTMLAudioElement>((resolve) => {
          const audio = new Audio(`/audio/${ownerType}_beat_${b.id}.wav`);
          audio.preload = 'auto';
          audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
          audio.addEventListener('error', () => {
            console.warn(`Failed to load audio: ${ownerType}_beat_${b.id}.wav`);
            resolve(audio); // Resolve anyway so we don't block
          }, { once: true });
          audio.load();
        });
      });

      const loadedAudio = await Promise.all(audioPromises);
      audioRefs.current = loadedAudio;
      setAudioLoaded(true);
    };

    loadAudio();

    // Cleanup on unmount
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [ownerType]);

  // Stop all audio helper
  const stopAllAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  // Advance to next beat
  const advanceBeat = useCallback(() => {
    stopAllAudio();

    if (currentBeat < TEX_BEATS.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentBeat(prev => prev + 1);
        setIsTransitioning(false);
      }, 500); // Crossfade duration
    } else {
      // Intro complete, go to name input
      setPhase('nameInput');
    }
  }, [currentBeat, setPhase, stopAllAudio]);

  // Play audio and auto-advance timer
  useEffect(() => {
    if (!beat || !audioLoaded) return;

    // Play the audio for this beat
    const audio = audioRefs.current[currentBeat];
    if (audio) {
      currentAudioRef.current = audio;
      audio.currentTime = 0;
      audio.play().catch(err => {
        console.warn('Audio playback failed:', err);
      });
    }

    // Auto-advance after beat duration
    const timer = setTimeout(() => {
      advanceBeat();
    }, beat.duration);

    return () => {
      clearTimeout(timer);
    };
  }, [beat, currentBeat, audioLoaded, advanceBeat]);

  // Skip intro
  const handleSkip = () => {
    stopAllAudio();
    setPhase('nameInput');
  };

  if (!beat) return null;

  // Ken Burns effect styles
  const getEffectStyle = (effect: IntroBeat['effect']) => {
    switch (effect) {
      case 'zoomIn':
        return {
          animation: `kenBurnsZoomIn ${beat.duration}ms ease-out forwards`,
        };
      case 'zoomOut':
        return {
          animation: `kenBurnsZoomOut ${beat.duration}ms ease-out forwards`,
        };
      case 'panLeft':
        return {
          animation: `kenBurnsPanLeft ${beat.duration}ms ease-out forwards`,
        };
      case 'panRight':
        return {
          animation: `kenBurnsPanRight ${beat.duration}ms ease-out forwards`,
        };
      default:
        return {};
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Ken Burns animations */}
      <style>{`
        @keyframes kenBurnsZoomIn {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
        @keyframes kenBurnsZoomOut {
          from { transform: scale(1.15); }
          to { transform: scale(1); }
        }
        @keyframes kenBurnsPanLeft {
          from { transform: scale(1.1) translateX(0); }
          to { transform: scale(1.1) translateX(-5%); }
        }
        @keyframes kenBurnsPanRight {
          from { transform: scale(1.1) translateX(-5%); }
          to { transform: scale(1.1) translateX(0); }
        }
      `}</style>

      {/* Background image with Ken Burns effect */}
      <div
        key={beat.id}
        className={`absolute inset-0 transition-opacity duration-500 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          ...getEffectStyle(beat.effect),
        }}
      >
        {/* Actual image */}
        <img
          src={getImageUrl(beat.image)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            // Try alternate case extension before giving up
            if (img.src.endsWith('.png')) {
              img.src = img.src.replace('.png', '.PNG');
            } else if (img.src.endsWith('.PNG')) {
              // Both cases failed, hide image
              img.style.display = 'none';
            }
          }}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.7) 100%)',
          }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 z-50 text-stone-500 hover:text-stone-300 text-sm tracking-wider transition-colors"
      >
        SKIP &gt;
      </button>

      {/* Progress indicator */}
      <div className="absolute top-6 left-6 z-50 flex gap-2">
        {TEX_BEATS.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx === currentBeat
                ? 'bg-amber-500'
                : idx < currentBeat
                ? 'bg-stone-600'
                : 'bg-stone-800'
            }`}
          />
        ))}
      </div>

      {/* Subtitle bar */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-16 pb-8 px-8">
          <div className="max-w-4xl mx-auto">
            <p
              className="text-white text-xl md:text-2xl font-medium leading-relaxed text-center"
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {subtitleText}
              <span className="animate-pulse">|</span>
            </p>
          </div>
        </div>
      </div>

      {/* Click to advance (optional - currently auto-advances) */}
      <div
        className="absolute inset-0 z-30 cursor-pointer"
        onClick={advanceBeat}
      />
    </div>
  );
};

export default FranchiseIntro;
