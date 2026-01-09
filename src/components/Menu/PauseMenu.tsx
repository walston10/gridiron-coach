/**
 * Pause Menu
 *
 * Overlay menu that appears when game is paused.
 * Provides quick access to settings, save/load, and exit options.
 */

import React, { useEffect, useCallback } from 'react';
import { soundManager } from '../../utils/soundManager';

interface PauseMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  onLoad?: () => void;
  onSettings: () => void;
  onMainMenu: () => void;
  onQuit?: () => void;
  showSaveLoad?: boolean;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onClose,
  onSave,
  onLoad,
  onSettings,
  onMainMenu,
  onQuit,
  showSaveLoad = true,
}) => {

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleButtonClick = useCallback((action: () => void) => {
    soundManager.play('UI_CLICK');
    action();
  }, []);

  const handleButtonHover = useCallback(() => {
    soundManager.play('UI_HOVER');
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        className="relative z-10 w-full max-w-md mx-4 bg-gradient-to-b from-stone-900 to-stone-950 rounded-lg shadow-2xl border border-stone-800"
        style={{
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-800 text-center">
          <h2 className="text-2xl font-black text-amber-500 tracking-tight">
            PAUSED
          </h2>
        </div>

        {/* Menu Options */}
        <div className="p-4 space-y-2">
          {/* Resume */}
          <MenuButton
            onClick={() => handleButtonClick(onClose)}
            onHover={handleButtonHover}
            primary
          >
            Resume Game
          </MenuButton>

          {/* Save/Load */}
          {showSaveLoad && (
            <>
              {onSave && (
                <MenuButton
                  onClick={() => handleButtonClick(onSave)}
                  onHover={handleButtonHover}
                >
                  Save Game
                </MenuButton>
              )}
              {onLoad && (
                <MenuButton
                  onClick={() => handleButtonClick(onLoad)}
                  onHover={handleButtonHover}
                >
                  Load Game
                </MenuButton>
              )}
            </>
          )}

          {/* Settings */}
          <MenuButton
            onClick={() => handleButtonClick(onSettings)}
            onHover={handleButtonHover}
          >
            Settings
          </MenuButton>

          {/* Divider */}
          <div className="py-2">
            <div className="border-t border-stone-800" />
          </div>

          {/* Main Menu */}
          <MenuButton
            onClick={() => handleButtonClick(onMainMenu)}
            onHover={handleButtonHover}
            danger
          >
            Return to Main Menu
          </MenuButton>

          {/* Quit */}
          {onQuit && (
            <MenuButton
              onClick={() => handleButtonClick(onQuit)}
              onHover={handleButtonHover}
              danger
            >
              Quit Game
            </MenuButton>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-4 border-t border-stone-800 text-center">
          <p className="text-stone-600 text-xs">
            Press <span className="text-stone-500 font-mono">ESC</span> to resume
          </p>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

// =============================================================================
// MENU BUTTON COMPONENT
// =============================================================================

interface MenuButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  onHover?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

const MenuButton: React.FC<MenuButtonProps> = ({
  children,
  onClick,
  onHover,
  primary = false,
  danger = false,
  disabled = false,
}) => {
  const baseClasses = `
    w-full px-6 py-3 font-bold text-lg rounded
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = primary
    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30'
    : danger
    ? 'bg-transparent hover:bg-red-900/30 text-red-500 hover:text-red-400 border border-red-900/50'
    : 'bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white';

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses}`}
    >
      {children}
    </button>
  );
};

export default PauseMenu;
