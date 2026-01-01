import React, { useCallback, useState, useRef } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameHUD } from './GameHUD';
import { PlaySelector } from './PlaySelector';
import { useFullGame, useInputHandler } from '../../hooks';
import type { OffensivePlay, DefensivePlay, Vector2 } from '../../types/GameSim';
import type { GamePhase } from '../../engine/GameManager';

interface FullGameViewProps {
  homeTeam?: string;
  awayTeam?: string;
  userTeam?: 'home' | 'away';
  onGameEnd?: (homeScore: number, awayScore: number) => void;
}

export const FullGameView: React.FC<FullGameViewProps> = ({
  homeTeam = 'Moles',
  awayTeam = 'Empire',
  userTeam = 'home',
  onGameEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    playState,
    managerState,
    isUserOnOffense,
    lastKickResult,
    offensivePlaybook,
    defensivePlaybook,
    coinToss,
    executeKickoff,
    endHalftime,
    selectPlay,
    snap,
    moveBallCarrier,
    throwToSpot,
    handoff,
    nextPlay,
    selectPunt,
    selectFieldGoal,
    executePunt,
    attemptFieldGoal,
    cancelSpecialTeams,
    choosePAT,
    chooseTwoPoint,
    executePAT,
    isInFieldGoalRange,
  } = useFullGame(userTeam);

  const [selectedPlay, setSelectedPlay] = useState<OffensivePlay | DefensivePlay | null>(null);

  const gamePhase = managerState?.gamePhase ?? 'COIN_TOSS';
  const isPreSnap = playState?.phase === 'PRE_SNAP';
  const isLive = playState?.phase === 'SNAP' || playState?.phase === 'ACTIVE';
  const isPlayOver = playState?.phase === 'WHISTLE';
  const isQBWithBall = playState?.ballCarrier === 'qb' && playState?.phase === 'SNAP';
  const isBallInAir = !!playState?.passFlight;

  // Handle play selection
  const handleSelectPlay = useCallback((play: OffensivePlay | DefensivePlay) => {
    setSelectedPlay(play);
    selectPlay(play);
  }, [selectPlay]);

  // Handle snap
  const handleSnap = useCallback(() => {
    if (selectedPlay) {
      snap();
    }
  }, [selectedPlay, snap]);

  // Handle next play - sync with manager
  const handleNextPlay = useCallback(() => {
    setSelectedPlay(null);
    nextPlay();
  }, [nextPlay]);

  // Handle field click (for throwing)
  const handleFieldClick = useCallback((location: Vector2) => {
    if (isQBWithBall && isUserOnOffense) {
      throwToSpot(location);
    }
  }, [isQBWithBall, isUserOnOffense, throwToSpot]);

  // Handle handoff
  const handleHandoff = useCallback(() => {
    handoff();
  }, [handoff]);

  // Input handler for keyboard controls (only during PLAY phase)
  useInputHandler({
    canvasRef,
    onMove: moveBallCarrier,
    onSnap: handleSnap,
    onThrow: () => {},
    onHandoff: handleHandoff,
    onNextPlay: handleNextPlay,
    phase: playState?.phase ?? 'PRE_SNAP',
    enabled: gamePhase === 'PLAY' && !isBallInAir && isUserOnOffense,
  });

  // Game end callback
  React.useEffect(() => {
    if (gamePhase === 'GAME_OVER' && managerState && onGameEnd) {
      onGameEnd(managerState.homeScore, managerState.awayScore);
    }
  }, [gamePhase, managerState, onGameEnd]);

  // Render based on game phase
  const renderPhaseContent = () => {
    switch (gamePhase) {
      case 'COIN_TOSS':
        return <CoinTossScreen onChoice={coinToss} userTeam={userTeam} />;

      case 'KICKOFF':
        return (
          <KickoffScreen
            onKickoff={executeKickoff}
            lastResult={lastKickResult}
            possession={managerState?.possession}
            userTeam={userTeam}
          />
        );

      case 'HALFTIME':
        return (
          <HalftimeScreen
            homeScore={managerState?.homeScore ?? 0}
            awayScore={managerState?.awayScore ?? 0}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            onContinue={endHalftime}
          />
        );

      case 'PAT_DECISION':
        return <PATDecisionScreen onPAT={choosePAT} onTwoPoint={chooseTwoPoint} />;

      case 'PAT':
        return <PATScreen onKick={executePAT} lastResult={lastKickResult} />;

      case 'FIELD_GOAL':
        return (
          <FieldGoalScreen
            onKick={attemptFieldGoal}
            onCancel={cancelSpecialTeams}
            yardLine={managerState?.field.yardLine ?? 50}
            lastResult={lastKickResult}
          />
        );

      case 'PUNT':
        return (
          <PuntScreen
            onPunt={executePunt}
            onCancel={cancelSpecialTeams}
            lastResult={lastKickResult}
          />
        );

      case 'GAME_OVER':
        return (
          <GameOverScreen
            homeScore={managerState?.homeScore ?? 0}
            awayScore={managerState?.awayScore ?? 0}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            userTeam={userTeam}
          />
        );

      case 'PLAY':
      default:
        return renderPlayPhase();
    }
  };

  // Render the main play phase (field + controls)
  const renderPlayPhase = () => (
    <div className="flex gap-4">
      {/* Left side - Field */}
      <div className="flex-1">
        <GameCanvas
          ref={canvasRef}
          gameState={playState}
          onFieldClick={handleFieldClick}
          width={400}
          height={720}
        />

        {/* Keyboard hints */}
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          {isPreSnap && selectedPlay && <div>SPACE to snap</div>}
          {isPreSnap && !selectedPlay && (
            <div className="text-yellow-500">Select a play first</div>
          )}
          {isQBWithBall && isUserOnOffense && (
            <div>
              <span className="text-yellow-400">Click to throw</span> • E handoff • WASD move • SHIFT sprint
            </div>
          )}
          {isLive && !isQBWithBall && !isBallInAir && isUserOnOffense && (
            <div>WASD to move • SHIFT to sprint</div>
          )}
          {isBallInAir && (
            <div className="text-yellow-400">Ball in the air...</div>
          )}
          {isPlayOver && <div>ENTER for next play</div>}
        </div>
      </div>

      {/* Right side - Controls */}
      <div className="w-80 space-y-4">
        <GameHUD
          gameState={playState}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />

        {/* Score display from manager */}
        {managerState && (
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">
              {managerState.homeScore} - {managerState.awayScore}
            </div>
            <div className="text-xs text-gray-400">
              Q{managerState.quarter} • {managerState.clock.minutes}:{managerState.clock.seconds.toString().padStart(2, '0')}
            </div>
          </div>
        )}

        {/* Play selector */}
        {isPreSnap && (
          <>
            <PlaySelector
              plays={isUserOnOffense ? offensivePlaybook : defensivePlaybook}
              selectedPlay={selectedPlay}
              onSelectPlay={handleSelectPlay}
              onSnap={handleSnap}
              disabled={!isPreSnap}
            />

            {/* Special teams options (4th down) */}
            {isUserOnOffense && managerState?.field.down === 4 && (
              <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                <div className="text-sm text-gray-400 font-bold">4th Down Options</div>
                <div className="flex gap-2">
                  <button
                    onClick={selectPunt}
                    className="flex-1 p-2 bg-yellow-800 hover:bg-yellow-700 rounded text-white text-sm"
                  >
                    Punt
                  </button>
                  {isInFieldGoalRange && (
                    <button
                      onClick={selectFieldGoal}
                      className="flex-1 p-2 bg-green-800 hover:bg-green-700 rounded text-white text-sm"
                    >
                      Field Goal
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* QB Options */}
        {isQBWithBall && isUserOnOffense && (
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-white font-bold mb-2">QB Options</div>
            <div className="text-sm text-gray-400 mb-3">
              Click anywhere on the field to throw
            </div>
            <button
              onClick={handleHandoff}
              className="w-full p-2 bg-green-800 hover:bg-green-700 rounded text-white mb-2"
            >
              <span className="text-yellow-400 font-mono mr-2">E</span>
              Handoff to RB
            </button>
          </div>
        )}

        {/* Ball in air */}
        {isBallInAir && playState?.passFlight && (
          <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
            <div className="text-yellow-400 font-bold">Pass in Flight!</div>
          </div>
        )}

        {/* Play result / next play */}
        {isPlayOver && playState?.lastResult && (
          <div className="bg-gray-900 rounded-lg p-4">
            <PlayResultDisplay result={playState.lastResult} />
            <button
              onClick={handleNextPlay}
              className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg"
            >
              Next Play (Enter)
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">
            {awayTeam} @ {homeTeam}
          </h1>
          <div className="text-sm text-gray-400">
            {userTeam === 'home' ? `You are ${homeTeam}` : `You are ${awayTeam}`}
          </div>
        </div>

        {renderPhaseContent()}
      </div>
    </div>
  );
};

// === Sub-components for each phase ===

interface CoinTossScreenProps {
  onChoice: (userReceives: boolean) => void;
  userTeam: 'home' | 'away';
}

const CoinTossScreen: React.FC<CoinTossScreenProps> = ({ onChoice }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg p-8">
    <div className="text-4xl mb-8">🪙</div>
    <h2 className="text-2xl font-bold text-white mb-4">Coin Toss</h2>
    <p className="text-gray-400 mb-8">Do you want to receive the opening kickoff?</p>
    <div className="flex gap-4">
      <button
        onClick={() => onChoice(true)}
        className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-lg"
      >
        Receive
      </button>
      <button
        onClick={() => onChoice(false)}
        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-lg"
      >
        Kick
      </button>
    </div>
  </div>
);

interface KickoffScreenProps {
  onKickoff: () => void;
  lastResult: import('../../engine/KickingEngine').KickResult | null;
  possession?: 'home' | 'away';
  userTeam: 'home' | 'away';
}

const KickoffScreen: React.FC<KickoffScreenProps> = ({ onKickoff, lastResult, possession, userTeam }) => {
  const isUserKicking = possession === userTeam;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg p-8">
      <div className="text-4xl mb-8">🏈</div>
      <h2 className="text-2xl font-bold text-white mb-4">Kickoff</h2>
      <p className="text-gray-400 mb-8">
        {isUserKicking ? "You're kicking off" : "You're receiving the kickoff"}
      </p>

      {lastResult && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg text-center">
          <div className="text-white">
            {lastResult.touchback
              ? 'Touchback! Ball at the 25'
              : `Returned to the ${lastResult.newYardLine} yard line`}
          </div>
          {lastResult.returnYards && (
            <div className="text-sm text-gray-400">
              {lastResult.returnYards} yard return
            </div>
          )}
        </div>
      )}

      <button
        onClick={onKickoff}
        className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg text-lg"
      >
        {lastResult ? 'Continue' : 'Kick Off'}
      </button>
    </div>
  );
};

interface HalftimeScreenProps {
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  onContinue: () => void;
}

const HalftimeScreen: React.FC<HalftimeScreenProps> = ({
  homeScore,
  awayScore,
  homeTeam,
  awayTeam,
  onContinue,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg p-8">
    <h2 className="text-3xl font-bold text-white mb-8">Halftime</h2>
    <div className="text-5xl font-bold text-white mb-4">
      {homeScore} - {awayScore}
    </div>
    <div className="text-gray-400 mb-8">
      {homeTeam} vs {awayTeam}
    </div>
    <button
      onClick={onContinue}
      className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-lg"
    >
      Start 2nd Half
    </button>
  </div>
);

interface PATDecisionScreenProps {
  onPAT: () => void;
  onTwoPoint: () => void;
}

const PATDecisionScreen: React.FC<PATDecisionScreenProps> = ({ onPAT, onTwoPoint }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg p-8">
    <div className="text-4xl mb-8">🎉</div>
    <h2 className="text-3xl font-bold text-green-400 mb-4">TOUCHDOWN!</h2>
    <p className="text-gray-400 mb-8">Choose your extra point attempt</p>
    <div className="flex gap-4">
      <button
        onClick={onPAT}
        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg"
      >
        <div className="text-lg">Extra Point</div>
        <div className="text-sm text-blue-200">+1 point (94%)</div>
      </button>
      <button
        onClick={onTwoPoint}
        className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg"
      >
        <div className="text-lg">2-Point Conversion</div>
        <div className="text-sm text-yellow-200">+2 points (48%)</div>
      </button>
    </div>
  </div>
);

interface PATScreenProps {
  onKick: () => void;
  lastResult: import('../../engine/KickingEngine').KickResult | null;
}

const PATScreen: React.FC<PATScreenProps> = ({ onKick, lastResult }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg p-8">
    <h2 className="text-2xl font-bold text-white mb-8">Extra Point Attempt</h2>

    {lastResult ? (
      <div className="text-center">
        <div className={`text-4xl mb-4 ${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>
          {lastResult.success ? 'GOOD!' : 'NO GOOD'}
        </div>
        <p className="text-gray-400 mb-6">
          {lastResult.success ? 'Extra point is good!' : lastResult.blocked ? 'Blocked!' : 'Missed wide'}
        </p>
        <button
          onClick={onKick}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg"
        >
          Continue
        </button>
      </div>
    ) : (
      <button
        onClick={onKick}
        className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg text-lg"
      >
        Kick Extra Point
      </button>
    )}
  </div>
);

interface FieldGoalScreenProps {
  onKick: () => void;
  onCancel: () => void;
  yardLine: number;
  lastResult: import('../../engine/KickingEngine').KickResult | null;
}

const FieldGoalScreen: React.FC<FieldGoalScreenProps> = ({ onKick, onCancel, yardLine, lastResult }) => {
  const fgDistance = 100 - yardLine + 17;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-white mb-4">Field Goal Attempt</h2>
      <p className="text-gray-400 mb-8">{fgDistance} yard attempt</p>

      {lastResult ? (
        <div className="text-center">
          <div className={`text-4xl mb-4 ${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {lastResult.success ? 'GOOD!' : 'NO GOOD'}
          </div>
          <p className="text-gray-400 mb-6">
            {lastResult.success
              ? '3 points!'
              : lastResult.blocked
              ? 'Blocked!'
              : 'Missed! Turnover on downs'}
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={onKick}
            className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
          >
            Attempt Field Goal
          </button>
          <button
            onClick={onCancel}
            className="px-8 py-4 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

interface PuntScreenProps {
  onPunt: () => void;
  onCancel: () => void;
  lastResult: import('../../engine/KickingEngine').KickResult | null;
}

const PuntScreen: React.FC<PuntScreenProps> = ({ onPunt, onCancel, lastResult }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg p-8">
    <h2 className="text-2xl font-bold text-white mb-8">Punt</h2>

    {lastResult ? (
      <div className="text-center">
        <div className="text-xl text-white mb-4">
          {lastResult.touchback
            ? 'Touchback! Ball at the 20'
            : `Punted ${lastResult.distance} yards`}
        </div>
        {lastResult.returnYards !== undefined && lastResult.returnYards > 0 && (
          <p className="text-gray-400 mb-6">{lastResult.returnYards} yard return</p>
        )}
        <p className="text-gray-400 mb-6">
          Opponent takes over at the {lastResult.newYardLine} yard line
        </p>
      </div>
    ) : (
      <div className="flex gap-4">
        <button
          onClick={onPunt}
          className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg"
        >
          Punt
        </button>
        <button
          onClick={onCancel}
          className="px-8 py-4 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg"
        >
          Cancel
        </button>
      </div>
    )}
  </div>
);

interface GameOverScreenProps {
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  userTeam: 'home' | 'away';
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  homeScore,
  awayScore,
  homeTeam,
  awayTeam,
  userTeam,
}) => {
  const userWon =
    (userTeam === 'home' && homeScore > awayScore) ||
    (userTeam === 'away' && awayScore > homeScore);
  const tied = homeScore === awayScore;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg p-8">
      <div className="text-4xl mb-4">
        {tied ? '🤝' : userWon ? '🏆' : '😢'}
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">
        {tied ? 'TIE GAME' : userWon ? 'VICTORY!' : 'DEFEAT'}
      </h2>
      <div className="text-5xl font-bold text-white my-6">
        {homeScore} - {awayScore}
      </div>
      <div className="text-gray-400 mb-8">
        {homeTeam} vs {awayTeam}
      </div>
      <div className="text-sm text-gray-500">
        Final Score
      </div>
    </div>
  );
};

interface PlayResultDisplayProps {
  result: import('../../types/GameSim').PlayResult;
}

const PlayResultDisplay: React.FC<PlayResultDisplayProps> = ({ result }) => {
  let message = '';
  let color = 'text-white';

  if (result.touchdown) {
    message = 'TOUCHDOWN!';
    color = 'text-green-400';
  } else if (result.turnover) {
    message = result.turnoverType === 'INTERCEPTION' ? 'INTERCEPTION!' : 'FUMBLE!';
    color = 'text-red-400';
  } else if (result.incomplete) {
    message = 'Incomplete Pass';
    color = 'text-yellow-400';
  } else if (result.sack) {
    message = `Sacked for ${Math.abs(result.yardsGained)} yard loss`;
    color = 'text-red-400';
  } else {
    const gainLoss = result.yardsGained >= 0 ? 'Gain' : 'Loss';
    message = `${Math.abs(result.yardsGained)} yard ${gainLoss}`;
    color = result.yardsGained >= 0 ? 'text-green-400' : 'text-red-400';
  }

  return (
    <div className={`text-center ${color} font-bold text-lg`}>
      {message}
    </div>
  );
};

export default FullGameView;
