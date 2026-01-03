/**
 * Franchise Intro
 *
 * Ken Burns style slideshow with owner monologue.
 * 6 beats with crossfade transitions and typewriter subtitles.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
    image: 'stadium',
    duration: 8000,
    text: "Thirty-one years I've owned this team. Three championships. And more bodies than I care to count. That's a joke, son. Mostly.",
    effect: 'zoomIn',
  },
  {
    id: 2,
    image: 'oil-derricks',
    duration: 10000,
    text: "Now my last GM... poor bastard thought he was smart. Thought he could skim a little off the top. Thought Big Oil wouldn't notice. They found his car at the border. Never did find him.",
    effect: 'panLeft',
  },
  {
    id: 3,
    image: 'tex-portrait',
    duration: 9000,
    text: "Let's get one thing straight. You don't deserve this job. Hell, you're nobody. But I like nobodies. Nobodies are grateful. Nobodies are loyal. And nobodies don't ask stupid goddamn questions.",
    effect: 'zoomIn',
  },
  {
    id: 4,
    image: 'briefcase',
    duration: 10000,
    text: "Here's how this works. When we win - and we will win - I'm the genius who built this thing. I'm the one on camera. I'm the one shaking hands with the commissioner. You? You're in the background where you belong.",
    effect: 'panRight',
  },
  {
    id: 5,
    image: 'tex-window',
    duration: 9000,
    text: "But when shit goes sideways? That's your name in the papers. Your face on the news. You're the fall guy, son. That's the job. That's the only job.",
    effect: 'zoomOut',
  },
  {
    id: 6,
    image: 'tex-closeup',
    duration: 12000,
    text: "Now. You can walk outta here right now. No hard feelings. Or you can stay, get rich, and maybe - maybe - earn yourself a seat at the big boy table. So what's it gonna be, partner?",
    effect: 'zoomIn',
  },
];

// Placeholder image backgrounds for each beat
const BEAT_BACKGROUNDS: Record<string, string> = {
  'stadium': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'oil-derricks': 'linear-gradient(135deg, #2d1f1f 0%, #4a2c2c 50%, #1a0f0f 100%)',
  'tex-portrait': 'linear-gradient(135deg, #1f1f2d 0%, #2c2c4a 50%, #0f0f1a 100%)',
  'briefcase': 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #0a0a0a 100%)',
  'tex-window': 'linear-gradient(135deg, #1f2d1f 0%, #2c4a2c 50%, #0f1a0f 100%)',
  'tex-closeup': 'linear-gradient(135deg, #2d1f1f 0%, #4a2c2c 50%, #1a0a0a 100%)',
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
  const { setPhase } = useGameStore();
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const beat = TEX_BEATS[currentBeat];
  const { displayed: subtitleText } = useTypewriter(beat?.text || '', 35);

  // Advance to next beat
  const advanceBeat = useCallback(() => {
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
  }, [currentBeat, setPhase]);

  // Auto-advance timer
  useEffect(() => {
    if (!beat) return;

    const timer = setTimeout(() => {
      advanceBeat();
    }, beat.duration);

    // TODO: Audio playback would go here
    // const audio = new Audio(`/audio/tex_beat_${beat.id}.mp3`);
    // audio.play();

    return () => {
      clearTimeout(timer);
      // audio.pause();
    };
  }, [beat, advanceBeat]);

  // Skip intro
  const handleSkip = () => {
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
          background: BEAT_BACKGROUNDS[beat.image],
          ...getEffectStyle(beat.effect),
        }}
      >
        {/* Placeholder beat indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-700 text-9xl font-black opacity-20">
          {beat.id}
        </div>

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
