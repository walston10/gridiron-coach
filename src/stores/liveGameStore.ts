import { create } from 'zustand';
import type { LiveGame, GameState, Play, Down } from '../types';

type PlayerPosition = { id: string; x: number; y: number; role: 'offense' | 'defense' };

// Default defense positions (4-3 formation)
const createDefensePositions = (losYardLine: number): PlayerPosition[] => {
  // Convert yard line to canvas X (0-100 scale where 50 is midfield)
  // Defense lines up across from offense
  const defenseDepth = 45; // Just past the LOS (which is at 50 in formation coords)

  return [
    // Defensive Line (4)
    { id: 'DL1', x: 42, y: defenseDepth, role: 'defense' },
    { id: 'DL2', x: 47, y: defenseDepth, role: 'defense' },
    { id: 'DL3', x: 53, y: defenseDepth, role: 'defense' },
    { id: 'DL4', x: 58, y: defenseDepth, role: 'defense' },
    // Linebackers (3)
    { id: 'LB1', x: 35, y: 38, role: 'defense' },
    { id: 'LB2', x: 50, y: 35, role: 'defense' },
    { id: 'LB3', x: 65, y: 38, role: 'defense' },
    // Cornerbacks (2)
    { id: 'CB1', x: 15, y: 40, role: 'defense' },
    { id: 'CB2', x: 85, y: 40, role: 'defense' },
    // Safeties (2)
    { id: 'FS', x: 50, y: 20, role: 'defense' },
    { id: 'SS', x: 70, y: 25, role: 'defense' },
  ];
};

interface LiveGameStore {
  game: LiveGame | null;
  selectedPlay: Play | null;

  // Actions
  startGame: (homeTeamId: string, awayTeamId: string) => void;
  selectPlay: (play: Play) => void;
  snapBall: () => void;
  updatePlayerPositions: (positions: LiveGame['playerPositions']) => void;
  moveBallCarrier: (dx: number, dy: number) => void;
  endPlay: (yardsGained: number) => void;
  tick: (deltaMs: number) => void;
}

