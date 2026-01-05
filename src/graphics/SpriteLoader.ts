/**
 * Sprite Sheet Loader
 *
 * Loads and slices sprite sheets from itch.io assets into individual frames.
 * Supports the 8x6 grid format (8 columns, 6 rows = 48 frames per sheet).
 */

import { Assets, Texture, Rectangle, Spritesheet } from 'pixi.js';

// Sprite sheet configuration
export interface SpriteSheetConfig {
  path: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
}

// Default config for player sprite sheets (8x6 grid)
export const PLAYER_SPRITE_CONFIG = {
  frameWidth: 32,   // Assumed - adjust based on actual asset
  frameHeight: 32,  // Assumed - adjust based on actual asset
  columns: 8,
  rows: 6,
};

// Animation frame definitions based on the sprite sheet layout
// Row 0: Idle frames (8 frames)
// Row 1: Running frames (8 frames)
// Row 2: Diving frames (8 frames)
// Row 3: Getting up frames (8 frames)
// Row 4: Blocking frames (8 frames)
// Row 5: Extras/throwing (8 frames)
export const ANIMATION_DEFINITIONS = {
  idle: { row: 0, frameStart: 0, frameCount: 4, loop: true },
  running: { row: 1, frameStart: 0, frameCount: 8, loop: true },
  diving: { row: 2, frameStart: 0, frameCount: 6, loop: false },
  gettingUp: { row: 3, frameStart: 0, frameCount: 6, loop: false },
  blocking: { row: 4, frameStart: 0, frameCount: 4, loop: true },
  throwing: { row: 5, frameStart: 0, frameCount: 4, loop: false },
  celebrating: { row: 5, frameStart: 4, frameCount: 4, loop: true },
} as const;

export type AnimationName = keyof typeof ANIMATION_DEFINITIONS;

// Team color sprite sheet paths
export const TEAM_SPRITE_PATHS = {
  blue: '/images/sprites/player_blue.png',
  red: '/images/sprites/player_red.png',
  green: '/images/sprites/player_green.png',
  yellow: '/images/sprites/player_yellow.png',
  purple: '/images/sprites/player_purple.png',
} as const;

export type TeamColor = keyof typeof TEAM_SPRITE_PATHS;

// Loaded textures cache
const textureCache: Map<string, Texture> = new Map();
const frameCache: Map<string, Texture[][]> = new Map();

/**
 * Load a texture from a path
 */
export async function loadTexture(path: string): Promise<Texture> {
  const cached = textureCache.get(path);
  if (cached) return cached;

  try {
    const texture = await Assets.load<Texture>(path);
    textureCache.set(path, texture);
    return texture;
  } catch (error) {
    console.warn(`Failed to load texture: ${path}`, error);
    throw error;
  }
}

/**
 * Slice a sprite sheet into individual frame textures
 */
export function sliceSpriteSheet(
  baseTexture: Texture,
  config: typeof PLAYER_SPRITE_CONFIG
): Texture[][] {
  const { frameWidth, frameHeight, columns, rows } = config;
  const frames: Texture[][] = [];

  for (let row = 0; row < rows; row++) {
    const rowFrames: Texture[] = [];
    for (let col = 0; col < columns; col++) {
      const frame = new Rectangle(
        col * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight
      );
      const texture = new Texture({
        source: baseTexture.source,
        frame,
      });
      rowFrames.push(texture);
    }
    frames.push(rowFrames);
  }

  return frames;
}

/**
 * Load and slice a player sprite sheet by team color
 */
export async function loadPlayerSpriteSheet(
  teamColor: TeamColor,
  config: typeof PLAYER_SPRITE_CONFIG = PLAYER_SPRITE_CONFIG
): Promise<Texture[][]> {
  const path = TEAM_SPRITE_PATHS[teamColor];
  const cacheKey = `player_${teamColor}`;

  const cached = frameCache.get(cacheKey);
  if (cached) return cached;

  const baseTexture = await loadTexture(path);
  const frames = sliceSpriteSheet(baseTexture, config);
  frameCache.set(cacheKey, frames);

  return frames;
}

/**
 * Get animation frames for a specific animation
 */
export function getAnimationFrames(
  allFrames: Texture[][],
  animationName: AnimationName
): Texture[] {
  const def = ANIMATION_DEFINITIONS[animationName];
  const rowFrames = allFrames[def.row];

  if (!rowFrames) {
    console.warn(`No frames found for row ${def.row}`);
    return [];
  }

  return rowFrames.slice(def.frameStart, def.frameStart + def.frameCount);
}

/**
 * Preload all team sprite sheets
 */
export async function preloadAllSprites(): Promise<void> {
  const colors: TeamColor[] = ['blue', 'red', 'green', 'yellow', 'purple'];

  await Promise.all(
    colors.map(color =>
      loadPlayerSpriteSheet(color).catch(err => {
        console.warn(`Failed to preload ${color} sprites:`, err);
      })
    )
  );
}

/**
 * Clear the texture cache (for cleanup)
 */
export function clearSpriteCache(): void {
  textureCache.forEach(texture => texture.destroy());
  textureCache.clear();
  frameCache.clear();
}

// Field and other asset paths
export const FIELD_SPRITE_PATH = '/images/sprites/field.png';
export const FOOTBALL_SPRITE_PATH = '/images/sprites/football.png';
export const POWER_METER_SPRITE_PATH = '/images/sprites/power_meter.png';

/**
 * Load the field background texture
 */
export async function loadFieldTexture(): Promise<Texture> {
  return loadTexture(FIELD_SPRITE_PATH);
}

/**
 * Load the football texture
 */
export async function loadFootballTexture(): Promise<Texture> {
  return loadTexture(FOOTBALL_SPRITE_PATH);
}

/**
 * Load the power meter texture
 */
export async function loadPowerMeterTexture(): Promise<Texture> {
  return loadTexture(POWER_METER_SPRITE_PATH);
}
