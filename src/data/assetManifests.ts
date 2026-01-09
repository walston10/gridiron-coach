/**
 * ILLEGAL MOTION - Asset Manifests
 *
 * Defines all asset groups for progressive loading.
 * Assets are organized by when they're needed in the game flow.
 */

import type { AssetManifest } from '../utils/assetPreloader';

// =============================================================================
// INTRO ASSETS
// =============================================================================

/**
 * Assets needed for the franchise intro sequence.
 * Must be fully loaded before intro plays.
 */
export const INTRO_ASSETS_TEX: AssetManifest = {
  id: 'intro-tex',
  images: [
    '/images/tex_beat_1.webp',
    '/images/tex_beat_2.webp',
    '/images/tex_beat_3.webp',
    '/images/tex_beat_4.webp',
    '/images/tex_beat_5.webp',
    '/images/tex_beat_6.webp',
  ],
  audio: [
    '/audio/tex_beat_1.mp3',
    '/audio/tex_beat_2.mp3',
    '/audio/tex_beat_3.mp3',
    '/audio/tex_beat_4.mp3',
    '/audio/tex_beat_5.mp3',
    '/audio/tex_beat_6.mp3',
  ],
};

// Fallback manifest with PNG format if WebP not supported
export const INTRO_ASSETS_TEX_FALLBACK: AssetManifest = {
  id: 'intro-tex-fallback',
  images: [
    '/images/tex_beat_1.png',
    '/images/tex_beat_2.png',
    '/images/tex_beat_3.png',
    '/images/tex_beat_4.png',
    '/images/tex_beat_5.png',
    '/images/tex_beat_6.png',
  ],
  audio: [
    '/audio/tex_beat_1.wav',
    '/audio/tex_beat_2.wav',
    '/audio/tex_beat_3.wav',
    '/audio/tex_beat_4.wav',
    '/audio/tex_beat_5.wav',
    '/audio/tex_beat_6.wav',
  ],
};

// =============================================================================
// TITLE/UI ASSETS
// =============================================================================

/**
 * Assets for the start screen and UI.
 * Can be loaded during initial app load.
 */
export const TITLE_ASSETS: AssetManifest = {
  id: 'title',
  images: [
    '/images/logo.webp',
    '/images/title_bg.webp',
  ],
};

// =============================================================================
// DRAFT ASSETS
// =============================================================================

/**
 * Assets for the draft screen.
 * Can be preloaded during intro.
 */
export const DRAFT_ASSETS: AssetManifest = {
  id: 'draft',
  images: [
    '/images/draft_bg.webp',
    '/images/draft_podium.webp',
  ],
  audio: [
    '/audio/draft_pick.mp3',
    '/audio/draft_complete.mp3',
  ],
};

// =============================================================================
// GAME DAY ASSETS
// =============================================================================

/**
 * Assets for the game day experience.
 * Loaded after draft is complete.
 */
export const GAME_DAY_ASSETS: AssetManifest = {
  id: 'game-day',
  images: [
    '/images/field.webp',
    '/images/stadium_bg.webp',
  ],
  audio: [
    '/audio/crowd_ambient.mp3',
    '/audio/whistle.mp3',
    '/audio/touchdown.mp3',
  ],
};

// =============================================================================
// DESK ASSETS
// =============================================================================

/**
 * Assets for the GM desk scene.
 */
export const DESK_ASSETS: AssetManifest = {
  id: 'desk',
  images: [
    '/images/desk_bg.webp',
    '/images/desk_items.webp',
  ],
};

// =============================================================================
// LOADING TIPS
// =============================================================================

/**
 * Tips to display during loading.
 * Rotated every few seconds.
 */
export const LOADING_TIPS: string[] = [
  'Win games. Avoid prison.',
  'The owner is always watching.',
  'Some problems can be solved with money. Others require... creativity.',
  'A good GM knows when to bend the rules.',
  'Keep your friends close and your evidence closer.',
  'Championships are won on the field. Empires are built in the shadows.',
  'Every scandal has a price tag.',
  'Trust is earned. Loyalty is purchased.',
  'The league has rules. Smart GMs have lawyers.',
  'Build your dynasty. Bend the rules.',
];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get the intro manifest for a specific owner type.
 */
export function getIntroManifest(ownerType: string): AssetManifest {
  // Currently only Tex is implemented
  // Add more owners here when ready
  switch (ownerType) {
    case 'tex':
    default:
      return INTRO_ASSETS_TEX;
  }
}

/**
 * Get fallback manifest for when primary format fails.
 */
export function getIntroFallbackManifest(ownerType: string): AssetManifest {
  switch (ownerType) {
    case 'tex':
    default:
      return INTRO_ASSETS_TEX_FALLBACK;
  }
}

/**
 * Check if browser supports WebP.
 */
export async function supportsWebP(): Promise<boolean> {
  if (typeof createImageBitmap === 'undefined') {
    return false;
  }

  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

  try {
    const blob = await fetch(webpData).then(r => r.blob());
    await createImageBitmap(blob);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get random loading tip.
 */
export function getRandomTip(): string {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
}
