import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team, Season, Playbook, Play, PlayFolder, PlayTag, Draft, FreeAgencyPeriod } from '../types';
import { DEFAULT_TEAMS } from '../data/defaultTeams';
import { DEFAULT_PLAYS } from '../data/defaultPlays';
import { generateRoster } from '../utils/playerGenerator';
import { generateContract } from '../utils/contractGenerator';
import { SALARY_CAP } from '../data/constants';
import type { PositionTemplate } from '../data/formations';

export type CustomFormation = {
  id: string;
  name: string;
  positions: PositionTemplate[];
};

// =============================================================================
// GAME HISTORY
// =============================================================================

export interface GameResult {
  id: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  userTeamId: string;
  userWon: boolean;
  playedAt: number;
  // Quarter-by-quarter scores
  quarterScores: {
    home: [number, number, number, number];
    away: [number, number, number, number];
  };
  // Key stats (optional, can be expanded)
  stats?: {
    userPassingYards?: number;
    userRushingYards?: number;
    userTurnovers?: number;
    opponentPassingYards?: number;
    opponentRushingYards?: number;
    opponentTurnovers?: number;
  };
}

// =============================================================================
// MID-GAME CHECKPOINT
// =============================================================================

export interface MidGameCheckpoint {
  gameId: string;
  quarter: 1 | 2 | 3 | 4;
  timeRemaining: number;  // Seconds in quarter
  homeScore: number;
  awayScore: number;
  homeTeamId: string;
  awayTeamId: string;
  possession: 'home' | 'away';
  down: number;
  yardsToGo: number;
  ballPosition: number;  // Yard line
  savedAt: number;
  // Full game state snapshot for restoration
  gameStateSnapshot?: unknown;  // Serialized game state
}

// Default folders
const DEFAULT_FOLDERS: PlayFolder[] = [
  { id: 'red-zone', name: 'Red Zone', color: '#ef4444', icon: '🎯' },
  { id: '3rd-down', name: '3rd Down', color: '#f59e0b', icon: '⚡' },
  { id: '2-minute', name: '2-Minute', color: '#3b82f6', icon: '⏱️' },
  { id: 'goal-line', name: 'Goal Line', color: '#22c55e', icon: '🏈' },
  { id: 'openers', name: 'Openers', color: '#8b5cf6', icon: '🎬' },
];

// Intro flow types
export type GamePhase = 'start' | 'intro' | 'nameInput' | 'draft' | 'desk';
export type OwnerType = 'tex' | 'kessler' | 'hale';

interface GameStore {
  // Intro flow state
  gamePhase: GamePhase;
  ownerType: OwnerType;
  gmName: string;

  // Core state
  userTeamId: string | null;
  teams: Team[];
  season: Season | null;
  playbook: Playbook;
  draft: Draft | null;
  freeAgency: FreeAgencyPeriod | null;
  customFormations: CustomFormation[];

  // Game history
  gameHistory: GameResult[];
  midGameCheckpoint: MidGameCheckpoint | null;

  // Intro flow actions
  setPhase: (phase: GamePhase) => void;
  setOwner: (owner: OwnerType) => void;
  setGMName: (name: string) => void;
  startFranchise: () => void;

  // Actions
  initializeGame: (userTeamIndex: number) => void;
  setUserTeam: (teamId: string) => void;

  // Playbook management
  addPlay: (play: Play) => void;
  updatePlay: (playId: string, updates: Partial<Play>) => void;
  removePlay: (playId: string) => void;
  duplicatePlay: (playId: string) => Play | null;

  // Folder management
  addFolder: (folder: PlayFolder) => void;
  updateFolder: (folderId: string, updates: Partial<PlayFolder>) => void;
  removeFolder: (folderId: string) => void;
  movePlayToFolder: (playId: string, folderId: string | undefined) => void;

  // Tag management
  addTagToPlay: (playId: string, tag: PlayTag) => void;
  removeTagFromPlay: (playId: string, tag: PlayTag) => void;

  // Game history actions
  recordGameResult: (result: Omit<GameResult, 'id' | 'playedAt'>) => void;
  getGameHistory: () => GameResult[];
  getTeamRecord: (teamId: string) => { wins: number; losses: number; ties: number };

  // Mid-game checkpoint actions
  saveCheckpoint: (checkpoint: Omit<MidGameCheckpoint, 'savedAt'>) => void;
  loadCheckpoint: () => MidGameCheckpoint | null;
  clearCheckpoint: () => void;
  hasActiveCheckpoint: () => boolean;

  // Season/Standings actions
  updateStandings: (homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number) => void;

  advancePhase: () => void;
  addCustomFormation: (formation: CustomFormation) => void;
  removeCustomFormation: (formationId: string) => void;

  // Reset
  resetFranchise: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Intro flow state
      gamePhase: 'start' as GamePhase,
      ownerType: 'tex' as OwnerType,
      gmName: '',

