/**
 * ILLEGAL MOTION - Offseason Store
 *
 * State management for multi-season progression.
 * Tracks current phase, decisions made, and cap implications.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  OffseasonPhase,
  OffseasonState,
  SeasonSummary,
  OwnerEvaluation,
  RetirementDecision,
  ExpiringContract,
  DevelopmentChange,
  OffseasonFreeAgent,
  FreeAgentResult,
  DraftClass,
  DraftPick,
  DraftSelection,
  DraftProspect,
  CampReport,
  RosterCut,
  ResigningOffer,
  ResigningResult,
  FreeAgentOffer,
} from '../types/offseason.types';
import { getNextPhase } from '../types/offseason.types';
import type { Player, Contract } from '../types/player.types';

// =============================================================================
// STORE STATE & ACTIONS
// =============================================================================

interface OffseasonStoreState extends OffseasonState {
  // Initialization
  startOffseason: (year: number, initialCap: number) => void;

  // Phase progression
  advancePhase: () => void;
  setPhase: (phase: OffseasonPhase) => void;

  // Season End
  setSeasonSummary: (summary: SeasonSummary) => void;
  setOwnerEvaluation: (evaluation: OwnerEvaluation) => void;

  // Player Changes
  addRetirement: (retirement: RetirementDecision) => void;
  setExpiringContracts: (contracts: ExpiringContract[]) => void;
  addDevelopmentChange: (change: DevelopmentChange) => void;

  // Re-signing
  makeResigningDecision: (playerId: string, decision: 'SIGNED' | 'RELEASED') => void;
  submitResigningOffer: (offer: ResigningOffer) => ResigningResult;

  // Free Agency
  setFreeAgentPool: (agents: OffseasonFreeAgent[]) => void;
  advanceFreeAgencyWave: () => void;
  makeOffer: (offer: FreeAgentOffer) => FreeAgentResult;
  passOnPlayer: (playerId: string) => void;
  addSigning: (result: FreeAgentResult) => void;

  // Draft
  setDraftClass: (draftClass: DraftClass) => void;
  setDraftOrder: (picks: DraftPick[]) => void;
  scoutProspect: (prospectId: string, cost: number) => boolean;
  makeDraftSelection: (pickNumber: number, prospectId: string) => DraftSelection | null;
  addDraftResult: (selection: DraftSelection) => void;

  // Training Camp
  setCampReport: (report: CampReport) => void;
  makeRosterCut: (cut: RosterCut) => void;
  finalizeRoster: () => void;

  // Cap Management
  updateCapSpace: (amount: number) => void;
  addDeadMoney: (amount: number) => void;
  recordSpending: (amount: number) => void;

  // Reset
  resetOffseason: () => void;
  endOffseason: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: OffseasonState = {
  isActive: false,
  phase: 'SEASON_END',
  year: 0,

  seasonSummary: undefined,
  ownerEvaluation: undefined,

  retirements: [],
  expiringContracts: [],
  developmentChanges: [],

  resigningDecisions: new Map(),

  freeAgentPool: [],
  currentWave: 1,
  signings: [],
  freeAgencyBudget: 0,

  draftClass: null,
  draftOrder: [],
  userPicks: [],
  draftResults: [],
  scoutingBudget: 0,

  campReport: null,
  rosterFinalized: false,

  capSpace: 0,
  deadMoney: 0,
  totalSpent: 0,
};

// =============================================================================
// STORE
// =============================================================================

export const useOffseasonStore = create<OffseasonStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =========================================================================
      // INITIALIZATION
      // =========================================================================

      startOffseason: (year: number, initialCap: number) => {
        set({
          ...initialState,
          isActive: true,
          phase: 'SEASON_END',
          year,
          capSpace: initialCap,
          freeAgencyBudget: initialCap * 0.3, // 30% for FA
          scoutingBudget: 500000, // $500K for scouting
          resigningDecisions: new Map(),
        });
      },

      // =========================================================================
      // PHASE PROGRESSION
      // =========================================================================

      advancePhase: () => {
        const { phase } = get();
        const nextPhase = getNextPhase(phase);

        set({ phase: nextPhase });

        // Auto-advance FA waves
        if (nextPhase === 'FREE_AGENCY_WAVE_2') {
          set({ currentWave: 2 });
        } else if (nextPhase === 'FREE_AGENCY_WAVE_3') {
          set({ currentWave: 3 });
        }
      },

      setPhase: (phase: OffseasonPhase) => {
        set({ phase });
      },

      // =========================================================================
      // SEASON END
      // =========================================================================

      setSeasonSummary: (summary: SeasonSummary) => {
        set({ seasonSummary: summary });
      },

      setOwnerEvaluation: (evaluation: OwnerEvaluation) => {
        set({ ownerEvaluation: evaluation });
      },

      // =========================================================================
      // PLAYER CHANGES
      // =========================================================================

      addRetirement: (retirement: RetirementDecision) => {
        set(state => ({
          retirements: [...state.retirements, retirement],
        }));
      },

      setExpiringContracts: (contracts: ExpiringContract[]) => {
        set({ expiringContracts: contracts });
      },

      addDevelopmentChange: (change: DevelopmentChange) => {
        set(state => ({
          developmentChanges: [...state.developmentChanges, change],
        }));
      },

      // =========================================================================
      // RE-SIGNING
      // =========================================================================

      makeResigningDecision: (playerId: string, decision: 'SIGNED' | 'RELEASED') => {
        set(state => {
          const newDecisions = new Map(state.resigningDecisions);
          newDecisions.set(playerId, decision);
          return { resigningDecisions: newDecisions };
        });
      },

      submitResigningOffer: (offer: ResigningOffer): ResigningResult => {
        const { expiringContracts, capSpace } = get();

        const player = expiringContracts.find(p => p.playerId === offer.playerId);
        if (!player) {
          return {
            playerId: offer.playerId,
            playerName: 'Unknown',
            accepted: false,
            reason: 'Player not found',
          };
        }

        // Check if we can afford it
        const totalCost = offer.salaryPerYear + offer.signingBonus;
        if (totalCost > capSpace) {
          return {
            playerId: offer.playerId,
            playerName: player.playerName,
            accepted: false,
            reason: 'Cannot afford this contract',
          };
        }

        // Calculate acceptance chance based on offer vs market value
        const offerValue = offer.salaryPerYear * offer.years + offer.guaranteed;
        const marketValue = player.marketValue * 2; // Rough equivalent
        const acceptanceChance = Math.min(0.95, (offerValue / marketValue) * player.willingness / 100);

        const accepted = Math.random() < acceptanceChance;

        if (accepted) {
          const contract: Contract = {
            yearsRemaining: offer.years,
            salaryPerYear: offer.salaryPerYear,
            guaranteed: offer.guaranteed,
            signingBonus: offer.signingBonus,
            hasNoTradeClause: offer.salaryPerYear > 15_000_000,
            hasOptionYear: offer.years > 2,
          };

          // Update cap space
          set(state => ({
            capSpace: state.capSpace - offer.salaryPerYear,
            totalSpent: state.totalSpent + offer.salaryPerYear,
          }));

          // Mark as signed
          get().makeResigningDecision(offer.playerId, 'SIGNED');

          return {
            playerId: offer.playerId,
            playerName: player.playerName,
            accepted: true,
            finalContract: contract,
          };
        }

        return {
          playerId: offer.playerId,
          playerName: player.playerName,
          accepted: false,
          reason: player.otherInterest > 2
            ? 'Wants to test the market'
            : 'Looking for more money',
        };
      },

      // =========================================================================
      // FREE AGENCY
      // =========================================================================

      setFreeAgentPool: (agents: OffseasonFreeAgent[]) => {
        set({ freeAgentPool: agents });
      },

      advanceFreeAgencyWave: () => {
        const { currentWave } = get();
        if (currentWave < 3) {
          set({ currentWave: (currentWave + 1) as 1 | 2 | 3 });
        }
      },

      makeOffer: (offer: FreeAgentOffer): FreeAgentResult => {
        const { freeAgentPool, capSpace } = get();

        const agent = freeAgentPool.find(a => a.player.id === offer.playerId);
        if (!agent) {
          return {
            playerId: offer.playerId,
            playerName: 'Unknown',
            signed: false,
            reason: 'Player not found',
          };
        }

        // Check affordability
        const totalCost = offer.salaryPerYear + offer.signingBonus;
        if (totalCost > capSpace) {
          return {
            playerId: offer.playerId,
            playerName: `${agent.player.firstName} ${agent.player.lastName}`,
            signed: false,
            reason: 'Cannot afford this contract',
          };
        }

        // Calculate acceptance
        const offerValue = offer.salaryPerYear;
        const askingPrice = agent.askingPrice;
        const valueRatio = offerValue / askingPrice;

        // Base chance from money
        let acceptanceChance = valueRatio * 0.5;

        // Competing offers reduce chance
        acceptanceChance -= agent.competingOffers * 0.1;

        // Interest level helps
        acceptanceChance += (agent.interest / 100) * 0.3;

        // Role matters
        if (offer.role === 'STARTER') acceptanceChance += 0.1;
        if (offer.role === 'DEPTH') acceptanceChance -= 0.15;

        acceptanceChance = Math.max(0.1, Math.min(0.9, acceptanceChance));

        const signed = Math.random() < acceptanceChance;

        if (signed) {
          const contract: Contract = {
            yearsRemaining: offer.years,
            salaryPerYear: offer.salaryPerYear,
            guaranteed: offer.guaranteed,
            signingBonus: offer.signingBonus,
            hasNoTradeClause: offer.salaryPerYear > 10_000_000,
            hasOptionYear: offer.years > 2,
          };

          // Update state
          set(state => ({
            capSpace: state.capSpace - offer.salaryPerYear,
            totalSpent: state.totalSpent + offer.salaryPerYear,
            freeAgentPool: state.freeAgentPool.filter(a => a.player.id !== offer.playerId),
          }));

          const result: FreeAgentResult = {
            playerId: offer.playerId,
            playerName: `${agent.player.firstName} ${agent.player.lastName}`,
            signed: true,
            signedWith: 'USER',
            contract,
          };

          get().addSigning(result);
          return result;
        }

        return {
          playerId: offer.playerId,
          playerName: `${agent.player.firstName} ${agent.player.lastName}`,
          signed: false,
          reason: agent.competingOffers > 2
            ? 'Signed with another team'
            : 'Wanted more money',
        };
      },

      passOnPlayer: (playerId: string) => {
        set(state => ({
          freeAgentPool: state.freeAgentPool.filter(a => a.player.id !== playerId),
        }));
      },

      addSigning: (result: FreeAgentResult) => {
        set(state => ({
          signings: [...state.signings, result],
        }));
      },

      // =========================================================================
      // DRAFT
      // =========================================================================

      setDraftClass: (draftClass: DraftClass) => {
        set({ draftClass });
      },

      setDraftOrder: (picks: DraftPick[]) => {
        const userPicks = picks.filter(p => p.teamId === 'USER');
        set({ draftOrder: picks, userPicks });
      },

      scoutProspect: (prospectId: string, cost: number): boolean => {
        const { draftClass, scoutingBudget } = get();
        if (!draftClass || cost > scoutingBudget) return false;

        set(state => ({
          scoutingBudget: state.scoutingBudget - cost,
          draftClass: state.draftClass ? {
            ...state.draftClass,
            scoutedPlayers: [...state.draftClass.scoutedPlayers, prospectId],
            prospects: state.draftClass.prospects.map(p =>
              p.id === prospectId ? { ...p, isScounted: true } : p
            ),
          } : null,
        }));

        return true;
      },

      makeDraftSelection: (pickNumber: number, prospectId: string): DraftSelection | null => {
        const { draftClass, draftOrder } = get();
        if (!draftClass) return null;

        const pick = draftOrder.find(p => p.overall === pickNumber);
        const prospect = draftClass.prospects.find(p => p.id === prospectId);

        if (!pick || !prospect) return null;

        const selection: DraftSelection = {
          pick,
          prospectId,
          teamId: pick.teamId,
          prospect,
        };

        // Update pick and remove prospect
        set(state => ({
          draftOrder: state.draftOrder.map(p =>
            p.overall === pickNumber
              ? { ...p, selectedPlayerId: prospectId }
              : p
          ),
          draftClass: state.draftClass ? {
            ...state.draftClass,
            prospects: state.draftClass.prospects.filter(p => p.id !== prospectId),
          } : null,
        }));

        get().addDraftResult(selection);
        return selection;
      },

      addDraftResult: (selection: DraftSelection) => {
        set(state => ({
          draftResults: [...state.draftResults, selection],
        }));
      },

      // =========================================================================
      // TRAINING CAMP
      // =========================================================================

      setCampReport: (report: CampReport) => {
        set({ campReport: report });
      },

      makeRosterCut: (cut: RosterCut) => {
        set(state => ({
          campReport: state.campReport ? {
            ...state.campReport,
            rosterDecisions: [...state.campReport.rosterDecisions, cut],
          } : null,
          deadMoney: state.deadMoney + cut.severanceCost,
        }));
      },

      finalizeRoster: () => {
        set({ rosterFinalized: true });
      },

      // =========================================================================
      // CAP MANAGEMENT
      // =========================================================================

      updateCapSpace: (amount: number) => {
        set(state => ({
          capSpace: state.capSpace + amount,
        }));
      },

      addDeadMoney: (amount: number) => {
        set(state => ({
          deadMoney: state.deadMoney + amount,
          capSpace: state.capSpace - amount,
        }));
      },

      recordSpending: (amount: number) => {
        set(state => ({
          totalSpent: state.totalSpent + amount,
          capSpace: state.capSpace - amount,
        }));
      },

      // =========================================================================
      // RESET
      // =========================================================================

      resetOffseason: () => {
        set({ ...initialState, resigningDecisions: new Map() });
      },

      endOffseason: () => {
        set({
          isActive: false,
          phase: 'COMPLETE',
        });
      },
    }),
    {
      name: 'illegal-motion-offseason',
      partialize: (state) => ({
        isActive: state.isActive,
        phase: state.phase,
        year: state.year,
        seasonSummary: state.seasonSummary,
        ownerEvaluation: state.ownerEvaluation,
        retirements: state.retirements,
        expiringContracts: state.expiringContracts,
        developmentChanges: state.developmentChanges,
        // Note: Map doesn't serialize well, we'd need to convert
        currentWave: state.currentWave,
        signings: state.signings,
        draftResults: state.draftResults,
        rosterFinalized: state.rosterFinalized,
        capSpace: state.capSpace,
        deadMoney: state.deadMoney,
        totalSpent: state.totalSpent,
      }),
    }
  )
);
