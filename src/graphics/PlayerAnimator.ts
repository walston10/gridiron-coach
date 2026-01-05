/**
 * Player Animation Manager
 *
 * Manages sprite-based animations for players during gameplay.
 * Handles animation state, frame timing, and direction facing.
 */

import { Texture, Sprite, Container } from 'pixi.js';
import {
  AnimationName,
  ANIMATION_DEFINITIONS,
  getAnimationFrames,
  TeamColor,
  loadPlayerSpriteSheet,
  PLAYER_SPRITE_CONFIG,
} from './SpriteLoader';

// Animation timing
const DEFAULT_FRAME_DURATION = 100; // ms per frame
const RUNNING_FRAME_DURATION = 80;  // Faster for running
const IDLE_FRAME_DURATION = 150;    // Slower for idle

// Animation state for a single player
export interface PlayerAnimState {
  currentAnimation: AnimationName;
  frameIndex: number;
  elapsedTime: number;
  facingLeft: boolean;
  isPlaying: boolean;
  lastX: number;
  lastY: number;
}

// Create initial animation state
export function createPlayerAnimState(): PlayerAnimState {
  return {
    currentAnimation: 'idle',
    frameIndex: 0,
    elapsedTime: 0,
    facingLeft: false,
    isPlaying: true,
    lastX: 0,
    lastY: 0,
  };
}

// Get frame duration for an animation
function getFrameDuration(animation: AnimationName): number {
  switch (animation) {
    case 'running':
      return RUNNING_FRAME_DURATION;
    case 'idle':
      return IDLE_FRAME_DURATION;
    default:
      return DEFAULT_FRAME_DURATION;
  }
}

/**
 * Update animation state based on delta time
 */
export function updateAnimation(
  state: PlayerAnimState,
  deltaTime: number
): PlayerAnimState {
  if (!state.isPlaying) return state;

  const def = ANIMATION_DEFINITIONS[state.currentAnimation];
  const frameDuration = getFrameDuration(state.currentAnimation);

  let newElapsedTime = state.elapsedTime + deltaTime;
  let newFrameIndex = state.frameIndex;

  // Advance frames based on elapsed time
  while (newElapsedTime >= frameDuration) {
    newElapsedTime -= frameDuration;
    newFrameIndex++;

    // Handle loop or end
    if (newFrameIndex >= def.frameCount) {
      if (def.loop) {
        newFrameIndex = 0;
      } else {
        newFrameIndex = def.frameCount - 1;
        return {
          ...state,
          frameIndex: newFrameIndex,
          elapsedTime: 0,
          isPlaying: false,
        };
      }
    }
  }

  return {
    ...state,
    frameIndex: newFrameIndex,
    elapsedTime: newElapsedTime,
  };
}

/**
 * Change to a new animation
 */
export function setAnimation(
  state: PlayerAnimState,
  animation: AnimationName,
  forceRestart: boolean = false
): PlayerAnimState {
  if (state.currentAnimation === animation && !forceRestart) {
    return state;
  }

  return {
    ...state,
    currentAnimation: animation,
    frameIndex: 0,
    elapsedTime: 0,
    isPlaying: true,
  };
}

/**
 * Update facing direction based on movement
 */
export function updateFacing(
  state: PlayerAnimState,
  currentX: number,
  currentY: number
): PlayerAnimState {
  const dx = currentX - state.lastX;

  // Only update facing if there's significant horizontal movement
  if (Math.abs(dx) > 0.5) {
    return {
      ...state,
      facingLeft: dx < 0,
      lastX: currentX,
      lastY: currentY,
    };
  }

  return {
    ...state,
    lastX: currentX,
    lastY: currentY,
  };
}

/**
 * Determine animation based on player state
 */
export function determineAnimation(
  isMoving: boolean,
  isBlocking: boolean,
  isThrowing: boolean,
  isDiving: boolean,
  isCelebrating: boolean
): AnimationName {
  if (isDiving) return 'diving';
  if (isThrowing) return 'throwing';
  if (isCelebrating) return 'celebrating';
  if (isBlocking) return 'blocking';
  if (isMoving) return 'running';
  return 'idle';
}

/**
 * Player Sprite Manager
 *
 * Manages the PixiJS sprite for a single player,
 * handling texture updates and transformations.
 */
export class PlayerSpriteManager {
  private sprite: Sprite;
  private frames: Texture[][] | null = null;
  private teamColor: TeamColor;
  private animState: PlayerAnimState;
  private isLoaded: boolean = false;