export const useLiveGameStore = create<LiveGameStore>((set, get) => ({
  game: null,
  selectedPlay: null,

  startGame: (homeTeamId, awayTeamId) => {
    set({
      game: {
        id: `game-${Date.now()}`,
        state: 'PRE_SNAP',
        clock: { quarter: 1, minutes: 15, seconds: 0, isRunning: false },
        fieldPosition: { yardLine: 25, down: 1, yardsToGo: 10 },
        possession: 'home',
        homeTeam: { teamId: homeTeamId, score: 0, timeoutsRemaining: 3 },
        awayTeam: { teamId: awayTeamId, score: 0, timeoutsRemaining: 3 },
        currentPlay: null,
        playerPositions: [],
        ballCarrier: null,
      },
      selectedPlay: null,
    });
  },

  selectPlay: (play) => {
    const { game } = get();
    if (!game) return;

    // Convert play assignments to player positions
    const offensePositions: PlayerPosition[] = play.assignments.map(assignment => ({
      id: assignment.positionSlot,
      x: assignment.startX,
      y: assignment.startY,
      role: 'offense' as const,
    }));

    // Add defense positions
    const defensePositions = createDefensePositions(game.fieldPosition.yardLine);

    set({
      selectedPlay: play,
      game: {
        ...game,
        currentPlay: play,
        playerPositions: [...offensePositions, ...defensePositions],
      },
    });
  },

  snapBall: () => {
    const { game, selectedPlay } = get();
    if (!game || !selectedPlay) return;

    set({
      game: {
        ...game,
        state: 'PLAY_RUNNING',
        currentPlay: selectedPlay,
        clock: { ...game.clock, isRunning: true },
      },
    });
  },

  updatePlayerPositions: (positions) => {
    set(state => ({
      game: state.game ? { ...state.game, playerPositions: positions } : null,
    }));
  },

  moveBallCarrier: (dx, dy) => {
    set(state => {
      if (!state.game?.ballCarrier) return state;
      return {
        game: {
          ...state.game,
          ballCarrier: {
            ...state.game.ballCarrier,
            x: state.game.ballCarrier.x + dx,
            y: state.game.ballCarrier.y + dy,
          },
        },
      };
    });
  },

  endPlay: (yardsGained) => {
    set(state => {
      if (!state.game) return state;
      
      const newYardLine = state.game.fieldPosition.yardLine + yardsGained;
      const madeFirstDown = yardsGained >= state.game.fieldPosition.yardsToGo;
      
      let newDown: Down = madeFirstDown ? 1 : ((state.game.fieldPosition.down + 1) as Down);
      let newYardsToGo = madeFirstDown ? 10 : state.game.fieldPosition.yardsToGo - yardsGained;
      
      // Turnover on downs
      const turnover = newDown > 4;
      
      return {
        game: {
          ...state.game,
          state: 'PLAY_DEAD',
          currentPlay: null,
          fieldPosition: {
            yardLine: turnover ? 100 - newYardLine : newYardLine,
            down: turnover ? 1 : newDown,
            yardsToGo: turnover ? 10 : newYardsToGo,
          },
          possession: turnover 
            ? (state.game.possession === 'home' ? 'away' : 'home')
            : state.game.possession,
          clock: { ...state.game.clock, isRunning: false },
        },
        selectedPlay: null,
      };
    });
  },

  tick: (deltaMs) => {
    set(state => {
      if (!state.game?.clock.isRunning) return state;

      const { minutes, seconds } = state.game.clock;
      // Slow down clock: 1 real second = 0.1 game seconds (10x slower)
      const clockSpeed = 0.1;
      const totalSeconds = minutes * 60 + seconds - (deltaMs / 1000) * clockSpeed;

      // Update player positions - basic movement
      const moveSpeed = deltaMs * 0.01; // pixels per ms
      const updatedPositions = state.game.playerPositions.map(player => {
        if (player.role === 'offense') {
          // Offense: receivers run forward (decrease Y to go downfield)
          // QB and linemen stay put for now
          const isReceiver = !['QB', 'C', 'LG', 'RG', 'LT', 'RT'].includes(player.id);
          if (isReceiver) {
            return {
              ...player,
              y: Math.max(player.y - moveSpeed * 0.5, 10), // Run downfield (toward y=0)
            };
          }
        } else {
          // Defense: move toward ball carrier or toward offense
          const ballCarrier = state.game?.ballCarrier;
          if (ballCarrier) {
            const dx = ballCarrier.x - player.x;
            const dy = ballCarrier.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
              return {
                ...player,
                x: player.x + (dx / dist) * moveSpeed * 0.4,
                y: player.y + (dy / dist) * moveSpeed * 0.4,
              };
            }
          } else {
            // No ball carrier yet, defense creeps forward
            return {
              ...player,
              y: Math.min(player.y + moveSpeed * 0.2, 60),
            };
          }
        }
        return player;
      });

      if (totalSeconds <= 0) {
        // Quarter ended
        const nextQuarter = state.game.clock.quarter + 1;
        if (nextQuarter > 4) {
          return {
            game: { ...state.game, state: 'GAME_OVER', clock: { ...state.game.clock, isRunning: false } },
          };
        }
        return {
          game: {
            ...state.game,
            state: nextQuarter === 3 ? 'HALFTIME' : 'PLAY_DEAD',
            clock: { quarter: nextQuarter as 1 | 2 | 3 | 4, minutes: 15, seconds: 0, isRunning: false },
            playerPositions: updatedPositions,
          },
        };
      }

      return {
        game: {
          ...state.game,
          clock: {
            ...state.game.clock,
            minutes: Math.floor(totalSeconds / 60),
            seconds: Math.floor(totalSeconds % 60),
          },
          playerPositions: updatedPositions,
        },
      };
    });
  },
}));