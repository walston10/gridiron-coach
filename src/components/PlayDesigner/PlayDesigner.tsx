import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FieldCanvas } from './FieldCanvas';
import { FormationPicker } from './FormationPicker';
import { RouteTree } from './RouteTree';
import { BlockingMenu } from './BlockingMenu';
import { FormationEditor } from './FormationEditor';
import type { FormationType, PlayerAssignment, Play, RouteType, BlockingAssignment, RunAssignment, ReceiverBlockType } from '../../types';
import { FORMATIONS } from '../../data/formations';
import type { PositionTemplate } from '../../data/formations';
import { getRoutePoints } from '../../data/routes';
import { useGameStore } from '../../stores/gameStore';

const BLOCKING_NAMES: Record<BlockingAssignment, string> = {
  'PASS_PRO': 'Pass Pro',
  'MAN': 'Man',
  'ZONE_LEFT': 'Zone L',
  'ZONE_RIGHT': 'Zone R',
  'PULL_LEFT': 'Pull L',
  'PULL_RIGHT': 'Pull R',
};

const RUN_ASSIGNMENTS: { value: RunAssignment; label: string }[] = [
  { value: 'INSIDE_ZONE', label: 'Inside Zone' },
  { value: 'OUTSIDE_ZONE', label: 'Outside Zone' },
  { value: 'POWER', label: 'Power' },
  { value: 'COUNTER', label: 'Counter' },
  { value: 'DIVE', label: 'Dive' },
  { value: 'SWEEP', label: 'Sweep' },
  { value: 'TOSS', label: 'Toss' },
  { value: 'DRAW', label: 'Draw' },
];

const RECEIVER_BLOCKS: { value: ReceiverBlockType; label: string }[] = [
  { value: 'STALK_BLOCK', label: 'Stalk Block' },
  { value: 'CRACK_BLOCK', label: 'Crack Block' },
  { value: 'LEAD_BLOCK', label: 'Lead Block' },
];