      // Core state
      userTeamId: null,
      teams: [],
      season: null,
      playbook: {
        id: 'user-playbook',
        name: 'My Playbook',
        plays: [...DEFAULT_PLAYS],
        folders: DEFAULT_FOLDERS,
      },
      draft: null,
      freeAgency: null,
      customFormations: [],

      // Game history
      gameHistory: [],
      midGameCheckpoint: null,

      // Intro flow actions
      setPhase: (phase: GamePhase) => set({ gamePhase: phase }),
      setOwner: (owner: OwnerType) => set({ ownerType: owner }),
      setGMName: (name: string) => set({ gmName: name }),
      startFranchise: () => {
        // Go to fantasy draft first - team will be built there
        set({ gamePhase: 'draft' });
      },

      initializeGame: (userTeamIndex: number) => {
        const teams: Team[] = DEFAULT_TEAMS.map(({ info }, index) => {
          const quality = info.prestige > 75 ? 'GOOD' : info.prestige > 55 ? 'AVERAGE' : 'BAD';
          const roster = generateRoster(info.id, quality);

          // Assign contracts to all players
          roster.forEach(player => {
            player.contract = generateContract(player, player.experience === 0);
          });

          const teamInfo = index === userTeamIndex
            ? { ...info, isUserTeam: true }
            : info;

          return {
            info: teamInfo,
            roster,
            depthChart: {},
            capSpace: SALARY_CAP,
            deadCap: 0,
            coordinators: { oc: null, dc: null },
          };
        });

        const userTeamId = teams[userTeamIndex].info.id;

        set({
          teams,
          userTeamId,
          season: {
            year: 2025,
            phase: 'PRESEASON',
            currentWeek: 0,
            schedule: [],
            standings: teams.map(t => ({
              teamId: t.info.id,
              wins: 0,
              losses: 0,
              ties: 0,
              pointsFor: 0,
              pointsAgainst: 0,
              divisionWins: 0,
              divisionLosses: 0,
            })),
          },
        });
      },

      setUserTeam: (teamId: string) => {
        set({ userTeamId: teamId });
      },

      addPlay: (play: Play) => {
        set(state => ({
          playbook: {
            ...state.playbook,
            plays: [...state.playbook.plays, play],
          },
        }));
      },

      updatePlay: (playId: string, updates: Partial<Play>) => {
        set(state => ({
          playbook: {
            ...state.playbook,
            plays: state.playbook.plays.map(p =>
              p.id === playId ? { ...p, ...updates, updatedAt: Date.now() } : p
            ),
          },
        }));
      },

      removePlay: (playId: string) => {
        set(state => ({
          playbook: {
            ...state.playbook,
            plays: state.playbook.plays.filter(p => p.id !== playId),
          },
        }));
      },

      duplicatePlay: (playId: string) => {
        const state = get();
        const originalPlay = state.playbook.plays.find(p => p.id === playId);
        if (!originalPlay) return null;

        const newPlay: Play = {
          ...originalPlay,
          id: crypto.randomUUID(),
          name: `${originalPlay.name} (Copy)`,
          createdAt: Date.now(),
          updatedAt: undefined,
          timesUsed: 0,
          successRate: 0,
        };

        set(state => ({
          playbook: {
            ...state.playbook,
            plays: [...state.playbook.plays, newPlay],
          },
        }));

        return newPlay;
      },

      addFolder: (folder: PlayFolder) => {
        set(state => ({
          playbook: {
            ...state.playbook,
            folders: [...state.playbook.folders, folder],
          },
        }));
      },

      updateFolder: (folderId: string, updates: Partial<PlayFolder>) => {
        set(state => ({
          playbook: {
            ...state.playbook,
            folders: state.playbook.folders.map(f =>
              f.id === folderId ? { ...f, ...updates } : f
            ),
          },
        }));
      },

      removeFolder: (folderId: string) => {
        set(state => ({
          playbook: {
            ...state.playbook,
            folders: state.playbook.folders.filter(f => f.id !== folderId),
            // Remove folder assignment from plays
            plays: state.playbook.plays.map(p =>
              p.folderId === folderId ? { ...p, folderId: undefined } : p
            ),
          },
        }));
      },

      movePlayToFolder: (playId: string, folderId: string | undefined) => {
        set(state => ({
          playbook: {
            ...state.playbook,
            plays: state.playbook.plays.map(p =>
              p.id === playId ? { ...p, folderId } : p
            ),
          },
        }));
      },

      addTagToPlay: (playId: string, tag: PlayTag) => {
        set(state => ({
          playbook: {
            ...state.playbook,
            plays: state.playbook.plays.map(p =>
              p.id === playId && !p.tags.includes(tag)
                ? { ...p, tags: [...p.tags, tag] }
                : p
            ),
          },
        }));
      },

