import React from 'react';

interface ControlDeckProps {
  // Game state
  phase: string;
  isPreSnap: boolean;
  isPlayRunning: boolean;
  isPlayDead: boolean;
  selectedPlayName?: string;
  isUserOffense: boolean; // Whether user's team has possession

  // Field position
  down: number;
  yardsToGo: number;
  yardLine: number;

  // Kicking states
  pendingPAT: boolean;
  pendingKickoff: boolean;
  isFourthDown: boolean;
  inFGRange: boolean;
  fieldGoalDistance?: number;

  // Last play result
  lastResult?: {
    touchdown?: boolean;
    incomplete?: boolean;
    sack?: boolean;
    turnover?: boolean;
    turnoverType?: string;
    safety?: boolean;
    yardsGained: number;
  };
  userTeamName: string;
  oppTeamName: string;
  lastKickResult?: {
    type: string;
    success: boolean;
    distance?: number;
  };

  // Callbacks
  onCallPlay: () => void;
  onSnap: () => void;
  onNextPlay: () => void;
  onPAT: () => void;
  onTwoPoint: () => void;
  onKickoff: () => void;
  onPunt: () => void;
  onFieldGoal: () => void;
  onJuke: () => void;
  onSpin: () => void;
  onDive: () => void;
  onSimulateCPU?: () => void; // Simulate CPU offense play