  constructor(teamColor: TeamColor) {
    this.teamColor = teamColor;
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 1); // Anchor at bottom center
    this.animState = createPlayerAnimState();
  }

  /**
   * Load the sprite sheet for this player
   */
  async load(): Promise<void> {
    try {
      this.frames = await loadPlayerSpriteSheet(this.teamColor);
      this.isLoaded = true;
      this.updateTexture();
    } catch (error) {
      console.warn(`Failed to load sprites for ${this.teamColor}`, error);
    }
  }

  /**
   * Get the sprite for adding to a container
   */
  getSprite(): Sprite {
    return this.sprite;
  }

  /**
   * Update the sprite texture based on current animation frame
   */
  private updateTexture(): void {
    if (!this.frames || !this.isLoaded) return;

    const animFrames = getAnimationFrames(
      this.frames,
      this.animState.currentAnimation
    );

    if (animFrames.length > 0) {
      const frameIndex = Math.min(
        this.animState.frameIndex,
        animFrames.length - 1
      );
      this.sprite.texture = animFrames[frameIndex];
    }
  }

  /**
   * Update animation state and sprite
   */
  update(
    deltaTime: number,
    x: number,
    y: number,
    scale: number,
    isMoving: boolean,
    options: {
      isBlocking?: boolean;
      isThrowing?: boolean;
      isDiving?: boolean;
      isCelebrating?: boolean;
    } = {}
  ): void {
    // Update facing direction
    this.animState = updateFacing(this.animState, x, y);

    // Determine and set animation
    const targetAnim = determineAnimation(
      isMoving,
      options.isBlocking ?? false,
      options.isThrowing ?? false,
      options.isDiving ?? false,
      options.isCelebrating ?? false
    );
    this.animState = setAnimation(this.animState, targetAnim);

    // Update animation timing
    this.animState = updateAnimation(this.animState, deltaTime);

    // Update sprite properties
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.scale.set(
      this.animState.facingLeft ? -scale : scale,
      scale
    );

    // Update texture
    this.updateTexture();
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.sprite.visible = visible;
  }

  /**
   * Change team color (requires reload)
   */
  async setTeamColor(color: TeamColor): Promise<void> {
    if (this.teamColor === color) return;
    this.teamColor = color;
    this.frames = null;
    this.isLoaded = false;
    await this.load();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.sprite.destroy();
  }
}

/**
 * Player Sprite Pool
 *
 * Manages a pool of player sprites for efficient reuse.
 */
export class PlayerSpritePool {
  private homeSprites: PlayerSpriteManager[] = [];
  private awaySprites: PlayerSpriteManager[] = [];
  private container: Container;
  private homeColor: TeamColor;
  private awayColor: TeamColor;

  constructor(
    container: Container,
    homeColor: TeamColor = 'blue',
    awayColor: TeamColor = 'red'
  ) {
    this.container = container;
    this.homeColor = homeColor;
    this.awayColor = awayColor;
  }

  /**
   * Initialize the sprite pool with a number of sprites per team
   */
  async init(spritesPerTeam: number = 15): Promise<void> {
    // Create home team sprites
    for (let i = 0; i < spritesPerTeam; i++) {
      const manager = new PlayerSpriteManager(this.homeColor);
      this.homeSprites.push(manager);
      this.container.addChild(manager.getSprite());
    }

    // Create away team sprites
    for (let i = 0; i < spritesPerTeam; i++) {
      const manager = new PlayerSpriteManager(this.awayColor);
      this.awaySprites.push(manager);
      this.container.addChild(manager.getSprite());
    }

    // Load all sprites
    await Promise.all([
      ...this.homeSprites.map(s => s.load()),
      ...this.awaySprites.map(s => s.load()),
    ]);
  }

  /**
   * Get a sprite manager for a player index
   */
  getSprite(isHome: boolean, index: number): PlayerSpriteManager | null {
    const pool = isHome ? this.homeSprites : this.awaySprites;
    return pool[index] ?? null;
  }

  /**
   * Update all sprites
   */
  updateAll(
    players: Array<{
      isHome: boolean;
      index: number;
      x: number;
      y: number;
      scale: number;
      isMoving: boolean;
      visible: boolean;
      options?: {
        isBlocking?: boolean;
        isThrowing?: boolean;
        isDiving?: boolean;
        isCelebrating?: boolean;
      };
    }>,
    deltaTime: number
  ): void {
    // Hide all sprites first
    this.homeSprites.forEach(s => s.setVisible(false));
    this.awaySprites.forEach(s => s.setVisible(false));

    // Update visible players
    for (const player of players) {
      const sprite = this.getSprite(player.isHome, player.index);
      if (sprite) {
        sprite.setVisible(player.visible);
        if (player.visible) {
          sprite.update(
            deltaTime,
            player.x,
            player.y,
            player.scale,
            player.isMoving,
            player.options
          );
        }
      }
    }
  }

  /**
   * Cleanup all sprites
   */
  destroy(): void {
    this.homeSprites.forEach(s => s.destroy());
    this.awaySprites.forEach(s => s.destroy());
    this.homeSprites = [];
    this.awaySprites = [];
  }
}
