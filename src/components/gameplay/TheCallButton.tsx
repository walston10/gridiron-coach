/**
 * The Call Button
 *
 * "That's my guy in stripes." - Tex
 *
 * Subtle button in corner during live play.
 * Tap to influence the refs (at a cost).
 */

import React, { useState, useEffect } from 'react';
import { theCallSystem, type CallType, type CallResult } from '../../engine/theCallSystem';

interface TheCallButtonProps {
  /** Current slush fund balance */
  slushFundBalance: number;
  /** Current play situation for determining call type */
  playSituation: 'sack' | 'fumble' | 'touchdown' | 'big-gain' | 'normal';
  /** Callback when call is made */
  onCall?: (result: CallResult) => void;
  /** Whether button should be visible */
  visible?: boolean;
}

export const TheCallButton: React.FC<TheCallButtonProps> = ({
  slushFundBalance,
  playSituation,
  onCall,
  visible = true,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [lastResult, setLastResult] = useState<CallResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const state = theCallSystem.getState();
  const isAvailable = theCallSystem.isAvailable();

  // Map play situation to call type
  const getCallType = (): CallType | null => {
    switch (playSituation) {
      case 'sack':
        return 'turn-sack-to-roughing';
      case 'fumble':
        return 'turn-fumble-to-incomplete';
      case 'touchdown':
        return 'turn-td-to-holding';
      case 'big-gain':
        return 'turn-gain-to-penalty';
      default:
        return null;
    }
  };

  const callType = getCallType();
  const cost = callType ? theCallSystem.calculateCost(callType) : 0;
  const canAfford = slushFundBalance >= cost;

  const handlePress = () => {
    if (!isAvailable || !callType || !canAfford) return;

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    const result = theCallSystem.makeCall(callType, slushFundBalance);
    setLastResult(result);
    setShowResult(true);
    onCall?.(result);

    // Hide result after delay
    setTimeout(() => setShowResult(false), 3000);
  };

  if (!visible) return null;

  // Heat meter color
  const getHeatColor = () => {
    const heat = state.heatLevel;
    if (heat < 30) return '#4ade80'; // Green
    if (heat < 60) return '#facc15'; // Yellow
    if (heat < 80) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '1rem',
        right: '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.5rem',
        zIndex: 100,
      }}
    >
      {/* Result toast */}
      {showResult && lastResult && (
        <div
          style={{
            backgroundColor: lastResult.caught
              ? 'rgba(239, 68, 68, 0.95)'
              : lastResult.success
              ? 'rgba(34, 197, 94, 0.95)'
              : 'rgba(100, 100, 100, 0.95)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontStyle: 'italic',
            maxWidth: '200px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          "{lastResult.texLine}"
          {lastResult.success && (
            <div
              style={{
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                opacity: 0.8,
              }}
            >
              -${lastResult.cost.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Tooltip on hover/hold */}
      {showTooltip && callType && (
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            maxWidth: '180px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
            The Call
          </div>
          <div style={{ opacity: 0.8, marginBottom: '0.5rem' }}>
            {callType === 'turn-sack-to-roughing' && 'Turn sack into roughing the passer'}
            {callType === 'turn-fumble-to-incomplete' && 'Turn fumble into incomplete pass'}
            {callType === 'turn-td-to-holding' && 'Call holding to negate touchdown'}
            {callType === 'turn-gain-to-penalty' && 'Call penalty to negate big gain'}
          </div>
          <div style={{ color: canAfford ? '#4ade80' : '#ef4444' }}>
            Cost: ${cost.toLocaleString()}
          </div>
        </div>
      )}

      {/* Heat meter */}
      <div
        style={{
          width: '48px',
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${state.heatLevel}%`,
            height: '100%',
            backgroundColor: getHeatColor(),
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Main button */}
      <button
        onClick={handlePress}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(true)}
        onTouchEnd={() => {
          setShowTooltip(false);
          handlePress();
        }}
        disabled={!isAvailable || !callType || !canAfford}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isAvailable && callType && canAfford
            ? isPressed
              ? 'rgba(200, 150, 50, 0.9)'
              : 'rgba(180, 130, 40, 0.8)'
            : 'rgba(100, 100, 100, 0.5)',
          color: 'white',
          cursor: isAvailable && callType && canAfford ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isPressed
            ? 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.3)',
          transform: isPressed ? 'scale(0.95)' : 'scale(1)',
          transition: 'all 0.15s ease',
          opacity: playSituation === 'normal' ? 0.3 : 1,
        }}
      >
        {/* Phone/whistle icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>

      {/* CSS for animations */}
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default TheCallButton;
