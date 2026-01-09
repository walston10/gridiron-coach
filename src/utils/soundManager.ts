/**
 * ILLEGAL MOTION - Sound Manager
 *
 * Handles all game audio: UI sounds, game sounds, music, ambience.
 * Integrates with settings store for volume control.
 */

import { useSettingsStore } from '../stores/settingsStore';

// =============================================================================
// TYPES
// =============================================================================

export type SoundCategory = 'sfx' | 'music' | 'voice' | 'ambience';

export interface SoundConfig {
  url: string;
  category: SoundCategory;
  volume?: number;          // 0-1, relative to category volume
  loop?: boolean;
  preload?: boolean;
}

export interface PlayOptions {
  volume?: number;          // Override volume
  loop?: boolean;
  onEnd?: () => void;
}

// =============================================================================
// SOUND DEFINITIONS
// =============================================================================

export const SOUNDS = {
  // UI Sounds
  UI_CLICK: { url: '/audio/ui/click.mp3', category: 'sfx' as const, volume: 0.5 },
  UI_HOVER: { url: '/audio/ui/hover.mp3', category: 'sfx' as const, volume: 0.3 },
  UI_BACK: { url: '/audio/ui/back.mp3', category: 'sfx' as const, volume: 0.5 },
  UI_CONFIRM: { url: '/audio/ui/confirm.mp3', category: 'sfx' as const, volume: 0.6 },
  UI_ERROR: { url: '/audio/ui/error.mp3', category: 'sfx' as const, volume: 0.5 },
  UI_NOTIFICATION: { url: '/audio/ui/notification.mp3', category: 'sfx' as const, volume: 0.6 },

  // Card Sounds
  CARD_DRAW: { url: '/audio/game/card_draw.mp3', category: 'sfx' as const, volume: 0.6 },
  CARD_PLAY: { url: '/audio/game/card_play.mp3', category: 'sfx' as const, volume: 0.7 },
  CARD_SELECT: { url: '/audio/game/card_select.mp3', category: 'sfx' as const, volume: 0.4 },

  // Game Sounds
  WHISTLE: { url: '/audio/game/whistle.mp3', category: 'sfx' as const, volume: 0.7 },
  SNAP: { url: '/audio/game/snap.mp3', category: 'sfx' as const, volume: 0.5 },
  TACKLE: { url: '/audio/game/tackle.mp3', category: 'sfx' as const, volume: 0.6 },
  CATCH: { url: '/audio/game/catch.mp3', category: 'sfx' as const, volume: 0.5 },

  // Result Sounds
  TOUCHDOWN: { url: '/audio/game/touchdown.mp3', category: 'sfx' as const, volume: 1.0 },
  FIELD_GOAL: { url: '/audio/game/field_goal.mp3', category: 'sfx' as const, volume: 0.8 },
  TURNOVER: { url: '/audio/game/turnover.mp3', category: 'sfx' as const, volume: 0.8 },
  SACK: { url: '/audio/game/sack.mp3', category: 'sfx' as const, volume: 0.7 },
  FIRST_DOWN: { url: '/audio/game/first_down.mp3', category: 'sfx' as const, volume: 0.6 },

  // Crowd Sounds
  CROWD_CHEER: { url: '/audio/game/crowd_cheer.mp3', category: 'sfx' as const, volume: 0.7 },
  CROWD_BOO: { url: '/audio/game/crowd_boo.mp3', category: 'sfx' as const, volume: 0.6 },
  CROWD_GASP: { url: '/audio/game/crowd_gasp.mp3', category: 'sfx' as const, volume: 0.5 },

  // Ambience
  STADIUM_AMBIENCE: { url: '/audio/ambience/stadium.mp3', category: 'ambience' as const, loop: true },
  OFFICE_AMBIENCE: { url: '/audio/ambience/office.mp3', category: 'ambience' as const, loop: true },

  // Music
  MENU_MUSIC: { url: '/audio/music/menu.mp3', category: 'music' as const, loop: true },
  GAME_MUSIC: { url: '/audio/music/game.mp3', category: 'music' as const, loop: true },
  VICTORY_MUSIC: { url: '/audio/music/victory.mp3', category: 'music' as const },
  DEFEAT_MUSIC: { url: '/audio/music/defeat.mp3', category: 'music' as const },
} as const;

