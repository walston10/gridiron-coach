/**
 * DefensePicker — compact row of defensive scheme cards.
 *
 * Used by the Key Frame slice to cycle through different defenses against
 * the same play. Tapping a card sets it as the active defense; the parent
 * re-loads the play so branches are re-simulated against the new look.
 */

import React from 'react';
import type { DefensiveCard } from '../../types/card.types';

interface DefensePickerProps {
  defenses: DefensiveCard[];
  activeId: string;
  onPick: (defense: DefensiveCard) => void;
}

/** Color hint per playType so each card is visually distinct at a glance. */
function paletteFor(playType: string): { bg: string; border: string; accent: string } {
  switch (playType) {
    case 'BLITZ':
    case 'ZONE_BLITZ':
      return { bg: '#7f1d1d', border: '#ef4444', accent: '#fca5a5' };
    case 'PRESS_COVERAGE':
    case 'MAN_COVERAGE':
      return { bg: '#7c2d12', border: '#f97316', accent: '#fdba74' };
    case 'STACK_THE_BOX':
    case 'GOAL_LINE_STAND':
      return { bg: '#581c87', border: '#a855f7', accent: '#d8b4fe' };
    case 'PREVENT':
    case 'DEEP_ZONE':
      return { bg: '#164e63', border: '#06b6d4', accent: '#67e8f9' };
    case 'ZONE_COVERAGE':
    default:
      return { bg: '#1e3a8a', border: '#3b82f6', accent: '#93c5fd' };
  }
}

export const DefensePicker: React.FC<DefensePickerProps> = ({
  defenses,
  activeId,
  onPick,
}) => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: 1 }}>
        DEFENSE
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        {defenses.map(d => {
          const isActive = d.id === activeId;
          const palette = paletteFor(d.playType);

          return (
            <button
              key={d.id}
              onClick={() => onPick(d)}
              style={{
                flex: '1 1 30%',
                minWidth: 96,
                minHeight: 44,
                padding: '6px 8px',
                backgroundColor: isActive ? palette.bg : '#1f2937',
                color: isActive ? '#ffffff' : '#d1d5db',
                border: `2px solid ${isActive ? palette.border : '#374151'}`,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                lineHeight: 1.1,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 12 }}>{d.name}</div>
              <div style={{ fontSize: 9, opacity: 0.75, marginTop: 2, color: isActive ? palette.accent : undefined }}>
                {d.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DefensePicker;
