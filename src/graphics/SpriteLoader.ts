/**
 * Sprite Loader - Supports multiple asset formats
 *
 * Format 1: Simple single sprites (SpawnCampGames free assets)
 * Format 2: Animation grid sprite sheets (8x6 grid with animations)
 */

import { Assets, Texture, Rectangle } from 'pixi.js';

// Loaded textures cache
const textureCache: Map<string, Texture> = new Map();
const frameCache: Map<string, Texture[][]> = new Map();

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

// ============================================================
// FORMAT 1: Simple single sprites (SpawnCampGames style)
// ============================================================

export const SIMPLE_SPRITE_PATHS = {
  red: '/images/sprites/simple/player_red.png',
  black: '/images/sprites/simple/player_black.png',
  purple: '/images/sprites/simple/player_purple.png',
  yellow: '/images/sprites/simple/player_yellow.png',
  maroon: '/images/sprites/simple/player_maroon.png',
} as const;

export type SimpleTeamColor = keyof typeof SIMPLE_SPRITE_PATHS;

// ============================================================
// FORMAT 2: Animation grid sprite sheets (8x6 grid)
// ============================================================

// Sprite sheet configuration for animated sprites
export interface SpriteSheetConfig {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
}

// Default config for 8x6 grid animation sheets
export const ANIMATED_SPRITE_CONFIG: SpriteSheetConfig = {
  frameWidth: 32,   // Adjust based on actual asset
  frameHeight: 32,  // Adjust based on actual asset
  columns: 8,
  rows: 6,
};

// Animation definitions for grid-based sprite sheets
// Row 0: Idle (4 frames)
// Row 1: Running (8 frames)
// Row 2: Diving (6 frames)
// Row 3: Getting up (6 frames)
// Row 4: Blocking (4 frames)
// Row 5: Throwing/extras (8 frames)
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

// 6 team color sets for animated sprites
export const ANIMATED_SPRITE_PATHS = {
  blue: '/images/sprites/animated/player_blue.png',
  red: '/images/sprites/animated/player_red.png',
  green: '/images/sprites/animated/player_green.png',
  yellow: '/images/sprites/animated/player_yellow.png',
  purple: '/images/sprites/animated/player_purple.png',
  orange: '/images/sprites/animated/player_orange.png',
} as const;

export type AnimatedTeamColor = keyof typeof ANIMATED_SPRITE_PATHS;

// Union type for all team colors
export type TeamColor = SimpleTeamColor | AnimatedTeamColor;

// ============================================================
// Shared asset paths
// ============================================================

export const FIELD_SPRITE_PATH = '/images/sprites/field.png';
export const FIELD_CLEAN_PATH = '/images/sprites/field_clean.png';
export const FOOTBALL_SPRITE_PATH = '/images/sprites/football.png';
export const POWER_METER_SPRITE_PATH = '/images/sprites/power_meter.png';

// ============================================================
// Loading functions
// ============================================================

/**
 * Slice a sprite sheet into individual frame textures
 */
export function sliceSpriteSheet(
  baseTexture: Texture,
  config: SpriteSheetConfig
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
 * Load a simple single-sprite player texture
 */
export async function loadSimplePlayerSprite(color: SimpleTeamColor): Promise<Texture> {
  const path = SIMPLE_SPRITE_PATHS[color];
  return loadTexture(path);
}

/**
 * Load and slice an animated player sprite sheet
 */
export async function loadAnimatedSpriteSheet(
  color: AnimatedTeamColor,
  config: SpriteSheetConfig = ANIMATED_SPRITE_CONFIG
): Promise<Texture[][]> {
  const path = ANIMATED_SPRITE_PATHS[color];
  const cacheKey = `animated_${color}`;

  const cached = frameCache.get(cacheKey);
  if (cached) return cached;

  const baseTexture = await loadTexture(path);
  const frames = sliceSpriteSheet(baseTexture, config);
  frameCache.set(cacheKey, frames);

  return frames;
}

/**
 * Get animation frames for a specific animation from a sprite sheet
 */
export function getAnimationFrames(
  allFrames: Texture[][] | null,
  animationName: AnimationName
): Texture[] {
  if (!allFrames || allFrames.length === 0) return [];

  const def = ANIMATION_DEFINITIONS[animationName];
  const rowFrames = allFrames[def.row];

  if (!rowFrames) {
    // Fallback for simple sprites - just return first frame
    if (allFrames[0] && allFrames[0][0]) {
      return [allFrames[0][0]];
    }
    return [];
  }

  return rowFrames.slice(def.frameStart, def.frameStart + def.frameCount);
}

/**
 * Load player sprite sheet - auto-detects format
 * Returns 2D array format for compatibility
 */
export async function loadPlayerSpriteSheet(
  teamColor: TeamColor
): Promise<Texture[][]> {
  // Try animated first
  if (teamColor in ANIMATED_SPRITE_PATHS) {
    try {
      return await loadAnimatedSpriteSheet(teamColor as AnimatedTeamColor);
    } catch {
      // Fall through to simple
    }
  }

  // Try simple sprites
  if (teamColor in SIMPLE_SPRITE_PATHS) {
    try {
      const texture = await loadSimplePlayerSprite(teamColor as SimpleTeamColor);
      // Wrap in 2D array for compatibility
      return [[texture]];
    } catch {
      // Both failed
    }
  }

  throw new Error(`No sprite found for team color: ${teamColor}`);
}

/**
 * Load field background texture
 */
export async function loadFieldTexture(clean: boolean = false): Promise<Texture> {
  return loadTexture(clean ? FIELD_CLEAN_PATH : FIELD_SPRITE_PATH);
}

/**
 * Load football texture
 */
export async function loadFootballTexture(): Promise<Texture> {
  return loadTexture(FOOTBALL_SPRITE_PATH);
}

/**
 * Load power meter texture
 */
export async function loadPowerMeterTexture(): Promise<Texture> {
  return loadTexture(POWER_METER_SPRITE_PATH);
}

/**
 * Preload all sprites
 */
export async function preloadAllSprites(useAnimated: boolean = true): Promise<void> {
  const colors = useAnimated
    ? Object.keys(ANIMATED_SPRITE_PATHS)
    : Object.keys(SIMPLE_SPRITE_PATHS);

  await Promise.all([
    ...colors.map(color =>
      loadPlayerSpriteSheet(color as TeamColor).catch(err => {
        console.warn(`Failed to preload ${color} sprites:`, err);
      })
    ),
    loadFieldTexture(true).catch(() => null),
    loadFootballTexture().catch(() => null),
    loadPowerMeterTexture().catch(() => null),
  ]);
}

/**
 * Clear all cached textures
 */
export function clearSpriteCache(): void {
  textureCache.forEach(texture => texture.destroy());
  textureCache.clear();
  frameCache.clear();
}

/**
 * Update sprite sheet config (call before loading if dimensions differ)
 */
export function updateSpriteConfig(config: Partial<SpriteSheetConfig>): void {
  Object.assign(ANIMATED_SPRITE_CONFIG, config);
}
