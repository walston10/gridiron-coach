/**
 * Desk Component
 *
 * The main dashboard - a top-down view of the GM's desk.
 * All game management happens through interacting with desk objects.
 */

import React, { useState, useEffect } from 'react';
import type { GameEvent, Choice, ChoiceResult, Meters, EventSystemState } from '../../types/Events';
import type { Owner } from '../../types/Owner';
import { DeskInfoBar } from './DeskInfoBar';
import { DeskMeters } from './DeskMeters';
import { DeskOwnerPhoto } from './DeskOwnerPhoto';
import { DeskPhone } from './DeskPhone';
import { DeskComputer } from './DeskComputer';
import { DeskFiles } from './DeskFiles';
import { DeskNewspaper } from './DeskNewspaper';
import { DeskCalendar } from './DeskCalendar';
import { DeskDoor } from './DeskDoor';
import { DeskWhiskey } from './DeskWhiskey';
import { EventModal } from '../Modals/EventModal';
import { OwnerModal } from '../Modals/OwnerModal';
import { ComputerModal } from '../Modals/ComputerModal';
import { FilesModal } from '../Modals/FilesModal';
import { ResultModal } from '../Modals/ResultModal';

// Determine which desk object an event should trigger
type EventTriggerObject = 'phone' | 'door' | 'newspaper' | 'computer' | 'owner';

function getEventTriggerObject(event: GameEvent): EventTriggerObject {
  switch (event.character) {
    case 'AGENT':
    case 'SHADY_FIGURE':
      return 'phone';
    case 'PLAYER':
    case 'REPORTER':
    case 'DOCTOR':
    case 'LEAGUE_REP':
      return 'door';
    case 'OWNER':
      return 'owner';
    default:
      return 'door';
  }
}

// Visual state based on game situation
type DeskMood = 'calm' | 'tense' | 'investigation' | 'winning' | 'losing';

function getDeskMood(state: EventSystemState, record: { wins: number; losses: number }): DeskMood {
  if (state.hidden.heat >= 50) return 'investigation';
  if (state.hidden.heat >= 30) return 'tense';
  if (state.hidden.ownerPatience < 40) return 'losing';
  if (record.wins >= 3 && record.wins > record.losses) return 'winning';
  return 'calm';
}

const MOOD_STYLES: Record<DeskMood, { bg: string; overlay: string; ambientClass: string }> = {
  calm: {
    bg: 'from-amber-950/20 via-stone-900 to-stone-950',
    overlay: 'bg-amber-500/5',
    ambientClass: 'shadow-amber-900/20',
  },
  tense: {
    bg: 'from-orange-950/30 via-stone-900 to-stone-950',
    overlay: 'bg-orange-500/10',
    ambientClass: 'shadow-orange-900/30',
  },
  investigation: {
    bg: 'from-red-950/40 via-stone-950 to-black',
    overlay: 'bg-red-500/10',
    ambientClass: 'shadow-red-900/40',
  },
  winning: {
    bg: 'from-amber-900/30 via-stone-800 to-stone-900',
    overlay: 'bg-amber-400/10',
    ambientClass: 'shadow-amber-500/30',
  },
  losing: {
    bg: 'from-slate-950 via-stone-950 to-black',
    overlay: 'bg-slate-500/5',
    ambientClass: 'shadow-slate-900/50',
  },
};

export interface DeskProps {
  // Game state
  eventState: EventSystemState;
  owner: Owner;
  record: { wins: number; losses: number };
  teamName: string;

  // Current event
  currentEvent: GameEvent | null;
  lastResult: ChoiceResult | null;

  // Actions
  onSelectEvent: () => void;
  onMakeChoice: (choice: Choice) => void;
  onAdvanceDay: () => void;
  onDismissResult: () => void;

  // Optional: navigation to game
  onStartGame?: () => void;
}

