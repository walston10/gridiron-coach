import React from 'react';
import type { PlayerAssignment } from '../../types';

interface ValidationPanelProps {
  assignments: PlayerAssignment[];
  playType: 'RUN' | 'PASS';
}

interface ValidationError {
  type: 'error' | 'warning';
  message: string;
}

function validatePlay(assignments: PlayerAssignment[], playType: 'RUN' | 'PASS'): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for 11 players
  if (assignments.length !== 11) {
    errors.push({
      type: 'error',
      message: `Must have 11 players (currently ${assignments.length})`,
    });
  }

  // Check players on line of scrimmage
  const onLine = assignments.filter((a) => a.isOnLine);
  if (onLine.length !== 7) {
    errors.push({
      type: 'error',
      message: `Must have 7 players on the line (currently ${onLine.length})`,
    });
  }

  // Check for QB
  const qb = assignments.find((a) => a.positionSlot === 'QB');
  if (!qb) {
    errors.push({
      type: 'error',
      message: 'No QB assigned',
    });
  }

  // Check ends of line are eligible
  if (onLine.length >= 7) {
    const sortedOnLine = [...onLine].sort((a, b) => a.startX - b.startX);
    const leftEnd = sortedOnLine[0];
    const rightEnd = sortedOnLine[sortedOnLine.length - 1];

    if (leftEnd && !leftEnd.canRunRoutes) {
      errors.push({
        type: 'error',
        message: `Left end of line (${leftEnd.label}) must be eligible receiver`,
      });
    }
    if (rightEnd && !rightEnd.canRunRoutes) {
      errors.push({
        type: 'error',
        message: `Right end of line (${rightEnd.label}) must be eligible receiver`,
      });
    }
  }

  // Pass play specific
  if (playType === 'PASS') {
    const receivers = assignments.filter((a) => a.canRunRoutes && a.route);
    if (receivers.length === 0) {
      errors.push({
        type: 'warning',
        message: 'No receivers have routes assigned',
      });
    }
  }

  // Run play specific
  if (playType === 'RUN') {
    const ballCarrier = assignments.find((a) => a.isBallCarrier);
    if (!ballCarrier) {
      errors.push({
        type: 'warning',
        message: 'No ball carrier designated',
      });
    }
  }

  return errors;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ assignments, playType }) => {
  const errors = validatePlay(assignments, playType);

  if (errors.length === 0) {
    return (
      <div className="p-3 bg-green-900/30 border border-green-700 rounded">
        <div className="flex items-center gap-2 text-green-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-medium">Play is valid</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {errors.map((error, index) => (
        <div
          key={index}
          className={`p-3 rounded flex items-start gap-2 ${
            error.type === 'error'
              ? 'bg-red-900/30 border border-red-700 text-red-400'
              : 'bg-yellow-900/30 border border-yellow-700 text-yellow-400'
          }`}
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {error.type === 'error' ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            )}
          </svg>
          <span>{error.message}</span>
        </div>
      ))}
    </div>
  );
};
