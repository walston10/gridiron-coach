import React from 'react';
import type { PassAction, QBRunType } from '../../types';

interface QBActionPickerProps {
  playType: 'RUN' | 'PASS';
  passAction?: PassAction;
  qbRun?: QBRunType;
  onPassActionChange: (action: PassAction) => void;
  onQBRunChange: (run: QBRunType) => void;
}

const PASS_ACTIONS: { value: PassAction; label: string; description: string }[] = [
  { value: '3_STEP', label: '3-Step', description: 'Quick drop for short passes' },
  { value: '5_STEP', label: '5-Step', description: 'Standard drop' },
  { value: '7_STEP', label: '7-Step', description: 'Deep drop for long passes' },
  { value: 'SPRINT_LEFT', label: 'Sprint Left', description: 'Roll to the left' },
  { value: 'SPRINT_RIGHT', label: 'Sprint Right', description: 'Roll to the right' },
  { value: 'BOOT_LEFT', label: 'Boot Left', description: 'Play action bootleg left' },
  { value: 'BOOT_RIGHT', label: 'Boot Right', description: 'Play action bootleg right' },
];

const QB_RUN_TYPES: { value: QBRunType; label: string; description: string }[] = [
  { value: 'HANDOFF', label: 'Handoff', description: 'Standard handoff to RB' },
  { value: 'QB_SNEAK', label: 'QB Sneak', description: 'Sneak behind center' },
  { value: 'QB_DRAW', label: 'QB Draw', description: 'Fake pass, QB runs' },
  { value: 'QB_POWER', label: 'QB Power', description: 'Designed QB run with lead blocker' },
  { value: 'READ_OPTION', label: 'Read Option', description: 'Read DE, give or keep' },
  { value: 'ZONE_READ', label: 'Zone Read', description: 'Read backside DE on zone' },
  { value: 'QB_SWEEP', label: 'QB Sweep', description: 'QB outside run' },
];

export const QBActionPicker: React.FC<QBActionPickerProps> = ({
  playType,
  passAction,
  qbRun,
  onPassActionChange,
  onQBRunChange,
}) => {
  if (playType === 'PASS') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">QB Drop</label>
        <div className="grid grid-cols-2 gap-2">
          {PASS_ACTIONS.map((action) => (
            <button
              key={action.value}
              onClick={() => onPassActionChange(action.value)}
              className={`p-2 rounded text-left transition-colors ${
                passAction === action.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={action.description}
            >
              <div className="font-medium text-sm">{action.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">QB Action</label>
      <div className="grid grid-cols-2 gap-2">
        {QB_RUN_TYPES.map((run) => (
          <button
            key={run.value}
            onClick={() => onQBRunChange(run.value)}
            className={`p-2 rounded text-left transition-colors ${
              qbRun === run.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={run.description}
          >
            <div className="font-medium text-sm">{run.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
