import React, { useState, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import type { Play, PlayTag, PlayFolder, FormationType } from '../../types';
import { FORMATIONS } from '../../data/formations';
import { PlayCard } from './PlayCard';
import { PlayDetailModal } from './PlayDetailModal';
import { FolderManager } from './FolderManager';
import { TagFilter } from './TagFilter';

type SortOption = 'name' | 'created' | 'updated' | 'used' | 'success';
type ViewMode = 'grid' | 'list';

export const PlaybookPage: React.FC = () => {
  const { playbook, removePlay, duplicatePlay } = useGameStore();

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<PlayTag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [formationFilter, setFormationFilter] = useState<FormationType | 'ALL'>('ALL');
  const [playTypeFilter, setPlayTypeFilter] = useState<'ALL' | 'PASS' | 'RUN'>('ALL');

  // Filter and sort plays
  const filteredPlays = useMemo(() => {
    let plays = [...playbook.plays];

    // Filter by folder
    if (selectedFolder === 'uncategorized') {
      plays = plays.filter(p => !p.folderId);
    } else if (selectedFolder) {
      plays = plays.filter(p => p.folderId === selectedFolder);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      plays = plays.filter(p => selectedTags.every(tag => p.tags.includes(tag)));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      plays = plays.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.formation.toLowerCase().includes(query)
      );
    }

    // Filter by formation
    if (formationFilter !== 'ALL') {
      plays = plays.filter(p => p.formation === formationFilter);
    }

    // Filter by play type
    if (playTypeFilter !== 'ALL') {
      plays = plays.filter(p => p.playType === playTypeFilter);
    }

    // Sort
    plays.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'updated':
          comparison = (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt);
          break;
        case 'used':
          comparison = a.timesUsed - b.timesUsed;
          break;
        case 'success':
          comparison = a.successRate - b.successRate;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return plays;
  }, [playbook.plays, selectedFolder, selectedTags, searchQuery, sortBy, sortAsc, formationFilter, playTypeFilter]);

  // Get folder play counts
  const getFolderPlayCount = (folderId: string) => {
    return playbook.plays.filter(p => p.folderId === folderId).length;
  };

  const getUncategorizedCount = () => {
    return playbook.plays.filter(p => !p.folderId).length;
  };

  const handleDuplicate = (playId: string) => {
    const newPlay = duplicatePlay(playId);
    if (newPlay) {
      setSelectedPlay(newPlay);
    }
  };

  const handleDelete = (playId: string) => {
    if (confirm('Delete this play? This cannot be undone.')) {
      removePlay(playId);
      if (selectedPlay?.id === playId) {
        setSelectedPlay(null);
      }
    }
  };

  const toggleTag = (tag: PlayTag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Playbook</h1>
          <p className="text-gray-400">{playbook.plays.length} plays total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFolderManager(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Manage Folders
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Folders */}
        <div className="w-56 space-y-2">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-3">Folders</h3>

            {/* All Plays */}
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left px-3 py-2 rounded flex justify-between items-center ${
                selectedFolder === null ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>All Plays</span>
              <span className="text-sm opacity-70">{playbook.plays.length}</span>
            </button>

            {/* Custom Folders */}
            {playbook.folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full text-left px-3 py-2 rounded flex justify-between items-center ${
                  selectedFolder === folder.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{folder.icon} {folder.name}</span>
                <span className="text-sm opacity-70">{getFolderPlayCount(folder.id)}</span>
              </button>
            ))}

            {/* Uncategorized */}
            <button
              onClick={() => setSelectedFolder('uncategorized')}
              className={`w-full text-left px-3 py-2 rounded flex justify-between items-center ${
                selectedFolder === 'uncategorized' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>Uncategorized</span>
              <span className="text-sm opacity-70">{getUncategorizedCount()}</span>
            </button>
          </div>

          {/* Tag Filters */}
          <TagFilter selectedTags={selectedTags} onToggleTag={toggleTag} />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Filters Bar */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="flex-1 min-w-48">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search plays..."
                  className="w-full bg-gray-700 text-white rounded px-3 py-2"
                />
              </div>

              {/* Formation Filter */}
              <select
                value={formationFilter}
                onChange={e => setFormationFilter(e.target.value as FormationType | 'ALL')}
                className="bg-gray-700 text-white rounded px-3 py-2"
              >
                <option value="ALL">All Formations</option>
                {FORMATIONS.map(f => (
                  <option key={f.type} value={f.type}>{f.name}</option>
                ))}
              </select>

              {/* Play Type Filter */}
              <select
                value={playTypeFilter}
                onChange={e => setPlayTypeFilter(e.target.value as 'ALL' | 'PASS' | 'RUN')}
                className="bg-gray-700 text-white rounded px-3 py-2"
              >
                <option value="ALL">All Types</option>
                <option value="PASS">Pass</option>
                <option value="RUN">Run</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="bg-gray-700 text-white rounded px-3 py-2"
              >
                <option value="created">Date Created</option>
                <option value="updated">Last Updated</option>
                <option value="name">Name</option>
                <option value="used">Times Used</option>
                <option value="success">Success Rate</option>
              </select>

              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="bg-gray-700 text-white px-3 py-2 rounded"
              >
                {sortAsc ? '↑' : '↓'}
              </button>

              {/* View Mode */}
              <div className="flex bg-gray-700 rounded overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
                >
                  List
                </button>
              </div>
            </div>

            {/* Active Filters */}
            {(selectedTags.length > 0 || searchQuery || formationFilter !== 'ALL' || playTypeFilter !== 'ALL') && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-700">
                <span className="text-gray-400 text-sm">Active filters:</span>
                {searchQuery && (
                  <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-red-400">X</button>
                  </span>
                )}
                {formationFilter !== 'ALL' && (
                  <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    {formationFilter}
                    <button onClick={() => setFormationFilter('ALL')} className="hover:text-red-400">X</button>
                  </span>
                )}
                {playTypeFilter !== 'ALL' && (
                  <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    {playTypeFilter}
                    <button onClick={() => setPlayTypeFilter('ALL')} className="hover:text-red-400">X</button>
                  </span>
                )}
                {selectedTags.map(tag => (
                  <span key={tag} className="bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    {tag.replace(/_/g, ' ')}
                    <button onClick={() => toggleTag(tag)} className="hover:text-red-400">X</button>
                  </span>
                ))}
                <button
                  onClick={() => {
                    setSelectedTags([]);
                    setSearchQuery('');
                    setFormationFilter('ALL');
                    setPlayTypeFilter('ALL');
                  }}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Plays Display */}
          {filteredPlays.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-white mb-2">No Plays Found</h3>
              <p className="text-gray-400 mb-4">
                {playbook.plays.length === 0
                  ? "Create your first play in the Play Designer!"
                  : "Try adjusting your filters."}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlays.map(play => (
                <PlayCard
                  key={play.id}
                  play={play}
                  folders={playbook.folders}
                  onClick={() => setSelectedPlay(play)}
                  onDuplicate={() => handleDuplicate(play.id)}
                  onDelete={() => handleDelete(play.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlays.map(play => (
                <PlayListItem
                  key={play.id}
                  play={play}
                  folders={playbook.folders}
                  onClick={() => setSelectedPlay(play)}
                  onDuplicate={() => handleDuplicate(play.id)}
                  onDelete={() => handleDelete(play.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Play Detail Modal */}
      {selectedPlay && (
        <PlayDetailModal
          play={selectedPlay}
          folders={playbook.folders}
          onClose={() => setSelectedPlay(null)}
          onDuplicate={() => handleDuplicate(selectedPlay.id)}
          onDelete={() => handleDelete(selectedPlay.id)}
        />
      )}

      {/* Folder Manager Modal */}
      {showFolderManager && (
        <FolderManager onClose={() => setShowFolderManager(false)} />
      )}
    </div>
  );
};

// List view item component
const PlayListItem: React.FC<{
  play: Play;
  folders: PlayFolder[];
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ play, folders, onClick, onDuplicate, onDelete }) => {
  const folder = folders.find(f => f.id === play.folderId);

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-750 transition-colors"
    >
      {/* Play Type Icon */}
      <div className={`w-10 h-10 rounded flex items-center justify-center text-xl ${
        play.playType === 'PASS' ? 'bg-blue-600' : 'bg-green-600'
      }`}>
        {play.playType === 'PASS' ? '🎯' : '🏃'}
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold">{play.name}</span>
          {folder && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: folder.color + '40', color: folder.color }}
            >
              {folder.icon} {folder.name}
            </span>
          )}
        </div>
        <div className="text-gray-400 text-sm">
          {play.formation} | {play.assignments.filter(a => a.route).length} routes
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-1">
        {play.tags.slice(0, 3).map(tag => (
          <span key={tag} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
            {tag.replace(/_/g, ' ')}
          </span>
        ))}
        {play.tags.length > 3 && (
          <span className="text-gray-500 text-xs">+{play.tags.length - 3}</span>
        )}
      </div>

      {/* Stats */}
      <div className="text-right text-sm">
        <div className="text-white">{play.timesUsed} uses</div>
        <div className="text-gray-400">{Math.round(play.successRate * 100)}% success</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={onDuplicate}
          className="text-gray-400 hover:text-white p-2"
          title="Duplicate"
        >
          Copy
        </button>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-400 p-2"
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
