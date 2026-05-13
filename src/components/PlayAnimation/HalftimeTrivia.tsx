/**
 * HalftimeTrivia — multi-choice trivia card shown during halftime.
 *
 * Player picks an answer; the card reveals correct + applies a small buff
 * (right) or debuff (wrong) to the 2nd half. The fun is in the absurdity
 * of the questions; the stake is small enough that wrong-answer pain is
 * a chuckle, not a punishment.
 */

import React, { useState } from 'react';
import type { TriviaQuestion, TriviaStake } from '../../data/halftimeTrivia';
import { describeStake } from '../../data/halftimeTrivia';

interface HalftimeTriviaProps {
  question: TriviaQuestion;
  stake: TriviaStake;
  /** Fired when the user picks an option. Parent computes the effect. */
  onAnswer: (selectedIndex: number, isCorrect: boolean) => void;
  /** Set by the parent after onAnswer to lock the card into reveal state. */
  revealed: boolean;
  /** What the user picked (set externally after onAnswer for stability). */
  selectedIndex: number | null;
}

export const HalftimeTrivia: React.FC<HalftimeTriviaProps> = ({
  question,
  stake,
  onAnswer,
  revealed,
  selectedIndex,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const stakeLabels = describeStake(stake);
  const isCorrect = selectedIndex !== null && selectedIndex === question.correctIndex;

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#1c1917',
        border: '2px solid #d4a056',
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 9, color: '#d4a056', letterSpacing: 2, fontWeight: 700 }}>
          HALFTIME TRIVIA
        </span>
        <span style={{ fontSize: 9, color: '#78716c', fontStyle: 'italic' }}>
          obscure-fact division
        </span>
      </div>

      <div style={{ fontSize: 14, color: '#e8e4d9', fontWeight: 600, lineHeight: 1.3 }}>
        {question.question}
      </div>

      {!revealed && (
        <div
          style={{
            fontSize: 11,
            color: '#a8a29e',
            padding: '6px 8px',
            backgroundColor: 'rgba(212, 160, 86, 0.08)',
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div><span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> {stakeLabels.right}</div>
          <div><span style={{ color: '#ef4444', fontWeight: 700 }}>✗</span> {stakeLabels.wrong}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {question.options.map((opt, i) => {
          const isPicked = selectedIndex === i;
          const isAnswer = i === question.correctIndex;
          let bg = '#292524';
          let border = '#44403c';
          let color = '#e8e4d9';
          if (revealed) {
            if (isAnswer) {
              bg = '#065f46';
              border = '#22c55e';
            } else if (isPicked && !isAnswer) {
              bg = '#7f1d1d';
              border = '#ef4444';
            } else {
              bg = '#1c1917';
              color = '#78716c';
            }
          } else if (hovered === i) {
            bg = '#3c3835';
          }
          return (
            <button
              key={i}
              onClick={() => { if (!revealed) onAnswer(i, i === question.correctIndex); }}
              disabled={revealed}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: '100%',
                minHeight: 40,
                padding: '8px 12px',
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
                alignItems: 'center',
                gap: 8,
              }}
            >
              {revealed && isAnswer && <span style={{ color: '#22c55e' }}>✓</span>}
              {revealed && isPicked && !isAnswer && <span style={{ color: '#ef4444' }}>✗</span>}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: isCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
            borderLeft: `3px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
            borderRadius: 4,
            fontSize: 11,
            color: '#d6d3d1',
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 700, color: isCorrect ? '#22c55e' : '#ef4444', marginBottom: 2 }}>
            {isCorrect ? `${stakeLabels.right}` : `${stakeLabels.wrong}`}
          </div>
          <div style={{ fontStyle: 'italic' }}>{question.funFact}</div>
        </div>
      )}
    </div>
  );
};

export default HalftimeTrivia;
