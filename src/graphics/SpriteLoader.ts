/**
 * Sprite Loader for itch.io SpawnCampGames assets
 *
 * Handles the circular player sprites and field background.
 * These are simple single-frame sprites, not animation grids.
 */

import { Assets, Texture } from 'pixi.js';

// Loaded textures cache
const textureCache: Map<string, Texture> = new Map();

/**
 * Load a texture from a path with caching
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

// Team color paths - simple single sprite per team
export const TEAM_SPRITE_PATHS = {
  red: '/images/sprites/player_red.png',
  black: '/images/sprites/player_black.png',
  purple: '/images/sprites/player_purple.png',
  yellow: '/images/sprites/player_yellow.png',
  maroon: '/images/sprites/player_maroon.png',
} as const;

export type TeamColor = keyof typeof TEAM_SPRITE_PATHS;

// Asset paths
export const FIELD_SPRITE_PATH = '/images/sprites/field.png';
export const FIELD_CLEAN_PATH = '/images/sprites/field_clean.png';
export const FOOTBALL_SPRITE_PATH = '/images/sprites/football.png';
export const POWER_METER_SPRITE_PATH = '/images/sprites/power_meter.png';

/**
 * Load a player sprite texture by team color
 */
export async function loadPlayerSprite(teamColor: TeamColor): Promise<Texture> {
  const path = TEAM_SPRITE_PATHS[teamColor];
  return loadTexture(path);
}

/**
 * Load the field background texture
 */
export async function loadFieldTexture(clean: boolean = false): Promise<Texture> {
  return loadTexture(clean ? FIELD_CLEAN_PATH : FIELD_SPRITE_PATH);
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

/**
 * Preload all assets
 */
export async function preloadAllSprites(): Promise<{
  players: Map<TeamColor, Texture>;
  field: Texture | null;
  football: Texture | null;
  powerMeter: Texture | null;
}> {
  const colors: TeamColor[] = ['red', 'black', 'purple', 'yellow', 'maroon'];
  const players = new Map<TeamColor, Texture>();

  // Load player sprites
  await Promise.all(
    colors.map(async (color) => {
      try {
        const tex = await loadPlayerSprite(color);
        players.set(color, tex);
      } catch (err) {
        console.warn(`Failed to load ${color} player sprite`);
      }
    })
  );

  // Load other assets
  const [field, football, powerMeter] = await Promise.all([
    loadFieldTexture(true).catch(() => null),
    loadFootballTexture().catch(() => null),
    loadPowerMeterTexture().catch(() => null),
  ]);

  return { players, field, football, powerMeter };
}

/**
 * Clear the texture cache (for cleanup)
 */
export function clearSpriteCache(): void {
  textureCache.forEach(texture => texture.destroy());
  textureCache.clear();
}

// Legacy exports for backwards compatibility with animation system
export const ANIMATION_DEFINITIONS = {
  idle: { row: 0, frameStart: 0, frameCount: 1, loop: true },
  running: { row: 0, frameStart: 0, frameCount: 1, loop: true },
} as const;

export type AnimationName = keyof typeof ANIMATION_DEFINITIONS;

/**
 * Get animation frames - simplified for single-frame sprites
 * Returns the same texture wrapped in an array for compatibility
 */
export function getAnimationFrames(
  frames: Texture[][] | null,
  _animationName: AnimationName
): Texture[] {
  if (!frames || frames.length === 0) return [];
  // For single-frame sprites, just return the first frame
  const firstRow = frames[0];
  if (!firstRow || firstRow.length === 0) return [];
  return [firstRow[0]];
}

/**
 * Load player sprite and wrap in 2D array format for compatibility
 */
export async function loadPlayerSpriteSheet(
  teamColor: TeamColor
): Promise<Texture[][]> {
  const texture = await loadPlayerSprite(teamColor);
  // Wrap single texture in 2D array format for compatibility
  return [[texture]];
}