      removeTagFromPlay: (playId: string, tag: PlayTag) => {
        set(state => ({
          playbook: {
            ...state.playbook,
            plays: state.playbook.plays.map(p =>
              p.id === playId
                ? { ...p, tags: p.tags.filter(t => t !== tag) }
                : p
            ),
          },
        }));
      },

      // =============================================================================
      // GAME HISTORY
      // =============================================================================

      recordGameResult: (result: Omit<GameResult, 'id' | 'playedAt'>) => {
        const gameResult: GameResult = {
          ...result,
          id: crypto.randomUUID(),
          playedAt: Date.now(),
        };

        set(state => ({
          gameHistory: [...state.gameHistory, gameResult],
        }));

        // Also update standings
        get().updateStandings(result.homeTeamId, result.awayTeamId, result.homeScore, result.awayScore);
      },

      getGameHistory: () => {
        return get().gameHistory;
      },

      getTeamRecord: (teamId: string) => {
        const history = get().gameHistory;
        let wins = 0, losses = 0, ties = 0;

        for (const game of history) {
          const isHome = game.homeTeamId === teamId;
          const isAway = game.awayTeamId === teamId;

          if (!isHome && !isAway) continue;

          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;

          if (teamScore > oppScore) wins++;
          else if (teamScore < oppScore) losses++;
          else ties++;
        }

        return { wins, losses, ties };
      },

      // =============================================================================
      // MID-GAME CHECKPOINTS
      // =============================================================================

      saveCheckpoint: (checkpoint: Omit<MidGameCheckpoint, 'savedAt'>) => {
        set({
          midGameCheckpoint: {
            ...checkpoint,
            savedAt: Date.now(),
          },
        });
      },

      loadCheckpoint: () => {
        return get().midGameCheckpoint;
      },

      clearCheckpoint: () => {
        set({ midGameCheckpoint: null });
      },

      hasActiveCheckpoint: () => {
        return get().midGameCheckpoint !== null;
      },

      // =============================================================================
      // STANDINGS
      // =============================================================================

      updateStandings: (homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number) => {
        set(state => {
          if (!state.season) return state;

          const standings = state.season.standings.map(standing => {
            if (standing.teamId === homeTeamId) {
              const won = homeScore > awayScore;
              const lost = homeScore < awayScore;
              const tied = homeScore === awayScore;
              return {
                ...standing,
                wins: standing.wins + (won ? 1 : 0),
                losses: standing.losses + (lost ? 1 : 0),
                ties: standing.ties + (tied ? 1 : 0),
                pointsFor: standing.pointsFor + homeScore,
                pointsAgainst: standing.pointsAgainst + awayScore,
              };
            }
            if (standing.teamId === awayTeamId) {
              const won = awayScore > homeScore;
              const lost = awayScore < homeScore;
              const tied = homeScore === awayScore;
              return {
                ...standing,
                wins: standing.wins + (won ? 1 : 0),
                losses: standing.losses + (lost ? 1 : 0),
                ties: standing.ties + (tied ? 1 : 0),
                pointsFor: standing.pointsFor + awayScore,
                pointsAgainst: standing.pointsAgainst + homeScore,
              };
            }
            return standing;
          });

          return {
            season: {
              ...state.season,
              standings,
            },
          };
        });
      },

      advancePhase: () => {
        // TODO: Implement phase transitions
      },

      addCustomFormation: (formation: CustomFormation) => {
        set(state => ({
          customFormations: [...state.customFormations, formation],
        }));
      },

      removeCustomFormation: (formationId: string) => {
        set(state => ({
          customFormations: state.customFormations.filter(f => f.id !== formationId),
        }));
      },

      // =============================================================================
      // RESET
      // =============================================================================

      resetFranchise: () => {
        set({
          gamePhase: 'start',
          ownerType: 'tex',
          gmName: '',
          userTeamId: null,
          teams: [],
          season: null,
          draft: null,
          freeAgency: null,
          gameHistory: [],
          midGameCheckpoint: null,
        });
      },
    }),
    {
      name: 'gridiron-coach-storage',
      partialize: (state) => ({
        // Intro/franchise state
        gamePhase: state.gamePhase,
        ownerType: state.ownerType,
        gmName: state.gmName,
        // Core game state
        userTeamId: state.userTeamId,
        teams: state.teams,
        season: state.season,
        // Playbook (always persisted)
        playbook: state.playbook,
        customFormations: state.customFormations,
        // Game history
        gameHistory: state.gameHistory,
        midGameCheckpoint: state.midGameCheckpoint,
      }),
      onRehydrateStorage: () => (state) => {
        // If playbook was loaded from storage but has no plays, add defaults
        if (state && state.playbook.plays.length === 0) {
          state.playbook.plays = [...DEFAULT_PLAYS];
        }
      },
    }
  )
);
