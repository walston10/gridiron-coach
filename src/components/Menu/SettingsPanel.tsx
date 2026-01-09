/**
 * Settings Panel
 *
 * Comprehensive settings UI for audio, gameplay, and display options.
 * Can be used as modal or full-page.
 */

import React, { useState, useCallback } from 'react';
import {
  useSettingsStore,
  GAME_LENGTH_CONFIG,
  DIFFICULTY_CONFIG,
} from '../../stores/settingsStore';
import type {
  GameSpeed,
  GameLength,
  Difficulty,
  ColorBlindMode,
  GameSettings,
} from '../../stores/settingsStore';
import { soundManager } from '../../utils/soundManager';

type SettingsTab = 'audio' | 'gameplay' | 'display' | 'accessibility';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  asModal?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  asModal = true,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('audio');
  const { settings, updateSettings, resetSettings } = useSettingsStore();

  const handleClose = useCallback(() => {
    soundManager.play('UI_BACK');
    onClose();
  }, [onClose]);

  const handleTabChange = useCallback((tab: SettingsTab) => {
    soundManager.play('UI_CLICK');
    setActiveTab(tab);
  }, []);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset all settings to defaults?')) {
      resetSettings();
      soundManager.play('UI_CONFIRM');
    }
  }, [resetSettings]);

  if (!isOpen) return null;

  const content = (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-800">
        <h2 className="text-xl font-black text-amber-500">SETTINGS</h2>
        <button
          onClick={handleClose}
          className="p-2 text-stone-500 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800">
        {(['audio', 'gameplay', 'display', 'accessibility'] as SettingsTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 px-4 py-3 font-bold text-sm uppercase tracking-wider transition-colors
              ${activeTab === tab
                ? 'text-amber-500 border-b-2 border-amber-500 bg-stone-800/50'
                : 'text-stone-500 hover:text-stone-300'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'audio' && (
          <AudioSettings settings={settings} updateSettings={updateSettings} />
        )}
        {activeTab === 'gameplay' && (
          <GameplaySettings settings={settings} updateSettings={updateSettings} />
        )}
        {activeTab === 'display' && (
          <DisplaySettings settings={settings} updateSettings={updateSettings} />
        )}
        {activeTab === 'accessibility' && (
          <AccessibilitySettings settings={settings} updateSettings={updateSettings} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-stone-800">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-red-500 hover:text-red-400 text-sm font-bold transition-colors"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleClose}
          className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative z-10 w-full max-w-2xl mx-4 bg-stone-900 rounded-lg shadow-2xl border border-stone-800 overflow-hidden">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-stone-900">
      {content}
    </div>
  );
};

// =============================================================================
// AUDIO SETTINGS
// =============================================================================

interface SettingsProps {
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
}

const AudioSettings: React.FC<SettingsProps> = ({ settings, updateSettings }) => {
  const handleVolumeChange = useCallback((key: string, value: number) => {
    updateSettings({ [key]: value });
    soundManager.updateVolumes();
  }, [updateSettings]);

  return (
    <div className="space-y-6">
      {/* Master Volume */}
      <VolumeSlider
        label="Master Volume"
        value={settings.masterVolume}
        onChange={(v) => handleVolumeChange('masterVolume', v)}
        disabled={settings.muteAll}
      />

      {/* SFX Volume */}
      <VolumeSlider
        label="Sound Effects"
        value={settings.sfxVolume}
        onChange={(v) => handleVolumeChange('sfxVolume', v)}
        disabled={settings.muteAll}
      />

      {/* Music Volume */}
      <VolumeSlider
        label="Music"
        value={settings.musicVolume}
        onChange={(v) => handleVolumeChange('musicVolume', v)}
        disabled={settings.muteAll}
      />

      {/* Voice Volume */}
      <VolumeSlider
        label="Voice/Commentary"
        value={settings.voiceVolume}
        onChange={(v) => handleVolumeChange('voiceVolume', v)}
        disabled={settings.muteAll}
      />

      {/* Mute Options */}
      <div className="pt-4 border-t border-stone-800 space-y-3">
        <ToggleSwitch
          label="Mute All Audio"
          checked={settings.muteAll}
          onChange={(v) => updateSettings({ muteAll: v })}
        />
        <ToggleSwitch
          label="Mute When Unfocused"
          description="Automatically mute audio when the game window loses focus"
          checked={settings.muteWhenUnfocused}
          onChange={(v) => updateSettings({ muteWhenUnfocused: v })}
        />
      </div>
    </div>
  );
};

// =============================================================================
// GAMEPLAY SETTINGS
// =============================================================================

const GameplaySettings: React.FC<SettingsProps> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-6">
      {/* Difficulty */}
      <div>
        <label className="block text-stone-400 text-sm font-bold mb-2">Difficulty</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => updateSettings({ difficulty: diff })}
              className={`p-3 rounded text-left transition-all
                ${settings.difficulty === diff
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
            >
              <div className="font-bold">{DIFFICULTY_CONFIG[diff].name}</div>
              <div className="text-xs opacity-70 mt-1">{DIFFICULTY_CONFIG[diff].description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Game Length */}
      <div>
        <label className="block text-stone-400 text-sm font-bold mb-2">Game Length</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(GAME_LENGTH_CONFIG) as GameLength[]).map((length) => (
            <button
              key={length}
              onClick={() => updateSettings({ gameLength: length })}
              className={`p-3 rounded text-center transition-all
                ${settings.gameLength === length
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
            >
              <div className="font-bold capitalize">{length}</div>
              <div className="text-xs opacity-70 mt-1">
                ~{GAME_LENGTH_CONFIG[length].estimatedRealMinutes} min
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Game Speed */}
      <div>
        <label className="block text-stone-400 text-sm font-bold mb-2">Animation Speed</label>
        <div className="grid grid-cols-3 gap-2">
          {(['slow', 'normal', 'fast'] as GameSpeed[]).map((speed) => (
            <button
              key={speed}
              onClick={() => updateSettings({ gameSpeed: speed })}
              className={`p-3 rounded font-bold capitalize transition-all
                ${settings.gameSpeed === speed
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
            >
              {speed}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="pt-4 border-t border-stone-800 space-y-3">
        <ToggleSwitch
          label="Auto-Sim Opponent Drives"
          description="Quickly simulate opponent possessions"
          checked={settings.autoSimOpponentDrives}
          onChange={(v) => updateSettings({ autoSimOpponentDrives: v })}
        />
        <ToggleSwitch
          label="Skip Animations"
          description="Disable all play animations"
          checked={settings.skipAnimations}
          onChange={(v) => updateSettings({ skipAnimations: v })}
        />
        <ToggleSwitch
          label="Show Tutorials"
          description="Display tutorial hints for new features"
          checked={settings.showTutorials}
          onChange={(v) => updateSettings({ showTutorials: v })}
        />
        <ToggleSwitch
          label="Confirm Dangerous Actions"
          description="Ask before irreversible decisions"
          checked={settings.confirmDangerousActions}
          onChange={(v) => updateSettings({ confirmDangerousActions: v })}
        />
      </div>

      {/* Auto-save */}
      <div className="pt-4 border-t border-stone-800 space-y-3">
        <ToggleSwitch
          label="Auto-Save"
          description="Automatically save game progress"
          checked={settings.autoSaveEnabled}
          onChange={(v) => updateSettings({ autoSaveEnabled: v })}
        />
        {settings.autoSaveEnabled && (
          <div>
            <label className="block text-stone-400 text-sm font-bold mb-2">
              Auto-Save Interval: {settings.autoSaveInterval} minutes
            </label>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={settings.autoSaveInterval}
              onChange={(e) => updateSettings({ autoSaveInterval: parseInt(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// DISPLAY SETTINGS
// =============================================================================

const DisplaySettings: React.FC<SettingsProps> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-6">
      <ToggleSwitch
        label="Show FPS Counter"
        description="Display frames per second in corner"
        checked={settings.showFPS}
        onChange={(v) => updateSettings({ showFPS: v })}
      />

      {/* Notifications */}
      <div className="pt-4 border-t border-stone-800 space-y-3">
        <ToggleSwitch
          label="Enable Notifications"
          description="Show browser notifications for events"
          checked={settings.enableNotifications}
          onChange={(v) => updateSettings({ enableNotifications: v })}
        />
        {settings.enableNotifications && (
          <ToggleSwitch
            label="Weekly Reminders"
            description="Remind about incomplete weekly tasks"
            checked={settings.weeklyReminders}
            onChange={(v) => updateSettings({ weeklyReminders: v })}
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// ACCESSIBILITY SETTINGS
// =============================================================================

const AccessibilitySettings: React.FC<SettingsProps> = ({ settings, updateSettings }) => {
  return (
    <div className="space-y-6">
      <ToggleSwitch
        label="Reduced Motion"
        description="Minimize animations and transitions"
        checked={settings.reducedMotion}
        onChange={(v) => updateSettings({ reducedMotion: v })}
      />

      <ToggleSwitch
        label="High Contrast"
        description="Increase contrast for better visibility"
        checked={settings.highContrast}
        onChange={(v) => updateSettings({ highContrast: v })}
      />

      {/* Color Blind Mode */}
      <div>
        <label className="block text-stone-400 text-sm font-bold mb-2">Color Blind Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {(['none', 'protanopia', 'deuteranopia', 'tritanopia'] as ColorBlindMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updateSettings({ colorBlindMode: mode })}
              className={`p-3 rounded font-bold capitalize transition-all
                ${settings.colorBlindMode === mode
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
            >
              {mode === 'none' ? 'Off' : mode}
            </button>
          ))}
        </div>
        <p className="text-stone-600 text-xs mt-2">
          Adjusts game colors for color vision deficiencies
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// UI COMPONENTS
// =============================================================================

interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({ label, value, onChange, disabled }) => {
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-stone-400 text-sm font-bold">{label}</label>
        <span className="text-stone-500 text-sm font-mono">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="w-full accent-amber-500"
      />
    </div>
  );
};

interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, description, checked, onChange }) => {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div>
        <div className="text-stone-300 font-medium group-hover:text-white transition-colors">
          {label}
        </div>
        {description && (
          <div className="text-stone-600 text-xs mt-0.5">{description}</div>
        )}
      </div>
      <div
        className={`relative w-12 h-6 rounded-full transition-colors
          ${checked ? 'bg-amber-600' : 'bg-stone-700'}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
            ${checked ? 'translate-x-7' : 'translate-x-1'}`}
        />
      </div>
    </label>
  );
};

export default SettingsPanel;
