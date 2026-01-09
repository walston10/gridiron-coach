/**
 * ILLEGAL MOTION - IndexedDB Utilities
 *
 * Handles all IndexedDB operations for save game storage.
 * IndexedDB allows for larger storage than localStorage (~50MB+).
 */

import type { SaveGame, SaveMetadata } from '../types/save.types';
import { CURRENT_SAVE_VERSION } from '../types/save.types';

// =============================================================================
// DATABASE CONFIG
// =============================================================================

const DB_NAME = 'IllegalMotionDB';
const DB_VERSION = 1;
const SAVES_STORE = 'saves';

// =============================================================================
// DATABASE INSTANCE
// =============================================================================

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize and return the IndexedDB database.
 * Creates the database and object stores if they don't exist.
 */
export async function initDB(): Promise<IDBDatabase> {
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Handle connection closing unexpectedly
      dbInstance.onclose = () => {
        console.warn('IndexedDB connection closed');
        dbInstance = null;
      };

      dbInstance.onerror = (event) => {
        console.error('IndexedDB error:', event);
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create saves object store
      if (!db.objectStoreNames.contains(SAVES_STORE)) {
        const savesStore = db.createObjectStore(SAVES_STORE, { keyPath: 'id' });

        // Create indexes for querying
        savesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        savesStore.createIndex('name', 'name', { unique: false });

        console.log('Created saves object store');
      }
    };
  });
}

/**
 * Close the database connection.
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get a single save by ID.
 */
export async function getSave(id: string): Promise<SaveGame | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SAVES_STORE, 'readonly');
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      console.error('Failed to get save:', request.error);
      reject(new Error(`Failed to get save: ${request.error?.message}`));
    };
  });
}

/**
 * Store or update a save.
 */
export async function putSave(save: SaveGame): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SAVES_STORE, 'readwrite');
    const store = transaction.objectStore(SAVES_STORE);

    // Update timestamp
    save.updatedAt = Date.now();

    const request = store.put(save);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to save:', request.error);
      reject(new Error(`Failed to save: ${request.error?.message}`));
    };
  });
}

/**
 * Delete a save by ID.
 */
export async function deleteSave(id: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SAVES_STORE, 'readwrite');
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to delete save:', request.error);
      reject(new Error(`Failed to delete save: ${request.error?.message}`));
    };
  });
}

/**
 * Get all saves.
 */
export async function getAllSaves(): Promise<SaveGame[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SAVES_STORE, 'readonly');
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by updatedAt descending (most recent first)
      const saves = request.result || [];
      saves.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(saves);
    };

    request.onerror = () => {
      console.error('Failed to get all saves:', request.error);
      reject(new Error(`Failed to get all saves: ${request.error?.message}`));
    };
  });
}

/**
 * Get save count.
 */
export async function getSaveCount(): Promise<number> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SAVES_STORE, 'readonly');
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Failed to count saves:', request.error);
      reject(new Error(`Failed to count saves: ${request.error?.message}`));
    };
  });
}

/**
 * Clear all saves (use with caution!).
 */
export async function clearAllSaves(): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SAVES_STORE, 'readwrite');
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to clear saves:', request.error);
      reject(new Error(`Failed to clear saves: ${request.error?.message}`));
    };
  });
}

// =============================================================================
// METADATA OPERATIONS (for localStorage sync)
// =============================================================================

/**
 * Extract metadata from a full save for localStorage storage.
 */
export function extractMetadata(save: SaveGame): SaveMetadata {
  const franchise = save.franchiseState;
  const season = franchise.season;

  return {
    id: save.id,
    name: save.name,
    version: save.version,
    createdAt: save.createdAt,
    updatedAt: save.updatedAt,

    teamId: franchise.teamId,
    teamName: franchise.teamId, // Will be looked up/replaced by display logic
    gmName: franchise.gmName,
    seasonYear: season.year,
    currentWeek: season.currentWeek,
    seasonPhase: season.phase,
    record: { ...franchise.careerRecord },
    championships: franchise.championships,

    hasActiveGame: !!save.activeGame,
  };
}

/**
 * Get all metadata from IndexedDB (extracts from full saves).
 */
export async function getAllMetadata(): Promise<SaveMetadata[]> {
  const saves = await getAllSaves();
  return saves.map(extractMetadata);
}

// =============================================================================
// STORAGE ESTIMATION
// =============================================================================

/**
 * Get estimated storage usage.
 */
export async function getStorageEstimate(): Promise<{
  used: number;
  quota: number;
  percentUsed: number;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? (used / quota) * 100 : 0;

    return { used, quota, percentUsed };
  }

  // Fallback for browsers without Storage API
  return { used: 0, quota: 0, percentUsed: 0 };
}

/**
 * Check if we have enough storage for a new save.
 */
export async function hasStorageSpace(requiredBytes: number = 10_000_000): Promise<boolean> {
  try {
    const estimate = await getStorageEstimate();

    // If quota is 0 (unknown), assume we have space
    if (estimate.quota === 0) return true;

    const availableBytes = estimate.quota - estimate.used;
    return availableBytes >= requiredBytes;
  } catch {
    // If we can't estimate, assume we have space
    return true;
  }
}

// =============================================================================
// BROWSER SUPPORT CHECK
// =============================================================================

/**
 * Check if IndexedDB is supported.
 */
export function isIndexedDBSupported(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Run a quick test to verify IndexedDB works.
 */
export async function testIndexedDB(): Promise<boolean> {
  if (!isIndexedDBSupported()) {
    return false;
  }

  try {
    // Try to open a test database
    const testDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('__illegal_motion_test__', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    testDB.close();

    // Delete the test database
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase('__illegal_motion_test__');
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => resolve();
    });

    return true;
  } catch (error) {
    console.warn('IndexedDB test failed:', error);
    return false;
  }
}

// =============================================================================
// DATABASE CLEANUP
// =============================================================================

/**
 * Delete the entire database (nuclear option).
 */
export async function deleteDatabase(): Promise<void> {
  closeDB();

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      console.log('Database deleted');
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to delete database:', request.error);
      reject(new Error(`Failed to delete database: ${request.error?.message}`));
    };

    request.onblocked = () => {
      console.warn('Database deletion blocked - close all connections');
    };
  });
}
