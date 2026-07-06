/**
 * SpotlightCardView — a Spotlight card in the COMMIT rail (§3.2).
 *
 * A verb wearing a personality: rarity-colored, headlined by a roster player,
 * with the ego-hook stamp (the payoff for feeding them) and a neglect warning
 * when they're about to boil over. Tap / swipe-up commits, exactly like a verb
 * card — playing it fires the card's verb with the ego tier-shift bonus.
 */

import React, { useRef, useState } from 'react';
import type { SpotlightCard, SpotlightPlayerState } from '../../engine/spotlightGenerator';
import { effectiveTierShift } from '../../engine/spotlightGenerator';
import { VERB_DEFS } from '../../data/verbs';
import { rarityColor, rarityLabel, spotlightBonusStamp } from './copy';

interface SpotlightCardViewProps {
  card: SpotlightCard;
  playerState: SpotlightPlayerState;
  used: boolean;
  disabled: boolean;
  onCommit: () => void;
}

const COMMIT_THRESHOLD = 48;

export const SpotlightCardView: React.FC<SpotlightCardViewProps> = ({
  card,
  playerState,
  used,
  disabled,
  onCommit,
}) => {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  const color = rarityColor(card.rarity);
  const shift = effectiveTierShift(card, playerState);
  const inert = disabled || used;
  // Neglect warning once they've been ignored at least once and one more will bite.
  const aboutToBoil =
    !used && playerState.neglectStreak > 0 && playerState.neglectStreak >= card.hook.neglectLimit - 1;

  const onPointerDown = (e: React.PointerEvent) => {
    if (inert) return;
    startYRef.current = e.clientY;
    movedRef.current = false;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startYRef.current === null) return;
    const dy = e.clientY - startYRef.current;
    if (Math.abs(dy) > 4) movedRef.current = true;
    setDragY(Math.min(0, dy));
  };
  const onPointerUp = () => {
    if (startYRef.current === null) return;
    const committed = -dragY >= COMMIT_THRESHOLD;
    startYRef.current = null;
    setDragging(false);
    setDragY(0);
    if (committed && !inert) onCommit();
  };
  const onClick = () => {
    if (inert) return;
    if (!movedRef.current) onCommit();
  };

  const armed = -dragY >= COMMIT_THRESHOLD;

  return (
    <button
      type="button"
      disabled={inert}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      className={`relative flex-1 min-w-0 touch-none rounded-lg border-2 p-2 text-left ${
        used ? 'opacity-40' : disabled ? 'opacity-50' : 'cursor-pointer'
      }`}
      style={{
        borderColor: armed ? '#fbbf24' : color,
        background: `linear-gradient(160deg, ${color}22, rgba(17,24,39,0.95))`,
        transform: `translateY(${dragY}px)`,
        transition: dragging ? 'none' : 'transform 160ms ease-out',
        boxShadow: armed ? '0 -6px 18px rgba(251,191,36,0.35)' : `0 0 10px ${color}33`,
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className="text-[8px] font-black uppercase tracking-widest"
          style={{ color }}
        >
          ⭐ {rarityLabel(card.rarity)}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
          {VERB_DEFS[card.verb].label}
        </span>
      </div>

      <div className="mt-0.5 text-xs font-black uppercase leading-tight text-white">
        {used ? 'FED ✓' : card.name}
      </div>

      <div className="mt-0.5 text-[9px] leading-tight text-gray-400 line-clamp-2">
        {card.flavor}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span
          className="rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-wider"
          style={{ backgroundColor: `${color}33`, color }}
        >
          {spotlightBonusStamp(shift)}
        </span>
        {aboutToBoil && (
          <span className="text-[8px] font-black uppercase tracking-wider text-red-400 animate-pulse">
            😤 feed me
          </span>
        )}
      </div>
    </button>
  );
};

export default SpotlightCardView;
