/**
 * ILLEGAL MOTION - Asset Preloader
 *
 * Preloads all assets before they're needed to prevent race conditions.
 * Handles images, audio, and video with proper event-based loading.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface AssetManifest {
  id: string;
  images?: string[];
  audio?: string[];
  video?: string[];
}

export interface LoadedAsset {
  type: 'image' | 'audio' | 'video';
  url: string;
  element: HTMLImageElement | HTMLAudioElement | HTMLVideoElement;
  loaded: boolean;
  error?: string;
}

export interface LoadedAssets {
  images: Map<string, HTMLImageElement>;
  audio: Map<string, HTMLAudioElement>;
  video: Map<string, HTMLVideoElement>;
  errors: LoadError[];
  totalLoaded: number;
  totalAssets: number;
}

export interface LoadError {
  url: string;
  type: 'image' | 'audio' | 'video';
  error: string;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percent: number;
  currentAsset: string;
  errors: LoadError[];
}

export type ProgressCallback = (progress: LoadProgress) => void;

// =============================================================================
// ASSET PRELOADER
// =============================================================================

/**
 * Preload all assets in a manifest.
 * Returns only when ALL assets are ready (or have failed with fallback).
 */
export async function preloadAssets(
  manifest: AssetManifest,
  onProgress?: ProgressCallback,
  options: PreloadOptions = {}
): Promise<LoadedAssets> {
  const {
    retryAttempts = 2,
    retryDelay = 1000,
    timeout = 30000,
  } = options;

  const images = new Map<string, HTMLImageElement>();
  const audio = new Map<string, HTMLAudioElement>();
  const video = new Map<string, HTMLVideoElement>();
  const errors: LoadError[] = [];

  const allUrls: Array<{ url: string; type: 'image' | 'audio' | 'video' }> = [
    ...(manifest.images || []).map(url => ({ url, type: 'image' as const })),
    ...(manifest.audio || []).map(url => ({ url, type: 'audio' as const })),
    ...(manifest.video || []).map(url => ({ url, type: 'video' as const })),
  ];

  const totalAssets = allUrls.length;
  let loadedCount = 0;

  const reportProgress = (currentAsset: string) => {
    if (onProgress) {
      onProgress({
        loaded: loadedCount,
        total: totalAssets,
        percent: totalAssets > 0 ? Math.round((loadedCount / totalAssets) * 100) : 0,
        currentAsset,
        errors,
      });
    }
  };

  // Load all assets in parallel
  const loadPromises = allUrls.map(async ({ url, type }) => {
    reportProgress(url);

    try {
      let element: HTMLImageElement | HTMLAudioElement | HTMLVideoElement;

      switch (type) {
        case 'image':
          element = await loadImageWithRetry(url, retryAttempts, retryDelay, timeout);
          images.set(url, element as HTMLImageElement);
          break;
        case 'audio':
          element = await loadAudioWithRetry(url, retryAttempts, retryDelay, timeout);
          audio.set(url, element as HTMLAudioElement);
          break;
        case 'video':
          element = await loadVideoWithRetry(url, retryAttempts, retryDelay, timeout);
          video.set(url, element as HTMLVideoElement);
          break;
      }

      loadedCount++;
      reportProgress(url);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ url, type, error: errorMsg });
      loadedCount++;
      reportProgress(url);
      console.warn(`Failed to load ${type}: ${url}`, errorMsg);
    }
  });

  await Promise.all(loadPromises);

  return {
    images,
    audio,
    video,
    errors,
    totalLoaded: loadedCount - errors.length,
    totalAssets,
  };
}

// =============================================================================
// INDIVIDUAL LOADERS
// =============================================================================

interface PreloadOptions {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Load a single image with retry logic.
 */
async function loadImageWithRetry(
  url: string,
  retries: number,
  retryDelay: number,
  timeout: number
): Promise<HTMLImageElement> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await loadImage(url, timeout);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < retries) {
        await delay(retryDelay);
      }
    }
  }

  throw lastError || new Error('Failed to load image');
}

/**
 * Load a single image.
 */
function loadImage(url: string, timeout: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const timeoutId = setTimeout(() => {
      reject(new Error(`Image load timeout: ${url}`));
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${url}`));
    };

    // Start loading
    img.src = url;
  });
}

/**
 * Load a single audio file with retry logic.
 */
async function loadAudioWithRetry(
  url: string,
  retries: number,
  retryDelay: number,
  timeout: number
): Promise<HTMLAudioElement> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await loadAudio(url, timeout);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < retries) {
        await delay(retryDelay);
      }
    }
  }

  throw lastError || new Error('Failed to load audio');
}

/**
 * Load a single audio file.
 * Waits for 'canplaythrough' event to ensure enough is buffered.
 */
function loadAudio(url: string, timeout: number): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'auto';

    const timeoutId = setTimeout(() => {
      reject(new Error(`Audio load timeout: ${url}`));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };

    const handleCanPlay = () => {
      cleanup();
      resolve(audio);
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Failed to load audio: ${url}`));
    };

    audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
    audio.addEventListener('error', handleError, { once: true });

    // Start loading
    audio.src = url;
    audio.load();
  });
}