export type SoundId = keyof typeof SOUNDS;

// =============================================================================
// SOUND MANAGER CLASS
// =============================================================================

class SoundManagerClass {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private activeAudio: Map<string, HTMLAudioElement> = new Map();
  private currentMusic: HTMLAudioElement | null = null;
  private currentAmbience: HTMLAudioElement | null = null;
  private initialized = false;

  /**
   * Initialize the sound manager and preload common sounds.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Preload common UI sounds
    const preloadSounds: SoundId[] = [
      'UI_CLICK',
      'UI_HOVER',
      'UI_CONFIRM',
      'CARD_PLAY',
      'WHISTLE',
    ];

    await Promise.all(
      preloadSounds.map(id => this.preload(id))
    );

    this.initialized = true;
  }

  /**
   * Preload a sound into cache.
   */
  async preload(soundId: SoundId): Promise<void> {
    const config = SOUNDS[soundId];
    if (this.audioCache.has(config.url)) return;

    try {
      const audio = new Audio();
      audio.preload = 'auto';

      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error(`Failed to load: ${config.url}`));
        audio.src = config.url;
      });

      this.audioCache.set(config.url, audio);
    } catch (error) {
      console.warn(`Failed to preload sound: ${soundId}`, error);
    }
  }

  /**
   * Play a sound effect.
   */
  play(soundId: SoundId, options: PlayOptions = {}): void {
    const config = SOUNDS[soundId] as SoundConfig;
    const volume = this.getVolume(config.category, config.volume, options.volume);

    if (volume <= 0) return;

    try {
      // Get or create audio element
      let audio = this.audioCache.get(config.url);

      if (!audio) {
        audio = new Audio(config.url);
      } else {
        // Clone for overlapping plays
        audio = audio.cloneNode(true) as HTMLAudioElement;
      }

      audio.volume = volume;
      audio.loop = options.loop ?? config.loop ?? false;

      if (options.onEnd) {
        audio.onended = options.onEnd;
      }

      // Track active audio
      const playId = `${soundId}-${Date.now()}`;
      this.activeAudio.set(playId, audio);

      audio.play().catch(err => {
        console.warn(`Audio play failed: ${soundId}`, err);
      });

      // Cleanup when done (for non-looping)
      if (!audio.loop) {
        audio.onended = () => {
          this.activeAudio.delete(playId);
          options.onEnd?.();
        };
      }
    } catch (error) {
      console.warn(`Failed to play sound: ${soundId}`, error);
    }
  }

  /**
   * Play background music (stops previous music).
   */
  playMusic(soundId: SoundId): void {
    const config = SOUNDS[soundId] as SoundConfig;
    if (config.category !== 'music') {
      console.warn(`${soundId} is not a music track`);
      return;
    }

    // Stop current music
    this.stopMusic();

    const volume = this.getVolume('music', config.volume);
    if (volume <= 0) return;

    try {
      const audio = new Audio(config.url);
      audio.volume = volume;
      audio.loop = config.loop ?? true;

      audio.play().catch(err => {
        console.warn(`Music play failed: ${soundId}`, err);
      });

      this.currentMusic = audio;
    } catch (error) {
      console.warn(`Failed to play music: ${soundId}`, error);
    }
  }

  /**
   * Stop background music.
   */
  stopMusic(fadeOut = true): void {
    if (!this.currentMusic) return;

    if (fadeOut) {
      this.fadeOut(this.currentMusic, 500);
    } else {
      this.currentMusic.pause();
      this.currentMusic = null;
    }
  }

  /**
   * Play ambient sound (stops previous ambience).
   */
  playAmbience(soundId: SoundId): void {
    const config = SOUNDS[soundId] as SoundConfig;
    if (config.category !== 'ambience') {
      console.warn(`${soundId} is not an ambience track`);
      return;
    }

    // Stop current ambience
    this.stopAmbience();

    const volume = this.getVolume('sfx', config.volume);
    if (volume <= 0) return;

    try {
      const audio = new Audio(config.url);
      audio.volume = volume * 0.3; // Ambience is quieter
      audio.loop = true;

      audio.play().catch(err => {
        console.warn(`Ambience play failed: ${soundId}`, err);
      });

      this.currentAmbience = audio;
    } catch (error) {
      console.warn(`Failed to play ambience: ${soundId}`, error);
    }
  }

  /**
   * Stop ambient sound.
   */
  stopAmbience(fadeOut = true): void {
    if (!this.currentAmbience) return;

    if (fadeOut) {
      this.fadeOut(this.currentAmbience, 1000);
      this.currentAmbience = null;
    } else {
      this.currentAmbience.pause();
      this.currentAmbience = null;
    }
  }

  /**
   * Stop all sounds.
   */
  stopAll(): void {
    // Stop active sounds
    this.activeAudio.forEach(audio => {
      audio.pause();
    });
    this.activeAudio.clear();

    // Stop music and ambience
    this.stopMusic(false);
    this.stopAmbience(false);
  }

  /**
   * Update volumes when settings change.
   */
  updateVolumes(): void {
    // Update music volume
    if (this.currentMusic) {
      const musicVol = this.getVolume('music');
      this.currentMusic.volume = musicVol;
    }

    // Update ambience volume
    if (this.currentAmbience) {
      const ambienceVol = this.getVolume('sfx') * 0.3;
      this.currentAmbience.volume = ambienceVol;
    }
  }

  /**
   * Get effective volume for a category.
   */
  private getVolume(
    category: SoundCategory,
    baseVolume = 1,
    override?: number
  ): number {
    const settings = useSettingsStore.getState().settings;

    if (settings.muteAll) return 0;

    const master = settings.masterVolume / 100;

    let categoryVolume: number;
    switch (category) {
      case 'sfx':
      case 'ambience':
        categoryVolume = settings.sfxVolume / 100;
        break;
      case 'music':
        categoryVolume = settings.musicVolume / 100;
        break;
      case 'voice':
        categoryVolume = settings.voiceVolume / 100;
        break;
      default:
        categoryVolume = 1;
    }

    const effectiveBase = override ?? baseVolume;
    return Math.min(1, master * categoryVolume * effectiveBase);
  }

  /**
   * Fade out an audio element.
   */
  private fadeOut(audio: HTMLAudioElement, duration: number): void {
    const startVolume = audio.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = startVolume / steps;

    let currentStep = 0;

    const fade = () => {
      currentStep++;
      audio.volume = Math.max(0, startVolume - (volumeStep * currentStep));

      if (currentStep < steps) {
        setTimeout(fade, stepDuration);
      } else {
        audio.pause();
      }
    };

    fade();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const soundManager = new SoundManagerClass();

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * Play a sound effect (use in components).
 */
export function useSound() {
  return {
    play: (soundId: SoundId, options?: PlayOptions) => soundManager.play(soundId, options),
    playMusic: (soundId: SoundId) => soundManager.playMusic(soundId),
    stopMusic: () => soundManager.stopMusic(),
    playAmbience: (soundId: SoundId) => soundManager.playAmbience(soundId),
    stopAmbience: () => soundManager.stopAmbience(),
    stopAll: () => soundManager.stopAll(),
  };
}

/**
 * Initialize sound manager on app load.
 */
export async function initializeSounds(): Promise<void> {
  await soundManager.initialize();
}
