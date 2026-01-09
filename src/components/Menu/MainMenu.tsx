/**
 * Main Menu
 *
 * Primary game menu with New Game, Continue, Load Game, and Settings options.
 * Replaces the basic StartScreen with full menu functionality.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useSaveStore } from '../../stores/saveStore';
import { SettingsPanel } from './SettingsPanel';
import { SaveManager } from '../Save/SaveManager';
import { soundManager, initializeSounds } from '../../utils/soundManager';

type MenuScreen = 'main' | 'settings' | 'load' | 'newGame';

export const MainMenu: React.FC = () => {
  const { setPhase, resetFranchise } = useGameStore();
  const { loadSave, saves, initialize } = useSaveStore();
  const [currentScreen, setCurrentScreen] = useState<MenuScreen>('main');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize save store
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Check for existing save to show "Continue"
  const hasSaves = saves.length > 0;
  const mostRecentSave = saves.length > 0 ? saves[0] : null; // Already sorted by updatedAt desc

  // Initialize sounds
  useEffect(() => {
    initializeSounds().then(() => {
      setIsInitialized(true);
    });
  }, []);

  // Play music on mount
  useEffect(() => {
    if (isInitialized) {
      soundManager.playMusic('MENU_MUSIC');
    }
    return () => {
      soundManager.stopMusic();
    };
  }, [isInitialized]);

  const handleNewGame = useCallback(() => {
    soundManager.play('UI_CONFIRM');
    soundManager.stopMusic();
    resetFranchise();
    setPhase('intro');
  }, [setPhase, resetFranchise]);

  const handleContinue = useCallback(async () => {
    if (mostRecentSave) {
      soundManager.play('UI_CONFIRM');
      soundManager.stopMusic();
      const result = await loadSave(mostRecentSave.id);
      if (result.success) {
        setPhase('desk');
      }
    }
  }, [mostRecentSave, loadSave, setPhase]);

  const handleLoadGame = useCallback(() => {
    soundManager.play('UI_CLICK');
    setCurrentScreen('load');
  }, []);

  const handleSettings = useCallback(() => {
    soundManager.play('UI_CLICK');
    setCurrentScreen('settings');
  }, []);

  const handleBack = useCallback(() => {
    soundManager.play('UI_BACK');
    setCurrentScreen('main');
  }, []);

  const handleLoadComplete = useCallback(() => {
    soundManager.stopMusic();
    setPhase('desk');
  }, [setPhase]);

  const handleButtonHover = useCallback(() => {
    soundManager.play('UI_HOVER');
  }, []);

  // Render different screens
  if (currentScreen === 'settings') {
    return (
      <div className="min-h-screen bg-black">
        <SettingsPanel isOpen={true} onClose={handleBack} asModal={false} />
      </div>
    );
  }

  if (currentScreen === 'load') {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-stone-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Menu
          </button>
          <SaveManager
            mode="load"
            onClose={handleBack}
            onLoadComplete={handleLoadComplete}
          />
        </div>
      </div>
    );
  }

  // Main menu
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(139, 69, 19, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(220, 38, 38, 0.15) 0%, transparent 40%),
            linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 100%)
          `,
        }}
      />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
            top: '10%',
            left: '20%',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-64 h-64 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(220, 38, 38, 0.3) 0%, transparent 70%)',
            bottom: '20%',
            right: '15%',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.1) 2px,
            rgba(255,255,255,0.1) 4px
          )`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Logo */}
        <div className="mb-12">
          <h1
            className="text-6xl md:text-8xl font-black tracking-tighter mb-2"
            style={{
              color: '#f59e0b',
              textShadow: `
                0 0 40px rgba(245, 158, 11, 0.5),
                0 4px 0 #78350f,
                0 8px 0 #451a03
              `,
            }}
          >
            ILLEGAL
          </h1>
          <h1
            className="text-6xl md:text-8xl font-black tracking-tighter"
            style={{
              color: '#dc2626',
              textShadow: `
                0 0 40px rgba(220, 38, 38, 0.5),
                0 4px 0 #7f1d1d,
                0 8px 0 #450a0a
              `,
            }}
          >
            MOTION
          </h1>
          <p className="text-stone-500 text-lg mt-4 tracking-widest uppercase">
            Build your dynasty. Bend the rules.
          </p>
        </div>

        {/* Menu Buttons */}
        <div className="space-y-3 w-72 mx-auto">
          {/* Continue - only show if saves exist */}
          {hasSaves && mostRecentSave && (
            <MenuButton
              onClick={handleContinue}
              onHover={handleButtonHover}
              primary
            >
              Continue
              <span className="block text-xs font-normal opacity-70 mt-1">
                {mostRecentSave.teamName || mostRecentSave.teamId} • Week {mostRecentSave.currentWeek}
              </span>
            </MenuButton>
          )}

          {/* New Game */}
          <MenuButton
            onClick={handleNewGame}
            onHover={handleButtonHover}
            primary={!hasSaves}
          >
            New Franchise
          </MenuButton>

          {/* Load Game */}
          {hasSaves && (
            <MenuButton onClick={handleLoadGame} onHover={handleButtonHover}>
              Load Game
            </MenuButton>
          )}

          {/* Settings */}
          <MenuButton onClick={handleSettings} onHover={handleButtonHover}>
            Settings
          </MenuButton>
        </div>

        {/* Version */}
        <p className="text-stone-700 text-xs mt-16 tracking-wider">
          v0.1 ALPHA
        </p>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
    </div>
  );
};

// =============================================================================
// MENU BUTTON
// =============================================================================

interface MenuButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  onHover?: () => void;
  primary?: boolean;
}

const MenuButton: React.FC<MenuButtonProps> = ({
  children,
  onClick,
  onHover,
  primary = false,
}) => {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`
        group relative w-full px-8 py-4 font-bold text-lg uppercase tracking-wider
        rounded transition-all duration-300
        ${primary
          ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-500 hover:to-amber-600 hover:scale-105 hover:shadow-lg hover:shadow-amber-900/50'
          : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700 hover:text-white'
        }
      `}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded" />
    </button>
  );
};

export default MainMenu;