/**
 * Load a single video file with retry logic.
 */
async function loadVideoWithRetry(
  url: string,
  retries: number,
  retryDelay: number,
  timeout: number
): Promise<HTMLVideoElement> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await loadVideo(url, timeout);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < retries) {
        await delay(retryDelay);
      }
    }
  }

  throw lastError || new Error('Failed to load video');
}

/**
 * Load a single video file.
 * Waits for 'canplaythrough' event to ensure enough is buffered.
 */
function loadVideo(url: string, timeout: number): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = true; // Muted initially for autoplay policies

    const timeoutId = setTimeout(() => {
      reject(new Error(`Video load timeout: ${url}`));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('canplaythrough', handleCanPlay);
      video.removeEventListener('error', handleError);
    };

    const handleCanPlay = () => {
      cleanup();
      resolve(video);
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Failed to load video: ${url}`));
    };

    video.addEventListener('canplaythrough', handleCanPlay, { once: true });
    video.addEventListener('error', handleError, { once: true });

    // Start loading
    video.src = url;
    video.load();
  });
}

// =============================================================================
// HELPERS
// =============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if all critical assets loaded successfully.
 */
export function hasAllCriticalAssets(
  loaded: LoadedAssets,
  critical: { images?: string[]; audio?: string[]; video?: string[] }
): boolean {
  for (const url of critical.images || []) {
    if (!loaded.images.has(url)) return false;
  }
  for (const url of critical.audio || []) {
    if (!loaded.audio.has(url)) return false;
  }
  for (const url of critical.video || []) {
    if (!loaded.video.has(url)) return false;
  }
  return true;
}

/**
 * Get a loaded audio element, ready to play.
 */
export function getAudio(assets: LoadedAssets, url: string): HTMLAudioElement | null {
  const audio = assets.audio.get(url);
  if (audio) {
    // Clone the audio so multiple can play simultaneously if needed
    audio.currentTime = 0;
  }
  return audio || null;
}

/**
 * Get a loaded image element.
 */
export function getImage(assets: LoadedAssets, url: string): HTMLImageElement | null {
  return assets.images.get(url) || null;
}

/**
 * Get a loaded video element.
 */
export function getVideo(assets: LoadedAssets, url: string): HTMLVideoElement | null {
  return assets.video.get(url) || null;
}

// =============================================================================
// PROGRESSIVE LOADER
// =============================================================================

/**
 * Progressive asset loader for loading assets in priority order.
 * Allows the game to start with intro assets while continuing to load others.
 */
export class ProgressiveAssetLoader {
  private loadedAssets: Map<string, LoadedAssets> = new Map();
  private loadingPromises: Map<string, Promise<LoadedAssets>> = new Map();

  /**
   * Load a manifest and return immediately if already loaded.
   */
  async load(
    manifest: AssetManifest,
    onProgress?: ProgressCallback
  ): Promise<LoadedAssets> {
    // Check if already loaded
    const existing = this.loadedAssets.get(manifest.id);
    if (existing) {
      return existing;
    }

    // Check if currently loading
    const loadingPromise = this.loadingPromises.get(manifest.id);
    if (loadingPromise) {
      return loadingPromise;
    }

    // Start loading
    const promise = preloadAssets(manifest, onProgress);
    this.loadingPromises.set(manifest.id, promise);

    try {
      const result = await promise;
      this.loadedAssets.set(manifest.id, result);
      this.loadingPromises.delete(manifest.id);
      return result;
    } catch (error) {
      this.loadingPromises.delete(manifest.id);
      throw error;
    }
  }

  /**
   * Start loading in background without waiting.
   */
  preload(manifest: AssetManifest): void {
    this.load(manifest).catch(err => {
      console.warn(`Background preload failed for ${manifest.id}:`, err);
    });
  }

  /**
   * Get loaded assets if available.
   */
  get(manifestId: string): LoadedAssets | null {
    return this.loadedAssets.get(manifestId) || null;
  }

  /**
   * Check if a manifest is fully loaded.
   */
  isLoaded(manifestId: string): boolean {
    return this.loadedAssets.has(manifestId);
  }

  /**
   * Clear all cached assets.
   */
  clear(): void {
    this.loadedAssets.clear();
    this.loadingPromises.clear();
  }
}

// Global instance for convenience
export const assetLoader = new ProgressiveAssetLoader();