  // Ball carrier info
  ballCarrier?: string;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  phase,
  isPreSnap,
  isPlayRunning,
  isPlayDead,
  selectedPlayName,
  isUserOffense,
  down,
  yardsToGo,
  yardLine,
  pendingPAT,
  pendingKickoff,
  isFourthDown,
  inFGRange,
  fieldGoalDistance,
  lastResult,
  userTeamName,
  oppTeamName,
  lastKickResult,
  onCallPlay,
  onSnap,
  onNextPlay,
  onPAT,
  onTwoPoint,
  onKickoff,
  onPunt,
  onFieldGoal,
  onJuke,
  onSpin,
  onDive,
  onSimulateCPU,
  ballCarrier,
}) => {
  const getDownSuffix = (d: number) => {
    if (d === 1) return 'ST';
    if (d === 2) return 'ND';
    if (d === 3) return 'RD';
    return 'TH';
  };

  const getYardLineText = (yl: number) => {
    if (yl === 50) return '50';
    if (yl > 50) return `OPP ${100 - yl}`;
    return `OWN ${yl}`;
  };

  const getLastPlayText = () => {
    if (!lastResult) return null;
    // When on defense, good/bad is reversed from the result perspective
    if (isUserOffense) {
      // User was on offense
      if (lastResult.touchdown) return { text: `TOUCHDOWN! ${userTeamName} SCORES!`, type: 'success' };
      if (lastResult.incomplete) return { text: 'INCOMPLETE PASS', type: 'neutral' };
      if (lastResult.sack) return { text: `SACK! ${lastResult.yardsGained} YARDS`, type: 'danger' };
      if (lastResult.turnover) return { text: `TURNOVER - ${lastResult.turnoverType}`, type: 'danger' };
      if (lastResult.safety) return { text: `SAFETY! ${oppTeamName} +2`, type: 'danger' };
      const prefix = lastResult.yardsGained >= 0 ? '+' : '';
      const type = lastResult.yardsGained > 5 ? 'success' : lastResult.yardsGained >= 0 ? 'neutral' : 'danger';
      return { text: `${prefix}${lastResult.yardsGained} YARDS`, type };
    } else {
      // User was on defense - reverse the colors
      if (lastResult.touchdown) return { text: `TOUCHDOWN! ${oppTeamName} SCORES!`, type: 'danger' };
      if (lastResult.incomplete) return { text: 'INCOMPLETE - GOOD D!', type: 'success' };
      if (lastResult.sack) return { text: `SACK! ${Math.abs(lastResult.yardsGained)} YARD LOSS!`, type: 'success' };
      if (lastResult.turnover) return { text: `TURNOVER! ${lastResult.turnoverType}!`, type: 'success' };
      if (lastResult.safety) return { text: `SAFETY! ${userTeamName} +2`, type: 'success' };
      const yards = lastResult.yardsGained;
      const type = yards <= 0 ? 'success' : yards <= 3 ? 'neutral' : 'danger';
      const prefix = yards >= 0 ? '+' : '';
      return { text: `${oppTeamName} ${prefix}${yards} YARDS`, type };
    }
  };

  const lastPlayInfo = getLastPlayText();

  return (
    <div className="bg-black/90 backdrop-blur-lg border-t border-white/10 shadow-2xl">
      <div className="max-w-6xl mx-auto px-6 py-4">
        {/* Last Play Result Toast */}
        {isPlayDead && lastPlayInfo && (
          <div className="flex justify-center mb-4">
            <div className={`
              px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider
              ${lastPlayInfo.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}
              ${lastPlayInfo.type === 'danger' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}
              ${lastPlayInfo.type === 'neutral' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' : ''}
              animate-pulse
            `}>
              {lastPlayInfo.text}
            </div>
          </div>
        )}

        {/* Kick result */}
        {isPreSnap && pendingKickoff && !pendingPAT && lastKickResult && (
          <div className="flex justify-center mb-4">
            <div className={`
              px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider
              ${lastKickResult.success ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}
            `}>
              {lastKickResult.type === 'PAT' && (lastKickResult.success ? 'EXTRA POINT GOOD!' : 'EXTRA POINT MISSED')}
              {lastKickResult.type === 'TWO_POINT' && (lastKickResult.success ? '2-POINT CONVERSION!' : '2-POINT FAILED')}
              {lastKickResult.type === 'FIELD_GOAL' && (lastKickResult.success ? `${lastKickResult.distance}YD FIELD GOAL GOOD!` : 'FIELD GOAL MISSED')}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-8">
          {/* Left - Down & Distance */}
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-700">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white tabular-nums">
                    {down}
                  </span>
                  <span className="text-xl font-bold text-slate-400">
                    {getDownSuffix(down)}
                  </span>
                  <span className="text-2xl font-bold text-slate-500 mx-2">&</span>
                  <span className="text-4xl font-black text-yellow-400 tabular-nums">
                    {yardsToGo}
                  </span>
                </div>
              </div>
              <div className="text-slate-400 text-sm">
                Ball on <span className="text-white font-semibold">{getYardLineText(yardLine)}</span>
              </div>
            </div>
          </div>

          {/* Center - Main Actions */}
          <div className="flex items-center gap-3">
            {/* PAT Choice */}
            {isPreSnap && pendingPAT && (
              <>
                <button
                  onClick={onPAT}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-lg shadow-lg shadow-green-500/25 transition-all hover:scale-105"
                >
                  XP (1 PT)
                </button>
                <button
                  onClick={onTwoPoint}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-lg shadow-lg shadow-orange-500/25 transition-all hover:scale-105"
                >
                  2-PT CONV
                </button>
              </>
            )}

            {/* Kickoff */}
            {isPreSnap && pendingKickoff && !pendingPAT && (
              <button
                onClick={onKickoff}
                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/25 transition-all hover:scale-105"
              >
                KICKOFF
              </button>
            )}

            {/* Normal Pre-Snap - OFFENSE */}
            {isPreSnap && !pendingKickoff && !pendingPAT && isUserOffense && (
              <>
                <button
                  onClick={onCallPlay}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg border border-slate-600 transition-all"
                >
                  CALL PLAY
                </button>

                {selectedPlayName && (
                  <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="text-xs text-slate-500 uppercase">Selected</div>
                    <div className="text-white font-bold">{selectedPlayName}</div>
                  </div>
                )}

                <button
                  onClick={onSnap}
                  disabled={!selectedPlayName}
                  className={`
                    px-8 py-3 font-bold rounded-lg shadow-lg transition-all hover:scale-105
                    ${selectedPlayName
                      ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-green-500/25'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    }
                  `}
                >
                  SNAP!
                </button>
              </>
            )}

            {/* Normal Pre-Snap - DEFENSE */}
            {isPreSnap && !pendingKickoff && !pendingPAT && !isUserOffense && (
              <>
                <div className="px-4 py-2 bg-red-500/20 rounded-lg border border-red-500/30">
                  <div className="text-xs text-red-400 uppercase font-bold">ON DEFENSE</div>
                  <div className="text-red-300 text-sm">{oppTeamName} has the ball</div>
                </div>

                <button
                  onClick={onSimulateCPU}
                  className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-lg shadow-lg shadow-red-500/25 transition-all hover:scale-105"
                >
                  RUN CPU PLAY
                </button>
              </>
            )}

            {/* 4th Down Options - Only show on offense */}
            {isPreSnap && !pendingKickoff && !pendingPAT && isFourthDown && isUserOffense && (
              <div className="flex items-center gap-2 ml-2 pl-4 border-l border-slate-700">
                {inFGRange && (
                  <button
                    onClick={onFieldGoal}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-bold rounded-lg text-sm shadow-lg shadow-yellow-500/25 transition-all hover:scale-105"
                  >
                    FG ({fieldGoalDistance}yd)
                  </button>
                )}
                <button
                  onClick={onPunt}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-sm border border-slate-600 transition-all"
                >
                  PUNT
                </button>
              </div>
            )}

            {/* Play Running - Evasion Controls */}
            {isPlayRunning && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onJuke}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm transition-all"
                >
                  JUKE [Q]
                </button>
                <button
                  onClick={onSpin}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-all"
                >
                  SPIN [E]
                </button>
                <button
                  onClick={onDive}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-all"
                >
                  DIVE [SPACE]
                </button>
              </div>
            )}

            {/* Play Dead - Next Play */}
            {isPlayDead && (
              <button
                onClick={onNextPlay}
                className="px-10 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-lg shadow-lg shadow-blue-500/25 transition-all hover:scale-105 text-lg"
              >
                NEXT PLAY
              </button>
            )}
          </div>

          {/* Right - Phase Indicator & Controls Help */}
          <div className="flex-1 flex justify-end">
            <div className="text-right">
              {/* Offense/Defense indicator */}
              <div className={`
                inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 mr-2
                ${isUserOffense
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'}
              `}>
                {isUserOffense ? 'OFFENSE' : 'DEFENSE'}
              </div>
              <div className={`
                inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2
                ${phase === 'HUDDLE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : ''}
                ${phase === 'BREAKING_HUDDLE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse' : ''}
                ${phase === 'PRE_SNAP' ? 'bg-slate-700 text-slate-300' : ''}
                ${phase === 'SNAP' || phase === 'ACTIVE' ? 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse' : ''}
                ${phase === 'WHISTLE' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : ''}
              `}>
                {pendingPAT ? 'EXTRA POINT' : pendingKickoff ? 'KICKOFF' :
                  phase === 'BREAKING_HUDDLE' ? 'BREAK!' : phase.replace('_', ' ')}
              </div>
              {isPlayRunning && isUserOffense && (
                <div className="text-xs text-slate-500">
                  <div>WASD/Arrows to move</div>
                  <div>SHIFT to sprint</div>
                  {ballCarrier?.toLowerCase() === 'qb' && (
                    <div className="text-yellow-400">Click field to throw</div>
                  )}
                </div>
              )}
              {isPlayRunning && !isUserOffense && (
                <div className="text-xs text-slate-500">
                  <div className="text-red-400">CPU has the ball</div>
                  <div>Watch the play unfold</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
