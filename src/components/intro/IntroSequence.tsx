/**
 * Intro Sequence Component
 *
 * Ken Burns style slideshow with owner monologue.
 * Uses preloaded assets to ensure smooth playback.
 * Audio-driven timing for perfect sync.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { LoadedAssets } from '../../utils/assetPreloader';

// =============================================================================
// TYPES
// =============================================================================

interface IntroBeat {
  id: number;
  imageUrl: string;
  audioUrl: string;
  text: string;
  effect: 'zoomIn' | 'panLeft' | 'panRight' | 'zoomOut';
  durationFallback: number; // Fallback if audio doesn't provide duration
}

interface IntroSequenceProps {
  assets: LoadedAssets;
  beats: IntroBeat[];
  onComplete: () => void;
  onSkip?: () => void;
}

// =============================================================================
// TYPEWRITER HOOK
// =============================================================================

function useTypewriter(text: string, speed: number = 35) {
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

// =============================================================================
// INTRO SEQUENCE
// =============================================================================

export const IntroSequence: React.FC<IntroSequenceProps> = ({
  assets,
  beats,
  onComplete,
  onSkip,
}) => {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const beat = beats[currentBeat];

  const { displayed: subtitleText } = useTypewriter(beat?.text || '', 35);

  // Check assets are ready
  useEffect(() => {
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Stop current audio
  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  // Advance to next beat
  const advanceBeat = useCallback(() => {
    stopAudio();

    if (currentBeat < beats.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentBeat(prev => prev + 1);
        setIsTransitioning(false);
      }, 500); // Crossfade duration
    } else {
      // Intro complete
      onComplete();
    }
  }, [currentBeat, beats.length, onComplete, stopAudio]);

  // Play beat audio and set up advance timing
  useEffect(() => {
    if (!isReady || !beat) return;

    // Get preloaded audio
    const audio = assets.audio.get(beat.audioUrl);

    if (audio) {
      // Clone to allow replay
      currentAudioRef.current = audio;
      audio.currentTime = 0;

      // When audio ends, advance to next beat
      const handleEnded = () => {
        advanceBeat();
      };

      audio.addEventListener('ended', handleEnded, { once: true });

      // Play the audio
      audio.play().catch(err => {
        console.warn('Audio playback failed:', err);
        // Use fallback duration if audio fails
        setTimeout(advanceBeat, beat.durationFallback);
      });

      return () => {
        audio.removeEventListener('ended', handleEnded);
      };
    } else {
      // No audio available, use fallback duration
      const timer = setTimeout(advanceBeat, beat.durationFallback);
      return () => clearTimeout(timer);
    }
  }, [isReady, beat, currentBeat, assets.audio, advanceBeat]);

  // Handle skip
  const handleSkip = () => {
    stopAudio();
    onSkip?.();
    onComplete();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  if (!beat) return null;

  // Get preloaded image
  const image = assets.images.get(beat.imageUrl);
  const imageUrl = image?.src || beat.imageUrl;

  // Ken Burns effect styles
  const getEffectStyle = (effect: IntroBeat['effect']) => {
    const duration = beat.durationFallback;
    switch (effect) {
      case 'zoomIn':
        return { animation: `kenBurnsZoomIn ${duration}ms ease-out forwards` };
      case 'zoomOut':
        return { animation: `kenBurnsZoomOut ${duration}ms ease-out forwards` };
      case 'panLeft':
        return { animation: `kenBurnsPanLeft ${duration}ms ease-out forwards` };
      case 'panRight':
        return { animation: `kenBurnsPanRight ${duration}ms ease-out forwards` };
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
        style={getEffectStyle(beat.effect)}
      >
        {/* Image */}
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
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
        {beats.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
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
              }}
            >
              {subtitleText}
              <span className="animate-pulse">|</span>
            </p>
          </div>
        </div>
      </div>

      {/* Click to advance overlay */}
      <div
        className="absolute inset-0 z-30 cursor-pointer"
        onClick={advanceBeat}
      />
    </div>
  );
};

// =============================================================================
// BEAT DEFINITIONS
// =============================================================================

/**
 * Tex owner intro beats with asset URLs.
 */
export const TEX_INTRO_BEATS: IntroBeat[] = [
  {
    id: 1,
    imageUrl: '/images/tex_beat_1.webp',
    audioUrl: '/audio/tex_beat_1.mp3',
    text: "Thirty-one years I've owned this team. Three championships. And more bodies than I care to count. That's a joke, son. Mostly.",
    effect: 'zoomIn',
    durationFallback: 8000,
  },
  {
    id: 2,
    imageUrl: '/images/tex_beat_2.webp',
    audioUrl: '/audio/tex_beat_2.mp3',
    text: "Now my last GM... poor bastard thought he was smart. Thought he could skim a little off the top. Thought Big Oil wouldn't notice. They found his car at the border. Never did find him.",
    effect: 'panLeft',
    durationFallback: 13000,
  },
  {
    id: 3,
    imageUrl: '/images/tex_beat_3.webp',
    audioUrl: '/audio/tex_beat_3.mp3',
    text: "Let's get one thing straight. You don't deserve this job. Hell, you're nobody. But I like nobodies. Nobodies are grateful. Nobodies are loyal. And nobodies don't ask stupid goddamn questions.",
    effect: 'zoomIn',
    durationFallback: 12500,
  },
  {
    id: 4,
    imageUrl: '/images/tex_beat_4.webp',
    audioUrl: '/audio/tex_beat_4.mp3',
    text: "Here's how this works. When we win - and we will win - I'm the genius who built this thing. I'm the one on camera. I'm the one shaking hands with the commissioner. You? You're in the background where you belong.",
    effect: 'panRight',
    durationFallback: 13000,
  },
  {
    id: 5,
    imageUrl: '/images/tex_beat_5.webp',
    audioUrl: '/audio/tex_beat_5.mp3',
    text: "But when shit goes sideways? That's your name in the papers. Your face on the news. You're the fall guy, son. That's the job. That's the only job.",
    effect: 'zoomOut',
    durationFallback: 11750,
  },
  {
    id: 6,
    imageUrl: '/images/tex_beat_6.webp',
    audioUrl: '/audio/tex_beat_6.mp3',
    text: "Now. You can walk outta here right now. No hard feelings. Or you can stay, get rich, and maybe - maybe - earn yourself a seat at the big boy table. So what's it gonna be, partner?",
    effect: 'zoomIn',
    durationFallback: 15000,
  },
];

/**
 * Get intro beats for owner type.
 */
export function getIntroBeats(ownerType: string): IntroBeat[] {
  switch (ownerType) {
    case 'tex':
    default:
      return TEX_INTRO_BEATS;
  }
}

export default IntroSequence;
