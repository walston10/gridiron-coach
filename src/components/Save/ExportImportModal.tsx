/**
 * ExportImportModal Component
 *
 * Modal for exporting saves to JSON or importing from JSON/file.
 */

import React, { useState, useRef } from 'react';
import type { SaveResult } from '../../types/save.types';

interface ExportImportModalProps {
  mode: 'export' | 'import';
  exportData?: string | null;
  onImport: (jsonString: string) => Promise<SaveResult>;
  onClose: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  mode,
  exportData,
  onImport,
  onClose,
}) => {
  const [importText, setImportText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy export data to clipboard
  const handleCopy = async () => {
    if (!exportData) return;

    try {
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  // Download export data as file
  const handleDownload = () => {
    if (!exportData) return;

    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `illegal-motion-save-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess('Save file downloaded!');
    setTimeout(() => setSuccess(null), 2000);
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setImportText(text);
      setError(null);
    } catch (err) {
      setError('Failed to read file');
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importText.trim()) {
      setError('Please paste save data or upload a file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await onImport(importText);

      if (result.success) {
        setSuccess('Save imported successfully!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'export' ? 'Export Save' : 'Import Save'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Export Mode */}
        {mode === 'export' && exportData && (
          <div>
            <p className="text-gray-400 mb-4">
              Copy this save data or download as a file. You can import it later
              or share it with others.
            </p>

            {/* Export data preview */}
            <div className="relative">
              <textarea
                value={exportData}
                readOnly
                className="w-full h-48 p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 font-mono text-xs resize-none"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1 rounded text-sm ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDownload}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg"
              >
                Download File
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Import Mode */}
        {mode === 'import' && (
          <div>
            <p className="text-gray-400 mb-4">
              Paste save data below or upload a save file. The imported save will
              be added as a new slot.
            </p>

            {/* File upload */}
            <div className="mb-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-amber-500 hover:text-amber-500 transition-colors"
              >
                <div className="text-2xl mb-1">📁</div>
                Click to upload save file
              </button>
            </div>

            <div className="text-center text-gray-500 my-4">— or —</div>

            {/* Paste area */}
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setError(null);
              }}
              placeholder="Paste save data here..."
              className="w-full h-48 p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 font-mono text-xs resize-none placeholder-gray-600"
            />

            {/* Error display */}
            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Success display */}
            {success && (
              <div className="mt-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-400">
                {success}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleImport}
                disabled={!importText.trim() || isProcessing}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Importing...
                  </>
                ) : (
                  'Import Save'
                )}
              </button>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg"
              >
                Cancel
              </button>
            </div>

            {/* Help text */}
            <p className="text-gray-500 text-sm mt-4">
              Note: Imported saves will be validated before loading. Incompatible
              or corrupted saves will be rejected.
            </p>
          </div>
        )}

        {/* Success message for export */}
        {success && mode === 'export' && (
          <div className="mt-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-400">
            {success}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportImportModal;
