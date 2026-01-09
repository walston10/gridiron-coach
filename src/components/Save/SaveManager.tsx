/**
 * SaveManager Component
 *
 * Main save/load screen showing all save slots with actions.
 */

import React, { useEffect, useState } from 'react';
import { useSaveStore } from '../../stores/saveStore';
import { SaveSlot } from './SaveSlot';
import { ExportImportModal } from './ExportImportModal';
import { STORAGE_LIMITS } from '../../types/save.types';

interface SaveManagerProps {
  // Callbacks - either old style or new style
  onLoadSave?: (saveId: string) => void;
  onNewGame?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  onLoadComplete?: () => void;

  // Mode: 'title' for start screen, 'menu' for in-game, 'load' for load-only
  mode?: 'title' | 'menu' | 'load';
}

export const SaveManager: React.FC<SaveManagerProps> = ({
  onLoadSave,
  onNewGame,
  onBack,
  onClose,
  onLoadComplete,
  mode = 'title',
}) => {
  const {
    saves,
    currentSaveId,
    isLoading,
    isSaving,
    error,
    initialize,
    loadSave,
    deleteSave,
    renameSave,
    exportSave,
    importSave,
    clearError,
  } = useSaveStore();

  const [selectedSaveId, setSelectedSaveId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState<string | null>(null);
  const [showExportImport, setShowExportImport] = useState<'export' | 'import' | null>(null);
  const [exportData, setExportData] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle load
  const handleLoad = async (saveId: string) => {
    setSelectedSaveId(saveId);
    const result = await loadSave(saveId);

    if (result.success && result.save) {
      onLoadSave?.(saveId);
      onLoadComplete?.();
    }
  };

  // Handle back/close
  const handleBack = () => {
    onBack?.();
    onClose?.();
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;

    const success = await deleteSave(showDeleteConfirm);
    if (success) {
      setShowDeleteConfirm(null);
    }
  };

  // Handle rename
  const handleRenameConfirm = async () => {
    if (!showRenameModal || !renameValue.trim()) return;

    const success = await renameSave(showRenameModal, renameValue.trim());
    if (success) {
      setShowRenameModal(null);
      setRenameValue('');
    }
  };

  // Handle export
  const handleExport = async (saveId: string) => {
    const data = await exportSave(saveId);
    if (data) {
      setExportData(data);
      setShowExportImport('export');
    }
  };

  // Handle import
  const handleImport = async (jsonString: string) => {
    const result = await importSave(jsonString);
    if (result.success) {
      setShowExportImport(null);
    }
    return result;
  };

  // Fill remaining slots with empty slots
  const slots = [...saves];
  while (slots.length < STORAGE_LIMITS.MAX_SAVES) {
    slots.push(null as unknown as typeof saves[0]);
  }

  const showBackButton = onBack || onClose;
  const isLoadOnly = mode === 'load';

  return (
    <div className={`${mode === 'title' ? 'min-h-screen bg-gray-900' : ''} p-6`}>
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {mode === 'title' ? 'ILLEGAL MOTION' : isLoadOnly ? 'Load Game' : 'Save / Load Game'}
            </h1>
            {mode === 'title' && (
              <p className="text-gray-400 mt-1">Select a save or start a new game</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowExportImport('import')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
            >
              Import Save
            </button>
            {showBackButton && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
              >
                Back
              </button>
            )}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-between">
            <span className="text-red-400">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && saves.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading saves...</p>
          </div>
        )}

        {/* Save slots grid */}
        {(!isLoading || saves.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map((save, index) => (
              <SaveSlot
                key={save?.id || `empty-${index}`}
                save={save || null}
                slotIndex={index}
                onLoad={handleLoad}
                onDelete={(id) => setShowDeleteConfirm(id)}
                onRename={(id) => {
                  const s = saves.find((s) => s.id === id);
                  setRenameValue(s?.name || '');
                  setShowRenameModal(id);
                }}
                onExport={handleExport}
                onNewGame={onNewGame}
                isSelected={save?.id === selectedSaveId}
                isLoading={save?.id === selectedSaveId && isLoading}
                disabled={isSaving}
              />
            ))}
          </div>
        )}

        {/* Quick continue button for current save */}
        {currentSaveId && mode === 'title' && (
          <div className="mt-8 text-center">
            <button
              onClick={() => handleLoad(currentSaveId)}
              disabled={isLoading}
              className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-lg rounded-lg transition-colors disabled:opacity-50"
            >
              Continue Last Save
            </button>
          </div>
        )}

        {/* Save count info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          {saves.length} / {STORAGE_LIMITS.MAX_SAVES} save slots used
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Save?"
          message="This action cannot be undone. All progress in this save will be lost."
          confirmText="Delete"
          confirmVariant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Rename Save</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white mb-4"
              placeholder="Enter new name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameConfirm();
                if (e.key === 'Escape') setShowRenameModal(null);
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleRenameConfirm}
                disabled={!renameValue.trim()}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white font-bold py-2 rounded"
              >
                Rename
              </button>
              <button
                onClick={() => setShowRenameModal(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export/Import Modal */}
      {showExportImport && (
        <ExportImportModal
          mode={showExportImport}
          exportData={showExportImport === 'export' ? exportData : null}
          onImport={handleImport}
          onClose={() => {
            setShowExportImport(null);
            setExportData(null);
          }}
        />
      )}
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmText,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 font-bold py-2 rounded ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveManager;
