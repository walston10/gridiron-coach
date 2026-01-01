import React, { useState } from 'react';
import type { Play, PlayFolder, PlayTag } from '../../types';
import { useGameStore } from '../../stores/gameStore';

interface PlayDetailModalProps {
  play: Play;
  folders: PlayFolder[];
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const ALL_TAGS: PlayTag[] = [
  'RED_ZONE', 'GOAL_LINE', '3RD_SHORT', '3RD_LONG', '2_MINUTE',
  'OPENING', 'PLAY_ACTION', 'SCREEN', 'QUICK_PASS', 'DEEP_SHOT',
  'RUN_HEAVY', 'FAVORITE'
];

const TAG_LABELS: Record<PlayTag, { label: string; icon: string }> = {
  'RED_ZONE': { label: 'Red Zone', icon: '🎯' },
  'GOAL_LINE': { label: 'Goal Line', icon: '🏈' },
  '3RD_SHORT': { label: '3rd & Short', icon: '⚡' },
  '3RD_LONG': { label: '3rd & Long', icon: '📏' },
  '2_MINUTE': { label: '2-Minute', icon: '⏱️' },
  'OPENING': { label: 'Opener', icon: '🎬' },
  'PLAY_ACTION': { label: 'Play Action', icon: '🎭' },
  'SCREEN': { label: 'Screen', icon: '🛡️' },
  'QUICK_PASS': { label: 'Quick Pass', icon: '💨' },
  'DEEP_SHOT': { label: 'Deep Shot', icon: '🚀' },
  'RUN_HEAVY': { label: 'Run Heavy', icon: '🏃' },
  'FAVORITE': { label: 'Favorite', icon: '⭐' },
};

export const PlayDetailModal: React.FC<PlayDetailModalProps> = ({
  play,
  folders,
  onClose,
  onDuplicate,
  onDelete,
}) => {
  const { updatePlay, movePlayToFolder, addTagToPlay, removeTagFromPlay } = useGameStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(play.name);
  const [notes, setNotes] = useState(play.notes || '');

  const handleSaveName = () => {
    if (editedName.trim()) {
      updatePlay(play.id, { name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleSaveNotes = () => {
    updatePlay(play.id, { notes });
  };

  const toggleTag = (tag: PlayTag) => {
    if (play.tags.includes(tag)) {
      removeTagFromPlay(play.id, tag);
    } else {
      addTagToPlay(play.id, tag);
    }
  };

  const routeCount = play.assignments.filter(a => a.route).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={e => setEditedName(e.target.value)}
                    className="bg-gray-700 text-white text-2xl font-bold rounded px-3 py-1 flex-1"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  />
                  <button
                    onClick={handleSaveName}
                    className="bg-green-600 text-white px-4 py-1 rounded"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <h2
                  className="text-2xl font-bold text-white cursor-pointer hover:text-blue-400"
                  onClick={() => setIsEditingName(true)}
                >
                  {play.name} (click to edit)
                </h2>
              )}
              <div className="flex items-center gap-3 mt-2 text-gray-400">
                <span className={`px-2 py-1 rounded text-sm ${
                  play.playType === 'PASS' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  {play.playType}
                </span>
                <span>{play.formation}</span>
                <span>|</span>
                <span>{routeCount} routes</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              X
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6">
          {/* Left Column - Play Preview */}
          <div className="col-span-2 space-y-4">
            {/* Play Diagram Placeholder */}
            <div className={`h-64 rounded-lg flex items-center justify-center ${
              play.playType === 'PASS' ? 'bg-blue-900' : 'bg-green-900'
            }`}>
              <div className="text-center">
                <div className="text-6xl mb-2">{play.playType === 'PASS' ? '🎯' : '🏃'}</div>
                <p className="text-gray-400">Play diagram preview</p>
              </div>
            </div>

            {/* Assignments */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">Assignments</h3>
              <div className="grid grid-cols-2 gap-2">
                {play.assignments.filter(a => a.route || a.blockingAssignment).map(a => (
                  <div key={a.positionSlot} className="bg-gray-600 rounded px-3 py-2 flex justify-between">
                    <span className="text-white font-bold">{a.label}</span>
                    <span className="text-gray-300">
                      {a.route || a.blockingAssignment}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">Notes</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Add notes about when to use this play..."
                className="w-full bg-gray-600 text-white rounded p-3 h-24 resize-none"
              />
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-4">
            {/* Folder */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">Folder</h3>
              <select
                value={play.folderId || ''}
                onChange={e => movePlayToFolder(play.id, e.target.value || undefined)}
                className="w-full bg-gray-600 text-white rounded px-3 py-2"
              >
                <option value="">No Folder</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map(tag => {
                  const isActive = play.tags.includes(tag);
                  const { label, icon } = TAG_LABELS[tag];
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Times Used</span>
                  <span className="text-white">{play.timesUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Success Rate</span>
                  <span className={play.successRate >= 0.5 ? 'text-green-400' : 'text-red-400'}>
                    {Math.round(play.successRate * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created</span>
                  <span className="text-white text-sm">
                    {new Date(play.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {play.updatedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Updated</span>
                    <span className="text-white text-sm">
                      {new Date(play.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={onDuplicate}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 rounded"
              >
                Duplicate Play
              </button>
              <button
                onClick={onDelete}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded"
              >
                Delete Play
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