export const Desk: React.FC<DeskProps> = ({
  eventState,
  owner,
  record,
  teamName,
  currentEvent,
  lastResult,
  onSelectEvent,
  onMakeChoice,
  onAdvanceDay,
  onDismissResult,
  onStartGame,
}) => {
  // Modal states
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [showComputerModal, setShowComputerModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Determine what's triggering
  const triggerObject = currentEvent ? getEventTriggerObject(currentEvent) : null;
  const deskMood = getDeskMood(eventState, record);
  const moodStyle = MOOD_STYLES[deskMood];

  // Calculate stress level for whiskey glass (0-100)
  const stressLevel = Math.min(100, eventState.hidden.heat + (100 - eventState.hidden.ownerPatience) / 2);

  // Handle clicking on objects with pending events
  const handlePhoneClick = () => {
    if (triggerObject === 'phone' && currentEvent) {
      setShowEventModal(true);
    }
  };

  const handleDoorClick = () => {
    if (triggerObject === 'door' && currentEvent) {
      setShowEventModal(true);
    }
  };

  const handleOwnerClick = () => {
    if (triggerObject === 'owner' && currentEvent) {
      setShowEventModal(true);
    } else {
      setShowOwnerModal(true);
    }
  };

  const handleNewspaperClick = () => {
    if (triggerObject === 'newspaper' && currentEvent) {
      setShowEventModal(true);
    }
  };

  // Handle choice made in event modal
  const handleChoice = (choice: Choice) => {
    onMakeChoice(choice);
    // Modal stays open to show result
  };

  // Handle continuing after result
  const handleContinue = () => {
    setShowEventModal(false);
    onDismissResult();
  };

  // Handle advancing day
  const handleAdvanceDay = () => {
    onAdvanceDay();
    // This might trigger a new event
    onSelectEvent();
  };

  // Check if it's game day
  const isGameDay = eventState.currentDay === 'SUNDAY';

  return (
    <div className={`relative w-full h-screen bg-gradient-to-b ${moodStyle.bg} overflow-hidden`}>
      {/* Ambient overlay */}
      <div className={`absolute inset-0 ${moodStyle.overlay} pointer-events-none`} />

      {/* Wood grain texture overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main desk layout */}
      <div className="relative h-full flex flex-col p-4 md:p-8">
        {/* Top row - Info bar and owner photo */}
        <div className="flex justify-between items-start mb-6">
          <DeskOwnerPhoto
            owner={owner}
            patience={eventState.hidden.ownerPatience}
            hasEvent={triggerObject === 'owner'}
            onClick={handleOwnerClick}
          />

          {/* Door/Window area (background) */}
          <DeskDoor
            hasVisitor={triggerObject === 'door'}
            visitorType={currentEvent?.character}
            onClick={handleDoorClick}
          />

          <DeskInfoBar
            week={eventState.currentWeek}
            day={eventState.currentDay}
            teamName={teamName}
            record={record}
            slushFund={eventState.hidden.slushFund}
          />
        </div>

        {/* Desk surface */}
        <div
          className={`flex-1 relative bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950
                      rounded-lg border border-stone-700/50 shadow-2xl ${moodStyle.ambientClass}
                      p-6 md:p-8`}
        >
          {/* Desk objects layout */}
          <div className="h-full grid grid-cols-12 grid-rows-6 gap-4">
            {/* Top row of desk - Phone, Computer, Files */}
            <div className="col-span-3 row-span-2">
              <DeskPhone
                isRinging={triggerObject === 'phone'}
                onClick={handlePhoneClick}
              />
            </div>

            <div className="col-span-4 row-span-2">
              <DeskComputer onClick={() => setShowComputerModal(true)} />
            </div>

            <div className="col-span-3 row-span-2">
              <DeskFiles onClick={() => setShowFilesModal(true)} />
            </div>

            {/* Meters on the right */}
            <div className="col-span-2 row-span-4 row-start-1">
              <DeskMeters meters={eventState.meters} />
            </div>

            {/* Middle row - Newspaper */}
            <div className="col-span-6 row-span-2 col-start-1 row-start-3">
              <DeskNewspaper
                headline={getHeadline(currentEvent, eventState, record)}
                hasEvent={triggerObject === 'newspaper'}
                onClick={handleNewspaperClick}
              />
            </div>

            {/* Bottom row - Whiskey and Calendar */}
            <div className="col-span-2 row-span-2 row-start-5">
              <DeskWhiskey fillLevel={stressLevel} />
            </div>

            <div className="col-span-4 row-span-2 row-start-5">
              <DeskCalendar
                currentWeek={eventState.currentWeek}
                currentDay={eventState.currentDay}
                isGameDay={isGameDay}
                onAdvance={isGameDay ? onStartGame : handleAdvanceDay}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEventModal && currentEvent && (
        <EventModal
          event={currentEvent}
          slushFund={eventState.hidden.slushFund}
          shadyActionCounts={eventState.shadyActionCounts}
          result={lastResult}
          onChoice={handleChoice}
          onContinue={handleContinue}
          onClose={() => setShowEventModal(false)}
        />
      )}

      {showOwnerModal && (
        <OwnerModal
          owner={owner}
          patience={eventState.hidden.ownerPatience}
          onClose={() => setShowOwnerModal(false)}
        />
      )}

      {showComputerModal && (
        <ComputerModal
          onClose={() => setShowComputerModal(false)}
        />
      )}

      {showFilesModal && (
        <FilesModal
          onClose={() => setShowFilesModal(false)}
        />
      )}

      {lastResult && !showEventModal && (
        <ResultModal
          result={lastResult}
          onContinue={onDismissResult}
        />
      )}
    </div>
  );
};

// Helper to generate newspaper headlines
function getHeadline(
  event: GameEvent | null,
  state: EventSystemState,
  record: { wins: number; losses: number }
): string {
  if (event) {
    // Event-specific headlines
    return event.title.toUpperCase();
  }

  // Context-based generic headlines
  if (state.hidden.heat >= 75) {
    return 'FEDS CIRCLING PROGRAM';
  }
  if (state.hidden.heat >= 50) {
    return 'SOURCES: INVESTIGATION LOOMS';
  }
  if (state.hidden.ownerPatience < 30) {
    return 'COACH ON THE HOT SEAT?';
  }
  if (record.wins > record.losses && record.wins >= 3) {
    return 'TEAM SURGING TOWARD PLAYOFFS';
  }
  if (record.losses > record.wins && record.losses >= 3) {
    return 'SEASON SPIRALING OUT OF CONTROL';
  }

  return `WEEK ${state.currentWeek} PREP CONTINUES`;
}

export default Desk;
