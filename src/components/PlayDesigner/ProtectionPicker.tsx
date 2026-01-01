import React from 'react';
import type { ProtectionScheme, RunBlockingScheme } from '../../types';

interface ProtectionPickerProps {
  playType: 'RUN' | 'PASS';
  protectionScheme?: ProtectionScheme;
  runBlockingScheme?: RunBlockingScheme;
  onProtectionChange: (scheme: ProtectionScheme) => void;
  onRunBlockingChange: (scheme: RunBlockingScheme) => void;
}

const PROTECTION_SCHEMES: { value: ProtectionScheme; label: string; description: string }[] = [
  { value: 'HALF_SLIDE_LEFT', label: 'Half Slide Left', description: 'C/LG/LT slide left, RG/RT man' },
  { value: 'HALF_SLIDE_RIGHT', label: 'Half Slide Right', description: 'C/RG/RT slide right, LG/LT man' },
  { value: 'FULL_SLIDE_LEFT', label: 'Full Slide Left', description: 'All 5 OL slide left' },
  { value: 'FULL_SLIDE_RIGHT', label: 'Full Slide Right', description: 'All 5 OL slide right' },
  { value: 'MAN_PROTECTION', label: 'Man', description: 'Everyone man blocks' },
  { value: 'MAX_PROTECT', label: 'Max Protect', description: 'Extra blockers stay in' },
];

const RUN_BLOCKING_SCHEMES: { value: RunBlockingScheme; label: string; description: string }[] = [
  { value: 'INSIDE_ZONE', label: 'Inside Zone', description: 'Zone blocking, RB reads playside' },
  { value: 'OUTSIDE_ZONE', label: 'Outside Zone', description: 'Stretch play, reach blocks' },
  { value: 'POWER', label: 'Power', description: 'Guard pulls, kick out DE' },
  { value: 'COUNTER', label: 'Counter', description: 'Guard and tackle pull' },
  { value: 'TRAP', label: 'Trap', description: 'Pull guard traps DT' },
  { value: 'DUO', label: 'Duo', description: 'Double teams on DTs' },
];

export const ProtectionPicker: React.FC<ProtectionPickerProps> = ({
  playType,
  protectionScheme,
  runBlockingScheme,
  onProtectionChange,
  onRunBlockingChange,
}) => {
  if (playType === 'PASS') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Protection</label>
        <div className="grid grid-cols-2 gap-2">
          {PROTECTION_SCHEMES.map((scheme) => (
            <button
              key={scheme.value}
              onClick={() => onProtectionChange(scheme.value)}
              className={`p-2 rounded text-left transition-colors ${
                protectionScheme === scheme.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={scheme.description}
            >
              <div className="font-medium text-sm">{scheme.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">Blocking Scheme</label>
      <div className="grid grid-cols-2 gap-2">
        {RUN_BLOCKING_SCHEMES.map((scheme) => (
          <button
            key={scheme.value}
            onClick={() => onRunBlockingChange(scheme.value)}
            className={`p-2 rounded text-left transition-colors ${
              runBlockingScheme === scheme.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={scheme.description}
          >
            <div className="font-medium text-sm">{scheme.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
