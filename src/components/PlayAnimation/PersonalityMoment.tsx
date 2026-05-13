/**
 * PersonalityMoment — character-driven interrupt between drives.
 *
 * Renders the prompt and 2–3 response options. User picks one; the card
 * locks into reveal state showing the choice + its effect. Parent gates
 * the "Opponent's Turn" button on selectedIndex !== null.
 */

import React from 'react';
import type { PersonalityMoment as Moment } from '../../data/personalityMoments';
import { effectSummary } from '../../data/personalityMoments';

interface PersonalityMomentProps {
  moment: Moment;
  /** Set by the parent after the user picks; null = unanswered. */
  selectedIndex: number | null;
  onChoose: (index: number) => void;
}

export const PersonalityMoment: React.FC<PersonalityMomentProps> = ({
  moment,
  selectedIndex,
  onChoose,
}) => {
  const revealed = selectedIndex !== null;

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#1c1917',
        border: '2px solid #8b0000',
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 9, color: '#dc2626', letterSpacing: 2, fontWeight: 700 }}>
          PERSONALITY
        </span>
        <span style={{ fontSize: 9, color: '#78716c', fontStyle: 'italic' }}>
          sideline interrupt
        </span>
      </div>

      <div style={{ fontSize: 13, color: '#e8e4d9', fontWeight: 600, lineHeight: 1.35 }}>
        {moment.prompt}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {moment.options.map((opt, i) => {
          const isPicked = selectedIndex === i;
          let bg = '#292524';
          let border = '#44403c';
          let color = '#e8e4d9';
          let labelColor = '#fbbf24';
          if (revealed) {
            if (isPicked) {
              bg = '#1e3a8a';
              border = '#3b82f6';
            } else {
              bg = '#1c1917';
              color = '#78716c';
              labelColor = '#78716c';
            }
          }
          return (
            <button
              key={i}
              onClick={() => { if (!revealed) onChoose(i); }}
              disabled={revealed}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: bg,
                color,
                border: `2px solid ${border}`,
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'left',
                cursor: revealed ? 'default' : 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ color: labelColor, fontWeight: 800 }}>{opt.label}</div>
              <div style={{ fontSize: 10, color: revealed && !isPicked ? '#52525b' : '#a8a29e', fontStyle: 'italic' }}>
                {opt.flavor}
              </div>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: 'rgba(59,130,246,0.12)',
            borderLeft: '3px solid #3b82f6',
            borderRadius: 4,
            fontSize: 11,
            color: '#dbeafe',
          }}
        >
          <strong>{moment.options[selectedIndex!].label}</strong> — {effectSummary(moment.options[selectedIndex!].effect)}.
        </div>
      )}
    </div>
  );
};

export default PersonalityMoment;
