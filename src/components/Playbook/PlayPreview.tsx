import React from 'react';
import type { Play } from '../../types';

interface PlayPreviewProps {
  play: Play;
  onClick?: () => void;
  isSelected?: boolean;
}

export const PlayPreview: React.FC<PlayPreviewProps> = ({ play, onClick, isSelected }) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-white">{play.name}</h4>
        <span className={`text-xs px-2 py-1 rounded ${
          play.playType === 'PASS' ? 'bg-blue-500' : 'bg-green-500'
        }`}>
          {play.playType}
        </span>
      </div>
      <div className="text-sm text-gray-400">
        <div>{play.formation.replace('_', ' ')}</div>
        <div className="flex gap-2 mt-2">
          <span>Used: {play.timesUsed}</span>
          <span>•</span>
          <span>Success: {Math.round(play.successRate * 100)}%</span>
        </div>
      </div>
      {play.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {play.tags.map(tag => (
            <span key={tag} className="text-xs bg-gray-600 px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};