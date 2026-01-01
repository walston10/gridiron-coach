import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import type { PlayFolder } from '../../types';

interface FolderManagerProps {
  onClose: () => void;
}

const FOLDER_COLORS = [
  '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

const FOLDER_ICONS = ['📁', '🎯', '⚡', '⏱️', '🏈', '🎬', '🛡️', '🚀', '💪', '🔥'];

export const FolderManager: React.FC<FolderManagerProps> = ({ onClose }) => {
  const { playbook, addFolder, updateFolder, removeFolder } = useGameStore();
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [newFolderIcon, setNewFolderIcon] = useState(FOLDER_ICONS[0]);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: PlayFolder = {
      id: crypto.randomUUID(),
      name: newFolderName.trim(),
      color: newFolderColor,
      icon: newFolderIcon,
    };

    addFolder(newFolder);
    setNewFolderName('');
  };

  const handleDeleteFolder = (folderId: string) => {
    const playCount = playbook.plays.filter(p => p.folderId === folderId).length;
    const message = playCount > 0
      ? `Delete this folder? ${playCount} play(s) will be moved to Uncategorized.`
      : 'Delete this folder?';

    if (confirm(message)) {
      removeFolder(folderId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Manage Folders</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              X
            </button>
          </div>

          {/* Existing Folders */}
          <div className="space-y-2 mb-6">
            <h3 className="text-gray-400 text-sm">Your Folders</h3>
            {playbook.folders.length === 0 ? (
              <p className="text-gray-500 text-sm">No folders yet. Create one below!</p>
            ) : (
              playbook.folders.map(folder => (
                <div
                  key={folder.id}
                  className="bg-gray-700 rounded-lg p-3 flex items-center justify-between"
                >
                  {editingFolder === folder.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        defaultValue={folder.name}
                        className="bg-gray-600 text-white rounded px-2 py-1 flex-1"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            updateFolder(folder.id, { name: (e.target as HTMLInputElement).value });
                            setEditingFolder(null);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => setEditingFolder(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: folder.color }}
                        >
                          {folder.icon}
                        </span>
                        <span className="text-white">{folder.name}</span>
                        <span className="text-gray-500 text-sm">
                          ({playbook.plays.filter(p => p.folderId === folder.id).length} plays)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingFolder(folder.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="text-gray-400 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add New Folder */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-gray-400 text-sm mb-3">Create New Folder</h3>

            <div className="space-y-4">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
              />

              {/* Icon Picker */}
              <div>
                <label className="text-gray-400 text-xs">Icon</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {FOLDER_ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewFolderIcon(icon)}
                      className={`w-8 h-8 rounded flex items-center justify-center ${
                        newFolderIcon === icon ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-gray-400 text-xs">Color</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {FOLDER_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewFolderColor(color)}
                      className={`w-8 h-8 rounded ${
                        newFolderColor === color ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 bg-gray-700 rounded-lg p-3">
                <span
                  className="w-10 h-10 rounded flex items-center justify-center text-xl"
                  style={{ backgroundColor: newFolderColor }}
                >
                  {newFolderIcon}
                </span>
                <span className="text-white">
                  {newFolderName || 'Folder Preview'}
                </span>
              </div>

              <button
                onClick={handleAddFolder}
                disabled={!newFolderName.trim()}
                className={`w-full py-3 rounded font-bold ${
                  newFolderName.trim()
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                + Create Folder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
