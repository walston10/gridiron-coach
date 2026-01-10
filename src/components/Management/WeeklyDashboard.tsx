/**
 * ILLEGAL MOTION - Weekly Dashboard
 *
 * Between games, players manage their team through a weekly agenda.
 * Handle mandatory events, optional prep, and passive alerts before game day.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  useManagementStore,
  getPriorityIcon,
  getHeatColor,
  type ManagementEvent,
  type EventChoice,
  type EventResult,
  type PrepChoice,
  type PassiveAlert,
} from '../../stores/managementStore';
import { useEventStore } from '../../stores/eventStore';
import { useLeagueStore, getTeamAbbreviation } from '../../stores/leagueStore';
import { useGameStore } from '../../stores/gameStore';
import { STATIC_TEAMS, getStaticTeam } from '../../data/staticTeams';
import type { Roster } from '../../types/player.types';
import { OwnerWelcomeEvent, type ChoiceResult } from '../Events/OwnerWelcomeEvent';

// =============================================================================
// TYPES
// =============================================================================

interface WeeklyDashboardProps {
  opponentName: string;
  opponentRecord: string;
  gameDate: string;
  playerRecord: string;
  onPlayGame: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PREP_OPTIONS: { type: PrepChoice['type']; name: string; icon: string; description: string }[] = [
  { type: 'SCOUT', name: 'Scout Opponent', icon: '🔍', description: 'Reveal opponent tendencies and cards' },
  { type: 'FILM_REVIEW', name: 'Film Review', icon: '📹', description: 'See your own tendency report' },
  { type: 'PRACTICE_FOCUS', name: 'Practice Focus', icon: '🏋️', description: 'Boost a position group' },
];

const POSITION_GROUPS = ['QB', 'RB', 'WR', 'OL', 'DL', 'LB', 'DB'];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WeeklyDashboard: React.FC<WeeklyDashboardProps> = ({
  opponentName,
  opponentRecord,
  gameDate,
  playerRecord,
  onPlayGame,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<ManagementEvent | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [viewingRosterTeamId, setViewingRosterTeamId] = useState<string | null>(null);

  const {
    currentWeek,
    teamMorale,
    reputation,
    ownerTrust,
    corruptionLevel,
    investigation,
    prepChoices,
    getMandatoryEvents,
    getOptionalEvents,
    getActiveAlerts,
    resolveEvent,
    togglePrepChoice,
    canSelectMorePrep,
    canPlayGame,
    getInvestigationWarning,
  } = useManagementStore();

  // Event store for special events
  const {
    hasSeenOwnerWelcome,
    getOwner,
    completeOwnerWelcome,
    currentWeek: eventWeek,
  } = useEventStore();

  // League store for standings
  const {
    phase: leaguePhase,
    standings,
    getStandingsSorted,
  } = useLeagueStore();

  // Game store for user roster
  const { draftedRoster, userTeamId } = useGameStore();

  const owner = getOwner();
  const showOwnerWelcome = eventWeek === 1 && !hasSeenOwnerWelcome;

  const mandatoryEvents = getMandatoryEvents();
  const optionalEvents = getOptionalEvents();
  const alerts = getActiveAlerts();
  const investigationWarning = getInvestigationWarning();

  const canPlay = canPlayGame();

  // Owner mood based on trust
  const ownerMood = useMemo(() => {
    if (ownerTrust >= 80) return { icon: '😊', text: 'Pleased', color: 'text-green-400' };
    if (ownerTrust >= 60) return { icon: '😐', text: 'Neutral', color: 'text-gray-400' };
    if (ownerTrust >= 40) return { icon: '😠', text: 'Frustrated', color: 'text-orange-400' };
    return { icon: '😡', text: 'Furious', color: 'text-red-400' };
  }, [ownerTrust]);

  // Handle event choice
  const handleEventChoice = useCallback((eventId: string, choiceId: string) => {
    const result = resolveEvent(eventId, choiceId);
    setEventResult(result);
  }, [resolveEvent]);

  // Close event modal
  const closeEventModal = useCallback(() => {
    setSelectedEvent(null);
    setEventResult(null);
  }, []);

  // Handle prep toggle
  const handlePrepToggle = useCallback((type: PrepChoice['type']) => {
    if (type === 'PRACTICE_FOCUS') {
      setShowPracticeModal(true);
    } else {
      togglePrepChoice(type);
    }
  }, [togglePrepChoice]);

  // Handle practice focus selection
  const handlePracticeFocus = useCallback((position: string) => {
    togglePrepChoice('PRACTICE_FOCUS', position);
    setShowPracticeModal(false);
  }, [togglePrepChoice]);

  // Handle owner welcome event choice
  const handleOwnerWelcomeChoice = useCallback((_choice: 'take' | 'refuse' | 'ask_more', result: ChoiceResult) => {
    completeOwnerWelcome(
      result.slushFundChange,
      result.riskChange,
      result.ownerPatienceChange,
      result.reputationChange
    );
  }, [completeOwnerWelcome]);

  // Show owner welcome event first if applicable
  if (showOwnerWelcome) {
    return (
      <OwnerWelcomeEvent
        owner={owner}
        onChoice={handleOwnerWelcomeChoice}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* === WEEK HEADER === */}
      <WeekHeader
        week={currentWeek}
        opponentName={opponentName}
        opponentRecord={opponentRecord}
        gameDate={gameDate}
        playerRecord={playerRecord}
        ownerMood={ownerMood}
      />

      {/* === MAIN CONTENT === */}
      <div className="flex flex-col lg:flex-row gap-4 p-4">
        {/* Left Column - Events & Prep */}
        <div className="flex-1 space-y-4">
          {/* Investigation Warning */}
          {investigationWarning && (
            <InvestigationBanner
              warning={investigationWarning}
              heat={investigation.heat}
            />
          )}

          {/* Mandatory Events */}
          {mandatoryEvents.length > 0 && (
            <EventsSection
              title="MUST RESOLVE"
              events={mandatoryEvents}
              onSelectEvent={setSelectedEvent}
              isMandatory
            />
          )}

          {/* Optional Events */}
          {optionalEvents.length > 0 && (
            <EventsSection
              title="OPPORTUNITIES"
              events={optionalEvents}
              onSelectEvent={setSelectedEvent}
              isMandatory={false}
            />
          )}

          {/* Optional Prep */}
          <PrepSection
            prepChoices={prepChoices}
            canSelectMore={canSelectMorePrep()}
            onToggle={handlePrepToggle}
          />

          {/* Team Status */}
          <TeamStatusPanel
            morale={teamMorale}
            reputation={reputation}
            ownerTrust={ownerTrust}
            corruption={corruptionLevel}
          />
        </div>

        {/* Right Column - Alerts & Game Button */}
        <div className="w-full lg:w-80 space-y-4">
          {/* Alerts */}
          <AlertsSidebar alerts={alerts} />

          {/* League Standings (if league is active) */}
          {leaguePhase !== 'NOT_STARTED' && standings.length > 0 && (
            <LeagueStandingsCompact
              standings={getStandingsSorted()}
              userTeamId={userTeamId || ''}
              onTeamClick={(teamId) => setViewingRosterTeamId(teamId)}
            />
          )}

          {/* Game Day Button */}
          <GameDayButton
            canPlay={canPlay}
            mandatoryRemaining={mandatoryEvents.length}
            onPlayGame={onPlayGame}
          />
        </div>
      </div>

      {/* === EVENT MODAL === */}
      {selectedEvent && !eventResult && (
        <EventResolutionModal
          event={selectedEvent}
          corruptionLevel={corruptionLevel}
          onChoice={handleEventChoice}
          onClose={closeEventModal}
        />
      )}

      {/* === EVENT RESULT MODAL === */}
      {eventResult && (
        <EventResultModal
          result={eventResult}
          onClose={closeEventModal}
        />
      )}

      {/* === PRACTICE FOCUS MODAL === */}
      {showPracticeModal && (
        <PracticeFocusModal
          positions={POSITION_GROUPS}
          onSelect={handlePracticeFocus}
          onClose={() => setShowPracticeModal(false)}
        />
      )}

      {/* === ROSTER MODAL === */}
      {viewingRosterTeamId && (
        <TeamRosterModal
          teamId={viewingRosterTeamId}
          userTeamId={userTeamId || ''}
          userRoster={draftedRoster}
          onClose={() => setViewingRosterTeamId(null)}
        />
      )}
    </div>
  );
};

