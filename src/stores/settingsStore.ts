/**
 * ILLEGAL MOTION - Settings Store
 *
 * Global game settings persisted to localStorage.
 * Controls audio, display, gameplay preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export type GameSpeed = 'slow' | 'normal' | 'fast';
export type GameLength = 'quick' | 'normal' | 'long';
export type Difficulty = 'rookie' | 'veteran' | 'all-pro' | 'legendary';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface GameSettings {
  // Audio
  masterVolume: number;        // 0-100
  sfxVolume: number;           // 0-100
  musicVolume: number;         // 0-100
  voiceVolume: number;         // 0-100
  muteAll: boolean;
  muteWhenUnfocused: boolean;

  // Gameplay
  gameSpeed: GameSpeed;        // Animation/resolution display time
  gameLength: GameLength;      // Quarter length
  difficulty: Difficulty;
  autoSimOpponentDrives: boolean;  // Quick opponent drives
  skipAnimations: boolean;
  showTutorials: boolean;
  confirmDangerousActions: boolean;

  // Display
  reducedMotion: boolean;
  colorBlindMode: ColorBlindMode;
  showFPS: boolean;
  highContrast: boolean;

  // Notifications
  enableNotifications: boolean;
  weeklyReminders: boolean;

  // Auto-save
  autoSaveEnabled: boolean;
  autoSaveInterval: number;    // Minutes
}

export const DEFAULT_SETTINGS: GameSettings = {
  // Audio
  masterVolume: 80,
  sfxVolume: 80,
  musicVolume: 60,
  voiceVolume: 100,
  muteAll: false,
  muteWhenUnfocused: true,

  // Gameplay
  gameSpeed: 'normal',
  gameLength: 'normal',
  difficulty: 'veteran',
  autoSimOpponentDrives: false,
  skipAnimations: false,
  showTutorials: true,
  confirmDangerousActions: true,

  // Display
  reducedMotion: false,
  colorBlindMode: 'none',
  showFPS: false,
  highContrast: false,

  // Notifications
  enableNotifications: false,
  weeklyReminders: false,

  // Auto-save
  autoSaveEnabled: true,
  autoSaveInterval: 5,
};

// =============================================================================
// GAME LENGTH CONFIG
// =============================================================================

export const GAME_LENGTH_CONFIG: Record<GameLength, {
  quarterMinutes: number;
  estimatedRealMinutes: string;
  description: string;
}> = {
  quick: {
    quarterMinutes: 4,
    estimatedRealMinutes: '15-20',
    description: 'Quick games for busy schedules',
  },
  normal: {
    quarterMinutes: 6,
    estimatedRealMinutes: '25-30',
    description: 'Balanced gameplay experience',
  },
  long: {
    quarterMinutes: 8,
    estimatedRealMinutes: '35-45',
    description: 'Full simulation experience',
  },
};

// =============================================================================
// DIFFICULTY CONFIG
// =============================================================================

export const DIFFICULTY_CONFIG: Record<Difficulty, {
  name: string;
  description: string;
  aiAccuracy: number;      // 0-100, how well AI reads tendencies
  aiAggression: number;    // 0-100, how often AI takes risks
  playerBonus: number;     // % bonus to player success rates
}> = {
  rookie: {
    name: 'Rookie',
    description: 'Learning the ropes. AI makes mistakes.',
    aiAccuracy: 30,
    aiAggression: 40,
    playerBonus: 15,
  },
  veteran: {
    name: 'Veteran',
    description: 'Balanced challenge. Fair competition.',
    aiAccuracy: 50,
    aiAggression: 50,
    playerBonus: 0,
  },
  'all-pro': {
    name: 'All-Pro',
    description: 'Tough competition. AI reads your tendencies.',
    aiAccuracy: 70,
    aiAggression: 60,
    playerBonus: -5,
  },
  legendary: {
    name: 'Legendary',
    description: 'The ultimate test. Every mistake is punished.',
    aiAccuracy: 85,
    aiAggression: 70,
    playerBonus: -10,
  },
};

// =============================================================================
// STORE
// =============================================================================

interface SettingsStore {
  settings: GameSettings;

  // Actions
  updateSettings: (updates: Partial<GameSettings>) => void;
  resetSettings: () => void;

  // Audio shortcuts
  setMasterVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleMute: () => void;

  // Gameplay shortcuts
  setDifficulty: (difficulty: Difficulty) => void;
  setGameLength: (length: GameLength) => void;
  setGameSpeed: (speed: GameSpeed) => void;
  toggleAutoSim: () => void;

  // Computed
  getEffectiveVolume: (type: 'sfx' | 'music' | 'voice') => number;
  getQuarterLength: () => number;
  getDifficultyConfig: () => typeof DIFFICULTY_CONFIG[Difficulty];
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },

      // Actions
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      resetSettings: () => {
        set({ settings: { ...DEFAULT_SETTINGS } });
      },

      // Audio shortcuts
      setMasterVolume: (volume) => {
        set((state) => ({
          settings: { ...state.settings, masterVolume: Math.max(0, Math.min(100, volume)) },
        }));
      },

      setSfxVolume: (volume) => {
        set((state) => ({
          settings: { ...state.settings, sfxVolume: Math.max(0, Math.min(100, volume)) },
        }));
      },

      setMusicVolume: (volume) => {
        set((state) => ({
          settings: { ...state.settings, musicVolume: Math.max(0, Math.min(100, volume)) },
        }));
      },

      toggleMute: () => {
        set((state) => ({
          settings: { ...state.settings, muteAll: !state.settings.muteAll },
        }));
      },

      // Gameplay shortcuts
      setDifficulty: (difficulty) => {
        set((state) => ({
          settings: { ...state.settings, difficulty },
        }));
      },

      setGameLength: (gameLength) => {
        set((state) => ({
          settings: { ...state.settings, gameLength },
        }));
      },

      setGameSpeed: (gameSpeed) => {
        set((state) => ({
          settings: { ...state.settings, gameSpeed },
        }));
      },

      toggleAutoSim: () => {
        set((state) => ({
          settings: { ...state.settings, autoSimOpponentDrives: !state.settings.autoSimOpponentDrives },
        }));
      },

      // Computed
      getEffectiveVolume: (type) => {
        const { settings } = get();
        if (settings.muteAll) return 0;

        const master = settings.masterVolume / 100;
        switch (type) {
          case 'sfx':
            return settings.sfxVolume * master;
          case 'music':
            return settings.musicVolume * master;
          case 'voice':
            return settings.voiceVolume * master;
          default:
            return 0;
        }
      },

      getQuarterLength: () => {
        const { settings } = get();
        return GAME_LENGTH_CONFIG[settings.gameLength].quarterMinutes;
      },

      getDifficultyConfig: () => {
        const { settings } = get();
        return DIFFICULTY_CONFIG[settings.difficulty];
      },
    }),
    {
      name: 'illegal-motion-settings',
    }
  )
);

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to check if reduced motion is preferred.
 */
export function useReducedMotion(): boolean {
  const { settings } = useSettingsStore();

  // Check system preference too
  if (typeof window !== 'undefined') {
    const systemPrefers = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return settings.reducedMotion || systemPrefers;
  }

  return settings.reducedMotion;
}

/**
 * Hook to get animation duration based on game speed.
 */
export function useAnimationDuration(baseDuration: number): number {
  const { settings } = useSettingsStore();

  const multipliers: Record<GameSpeed, number> = {
    slow: 1.5,
    normal: 1.0,
    fast: 0.5,
  };

  if (settings.skipAnimations) return 0;
  if (settings.reducedMotion) return baseDuration * 0.5;

  return baseDuration * multipliers[settings.gameSpeed];
}
