/**
 * Player Sprite Helper
 *
 * Simple sprite management for circular player sprites.
 * No animation needed - just position and scale updates.
 */

import { Sprite, Container, Texture } from 'pixi.js';
import { loadPlayerSprite, type TeamColor } from './SpriteLoader';

/**
 * Simple sprite pool for player rendering
 */
export class PlayerSpritePool {
  private sprites: Map<string, Sprite> = new Map();
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Get or create a sprite for a player
   */
  getSprite(playerId: string, texture: Texture): Sprite {
    let sprite = this.sprites.get(playerId);

    if (!sprite) {
      sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 0.5); // Center anchor for circular sprites
      this.sprites.set(playerId, sprite);
    } else {
      sprite.texture = texture;
    }

    return sprite;
  }

  /**
   * Update sprite position and add to container
   */
  updateSprite(
    playerId: string,
    texture: Texture,
    x: number,
    y: number,
    scale: number,
    isBallCarrier: boolean = false
  ): Sprite {
    const sprite = this.getSprite(playerId, texture);

    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(scale);

    // Ball carrier highlight
    if (isBallCarrier) {
      sprite.tint = 0xffffcc;
    } else {
      sprite.tint = 0xffffff;
    }

    if (!sprite.parent) {
      this.container.addChild(sprite);
    }

    return sprite;
  }

  /**
   * Hide all sprites (call before updating visible players)
   */
  hideAll(): void {
    this.sprites.forEach(sprite => {
      sprite.visible = false;
    });
  }

  /**
   * Show a specific sprite
   */
  show(playerId: string): void {
    const sprite = this.sprites.get(playerId);
    if (sprite) {
      sprite.visible = true;
    }
  }

  /**
   * Clear all sprites
   */
  clear(): void {
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites.clear();
  }
}

/**
 * Preload player textures for both teams
 */
export async function preloadTeamSprites(
  homeColor: TeamColor,
  awayColor: TeamColor
): Promise<{ home: Texture | null; away: Texture | null }> {
  const [home, away] = await Promise.all([
    loadPlayerSprite(homeColor).catch(() => null),
    loadPlayerSprite(awayColor).catch(() => null),
  ]);

  return { home, away };
}
