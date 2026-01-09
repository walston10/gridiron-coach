/**
 * Loading Screen Component
 *
 * Displays while assets are loading.
 * Shows progress bar, logo, and rotating tips.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LOADING_TIPS, getRandomTip } from '../../data/assetManifests';
import type { LoadProgress } from '../../utils/assetPreloader';

interface LoadingScreenProps {
  progress: LoadProgress;
  onComplete?: () => void;
  minimumDisplayTime?: number; // Minimum time to show (prevent flash)
  error?: string | null;
  onRetry?: () => void;
  onSkip?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  onComplete,
  minimumDisplayTime = 2000,
  error,
  onRetry,
  onSkip,
}) => {
  const [tip, setTip] = useState(getRandomTip());
  const [startTime] = useState(Date.now());
  const [canComplete, setCanComplete] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Rotate tips every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTip(getRandomTip());
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Enforce minimum display time
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanComplete(true);
    }, minimumDisplayTime);

    return () => clearTimeout(timer);
  }, [minimumDisplayTime]);

  // Complete when ready and minimum time passed
  useEffect(() => {
    if (canComplete && progress.percent >= 100 && !error && onComplete) {
      // Start fade out
      setFadeOut(true);

      // Complete after fade
      const timer = setTimeout(() => {
        onComplete();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [canComplete, progress.percent, error, onComplete]);

  // Format current asset name for display
  const formatAssetName = (url: string): string => {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.(webp|png|jpg|mp3|wav|webm|mp4)$/i, '');
  };

  return (
    <div
      className={`fixed inset-0 bg-black flex flex-col items-center justify-center z-50
                  transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(139, 69, 19, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(220, 38, 38, 0.1) 0%, transparent 40%),
            linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 100%)
          `,
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg px-8">
        {/* Logo */}
        <div className="mb-12">
          <h1
            className="text-4xl md:text-5xl font-black tracking-tighter"
            style={{
              color: '#f59e0b',
              textShadow: '0 0 30px rgba(245, 158, 11, 0.4)',
            }}
          >
            ILLEGAL
          </h1>
          <h1
            className="text-4xl md:text-5xl font-black tracking-tighter"
            style={{
              color: '#dc2626',
              textShadow: '0 0 30px rgba(220, 38, 38, 0.4)',
            }}
          >
            MOTION
          </h1>
        </div>

        {/* Error state */}
        {error ? (
          <div className="mb-8">
            <div className="text-red-500 mb-4">{error}</div>
            <div className="flex gap-4 justify-center">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded"
                >
                  Retry
                </button>
              )}
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                >
                  Skip Intro
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-8">
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {/* Progress text */}
              <div className="mt-3 flex justify-between items-center text-sm">
                <span className="text-stone-500">
                  {progress.loaded} / {progress.total}
                </span>
                <span className="text-stone-400">{progress.percent}%</span>
              </div>

              {/* Current asset */}
              {progress.currentAsset && (
                <div className="mt-2 text-stone-600 text-xs truncate">
                  Loading: {formatAssetName(progress.currentAsset)}
                </div>
              )}
            </div>

            {/* Loading indicator */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-3">
                <LoadingSpinner />
                <span className="text-stone-400 text-sm tracking-wider uppercase">
                  Preparing Assets
                </span>
              </div>
            </div>
          </>
        )}

        {/* Tip */}
        <div className="h-12">
          <p
            className="text-stone-500 text-sm italic transition-opacity duration-500"
            key={tip}
          >
            "{tip}"
          </p>
        </div>

        {/* Load errors (non-fatal) */}
        {progress.errors.length > 0 && !error && (
          <div className="mt-4 text-xs text-stone-600">
            {progress.errors.length} asset(s) failed to load (using fallbacks)
          </div>
        )}
      </div>

      {/* Version */}
      <div className="absolute bottom-4 text-stone-800 text-xs">
        v0.1 ALPHA
      </div>
    </div>
  );
};

// =============================================================================
// LOADING SPINNER
// =============================================================================

const LoadingSpinner: React.FC = () => (
  <svg
    className="animate-spin h-5 w-5 text-amber-500"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export default LoadingScreen;
