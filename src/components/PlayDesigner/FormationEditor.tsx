import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { FormationType, FieldSide } from '../../types';
import { FORMATIONS, validateFormation } from '../../data/formations';
import type { PositionTemplate, ValidationResult } from '../../data/formations';

interface DraggablePlayer extends PositionTemplate {
  isDragging?: boolean;
}

interface FormationEditorProps {
  baseFormation: FormationType;
  onSaveFormation: (name: string, positions: PositionTemplate[]) => void;
  onClose: () => void;
  existingCustomFormations: { name: string; positions: PositionTemplate[] }[];
}

export const FormationEditor: React.FC<FormationEditorProps> = ({
  baseFormation,
  onSaveFormation,
  onClose,
  existingCustomFormations,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [players, setPlayers] = useState<DraggablePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [draggingPlayer, setDraggingPlayer] = useState<string | null>(null);
  const [formationName, setFormationName] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [], warnings: [] });

  const width = 700;
  const height = 400;

  // Initialize from base formation
  useEffect(() => {
    const template = FORMATIONS.find(f => f.type === baseFormation);
    if (template) {
      setPlayers(template.positions.map(p => ({ ...p })));
      setFormationName(`Custom ${template.name}`);
    }
  }, [baseFormation]);

  // Validate formation whenever players change
  useEffect(() => {
    const result = validateFormation(players);
    setValidation(result);
  }, [players]);

  // Draw the field and players
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, width, height);

    // Grid lines for positioning help
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Line of scrimmage
    const losY = height * 0.5;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, losY);
    ctx.lineTo(width, losY);
    ctx.stroke();

    // LOS label
    ctx.fillStyle = '#3b82f6';
    ctx.font = '12px Arial';
    ctx.fillText('LINE OF SCRIMMAGE', 10, losY - 8);

    // "On Line" guide (slightly above LOS)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, losY - 5);
    ctx.lineTo(width, losY - 5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw players
    players.forEach(player => {
      const x = (player.x / 100) * width;
      const y = (player.y / 100) * height;
      const isSelected = player.slot === selectedPlayer;
      const isDragging = player.slot === draggingPlayer;
      const radius = player.canRunRoutes ? 14 : 12;

      // Glow effect when selected/dragging
      if (isSelected || isDragging) {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
      }

      if (player.canRunRoutes) {
        if (player.isOnLine) {
          ctx.fillStyle = isSelected ? '#fbbf24' : '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = isSelected ? '#fbbf24' : '#ffffff';
          ctx.lineWidth = 3;
          ctx.fillStyle = '#2d5a27';
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        const size = radius * 1.8;
        ctx.fillStyle = isSelected ? '#fbbf24' : '#6b7280';
        ctx.fillRect(x - size/2, y - size/2, size, size);
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - size/2, y - size/2, size, size);
      }

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // QB marker
      if (player.slot === 'QB') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label
      ctx.fillStyle = player.canRunRoutes || player.slot === 'QB' ? '#000000' : '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.label, x, y);

      // Position coordinates (when selected)
      if (isSelected) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '10px Arial';
        ctx.fillText(`(${Math.round(player.x)}, ${Math.round(player.y)})`, x, y + radius + 12);
      }
    });

    // Legend
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Drag players to reposition - Click to select - Use panel to adjust settings', 10, height - 10);

  }, [players, selectedPlayer, draggingPlayer, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getPlayerAtPosition = (x: number, y: number): string | null => {
    for (const player of players) {
      const px = (player.x / 100) * width;
      const py = (player.y / 100) * height;
      const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
      if (dist < 20) {
        return player.slot;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const playerSlot = getPlayerAtPosition(x, y);
    if (playerSlot) {
      setSelectedPlayer(playerSlot);
      setDraggingPlayer(playerSlot);
    } else {
      setSelectedPlayer(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingPlayer) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / width) * 100;
    const y = ((e.clientY - rect.top) / height) * 100;

    // Snap to grid (every 5 units)
    const snappedX = Math.round(x / 2.5) * 2.5;
    const snappedY = Math.round(y / 2.5) * 2.5;

    // Clamp within bounds
    const clampedX = Math.max(2, Math.min(98, snappedX));
    const clampedY = Math.max(2, Math.min(98, snappedY));

    setPlayers(prev => prev.map(p => {
      if (p.slot === draggingPlayer) {
        // Auto-detect field side based on X position
        let fieldSide: FieldSide = 'CENTER';
        if (clampedX < 40) fieldSide = 'LEFT';
        else if (clampedX > 60) fieldSide = 'RIGHT';

        // Auto-detect on/off line based on Y position (close to 50 = on line)
        const isOnLine = Math.abs(clampedY - 50) < 3;

        return {
          ...p,
          x: clampedX,
          y: clampedY,
          fieldSide,
          isOnLine: p.canRunRoutes ? isOnLine : true, // Linemen always on line
        };
      }
      return p;
    }));
  };

  const handleMouseUp = () => {
    setDraggingPlayer(null);
  };

  const handleToggleOnLine = () => {
    if (!selectedPlayer) return;
    setPlayers(prev => prev.map(p => {
      if (p.slot === selectedPlayer && p.canRunRoutes) {
        return { ...p, isOnLine: !p.isOnLine };
      }
      return p;
    }));
  };

  const handleFieldSideChange = (side: FieldSide) => {
    if (!selectedPlayer) return;
    setPlayers(prev => prev.map(p => {
      if (p.slot === selectedPlayer) {
        return { ...p, fieldSide: side };
      }
      return p;
    }));
  };

  const handleLabelChange = (newLabel: string) => {
    if (!selectedPlayer) return;
    setPlayers(prev => prev.map(p => {
      if (p.slot === selectedPlayer) {
        return { ...p, label: newLabel.toUpperCase().slice(0, 3) };
      }
      return p;
    }));
  };

  const handleSave = () => {
    if (!formationName.trim()) {
      setSaveMessage('Enter a formation name');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    // Check for duplicate name
    if (existingCustomFormations.some(f => f.name === formationName)) {
      setSaveMessage('Formation name already exists');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    // Validate formation before saving
    const result = validateFormation(players);
    if (!result.valid) {
      setSaveMessage(`Invalid formation: ${result.errors[0]}`);
      setTimeout(() => setSaveMessage(null), 5000);
      return;
    }

    onSaveFormation(formationName, players);
    setSaveMessage('Formation saved!');
    setTimeout(() => {
      setSaveMessage(null);
      onClose();
    }, 1500);
  };

  const handleReset = () => {
    const template = FORMATIONS.find(f => f.type === baseFormation);
    if (template) {
      setPlayers(template.positions.map(p => ({ ...p })));
    }
  };

  const selectedPlayerData = players.find(p => p.slot === selectedPlayer);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Formation Editor</h2>
              <p className="text-gray-400 text-sm">Drag players to customize positions</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              X
            </button>
          </div>

          <div className="flex gap-6">
            {/* Canvas */}
            <div className="flex-1">
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="border border-gray-600 rounded cursor-move"
              />
            </div>

            {/* Side Panel */}
            <div className="w-72 space-y-4">
              {/* Formation Name */}
              <div className="bg-gray-700 rounded-lg p-4">
                <label className="text-gray-400 text-sm">Formation Name</label>
                <input
                  type="text"
                  value={formationName}
                  onChange={e => setFormationName(e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-3 py-2 mt-1"
                  placeholder="My Custom Formation"
                />
              </div>

              {/* Selected Player Info */}
              {selectedPlayerData ? (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-white font-bold mb-3">
                    Selected: {selectedPlayerData.label}
                  </h3>

                  {/* Label Edit */}
                  <div className="mb-3">
                    <label className="text-gray-400 text-xs">Label (max 3 chars)</label>
                    <input
                      type="text"
                      value={selectedPlayerData.label}
                      onChange={e => handleLabelChange(e.target.value)}
                      className="w-full bg-gray-600 text-white rounded px-2 py-1 mt-1 text-sm"
                      maxLength={3}
                    />
                  </div>

                  {/* Position */}
                  <div className="mb-3 text-sm">
                    <span className="text-gray-400">Position: </span>
                    <span className="text-white">
                      X: {Math.round(selectedPlayerData.x)}, Y: {Math.round(selectedPlayerData.y)}
                    </span>
                  </div>

                  {/* On/Off Line Toggle (only for receivers) */}
                  {selectedPlayerData.canRunRoutes && (
                    <div className="mb-3">
                      <label className="text-gray-400 text-xs block mb-1">Line Position</label>
                      <button
                        onClick={handleToggleOnLine}
                        className={`w-full py-2 rounded text-sm font-bold ${
                          selectedPlayerData.isOnLine
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                      >
                        {selectedPlayerData.isOnLine ? 'On the Line' : 'Off the Line'}
                      </button>
                    </div>
                  )}

                  {/* Field Side */}
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Field Side</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['LEFT', 'CENTER', 'RIGHT'] as FieldSide[]).map(side => (
                        <button
                          key={side}
                          onClick={() => handleFieldSideChange(side)}
                          className={`py-1 rounded text-xs font-bold ${
                            selectedPlayerData.fieldSide === side
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-600 text-gray-300'
                          }`}
                        >
                          {side}
                        </button>
                      ))}
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      Affects route mirroring direction
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-700 rounded-lg p-4 text-gray-400 text-sm text-center">
                  Click a player to select and edit
                </div>
              )}

              {/* Player List */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-gray-400 text-xs mb-2 uppercase tracking-wide">All Players</h3>
                <div className="grid grid-cols-4 gap-1">
                  {players.map(p => (
                    <button
                      key={p.slot}
                      onClick={() => setSelectedPlayer(p.slot)}
                      className={`py-1 px-2 rounded text-xs ${
                        selectedPlayer === p.slot
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Validation Status */}
              <div className={`rounded-lg p-3 ${
                validation.valid
                  ? 'bg-green-900/30 border border-green-700'
                  : 'bg-red-900/30 border border-red-700'
              }`}>
                <div className={`font-bold text-sm mb-1 ${validation.valid ? 'text-green-400' : 'text-red-400'}`}>
                  {validation.valid ? '✓ Formation Valid' : '✕ Formation Invalid'}
                </div>
                {validation.errors.length > 0 && (
                  <ul className="text-red-300 text-xs space-y-1">
                    {validation.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                )}
                {validation.warnings.length > 0 && (
                  <ul className="text-yellow-300 text-xs space-y-1 mt-1">
                    {validation.warnings.map((warn, i) => (
                      <li key={i}>⚠ {warn}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Save Message */}
              {saveMessage && (
                <div className={`p-3 rounded text-sm ${
                  saveMessage.includes('saved') ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
                }`}>
                  {saveMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleSave}
                  disabled={!validation.valid}
                  className={`w-full py-3 rounded font-bold ${
                    validation.valid
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {validation.valid ? 'Save Custom Formation' : 'Fix Errors to Save'}
                </button>
                <button
                  onClick={handleReset}
                  className="w-full bg-gray-600 hover:bg-gray-500 text-gray-300 py-2 rounded"
                >
                  Reset to Original
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
