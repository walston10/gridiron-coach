/**
 * ILLEGAL MOTION - Save Store
 *
 * Manages save/load operations, auto-save, and save metadata.
 * Uses IndexedDB for full saves and localStorage for metadata.
 */

import { create } from 'zustand';
import type {
  SaveGame,
  SaveMetadata,
  SaveResult,
  LoadResult,
  AutoSaveTrigger,
  AutoSaveEvent,
  UserSettings,
} from '../types/save.types';
import {
  STORAGE_LIMITS,
  CURRENT_SAVE_VERSION,
  DEFAULT_USER_SETTINGS,
  generateSaveId,
  generateSaveName,
  formatLastPlayed,
  needsMigration,
} from '../types/save.types';
import type { FranchiseState } from '../types/franchise.types';
import type { LiveGame } from '../types/game.types';
import {
  initDB,
  getSave,
  putSave,
  deleteSave as dbDeleteSave,
  getAllSaves,
  getSaveCount,
  extractMetadata,
  hasStorageSpace,
  isIndexedDBSupported,
} from '../utils/db';
import {
  getMetadataFromStorage,
  saveMetadataToStorage,
  updateMetadataEntry,
  removeMetadataEntry,
  getCurrentSaveId,
  setCurrentSaveId,
  validateSave,
  exportSave as exportSaveUtil,
  importSave as importSaveUtil,
  migrateSave,
  isSaveTooLarge,
} from '../utils/storage';

// =============================================================================
// STORE STATE
// =============================================================================

interface SaveStoreState {
  // State
  saves: SaveMetadata[];
  currentSaveId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Auto-save
  autoSaveEnabled: boolean;
  lastAutoSave: AutoSaveEvent | null;
  autoSaveTimer: number | null;

  // User settings (persisted separately)
  userSettings: UserSettings;

  // Computed
  canCreateNewSave: boolean;

  // Actions - Save Management
  initialize: () => Promise<void>;
  createSave: (
    franchiseState: FranchiseState,
    activeGame?: LiveGame,
    name?: string
  ) => Promise<SaveResult>;
  loadSave: (saveId: string) => Promise<LoadResult>;
  updateSave: (
    saveId: string,
    franchiseState: FranchiseState,
    activeGame?: LiveGame
  ) => Promise<SaveResult>;
  deleteSave: (saveId: string) => Promise<boolean>;
  renameSave: (saveId: string, newName: string) => Promise<boolean>;
  listSaves: () => Promise<SaveMetadata[]>;

  // Actions - Export/Import
  exportSave: (saveId: string) => Promise<string | null>;
  importSave: (jsonString: string) => Promise<SaveResult>;

  // Actions - Auto-save
  triggerAutoSave: (
    trigger: AutoSaveTrigger,
    franchiseState: FranchiseState,
    activeGame?: LiveGame
  ) => Promise<void>;
  setAutoSaveEnabled: (enabled: boolean) => void;

  // Actions - Settings
  updateUserSettings: (settings: Partial<UserSettings>) => void;

  // Actions - Error handling
  clearError: () => void;

  // Internal
  _refreshMetadata: () => Promise<void>;
  _setLoading: (loading: boolean) => void;
  _setSaving: (saving: boolean) => void;
  _setError: (error: string | null) => void;
}

// =============================================================================
// AUTO-SAVE DEBOUNCE
// =============================================================================

let lastSaveTimestamp = 0;
let pendingAutoSave: ReturnType<typeof setTimeout> | null = null;

// =============================================================================
// STORE
// =============================================================================

