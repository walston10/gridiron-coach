/**
 * ILLEGAL MOTION - Save System Types
 *
 * Defines the save game structure and metadata for local storage.
 */

import type { FranchiseState, FranchiseSettings } from './franchise.types';
import type { LiveGame } from './game.types';

// =============================================================================
// SAVE GAME STRUCTURE
// =============================================================================

/**
 * Complete save game data stored in IndexedDB.
 * This is the full "snapshot" of game state.
 */
export interface SaveGame {
  // Identity
  id: string;
  name: string;                      // User-given name or auto-generated
  version: string;                   // For migration handling

  // Timestamps
  createdAt: number;
  updatedAt: number;

  // Core game state - FranchiseState contains everything
  franchiseState: FranchiseState;

  // Current game in progress (if any)
  activeGame?: LiveGame;

  // User preferences (may differ from franchise settings)
  userSettings: UserSettings;
}

/**
 * Lightweight metadata stored in localStorage for quick access.
 * Used to display save slots without loading full save data.
 */
export interface SaveMetadata {
  id: string;
  name: string;
  version: string;
  createdAt: number;
  updatedAt: number;

  // Display info (extracted from franchise state)
  teamId: string;
  teamName: string;
  gmName: string;
  seasonYear: number;
  currentWeek: number;
  seasonPhase: string;
  record: { wins: number; losses: number };
  championships: number;

  // Quick status
  hasActiveGame: boolean;
  lastPlayedFormatted?: string;      // "2 hours ago" - computed on display
}

// =============================================================================
// USER SETTINGS
// =============================================================================

/**
 * User preferences that persist across saves.
 */
export interface UserSettings {
  // Audio
  masterVolume: number;              // 0-100
  musicVolume: number;               // 0-100
  sfxVolume: number;                 // 0-100
  muteWhenUnfocused: boolean;

  // Gameplay
  autoAdvanceDialogue: boolean;
  playSpeed: 'SLOW' | 'NORMAL' | 'FAST';
  showTutorialHints: boolean;
  confirmDangerousActions: boolean;

  // Display
  darkMode: boolean;                 // Always dark in this game tbh
  reducedMotion: boolean;
  colorBlindMode: 'NONE' | 'PROTANOPIA' | 'DEUTERANOPIA' | 'TRITANOPIA';

  // Auto-save
  autoSaveEnabled: boolean;
  autoSaveIntervalMinutes: number;   // 5, 10, 15, etc.
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 80,
  muteWhenUnfocused: true,

  autoAdvanceDialogue: false,
  playSpeed: 'NORMAL',
  showTutorialHints: true,
  confirmDangerousActions: true,

  darkMode: true,
  reducedMotion: false,
  colorBlindMode: 'NONE',

  autoSaveEnabled: true,
  autoSaveIntervalMinutes: 5,
};

// =============================================================================
// SAVE OPERATIONS
// =============================================================================

/**
 * Result of a save operation.
 */
export interface SaveResult {
  success: boolean;
  saveId?: string;
  error?: string;
  timestamp?: number;
}

/**
 * Result of a load operation.
 */
export interface LoadResult {
  success: boolean;
  save?: SaveGame;
  error?: string;
  needsMigration?: boolean;
  migratedFrom?: string;
}

/**
 * Result of an import operation.
 */
export interface ImportResult {
  success: boolean;
  saveId?: string;
  error?: string;
  warnings?: string[];               // Non-fatal issues
}

/**
 * Result of a validation check.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// MIGRATION SYSTEM
// =============================================================================

/**
 * Migration definition for upgrading save versions.
 */
export interface Migration {
  fromVersion: string;
  toVersion: string;
  description: string;
  migrate: (data: unknown) => unknown;
}

/**
 * Current save version - increment when schema changes.
 */
export const CURRENT_SAVE_VERSION = '1.0.0';

/**
 * Minimum supported version - saves older than this can't be migrated.
 */
export const MIN_SUPPORTED_VERSION = '1.0.0';

// =============================================================================
// STORAGE LIMITS
// =============================================================================

export const STORAGE_LIMITS = {
  MAX_SAVES: 5,
  MAX_SAVE_SIZE_MB: 10,              // Per save
  MAX_TOTAL_SIZE_MB: 50,             // Total IndexedDB budget
  LOCALSTORAGE_WARNING_KB: 4000,     // Warn if localStorage > 4MB
  AUTO_SAVE_DEBOUNCE_MS: 5000,       // Min 5s between auto-saves
};

// =============================================================================
// AUTO-SAVE TRIGGERS
// =============================================================================

export type AutoSaveTrigger =
  | 'WEEK_COMPLETE'
  | 'GAME_END'
  | 'PHASE_CHANGE'
  | 'BROWSER_CLOSE'
  | 'TAB_CHANGE'
  | 'INTERVAL'
  | 'MANUAL';

export interface AutoSaveEvent {
  trigger: AutoSaveTrigger;
  timestamp: number;
  saveId: string;
  success: boolean;
  error?: string;
}

// =============================================================================
// EXPORT/IMPORT
// =============================================================================

/**
 * Exported save format (for sharing/backup).
 */
export interface ExportedSave {
  format: 'illegal-motion-save';
  version: string;
  exportedAt: number;
  data: SaveGame;
  checksum?: string;                 // Optional integrity check
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a unique save ID.
 */
export function generateSaveId(): string {
  return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a default save name.
 */
export function generateSaveName(teamName: string, seasonYear: number): string {
  return `Season ${seasonYear} - ${teamName}`;
}

/**
 * Format relative time for display.
 */
export function formatLastPlayed(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;

  // For older saves, show date
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Compare version strings.
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;

    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }

  return 0;
}

/**
 * Check if a version needs migration.
 */
export function needsMigration(saveVersion: string): boolean {
  return compareVersions(saveVersion, CURRENT_SAVE_VERSION) < 0;
}

/**
 * Check if a version is too old to migrate.
 */
export function isTooOld(saveVersion: string): boolean {
  return compareVersions(saveVersion, MIN_SUPPORTED_VERSION) < 0;
}
