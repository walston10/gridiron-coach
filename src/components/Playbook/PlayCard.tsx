import React from 'react';
import type { Play, PlayFolder } from '../../types';

interface PlayCardProps {
  play: Play;
  folders: PlayFolder[];
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const PlayCard: React.FC<PlayCardProps> = ({
  play,
  folders,
  onClick,
  onDuplicate,
  onDelete,
}) => {
  const folder = folders.find(f => f.id === play.folderId);
  const routeCount = play.assignments.filter(a => a.route).length;

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
    >
      {/* Preview Area */}
      <div className={`h-32 flex items-center justify-center relative ${
        play.playType === 'PASS' ? 'bg-blue-900' : 'bg-green-900'
      }`}>
        <div className="text-6xl opacity-30">
          {play.playType === 'PASS' ? '🎯' : '🏃'}
        </div>

        {/* Folder Badge */}
        {folder && (
          <div
            className="absolute top-2 left-2 text-xs px-2 py-1 rounded flex items-center gap-1"
            style={{ backgroundColor: folder.color }}
          >
            {folder.icon} {folder.name}
          </div>
        )}

        {/* Quick Actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="bg-gray-800 text-white p-1.5 rounded hover:bg-gray-700"
            title="Duplicate"
          >
            📋
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="bg-gray-800 text-red-400 p-1.5 rounded hover:bg-gray-700"
            title="Delete"
          >
            🗑️
          </button>
        </div>

        {/* Play Type Badge */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {play.playType}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-white font-bold truncate">{play.name}</h3>
        <div className="text-gray-400 text-sm">{play.formation}</div>

        <div className="flex justify-between items-center mt-2">
          <div className="text-gray-500 text-xs">
            {routeCount} routes
          </div>
          <div className="flex gap-1">
            {play.tags.includes('FAVORITE') && <span>⭐</span>}
            {play.tags.slice(0, 2).filter(t => t !== 'FAVORITE').map(tag => (
              <span key={tag} className="bg-gray-700 text-gray-300 text-xs px-1.5 py-0.5 rounded">
                {tag.replace(/_/g, ' ').slice(0, 8)}
              </span>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex justify-between mt-2 pt-2 border-t border-gray-700 text-xs">
          <span className="text-gray-400">
            Used: <span className="text-white">{play.timesUsed}</span>
          </span>
          <span className="text-gray-400">
            Success: <span className={play.successRate >= 0.5 ? 'text-green-400' : 'text-red-400'}>
              {Math.round(play.successRate * 100)}%
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
