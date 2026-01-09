/**
 * Intro Controller
 *
 * Orchestrates the loading and playback of the intro sequence.
 * 1. Shows loading screen while assets preload
 * 2. Plays intro sequence once ready
 * 3. Handles errors gracefully with skip option
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { IntroSequence, getIntroBeats } from './IntroSequence';
import { IntroErrorBoundary } from './IntroErrorBoundary';
import {
  preloadAssets,
  type LoadedAssets,
  type LoadProgress,
} from '../../utils/assetPreloader';
import {
  getIntroManifest,
  getIntroFallbackManifest,
  supportsWebP,
  DRAFT_ASSETS,
} from '../../data/assetManifests';
import { assetLoader } from '../../utils/assetPreloader';

type IntroPhase = 'loading' | 'playing' | 'complete';

interface IntroControllerProps {
  ownerType: string;
  onComplete: () => void;
}

export const IntroController: React.FC<IntroControllerProps> = ({
  ownerType,
  onComplete,
}) => {
  const [phase, setPhase] = useState<IntroPhase>('loading');
  const [progress, setProgress] = useState<LoadProgress>({
    loaded: 0,
    total: 1,
    percent: 0,
    currentAsset: '',
    errors: [],
  });
  const [assets, setAssets] = useState<LoadedAssets | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load assets
  const loadAssets = useCallback(async () => {
    setLoadError(null);
    setPhase('loading');

    try {
      // Check WebP support to pick manifest
      const webpSupported = await supportsWebP();
      const manifest = webpSupported
        ? getIntroManifest(ownerType)
        : getIntroFallbackManifest(ownerType);

      // Load intro assets
      const loadedAssets = await preloadAssets(manifest, setProgress);

      // Check for critical failures
      const criticalErrors = loadedAssets.errors.filter(
        e => e.type === 'audio' // Images can use placeholder, but audio is critical
      );

      if (criticalErrors.length === loadedAssets.errors.length && criticalErrors.length > 0) {
        // All audio failed - still try to play with fallback timing
        console.warn('Audio loading failed, using fallback timing');
      }

      setAssets(loadedAssets);

      // Start preloading draft assets in background
      assetLoader.preload(DRAFT_ASSETS);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load assets';
      setLoadError(message);
      console.error('Asset loading failed:', error);
    }
  }, [ownerType]);

  // Initial load
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Handle loading complete
  const handleLoadingComplete = useCallback(() => {
    if (assets) {
      setPhase('playing');
    }
  }, [assets]);

  // Handle intro complete
  const handleIntroComplete = useCallback(() => {
    setPhase('complete');
    onComplete();
  }, [onComplete]);

  // Handle skip (from loading or intro)
  const handleSkip = useCallback(() => {
    setPhase('complete');
    onComplete();
  }, [onComplete]);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    loadAssets();
  }, [loadAssets]);

  // Get beats for this owner
  const beats = getIntroBeats(ownerType);

  // Render based on phase
  return (
    <IntroErrorBoundary onSkip={handleSkip}>
      {phase === 'loading' && (
        <LoadingScreen
          progress={progress}
          onComplete={handleLoadingComplete}
          error={loadError}
          onRetry={handleRetry}
          onSkip={handleSkip}
          minimumDisplayTime={2000}
        />
      )}

      {phase === 'playing' && assets && (
        <IntroSequence
          assets={assets}
          beats={beats}
          onComplete={handleIntroComplete}
          onSkip={handleSkip}
        />
      )}

      {/* Phase 'complete' renders nothing - parent handles navigation */}
    </IntroErrorBoundary>
  );
};

export default IntroController;