// =============================================================================
// WEEK HEADER
// =============================================================================

interface WeekHeaderProps {
  week: number;
  opponentName: string;
  opponentRecord: string;
  gameDate: string;
  playerRecord: string;
  ownerMood: { icon: string; text: string; color: string };
}

const WeekHeader: React.FC<WeekHeaderProps> = ({
  week,
  opponentName,
  opponentRecord,
  gameDate,
  playerRecord,
  ownerMood,
}) => {
  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
      <div className="p-6">
        {/* Week Title */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-widest">Week {week}</div>
            <div className="text-3xl font-black text-white">
              vs <span className="text-amber-400">{opponentName}</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {opponentRecord} | {gameDate}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Your Record</div>
            <div className="text-2xl font-bold text-white">{playerRecord}</div>
          </div>
        </div>

        {/* Owner Mood */}
        <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
          <span className="text-2xl">{ownerMood.icon}</span>
          <div>
            <div className="text-xs text-gray-500">Owner Mood</div>
            <div className={`font-bold ${ownerMood.color}`}>{ownerMood.text}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// INVESTIGATION BANNER
// =============================================================================

interface InvestigationBannerProps {
  warning: string;
  heat: number;
}

const InvestigationBanner: React.FC<InvestigationBannerProps> = ({ warning, heat }) => {
  return (
    <div className={`p-4 rounded-lg border ${
      heat >= 60 ? 'bg-red-900/30 border-red-700' : 'bg-yellow-900/30 border-yellow-700'
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔍</span>
        <div>
          <div className={`font-bold ${getHeatColor(heat)}`}>{warning}</div>
          <div className="text-xs text-gray-400 mt-1">
            Be careful with your choices this week.
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// EVENTS SECTION
// =============================================================================

interface EventsSectionProps {
  title: string;
  events: ManagementEvent[];
  onSelectEvent: (event: ManagementEvent) => void;
  isMandatory: boolean;
}

const EventsSection: React.FC<EventsSectionProps> = ({
  title,
  events,
  onSelectEvent,
  isMandatory,
}) => {
  return (
    <div className={`rounded-lg border ${
      isMandatory ? 'border-red-800/50 bg-red-950/20' : 'border-gray-800 bg-gray-900/50'
    }`}>
      <div className={`px-4 py-3 border-b ${
        isMandatory ? 'border-red-800/50' : 'border-gray-800'
      }`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider ${
          isMandatory ? 'text-red-400' : 'text-gray-400'
        }`}>
          {title}
          {isMandatory && (
            <span className="ml-2 text-xs text-red-500">
              ({events.length} remaining)
            </span>
          )}
        </h3>
      </div>

      <div className="p-3 space-y-2">
        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            onSelect={() => onSelectEvent(event)}
          />
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// EVENT CARD
// =============================================================================

interface EventCardProps {
  event: ManagementEvent;
  onSelect: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  return (
    <div className="p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getPriorityIcon(event.priority)}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{event.icon}</span>
            <span className="font-bold text-white">{event.title}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">{event.description}</p>
        </div>
        <button
          onClick={onSelect}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-sm font-bold text-black transition-colors shrink-0"
        >
          HANDLE
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// EVENT RESOLUTION MODAL
// =============================================================================

interface EventResolutionModalProps {
  event: ManagementEvent;
  corruptionLevel: number;
  onChoice: (eventId: string, choiceId: string) => void;
  onClose: () => void;
}

const EventResolutionModal: React.FC<EventResolutionModalProps> = ({
  event,
  corruptionLevel,
  onChoice,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-4 bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
        {/* Image header (if available) */}
        {event.imageUrl ? (
          <div className="relative w-full h-48 overflow-hidden">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative w-full h-24 bg-gradient-to-br from-amber-900/30 via-gray-800 to-gray-900 flex items-center justify-center">
            <span className="text-6xl opacity-50">{event.icon}</span>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
          </div>
        )}

        {/* Character type label */}
        <div className="px-6 pt-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            {event.type.replace(/_/g, ' ')}
          </div>
        </div>

        {/* Title */}
        <div className="px-6 pt-1 pb-2">
          <h2 className="text-2xl font-black text-white">{event.title}</h2>
        </div>

        {/* Description */}
        <div className="px-6 pb-4">
          <p className="text-gray-300 italic leading-relaxed">"{event.detailedDescription}"</p>
        </div>

        {/* Choices - grid layout like screenshot */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {event.choices.map(choice => (
            <ChoiceOptionGrid
              key={choice.id}
              choice={choice}
              corruptionLevel={corruptionLevel}
              onSelect={() => onChoice(event.id, choice.id)}
            />
          ))}
        </div>

        {/* Cancel */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Think about it later
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// CHOICE OPTION
// =============================================================================

interface ChoiceOptionProps {
  choice: EventChoice;
  corruptionLevel: number;
  onSelect: () => void;
}

// Original full-width choice option (kept for reference/alternate layouts)
const _ChoiceOption: React.FC<ChoiceOptionProps> = ({
  choice,
  corruptionLevel,
  onSelect,
}) => {
  const isLocked = choice.requiresCorruption !== undefined && corruptionLevel < choice.requiresCorruption;
  const isDirty = choice.requiresCorruption !== undefined;

  return (
    <button
      onClick={onSelect}
      disabled={isLocked}
      className={`w-full p-4 rounded-lg border text-left transition-all ${
        isLocked
          ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
          : isDirty
          ? 'border-purple-700 bg-purple-900/30 hover:bg-purple-900/50'
          : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700'
      }`}
    >
      <div className="font-medium text-white mb-2">
        {isDirty && <span className="mr-2">😈</span>}
        {choice.text}
      </div>

      {/* Consequences Preview */}
      <div className="space-y-1">
        {choice.consequences.map((consequence, i) => (
          <div key={i} className="text-xs">
            {consequence.hidden || choice.hiddenConsequences ? (
              <span className="text-gray-600">??? - Unknown outcome</span>
            ) : (
              <span className={consequence.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                {consequence.description}
                {consequence.type !== 'DELAYED' && (
                  <span className="ml-1">
                    ({consequence.value >= 0 ? '+' : ''}{consequence.value})
                  </span>
                )}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Locked Reason */}
      {isLocked && (
        <div className="mt-2 text-xs text-purple-400">
          🔒 Requires more... experience
        </div>
      )}
    </button>
  );
};
void _ChoiceOption; // Suppress unused warning

// =============================================================================
// CHOICE OPTION GRID (Screenshot-style layout with tags)
// =============================================================================

const ChoiceOptionGrid: React.FC<ChoiceOptionProps> = ({
  choice,
  corruptionLevel,
  onSelect,
}) => {
  const isLocked = choice.requiresCorruption !== undefined && corruptionLevel < choice.requiresCorruption;
  const isDirty = choice.requiresCorruption !== undefined;

  // Determine tags based on consequences
  const tags: { label: string; color: string }[] = [];

  const hasExpensiveCost = choice.consequences.some(c => c.type === 'MONEY' && c.value < -50000);
  const hasHeatRisk = choice.consequences.some(c => c.type === 'HEAT' && c.value > 0);
  const hasReputationGain = choice.consequences.some(c => c.type === 'REPUTATION' && c.value > 0);
  const hasMoraleGain = choice.consequences.some(c => c.type === 'MORALE' && c.value > 0);
  const hasRisk = choice.hiddenConsequences || choice.consequences.some(c => c.hidden);

  if (hasExpensiveCost) tags.push({ label: 'EXPENSIVE', color: 'bg-amber-700/50 text-amber-300' });
  if (isDirty || hasHeatRisk) tags.push({ label: 'SHADY', color: 'bg-purple-700/50 text-purple-300' });
  if (hasReputationGain || hasMoraleGain) tags.push({ label: 'MORAL', color: 'bg-blue-700/50 text-blue-300' });
  if (!isDirty && !hasHeatRisk && !hasRisk) tags.push({ label: 'SAFE', color: 'bg-green-700/50 text-green-300' });
  if (hasRisk) tags.push({ label: 'RISKY', color: 'bg-red-700/50 text-red-300' });

  // Check for money cost to display
  const moneyCost = choice.consequences.find(c => c.type === 'MONEY' && c.value < 0);

  return (
    <button
      onClick={onSelect}
      disabled={isLocked}
      className={`p-3 rounded-lg border text-left transition-all ${
        isLocked
          ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
          : isDirty
          ? 'border-purple-700/50 bg-purple-900/20 hover:bg-purple-900/40 hover:border-purple-500'
          : 'border-gray-600 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-500'
      }`}
    >
      <div className="font-medium text-white text-sm mb-2">
        {choice.text}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded ${tag.color}`}>
            {tag.label}
          </span>
        ))}
        {moneyCost && (
          <span className="text-xs text-amber-400">
            ${Math.abs(moneyCost.value).toLocaleString()}
          </span>
        )}
      </div>

      {/* Locked Reason */}
      {isLocked && (
        <div className="mt-2 text-xs text-purple-400">
          🔒 Requires more... experience
        </div>
      )}
    </button>
  );
};

// =============================================================================
// EVENT RESULT MODAL
// =============================================================================

interface EventResultModalProps {
  result: EventResult;
  onClose: () => void;
}

const EventResultModal: React.FC<EventResultModalProps> = ({ result, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="p-6 text-center">
          <div className="text-4xl mb-4">✅</div>
          <div className="text-xl font-bold text-white mb-4">Decision Made</div>

          {/* Immediate Effects */}
          <div className="space-y-2 text-left bg-gray-800/50 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase mb-2">Consequences</div>
            {result.immediateEffects.map((effect, i) => (
              <div key={i} className="text-sm text-gray-300">
                • {effect}
              </div>
            ))}
          </div>

          {/* Delayed Effects Warning */}
          {result.delayedEffects.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-900/30 rounded-lg text-left">
              <div className="text-xs text-yellow-500">⏳ Something may come of this later...</div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold text-black transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// PREP SECTION
// =============================================================================

interface PrepSectionProps {
  prepChoices: PrepChoice[];
  canSelectMore: boolean;
  onToggle: (type: PrepChoice['type']) => void;
}

const PrepSection: React.FC<PrepSectionProps> = ({
  prepChoices,
  canSelectMore,
  onToggle,
}) => {
  const selectedCount = prepChoices.filter(p => p.selected).length;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
          Weekly Prep
          <span className="ml-2 text-xs text-gray-600">
            ({selectedCount}/2 selected)
          </span>
        </h3>
      </div>

      <div className="p-3 space-y-2">
        {PREP_OPTIONS.map(option => {
          const prep = prepChoices.find(p => p.type === option.type);
          const isSelected = prep?.selected || false;
          const canSelect = isSelected || canSelectMore;

          return (
            <button
              key={option.type}
              onClick={() => onToggle(option.type)}
              disabled={!canSelect}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-900/30'
                  : canSelect
                  ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  : 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{option.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-white">{option.name}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
                <div className={`w-5 h-5 rounded border ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500'
                    : 'border-gray-600'
                }`}>
                  {isSelected && <span className="text-black text-sm">✓</span>}
                </div>
              </div>
              {prep?.target && (
                <div className="mt-2 text-xs text-amber-400">
                  Focus: {prep.target}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// PRACTICE FOCUS MODAL
// =============================================================================

interface PracticeFocusModalProps {
  positions: string[];
  onSelect: (position: string) => void;
  onClose: () => void;
}

const PracticeFocusModal: React.FC<PracticeFocusModalProps> = ({
  positions,
  onSelect,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">Choose Position Group</h3>
          <p className="text-sm text-gray-500">Which group should practice extra this week?</p>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2">
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => onSelect(pos)}
              className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
            >
              {pos}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TEAM STATUS PANEL
// =============================================================================

interface TeamStatusPanelProps {
  morale: number;
  reputation: number;
  ownerTrust: number;
  corruption: number;
}

const TeamStatusPanel: React.FC<TeamStatusPanelProps> = ({
  morale,
  reputation,
  ownerTrust,
  corruption,
}) => {
  const stats = [
    { label: 'Team Morale', value: morale, color: morale >= 70 ? 'bg-green-500' : morale >= 40 ? 'bg-yellow-500' : 'bg-red-500' },
    { label: 'Reputation', value: reputation, color: reputation >= 70 ? 'bg-blue-500' : reputation >= 40 ? 'bg-gray-500' : 'bg-red-500' },
    { label: 'Owner Trust', value: ownerTrust, color: ownerTrust >= 70 ? 'bg-green-500' : ownerTrust >= 40 ? 'bg-yellow-500' : 'bg-red-500' },
  ];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
        Team Status
      </h3>

      <div className="space-y-3">
        {stats.map(stat => (
          <div key={stat.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">{stat.label}</span>
              <span className="text-white">{stat.value}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${stat.color} transition-all`}
                style={{ width: `${stat.value}%` }}
              />
            </div>
          </div>
        ))}

        {/* Corruption (hidden until > 0) */}
        {corruption > 0 && (
          <div className="pt-2 border-t border-gray-800 mt-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-400">Corruption</span>
              <span className="text-purple-400">{corruption}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all"
                style={{ width: `${corruption}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// ALERTS SIDEBAR
// =============================================================================

interface AlertsSidebarProps {
  alerts: PassiveAlert[];
}

const AlertsSidebar: React.FC<AlertsSidebarProps> = ({ alerts }) => {
  const getAlertIcon = (type: PassiveAlert['type']) => {
    switch (type) {
      case 'INJURY': return '🏥';
      case 'TRADE': return '🔄';
      case 'CONTRACT': return '📝';
      case 'INVESTIGATION': return '🔍';
      case 'NEWS': return '📰';
    }
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
          Alerts
          {alerts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-900/50 rounded-full text-xs text-red-400">
              {alerts.length}
            </span>
          )}
        </h3>
      </div>

      <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-4">
            No alerts this week
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg ${
                alert.urgent ? 'bg-red-900/30 border border-red-800/50' : 'bg-gray-800/50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span>{getAlertIcon(alert.type)}</span>
                <div>
                  <div className="text-sm font-medium text-white">{alert.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{alert.description}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// GAME DAY BUTTON
// =============================================================================

interface GameDayButtonProps {
  canPlay: boolean;
  mandatoryRemaining: number;
  onPlayGame: () => void;
}

const GameDayButton: React.FC<GameDayButtonProps> = ({
  canPlay,
  mandatoryRemaining,
  onPlayGame,
}) => {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <button
        onClick={onPlayGame}
        disabled={!canPlay}
        className={`w-full py-4 rounded-lg text-lg font-black uppercase tracking-wider transition-all ${
          canPlay
            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 shadow-lg shadow-amber-500/30'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        🏈 PLAY GAME
      </button>

      {!canPlay && mandatoryRemaining > 0 && (
        <div className="mt-2 text-center text-xs text-red-400">
          Resolve {mandatoryRemaining} mandatory event{mandatoryRemaining > 1 ? 's' : ''} first
        </div>
      )}

      {canPlay && (
        <div className="mt-2 text-center text-xs text-gray-500">
          All events resolved - ready for game day!
        </div>
      )}
    </div>
  );
};

// =============================================================================
// LEAGUE STANDINGS COMPACT
// =============================================================================

interface LeagueStandingsCompactProps {
  standings: Array<{ teamId: string; wins: number; losses: number }>;
  userTeamId: string;
  onTeamClick: (teamId: string) => void;
}

const LeagueStandingsCompact: React.FC<LeagueStandingsCompactProps> = ({ standings, userTeamId, onTeamClick }) => {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
          League Standings
        </h3>
        <p className="text-xs text-gray-500 mt-1">Tap team to view roster</p>
      </div>

      <div className="p-3 space-y-1">
        {standings.slice(0, 8).map((standing, index) => {
          const isUserTeam = standing.teamId === userTeamId;
          const isPlayoffPosition = index < 4;
          const isPlayoffLine = index === 3;
          const staticTeam = STATIC_TEAMS.find(t => t.info.id === standing.teamId);
          const primaryColor = staticTeam?.info.primaryColor || '#4a5568';
          const abbr = getTeamAbbreviation(standing.teamId);

          return (
            <button
              key={standing.teamId}
              onClick={() => onTeamClick(standing.teamId)}
              className={`w-full flex items-center justify-between p-2 rounded transition-colors cursor-pointer ${
                isUserTeam ? 'bg-blue-900/30 hover:bg-blue-900/50' : 'hover:bg-gray-700/50'
              } ${isPlayoffLine ? 'border-b border-b-blue-500' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 text-xs font-bold ${
                  isPlayoffPosition ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {index + 1}
                </span>

                <div
                  className="w-5 h-5 rounded text-xs flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {abbr.charAt(0)}
                </div>

                <span className={`text-sm ${isUserTeam ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                  {abbr}
                  {isUserTeam && <span className="text-xs text-blue-400/50 ml-1">(You)</span>}
                </span>
              </div>

              <span className="text-sm text-gray-400">
                {standing.wins}-{standing.losses}
              </span>
            </button>
          );
        })}
      </div>

      {/* Playoff indicator */}
      <div className="px-4 py-2 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-gray-500">Top 4 make playoffs</span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TEAM ROSTER MODAL
// =============================================================================

interface TeamRosterModalProps {
  teamId: string;
  userTeamId: string;
  userRoster: Roster | null;
  onClose: () => void;
}

const TeamRosterModal: React.FC<TeamRosterModalProps> = ({ teamId, userTeamId, userRoster, onClose }) => {
  const isUserTeam = teamId === userTeamId;
  const staticTeam = getStaticTeam(teamId);

  // Get the appropriate roster
  const roster: Roster | null = isUserTeam ? userRoster : staticTeam?.roster || null;
  const teamName = isUserTeam ? 'Your Team' : staticTeam?.info.name || 'Unknown Team';
  const teamCity = isUserTeam ? '' : staticTeam?.info.city || '';
  const primaryColor = staticTeam?.info.primaryColor || '#3b82f6';

  if (!roster) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 rounded-lg p-6 max-w-md" onClick={e => e.stopPropagation()}>
          <p className="text-gray-400">No roster data available</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-700 rounded text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Group players by position type using actual Roster structure
  const offense = [
    { label: 'QB', player: roster.offense.QB },
    { label: 'RB', player: roster.offense.RB },
    { label: 'WR1', player: roster.offense.WR1 },
    { label: 'WR2', player: roster.offense.WR2 },
    { label: 'TE', player: roster.offense.TE },
  ];

  const defense = [
    { label: 'LB', player: roster.defense.LB },
    { label: 'CB1', player: roster.defense.CB1 },
    { label: 'CB2', player: roster.defense.CB2 },
    { label: 'S', player: roster.defense.S },
  ];

  const flexLabel = roster.flex.type;
  const flexPlayer = roster.flex.player;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 border-b border-gray-700"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">{teamCity}</div>
              <h2 className="text-xl font-bold text-white">{teamName}</h2>
              {isUserTeam && <span className="text-xs text-blue-400">(Your Team)</span>}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Offense */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <h3 className="text-sm font-bold text-green-400 mb-2">Offense</h3>
            <div className="space-y-1">
              {offense.map(({ label, player }) => (
                <div key={label} className="flex justify-between text-sm py-1">
                  <span className="text-gray-500 w-12">{label}</span>
                  <span className="text-gray-300 flex-1">{player.firstName} {player.lastName}</span>
                  <span className="text-gray-500">OVR {player.overall}</span>
                </div>
              ))}
            </div>
            {/* O-Line Unit */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 w-12">OL</span>
                <span className="text-gray-300 flex-1">{roster.offense.OL.name}</span>
                <span className="text-gray-500">OVR {roster.offense.OL.overall}</span>
              </div>
              <div className="text-xs text-gray-600 ml-12 mt-1">
                Pass Block: {roster.offense.OL.passBlockRating} | Run Block: {roster.offense.OL.runBlockRating}
              </div>
            </div>
          </div>

          {/* Defense */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <h3 className="text-sm font-bold text-blue-400 mb-2">Defense</h3>
            <div className="space-y-1">
              {defense.map(({ label, player }) => (
                <div key={label} className="flex justify-between text-sm py-1">
                  <span className="text-gray-500 w-12">{label}</span>
                  <span className="text-gray-300 flex-1">{player.firstName} {player.lastName}</span>
                  <span className="text-gray-500">OVR {player.overall}</span>
                </div>
              ))}
            </div>
            {/* D-Line Unit */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 w-12">DL</span>
                <span className="text-gray-300 flex-1">{roster.defense.DL.name}</span>
                <span className="text-gray-500">OVR {roster.defense.DL.overall}</span>
              </div>
              <div className="text-xs text-gray-600 ml-12 mt-1">
                Pass Rush: {roster.defense.DL.passRushRating} | Run Stop: {roster.defense.DL.runStopRating}
              </div>
            </div>
          </div>

          {/* Flex Player */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <h3 className="text-sm font-bold text-amber-400 mb-2">Flex</h3>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500 w-12">{flexLabel}</span>
              <span className="text-gray-300 flex-1">{flexPlayer.firstName} {flexPlayer.lastName}</span>
              <span className="text-gray-500">OVR {flexPlayer.overall}</span>
            </div>
          </div>

          {/* Special Teams */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <h3 className="text-sm font-bold text-purple-400 mb-2">Special Teams</h3>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500 w-12">K/P</span>
              <span className="text-gray-300 flex-1">{roster.specialTeams.KP.firstName} {roster.specialTeams.KP.lastName}</span>
              <span className="text-gray-500">OVR {roster.specialTeams.KP.overall}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export default WeeklyDashboard;
