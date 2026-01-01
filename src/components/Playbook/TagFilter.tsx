import React from 'react';
import type { PlayTag } from '../../types';

interface TagFilterProps {
  selectedTags: PlayTag[];
  onToggleTag: (tag: PlayTag) => void;
}

const TAG_GROUPS: { label: string; tags: PlayTag[] }[] = [
  {
    label: 'Situations',
    tags: ['RED_ZONE', 'GOAL_LINE', '3RD_SHORT', '3RD_LONG', '2_MINUTE', 'OPENING'],
  },
  {
    label: 'Play Types',
    tags: ['PLAY_ACTION', 'SCREEN', 'QUICK_PASS', 'DEEP_SHOT', 'RUN_HEAVY'],
  },
  {
    label: 'Other',
    tags: ['FAVORITE'],
  },
];

const TAG_ICONS: Record<PlayTag, string> = {
  'RED_ZONE': '🎯',
  'GOAL_LINE': '🏈',
  '3RD_SHORT': '⚡',
  '3RD_LONG': '📏',
  '2_MINUTE': '⏱️',
  'OPENING': '🎬',
  'PLAY_ACTION': '🎭',
  'SCREEN': '🛡️',
  'QUICK_PASS': '💨',
  'DEEP_SHOT': '🚀',
  'RUN_HEAVY': '🏃',
  'FAVORITE': '⭐',
};

export const TagFilter: React.FC<TagFilterProps> = ({ selectedTags, onToggleTag }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-3">Filter by Tag</h3>

      {TAG_GROUPS.map(group => (
        <div key={group.label} className="mb-3">
          <div className="text-gray-500 text-xs mb-1">{group.label}</div>
          <div className="flex flex-wrap gap-1">
            {group.tags.map(tag => {
              const isActive = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {TAG_ICONS[tag]}
                  <span className="hidden xl:inline">
                    {tag.replace(/_/g, ' ')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedTags.length > 0 && (
        <button
          onClick={() => selectedTags.forEach(t => onToggleTag(t))}
          className="text-gray-400 hover:text-white text-xs w-full text-center mt-2"
        >
          Clear tags
        </button>
      )}
    </div>
  );
};