export const PlayDesigner: React.FC = () => {
  const { addPlay, playbook, customFormations, addCustomFormation } = useGameStore();

  const [formation, setFormation] = useState<FormationType | string>('SHOTGUN');
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showRouteTree, setShowRouteTree] = useState(false);
  const [showBlockingMenu, setShowBlockingMenu] = useState(false);
  const [showRunAssignmentMenu, setShowRunAssignmentMenu] = useState(false);
  const [showFormationEditor, setShowFormationEditor] = useState(false);
  const [playName, setPlayName] = useState('');
  const [playType, setPlayType] = useState<'PASS' | 'RUN'>('PASS');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const getFormationPositions = useCallback((formationId: FormationType | string): PositionTemplate[] => {
    // Check custom formations first
    const customFormation = customFormations.find(f => f.id === formationId);
    if (customFormation) {
      return customFormation.positions;
    }

    // Fall back to standard formations
    const standardFormation = FORMATIONS.find(f => f.type === formationId);
    return standardFormation?.positions || [];
  }, [customFormations]);

  const initializeAssignments = useCallback((formationId: FormationType | string) => {
    const positions = getFormationPositions(formationId);

    const newAssignments: PlayerAssignment[] = positions.map(pos => ({
      playerId: pos.slot,
      positionSlot: pos.slot,
      label: pos.label,
      startX: pos.x,
      startY: pos.y,
      route: undefined,
      blockingAssignment: pos.defaultRole === 'BLOCK' ? 'PASS_PRO' : undefined,
      isOnLine: pos.isOnLine,
      fieldSide: pos.fieldSide,
      canRunRoutes: pos.canRunRoutes,
    }));

    setAssignments(newAssignments);
  }, [getFormationPositions]);

  useEffect(() => {
    initializeAssignments(formation);
  }, []);

  const handleFormationChange = (newFormation: FormationType | string) => {
    setFormation(newFormation);
    initializeAssignments(newFormation);
    setSelectedPlayer(null);
  };

  // Unified click handler for all players
  const handlePlayerClick = (slot: string) => {
    const assignment = assignments.find(a => a.positionSlot === slot);
    if (!assignment) return;

    setSelectedPlayer(slot);

    // Linemen (OL) - always show blocking menu
    if (!assignment.canRunRoutes) {
      setShowBlockingMenu(true);
      return;
    }

    // Eligible receivers - depends on play type
    if (playType === 'PASS') {
      setShowRouteTree(true);
    } else {
      // RUN play - show run assignment menu
      setShowRunAssignmentMenu(true);
    }
  };

  const handleRouteSelect = (routeType: RouteType) => {
    if (!selectedPlayer) return;

    const assignment = assignments.find(a => a.positionSlot === selectedPlayer);
    if (!assignment) return;

    // Get route points adjusted for player's field side
    const routePoints = getRoutePoints(
      routeType,
      assignment.fieldSide,
      assignment.startX,
      assignment.startY
    );

    setAssignments(prev => prev.map(a => {
      if (a.positionSlot === selectedPlayer) {
        return {
          ...a,
          route: routeType,
          customRoutePoints: routePoints,
          // Clear run assignments when setting a route
          runAssignment: undefined,
          receiverBlock: undefined,
          isBallCarrier: false,
        };
      }
      return a;
    }));

    setShowRouteTree(false);
    setSelectedPlayer(null);
  };

  const handleBlockingSelect = (blocking: BlockingAssignment) => {
    if (!selectedPlayer) return;

    setAssignments(prev => prev.map(a => {
      if (a.positionSlot === selectedPlayer) {
        return { ...a, blockingAssignment: blocking };
      }
      return a;
    }));

    setShowBlockingMenu(false);
    setSelectedPlayer(null);
  };

  const handleRunAssignmentSelect = (type: 'ball_carrier' | 'block', value?: RunAssignment | ReceiverBlockType) => {
    if (!selectedPlayer) return;

    setAssignments(prev => prev.map(a => {
      if (a.positionSlot === selectedPlayer) {
        if (type === 'ball_carrier') {
          // Clear other ball carriers first
          return {
            ...a,
            isBallCarrier: true,
            runAssignment: value as RunAssignment,
            route: undefined,
            receiverBlock: undefined,
          };
        } else {
          return {
            ...a,
            receiverBlock: value as ReceiverBlockType,
            isBallCarrier: false,
            runAssignment: undefined,
            route: undefined,
          };
        }
      }
      // Clear ball carrier from others if setting new ball carrier
      if (type === 'ball_carrier') {
        return { ...a, isBallCarrier: false };
      }
      return a;
    }));

    setShowRunAssignmentMenu(false);
    setSelectedPlayer(null);
  };

  const setAllLinemanBlocking = (blocking: BlockingAssignment) => {
    setAssignments(prev => prev.map(a => {
      if (!a.canRunRoutes && a.positionSlot !== 'QB') {
        return { ...a, blockingAssignment: blocking };
      }
      return a;
    }));
  };

  const handleClearAssignment = (slot: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.positionSlot === slot) {
        return {
          ...a,
          route: undefined,
          customRoutePoints: undefined,
          runAssignment: undefined,
          receiverBlock: undefined,
          isBallCarrier: false,
        };
      }
      return a;
    }));
  };

  const getAssignedRoutes = () => {
    return assignments.filter(a => a.route).length;
  };

  const getBallCarrier = () => {
    return assignments.find(a => a.isBallCarrier);
  };

  const getSelectedPlayerInfo = () => {
    if (!selectedPlayer) return null;
    return assignments.find(a => a.positionSlot === selectedPlayer);
  };

  const handleSaveCustomFormation = (name: string, positions: PositionTemplate[]) => {
    const newFormation = {
      id: uuidv4(),
      name,
      positions,
    };
    addCustomFormation(newFormation);
    setFormation(newFormation.id);
    initializeAssignments(newFormation.id);
  };

  const getFormationName = () => {
    const customFormation = customFormations.find(f => f.id === formation);
    if (customFormation) return customFormation.name;
    const standard = FORMATIONS.find(f => f.type === formation);
    return standard?.name || formation;
  };

  const handleSavePlay = () => {
    if (!playName.trim()) {
      setSaveMessage('Please enter a play name');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    if (playType === 'PASS' && getAssignedRoutes() === 0) {
      setSaveMessage('Assign at least one route for a pass play');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    if (playType === 'RUN' && !getBallCarrier()) {
      setSaveMessage('Designate a ball carrier for a run play');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    const play: Play = {
      id: uuidv4(),
      name: playName,
      formation: formation as FormationType,
      playType,
      assignments,
      tags: [],
      createdAt: Date.now(),
      timesUsed: 0,
      successRate: 0,
    };

    addPlay(play);
    setSaveMessage(`"${playName}" saved to playbook!`);
    setPlayName('');

    setTimeout(() => setSaveMessage(null), 3000);
  };

  const selectedInfo = getSelectedPlayerInfo();
  const linemen = assignments.filter(a => !a.canRunRoutes && a.positionSlot !== 'QB');
  const receivers = assignments.filter(a => a.canRunRoutes);
  const ballCarrier = getBallCarrier();

  // Get base formation type for editor
  const getBaseFormationType = (): FormationType => {
    if (FORMATIONS.some(f => f.type === formation)) {
      return formation as FormationType;
    }
    return 'SHOTGUN';
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Play Designer</h1>
        <div className="text-gray-400">
          Playbook: {playbook.plays.length} plays
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
        <h3 className="text-blue-200 font-bold mb-2">How to Design a Play:</h3>
        <ol className="text-blue-300 text-sm list-decimal list-inside space-y-1">
          <li>Choose a formation (or create a custom one)</li>
          <li>Select Pass or Run play type</li>
          <li>Click on any player to assign their role</li>
          <li>Name your play and click Save</li>
        </ol>
        <div className="mt-2 text-blue-400 text-xs">
          <strong>Legend:</strong> X = Split End | Z = Flanker | H/F = Slots | Y = Tight End | ■ = Lineman
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="text-white text-sm mb-2 block">Formation: {getFormationName()}</label>
          <FormationPicker
            selected={formation}
            onSelect={handleFormationChange}
            onEditFormation={() => setShowFormationEditor(true)}
          />
        </div>

        <div>
          <label className="text-white text-sm mb-2 block">Play Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPlayType('PASS')}
              className={`px-4 py-2 rounded font-bold ${
                playType === 'PASS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Pass
            </button>
            <button
              onClick={() => setPlayType('RUN')}
              className={`px-4 py-2 rounded font-bold ${
                playType === 'RUN'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Run
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <FieldCanvas
            formation={formation as FormationType}
            assignments={assignments}
            selectedPlayer={selectedPlayer}
            onPlayerClick={handlePlayerClick}
            playType={playType}
          />
        </div>

        <div className="w-80 space-y-4">
          {/* Play Name Input */}
          <div className="bg-gray-800 rounded-lg p-4">
            <label className="text-gray-400 text-sm">Play Name</label>
            <input
              type="text"
              value={playName}
              onChange={e => setPlayName(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mt-1"
              placeholder="e.g., Shotgun Trips Left"
            />
          </div>

          {/* Quick Blocking Presets */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-2">Quick OL Preset</div>
            <div className="grid grid-cols-2 gap-2">
              {playType === 'PASS' ? (
                <>
                  <button
                    onClick={() => setAllLinemanBlocking('PASS_PRO')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded"
                  >
                    All Pass Pro
                  </button>
                  <button
                    onClick={() => setAllLinemanBlocking('MAN')}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 rounded"
                  >
                    All Man
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAllLinemanBlocking('ZONE_LEFT')}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                  >
                    Zone Left
                  </button>
                  <button
                    onClick={() => setAllLinemanBlocking('ZONE_RIGHT')}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                  >
                    Zone Right
                  </button>
                  <button
                    onClick={() => setAllLinemanBlocking('MAN')}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 rounded"
                  >
                    Power/Man
                  </button>
                  <button
                    onClick={() => setAllLinemanBlocking('PULL_RIGHT')}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs py-2 rounded"
                  >
                    Pull Right
                  </button>
                </>
              )}
            </div>
          </div>

          {/* OL Summary */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-2">OL Assignments (click to edit)</div>
            <div className="space-y-1">
              {linemen.map(l => (
                <button
                  key={l.positionSlot}
                  onClick={() => handlePlayerClick(l.positionSlot)}
                  className="w-full flex justify-between items-center text-sm hover:bg-gray-700 rounded px-2 py-1"
                >
                  <span className="text-white font-bold">{l.label}</span>
                  <span className="text-gray-300">
                    {l.blockingAssignment ? BLOCKING_NAMES[l.blockingAssignment] : 'None'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Pass Play: Routes Summary */}
          {playType === 'PASS' && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-2">Assigned Routes ({getAssignedRoutes()})</div>
              {assignments.filter(a => a.route).length === 0 ? (
                <p className="text-gray-500 text-sm">Click a receiver to assign routes</p>
              ) : (
                <div className="space-y-2">
                  {assignments.filter(a => a.route).map(a => (
                    <div key={a.positionSlot} className="flex justify-between items-center bg-gray-700 rounded px-2 py-1">
                      <span className="text-white text-sm">
                        <strong>{a.label}</strong>: {a.route}
                      </span>
                      <button
                        onClick={() => handleClearAssignment(a.positionSlot)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Run Play: Assignments Summary */}
          {playType === 'RUN' && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-2">Run Assignments</div>

              {/* Ball Carrier */}
              <div className="mb-3">
                <div className="text-yellow-400 text-xs font-bold mb-1">Ball Carrier</div>
                {ballCarrier ? (
                  <div className="flex justify-between items-center bg-yellow-900/30 border border-yellow-700 rounded px-2 py-1">
                    <span className="text-yellow-200 text-sm">
                      <strong>{ballCarrier.label}</strong>: {ballCarrier.runAssignment || 'Run'}
                    </span>
                    <button
                      onClick={() => handleClearAssignment(ballCarrier.positionSlot)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Click RB/FB to set ball carrier</p>
                )}
              </div>

              {/* Receiver Blocks */}
              <div className="text-gray-400 text-xs font-bold mb-1">Receiver Blocking</div>
              {receivers.filter(r => r.receiverBlock).length === 0 ? (
                <p className="text-gray-500 text-sm">Click receivers to assign blocks</p>
              ) : (
                <div className="space-y-1">
                  {receivers.filter(r => r.receiverBlock).map(r => (
                    <div key={r.positionSlot} className="flex justify-between items-center bg-gray-700 rounded px-2 py-1">
                      <span className="text-white text-sm">
                        <strong>{r.label}</strong>: {r.receiverBlock?.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => handleClearAssignment(r.positionSlot)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Section */}
          {saveMessage && (
            <div className={`p-3 rounded text-sm ${
              saveMessage.includes('saved') ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
            }`}>
              {saveMessage}
            </div>
          )}

          <button
            onClick={handleSavePlay}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold"
          >
            Save Play to Playbook
          </button>

          {playbook.plays.length === 0 && (
            <p className="text-yellow-400 text-xs text-center">
              You need at least 1 play to start a game
            </p>
          )}
        </div>
      </div>

      {/* Route Tree Modal (PASS plays) */}
      {showRouteTree && selectedInfo && (
        <RouteTree
          onSelectRoute={handleRouteSelect}
          onClose={() => {
            setShowRouteTree(false);
            setSelectedPlayer(null);
          }}
          playerLabel={selectedInfo.label}
          fieldSide={selectedInfo.fieldSide}
        />
      )}

      {/* Blocking Menu Modal (for OL) */}
      {showBlockingMenu && selectedInfo && (
        <BlockingMenu
          onSelectBlocking={handleBlockingSelect}
          onClose={() => {
            setShowBlockingMenu(false);
            setSelectedPlayer(null);
          }}
          playerLabel={selectedInfo.label}
          currentAssignment={selectedInfo.blockingAssignment}
        />
      )}

      {/* Run Assignment Modal (for receivers in RUN plays) */}
      {showRunAssignmentMenu && selectedInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {selectedInfo.label} - Run Assignment
              </h3>
              <button
                onClick={() => {
                  setShowRunAssignmentMenu(false);
                  setSelectedPlayer(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Ball Carrier Option (for RB/FB) */}
            {(selectedInfo.positionSlot === 'RB' || selectedInfo.positionSlot === 'FB') && (
              <div className="mb-4">
                <div className="text-yellow-400 font-bold mb-2">Ball Carrier</div>
                <div className="grid grid-cols-2 gap-2">
                  {RUN_ASSIGNMENTS.map(run => (
                    <button
                      key={run.value}
                      onClick={() => handleRunAssignmentSelect('ball_carrier', run.value)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded text-sm"
                    >
                      {run.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Blocking Options */}
            <div>
              <div className="text-gray-400 font-bold mb-2">Blocking Assignment</div>
              <div className="grid grid-cols-1 gap-2">
                {RECEIVER_BLOCKS.map(block => (
                  <button
                    key={block.value}
                    onClick={() => handleRunAssignmentSelect('block', block.value)}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm text-left"
                  >
                    {block.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showFormationEditor && (
        <FormationEditor
          baseFormation={getBaseFormationType()}
          onSaveFormation={handleSaveCustomFormation}
          onClose={() => setShowFormationEditor(false)}
          existingCustomFormations={customFormations}
        />
      )}
    </div>
  );
};