export const useSaveStore = create<SaveStoreState>()((set, get) => ({
  // Initial state
  saves: [],
  currentSaveId: null,
  isLoading: false,
  isSaving: false,
  error: null,

  autoSaveEnabled: true,
  lastAutoSave: null,
  autoSaveTimer: null,

  userSettings: DEFAULT_USER_SETTINGS,

  canCreateNewSave: true,

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  initialize: async () => {
    get()._setLoading(true);
    get()._setError(null);

    try {
      // Check IndexedDB support
      if (!isIndexedDBSupported()) {
        throw new Error('Your browser does not support IndexedDB. Saves may be limited.');
      }

      // Initialize database
      await initDB();

      // Load metadata from localStorage (faster)
      const storedMetadata = getMetadataFromStorage();
      set({ saves: storedMetadata });

      // Load current save ID
      const currentId = getCurrentSaveId();
      set({ currentSaveId: currentId });

      // Check save count
      const count = await getSaveCount();
      set({ canCreateNewSave: count < STORAGE_LIMITS.MAX_SAVES });

      // Sync metadata with actual IndexedDB contents (in background)
      get()._refreshMetadata();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize save system';
      get()._setError(message);
      console.error('Save system initialization failed:', error);
    } finally {
      get()._setLoading(false);
    }
  },

  // =========================================================================
  // SAVE MANAGEMENT
  // =========================================================================

  createSave: async (franchiseState, activeGame, name) => {
    const state = get();

    // Check limits
    if (state.saves.length >= STORAGE_LIMITS.MAX_SAVES) {
      return {
        success: false,
        error: `Maximum ${STORAGE_LIMITS.MAX_SAVES} saves reached. Delete a save to create a new one.`,
      };
    }

    // Check storage space
    const hasSpace = await hasStorageSpace();
    if (!hasSpace) {
      return {
        success: false,
        error: 'Not enough storage space. Delete old saves or clear browser data.',
      };
    }

    state._setSaving(true);
    state._setError(null);

    try {
      const saveId = generateSaveId();
      const saveName = name || generateSaveName(
        franchiseState.teamId,
        franchiseState.season.year
      );

      const save: SaveGame = {
        id: saveId,
        name: saveName,
        version: CURRENT_SAVE_VERSION,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        franchiseState,
        activeGame,
        userSettings: state.userSettings,
      };

      // Check size
      if (isSaveTooLarge(save)) {
        return {
          success: false,
          error: 'Save data is too large. This should not happen - please report this bug.',
        };
      }

      // Save to IndexedDB
      await putSave(save);

      // Update metadata in localStorage
      const metadata = extractMetadata(save);
      updateMetadataEntry(metadata);

      // Update current save ID
      setCurrentSaveId(saveId);

      // Refresh state
      await state._refreshMetadata();

      set({
        currentSaveId: saveId,
        canCreateNewSave: state.saves.length + 1 < STORAGE_LIMITS.MAX_SAVES,
      });

      lastSaveTimestamp = Date.now();

      return {
        success: true,
        saveId,
        timestamp: Date.now(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create save';
      state._setError(message);
      return { success: false, error: message };
    } finally {
      state._setSaving(false);
    }
  },

  loadSave: async (saveId) => {
    const state = get();
    state._setLoading(true);
    state._setError(null);

    try {
      const save = await getSave(saveId);

      if (!save) {
        return {
          success: false,
          error: 'Save not found. It may have been deleted.',
        };
      }

      // Validate save
      const validation = validateSave(save);
      if (!validation.valid) {
        return {
          success: false,
          error: `Corrupted save: ${validation.errors.join(', ')}`,
        };
      }

      // Check for migration
      let finalSave = save;
      let migratedFrom: string | undefined;

      if (needsMigration(save.version)) {
        migratedFrom = save.version;
        finalSave = migrateSave(save);

        // Save migrated version
        await putSave(finalSave);
        const metadata = extractMetadata(finalSave);
        updateMetadataEntry(metadata);
      }

      // Update current save ID
      setCurrentSaveId(saveId);
      set({ currentSaveId: saveId });

      // Update last played time
      finalSave.updatedAt = Date.now();
      finalSave.franchiseState.lastPlayedAt = Date.now();
      await putSave(finalSave);

      // Refresh metadata
      await state._refreshMetadata();

      return {
        success: true,
        save: finalSave,
        needsMigration: !!migratedFrom,
        migratedFrom,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load save';
      state._setError(message);
      return { success: false, error: message };
    } finally {
      state._setLoading(false);
    }
  },

  updateSave: async (saveId, franchiseState, activeGame) => {
    const state = get();
    state._setSaving(true);

    try {
      const existingSave = await getSave(saveId);

      if (!existingSave) {
        // Create new save if doesn't exist
        return state.createSave(franchiseState, activeGame);
      }

      const updatedSave: SaveGame = {
        ...existingSave,
        updatedAt: Date.now(),
        franchiseState: {
          ...franchiseState,
          lastPlayedAt: Date.now(),
        },
        activeGame,
        userSettings: state.userSettings,
      };

      // Check size
      if (isSaveTooLarge(updatedSave)) {
        return {
          success: false,
          error: 'Save data is too large.',
        };
      }

      await putSave(updatedSave);

      // Update metadata
      const metadata = extractMetadata(updatedSave);
      updateMetadataEntry(metadata);

      await state._refreshMetadata();

      lastSaveTimestamp = Date.now();

      return {
        success: true,
        saveId,
        timestamp: Date.now(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update save';
      state._setError(message);
      return { success: false, error: message };
    } finally {
      state._setSaving(false);
    }
  },

  deleteSave: async (saveId) => {
    const state = get();

    try {
      await dbDeleteSave(saveId);
      removeMetadataEntry(saveId);

      // Clear current save if it was this one
      if (state.currentSaveId === saveId) {
        setCurrentSaveId(null);
        set({ currentSaveId: null });
      }

      await state._refreshMetadata();
      set({ canCreateNewSave: true });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete save';
      state._setError(message);
      return false;
    }
  },

  renameSave: async (saveId, newName) => {
    const state = get();

    try {
      const save = await getSave(saveId);
      if (!save) return false;

      save.name = newName;
      save.updatedAt = Date.now();

      await putSave(save);

      const metadata = extractMetadata(save);
      updateMetadataEntry(metadata);

      await state._refreshMetadata();

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename save';
      state._setError(message);
      return false;
    }
  },

  listSaves: async () => {
    await get()._refreshMetadata();
    return get().saves;
  },

  // =========================================================================
  // EXPORT/IMPORT
  // =========================================================================

  exportSave: async (saveId) => {
    try {
      const save = await getSave(saveId);
      if (!save) {
        get()._setError('Save not found');
        return null;
      }

      return exportSaveUtil(save);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export save';
      get()._setError(message);
      return null;
    }
  },

  importSave: async (jsonString) => {
    const state = get();

    // Check limits
    if (state.saves.length >= STORAGE_LIMITS.MAX_SAVES) {
      return {
        success: false,
        error: `Maximum ${STORAGE_LIMITS.MAX_SAVES} saves reached. Delete a save first.`,
      };
    }

    state._setSaving(true);

    try {
      const { save, errors, warnings } = importSaveUtil(jsonString);

      if (!save || errors.length > 0) {
        return {
          success: false,
          error: errors.join(', ') || 'Invalid save data',
        };
      }

      // Check for migration
      let finalSave = save;
      if (needsMigration(save.version)) {
        finalSave = migrateSave(save);
      }

      // Save to IndexedDB
      await putSave(finalSave);

      // Update metadata
      const metadata = extractMetadata(finalSave);
      updateMetadataEntry(metadata);

      await state._refreshMetadata();

      if (warnings.length > 0) {
        console.warn('Import warnings:', warnings);
      }

      return {
        success: true,
        saveId: finalSave.id,
        timestamp: Date.now(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import save';
      state._setError(message);
      return { success: false, error: message };
    } finally {
      state._setSaving(false);
    }
  },

  // =========================================================================
  // AUTO-SAVE
  // =========================================================================

  triggerAutoSave: async (trigger, franchiseState, activeGame) => {
    const state = get();

    // Check if auto-save is enabled
    if (!state.autoSaveEnabled && trigger !== 'MANUAL') {
      return;
    }

    // Check debounce (except for critical triggers)
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimestamp;
    const criticalTriggers: AutoSaveTrigger[] = ['BROWSER_CLOSE', 'MANUAL'];

    if (
      !criticalTriggers.includes(trigger) &&
      timeSinceLastSave < STORAGE_LIMITS.AUTO_SAVE_DEBOUNCE_MS
    ) {
      // Debounce: schedule a save for later
      if (pendingAutoSave) {
        clearTimeout(pendingAutoSave);
      }

      pendingAutoSave = setTimeout(() => {
        get().triggerAutoSave('INTERVAL', franchiseState, activeGame);
        pendingAutoSave = null;
      }, STORAGE_LIMITS.AUTO_SAVE_DEBOUNCE_MS - timeSinceLastSave);

      return;
    }

    // Perform save
    const { currentSaveId } = state;

    let result: SaveResult;
    if (currentSaveId) {
      result = await state.updateSave(currentSaveId, franchiseState, activeGame);
    } else {
      result = await state.createSave(franchiseState, activeGame);
    }

    // Record auto-save event
    const event: AutoSaveEvent = {
      trigger,
      timestamp: now,
      saveId: result.saveId || currentSaveId || '',
      success: result.success,
      error: result.error,
    };

    set({ lastAutoSave: event });
  },

  setAutoSaveEnabled: (enabled) => {
    set({ autoSaveEnabled: enabled });
  },

  // =========================================================================
  // SETTINGS
  // =========================================================================

  updateUserSettings: (settings) => {
    set((state) => ({
      userSettings: { ...state.userSettings, ...settings },
    }));
  },

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  clearError: () => {
    set({ error: null });
  },

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  _refreshMetadata: async () => {
    try {
      const saves = await getAllSaves();
      const metadata = saves.map(extractMetadata);

      // Sort by updatedAt descending
      metadata.sort((a, b) => b.updatedAt - a.updatedAt);

      // Add formatted last played
      const withFormatted = metadata.map((m) => ({
        ...m,
        lastPlayedFormatted: formatLastPlayed(m.updatedAt),
      }));

      // Save to localStorage for quick access
      saveMetadataToStorage(withFormatted);

      set({
        saves: withFormatted,
        canCreateNewSave: withFormatted.length < STORAGE_LIMITS.MAX_SAVES,
      });
    } catch (error) {
      console.error('Failed to refresh metadata:', error);
    }
  },

  _setLoading: (loading) => set({ isLoading: loading }),
  _setSaving: (saving) => set({ isSaving: saving }),
  _setError: (error) => set({ error }),
}));

// =============================================================================
// BROWSER CLOSE HANDLER
// =============================================================================

/**
 * Set up beforeunload handler for auto-save.
 * Call this once on app initialization.
 */
export function setupAutoSaveOnClose(
  getFranchiseState: () => FranchiseState | null,
  getActiveGame: () => LiveGame | undefined
): () => void {
  const handleBeforeUnload = () => {
    const franchiseState = getFranchiseState();
    if (franchiseState) {
      // Use sendBeacon for reliability on page close
      // Note: This is a simplified version - full implementation would
      // serialize and send to a service worker
      const store = useSaveStore.getState();
      if (store.currentSaveId && store.autoSaveEnabled) {
        // Synchronous save attempt - may not complete
        store.triggerAutoSave('BROWSER_CLOSE', franchiseState, getActiveGame());
      }
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      const franchiseState = getFranchiseState();
      if (franchiseState) {
        const store = useSaveStore.getState();
        if (store.autoSaveEnabled) {
          store.triggerAutoSave('TAB_CHANGE', franchiseState, getActiveGame());
        }
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
