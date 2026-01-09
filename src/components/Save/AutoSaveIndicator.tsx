/**
 * AutoSaveIndicator Component
 *
 * Small indicator showing auto-save status in corner of screen.
 * Shows "Saving...", "Saved", or error state.
 */

import React, { useEffect, useState } from 'react';
import { useSaveStore } from '../../stores/saveStore';

interface AutoSaveIndicatorProps {
  // Position on screen
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  position = 'bottom-right',
}) => {
  const { isSaving, lastAutoSave, error } = useSaveStore();

  const [showSaved, setShowSaved] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Show "Saved" briefly after successful save
  useEffect(() => {
    if (lastAutoSave?.success) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastAutoSave]);

  // Show error briefly
  useEffect(() => {
    if (lastAutoSave?.error) {
      setDisplayError(lastAutoSave.error);
      const timer = setTimeout(() => setDisplayError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastAutoSave]);

  // Position classes
  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Don't render if nothing to show
  if (!isSaving && !showSaved && !displayError) {
    return null;
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 transition-all duration-300`}
    >
      {/* Saving state */}
      {isSaving && (
        <div className="flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-700">
          <SpinnerIcon />
          <span className="text-gray-300 text-sm">Saving...</span>
        </div>
      )}

      {/* Saved state */}
      {!isSaving && showSaved && !displayError && (
        <div className="flex items-center gap-2 bg-green-900/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-green-700 animate-fade-in">
          <CheckIcon />
          <span className="text-green-400 text-sm">Saved</span>
        </div>
      )}

      {/* Error state */}
      {displayError && (
        <div className="flex items-center gap-2 bg-red-900/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-red-700 max-w-xs">
          <ErrorIcon />
          <span className="text-red-400 text-sm truncate">{displayError}</span>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ICONS
// =============================================================================

const SpinnerIcon: React.FC = () => (
  <svg
    className="animate-spin h-4 w-4 text-amber-500"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg
    className="h-4 w-4 text-green-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg
    className="h-4 w-4 text-red-400 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default AutoSaveIndicator;
