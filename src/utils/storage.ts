/**
 * ILLEGAL MOTION - Storage Utilities
 *
 * Helper functions for save validation, compression, and localStorage management.
 */

import type {
  SaveGame,
  SaveMetadata,
  ValidationResult,
  ExportedSave,
  Migration,
} from '../types/save.types';
import {
  CURRENT_SAVE_VERSION,
  MIN_SUPPORTED_VERSION,
  STORAGE_LIMITS,
  compareVersions,
  generateSaveId,
} from '../types/save.types';

// =============================================================================
// LOCALSTORAGE KEYS
// =============================================================================

const METADATA_KEY = 'illegal-motion-saves';
const CURRENT_SAVE_KEY = 'illegal-motion-current-save';
const SETTINGS_KEY = 'illegal-motion-settings';

// =============================================================================
// LOCALSTORAGE OPERATIONS
// =============================================================================

/**
 * Get all save metadata from localStorage.
 */
export function getMetadataFromStorage(): SaveMetadata[] {
  try {
    const data = localStorage.getItem(METADATA_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to read metadata from localStorage:', error);
    return [];
  }
}

/**
 * Save metadata to localStorage.
 */
export function saveMetadataToStorage(metadata: SaveMetadata[]): boolean {
  try {
    const json = JSON.stringify(metadata);

    // Check size before saving
    if (json.length > STORAGE_LIMITS.LOCALSTORAGE_WARNING_KB * 1024) {
      console.warn('Save metadata approaching localStorage limit');
    }

    localStorage.setItem(METADATA_KEY, json);
    return true;
  } catch (error) {
    console.error('Failed to save metadata to localStorage:', error);
    return false;
  }
}

/**
 * Update a single metadata entry.
 */
export function updateMetadataEntry(metadata: SaveMetadata): boolean {
  const allMetadata = getMetadataFromStorage();
  const index = allMetadata.findIndex(m => m.id === metadata.id);

  if (index >= 0) {
    allMetadata[index] = metadata;
  } else {
    allMetadata.push(metadata);
  }

  return saveMetadataToStorage(allMetadata);
}

/**
 * Remove a metadata entry.
 */
export function removeMetadataEntry(saveId: string): boolean {
  const allMetadata = getMetadataFromStorage();
  const filtered = allMetadata.filter(m => m.id !== saveId);
  return saveMetadataToStorage(filtered);
}

/**
 * Get current save ID.
 */
export function getCurrentSaveId(): string | null {
  return localStorage.getItem(CURRENT_SAVE_KEY);
}

/**
 * Set current save ID.
 */
export function setCurrentSaveId(saveId: string | null): void {
  if (saveId) {
    localStorage.setItem(CURRENT_SAVE_KEY, saveId);
  } else {
    localStorage.removeItem(CURRENT_SAVE_KEY);
  }
}

// =============================================================================
// SAVE VALIDATION
// =============================================================================

/**
 * Validate a save game object.
 * Returns validation result with errors and warnings.
 */
export function validateSave(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type check
  if (!data || typeof data !== 'object') {
    errors.push('Save data is not a valid object');
    return { valid: false, errors, warnings };
  }

  const save = data as Record<string, unknown>;

  // Required fields
  if (!save.id || typeof save.id !== 'string') {
    errors.push('Missing or invalid save ID');
  }

  if (!save.version || typeof save.version !== 'string') {
    errors.push('Missing or invalid save version');
  }

  if (!save.franchiseState || typeof save.franchiseState !== 'object') {
    errors.push('Missing or invalid franchise state');
  }

  // Version check
  if (typeof save.version === 'string') {
    if (compareVersions(save.version, MIN_SUPPORTED_VERSION) < 0) {
      errors.push(`Save version ${save.version} is too old (minimum: ${MIN_SUPPORTED_VERSION})`);
    } else if (compareVersions(save.version, CURRENT_SAVE_VERSION) < 0) {
      warnings.push(`Save needs migration from ${save.version} to ${CURRENT_SAVE_VERSION}`);
    }
  }

  // Franchise state validation
  if (save.franchiseState && typeof save.franchiseState === 'object') {
    const franchise = save.franchiseState as Record<string, unknown>;

    if (!franchise.id) errors.push('Missing franchise ID');
    if (!franchise.teamId) errors.push('Missing team ID');
    if (!franchise.roster) errors.push('Missing roster');
    if (!franchise.season) errors.push('Missing season data');

    // Season validation
    if (franchise.season && typeof franchise.season === 'object') {
      const season = franchise.season as Record<string, unknown>;
      if (typeof season.year !== 'number') errors.push('Invalid season year');
      if (typeof season.currentWeek !== 'number') errors.push('Invalid current week');
    }
  }

  // Timestamps
  if (typeof save.createdAt !== 'number' || save.createdAt <= 0) {
    warnings.push('Invalid or missing createdAt timestamp');
  }

  if (typeof save.updatedAt !== 'number' || save.updatedAt <= 0) {
    warnings.push('Invalid or missing updatedAt timestamp');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Type guard for SaveGame.
 */
export function isSaveGame(data: unknown): data is SaveGame {
  const result = validateSave(data);
  return result.valid;
}

// =============================================================================
// EXPORT/IMPORT
// =============================================================================

/**
 * Export a save to a portable format.
 */
export function exportSave(save: SaveGame): string {
  const exported: ExportedSave = {
    format: 'illegal-motion-save',
    version: CURRENT_SAVE_VERSION,
    exportedAt: Date.now(),
    data: save,
    checksum: generateChecksum(JSON.stringify(save)),
  };

  return JSON.stringify(exported, null, 2);
}

/**
 * Import a save from exported format.
 * Returns the save with a new ID to avoid conflicts.
 */
export function importSave(jsonString: string): {
  save: SaveGame | null;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(jsonString);

    // Check if it's our format
    if (parsed.format === 'illegal-motion-save') {
      // It's an exported save
      const exported = parsed as ExportedSave;

      // Verify checksum if present
      if (exported.checksum) {
        const dataChecksum = generateChecksum(JSON.stringify(exported.data));
        if (dataChecksum !== exported.checksum) {
          warnings.push('Checksum mismatch - save data may have been modified');
        }
      }

      // Validate the inner save
      const validation = validateSave(exported.data);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      if (validation.valid) {
        // Generate new ID to avoid conflicts
        const importedSave: SaveGame = {
          ...exported.data,
          id: generateSaveId(),
          name: `${exported.data.name} (Imported)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        return { save: importedSave, errors, warnings };
      }
    } else {
      // Try to treat as raw save data
      const validation = validateSave(parsed);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      if (validation.valid) {
        const importedSave: SaveGame = {
          ...parsed,
          id: generateSaveId(),
          name: `${parsed.name || 'Imported Save'} (Imported)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        return { save: importedSave, errors, warnings };
      }
    }
  } catch (parseError) {
    errors.push(`Failed to parse JSON: ${parseError}`);
  }

  return { save: null, errors, warnings };
}

/**
 * Generate a simple checksum for data integrity.
 */
function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

// =============================================================================
// COMPRESSION (Optional, for large saves)
// =============================================================================

/**
 * Compress save data using built-in compression.
 * Falls back to uncompressed if CompressionStream not available.
 */
export async function compressSave(save: SaveGame): Promise<string> {
  const json = JSON.stringify(save);

  // Check if CompressionStream is available
  if (typeof CompressionStream !== 'undefined') {
    try {
      const blob = new Blob([json]);
      const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(stream).blob();
      const arrayBuffer = await compressedBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return `compressed:${base64}`;
    } catch (error) {
      console.warn('Compression failed, using raw JSON:', error);
    }
  }

  // Fallback to raw JSON
  return json;
}

/**
 * Decompress save data.
 */
export async function decompressSave(data: string): Promise<SaveGame> {
  // Check if it's compressed
  if (data.startsWith('compressed:')) {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const base64 = data.slice(11); // Remove 'compressed:' prefix
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const blob = new Blob([bytes]);
        const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        const decompressedBlob = await new Response(stream).blob();
        const json = await decompressedBlob.text();
        return JSON.parse(json);
      } catch (error) {
        throw new Error(`Failed to decompress save: ${error}`);
      }
    } else {
      throw new Error('Compressed save cannot be read - browser does not support decompression');
    }
  }

  // Not compressed, parse as JSON
  return JSON.parse(data);
}

// =============================================================================
// MIGRATION
// =============================================================================

/**
 * List of migrations to apply.
 * Add new migrations here when save format changes.
 */
const MIGRATIONS: Migration[] = [
  // Example migration:
  // {
  //   fromVersion: '1.0.0',
  //   toVersion: '1.1.0',
  //   description: 'Add new field to franchise state',
  //   migrate: (data: unknown) => {
  //     const save = data as SaveGame;
  //     save.franchiseState.newField = 'default';
  //     save.version = '1.1.0';
  //     return save;
  //   },
  // },
];

/**
 * Apply migrations to bring a save up to current version.
 */
export function migrateSave(save: SaveGame): SaveGame {
  let currentVersion = save.version;
  let migratedSave = { ...save };

  // Find and apply migrations in order
  while (compareVersions(currentVersion, CURRENT_SAVE_VERSION) < 0) {
    const migration = MIGRATIONS.find(m => m.fromVersion === currentVersion);

    if (!migration) {
      console.warn(`No migration found from version ${currentVersion}`);
      // No migration found, just bump version
      migratedSave.version = CURRENT_SAVE_VERSION;
      break;
    }

    console.log(`Migrating save from ${migration.fromVersion} to ${migration.toVersion}`);
    migratedSave = migration.migrate(migratedSave) as SaveGame;
    currentVersion = migration.toVersion;
  }

  return migratedSave;
}

// =============================================================================
// SIZE UTILITIES
// =============================================================================

/**
 * Estimate the size of a save in bytes.
 */
export function estimateSaveSize(save: SaveGame): number {
  const json = JSON.stringify(save);
  // UTF-16 encoding, rough estimate
  return json.length * 2;
}

/**
 * Format bytes to human readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Check if a save is too large.
 */
export function isSaveTooLarge(save: SaveGame): boolean {
  const size = estimateSaveSize(save);
  return size > STORAGE_LIMITS.MAX_SAVE_SIZE_MB * 1024 * 1024;
}

// =============================================================================
// CLEANUP UTILITIES
// =============================================================================

/**
 * Clear all localStorage data for the game.
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(METADATA_KEY);
  localStorage.removeItem(CURRENT_SAVE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}

/**
 * Get localStorage usage for our app.
 */
export function getLocalStorageUsage(): { used: number; items: number } {
  let totalSize = 0;
  let itemCount = 0;

  const keys = [METADATA_KEY, CURRENT_SAVE_KEY, SETTINGS_KEY];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) {
      totalSize += value.length * 2; // UTF-16
      itemCount++;
    }
  }

  return { used: totalSize, items: itemCount };
}
