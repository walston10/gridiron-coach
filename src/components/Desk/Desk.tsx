/**
 * Desk Component
 *
 * The main dashboard - a top-down view of the GM's desk.
 * GTA-style dark aesthetic with neon accents.
 */

import React, { useState } from 'react';
import type { GameEvent, Choice, ChoiceResult, EventSystemState } from '../../types/Events';
import type { Owner } from '../../types/Owner';
import { DeskMeters } from './DeskMeters';
import { DeskOwnerPhoto } from './DeskOwnerPhoto';
import { DeskCalendar } from './DeskCalendar';
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

export interface DeskProps {
  eventState: EventSystemState;
  owner: Owner;
  record: { wins: number; losses: number };
  teamName: string;
  currentEvent: GameEvent | null;
  lastResult: ChoiceResult | null;
  onSelectEvent: () => void;
  onMakeChoice: (choice: Choice) => void;
  onAdvanceDay: () => void;
  onDismissResult: () => void;
  onStartGame?: () => void;
}

export const Desk: React.FC<DeskProps> = ({
  eventState,
  owner,
  record,
  teamName,
  currentEvent,
  lastResult,
  onMakeChoice,
  onAdvanceDay,
  onDismissResult,
  onStartGame,
  onSelectEvent,
}) => {
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [showComputerModal, setShowComputerModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  const triggerObject = currentEvent ? getEventTriggerObject(currentEvent) : null;
  const isGameDay = eventState.currentDay === 'SUNDAY';

  // Handle clicking on objects with pending events
  const handleEventTrigger = () => {
    if (currentEvent) {
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

  const handleChoice = (choice: Choice) => {
    onMakeChoice(choice);
  };

  const handleContinue = () => {
    setShowEventModal(false);
    onDismissResult();
  };

  const handleAdvanceDay = () => {
    onAdvanceDay();
    onSelectEvent();
  };

  // Generate headline
  const headline = currentEvent
    ? currentEvent.title.toUpperCase()
    : eventState.hidden.heat >= 50
    ? 'SOURCES: INVESTIGATION LOOMS'
    : eventState.hidden.ownerPatience < 30
    ? 'COACH ON THE HOT SEAT?'
    : `WEEK ${eventState.currentWeek} UNDERWAY`;

  return (
    <div className="relative w-full h-screen bg-stone-950 overflow-hidden">
      {/* Dark wood desk surface */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg,
              #1a1512 0%,
              #231c17 20%,
              #2a211a 50%,
              #1f1914 80%,
              #0f0c0a 100%
            )
          `,
        }}
      />

      {/* Subtle wood grain texture */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              rgba(139, 90, 43, 0.1) 1px,
              transparent 2px,
              transparent 20px
            ),
            repeating-linear-gradient(
              85deg,
              transparent 0px,
              rgba(101, 67, 33, 0.08) 1px,
              transparent 3px,
              transparent 40px
            )
          `,
        }}
      />

      {/* Desk lamp glow (top-left) */}
      <div
        className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(255,180,100,0.3) 0%, transparent 70%)',
        }}
      />

      {/* Main layout */}
      <div className="relative h-full flex flex-col p-6">
        {/* Top bar - Owner, Team info, Record */}
        <div className="flex justify-between items-start mb-4 z-10">
          {/* Owner photo */}
          <DeskOwnerPhoto
            owner={owner}
            patience={eventState.hidden.ownerPatience}
            hasEvent={triggerObject === 'owner'}
            onClick={handleOwnerClick}
          />

          {/* Center - Event/Visitor notification */}
          {currentEvent && triggerObject !== 'owner' && (
            <button
              onClick={handleEventTrigger}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600
                         rounded-sm text-white font-black uppercase tracking-wider
                         shadow-lg shadow-orange-900/50 hover:from-amber-500 hover:to-orange-500
                         transform hover:scale-105 transition-all animate-pulse"
            >
              <span className="text-sm opacity-80">
                {triggerObject === 'phone' ? '📞 INCOMING CALL' : '🚪 VISITOR'}
              </span>
              <div className="text-lg">{currentEvent.character.replace('_', ' ')}</div>
            </button>
          )}

          {/* Team info - right side */}
          <div className="text-right">
            <div className="text-amber-500/60 text-xs font-bold tracking-widest">
              WEEK {eventState.currentWeek} — {eventState.currentDay}
            </div>
            <div className="text-white font-black text-2xl tracking-tight">
              {teamName} <span className="text-amber-500">{record.wins}-{record.losses}</span>
            </div>
            <div className="text-emerald-400 text-sm font-mono">
              SLUSH FUND <span className="font-bold">${eventState.hidden.slushFund.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Main desk area - 2x2 grid on left, meters/calendar on right */}
        <div className="flex-1 flex gap-4">
          {/* Left side - 2x2 tile grid */}
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4">
            {/* Newspaper tile */}
            <div
              className="relative rounded-sm overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <div className="absolute inset-0 border border-stone-700/30" />
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between border-b border-amber-900/30 pb-2 mb-2">
                  <div className="text-amber-600/80 font-serif text-xs font-bold tracking-widest">
                    TRIBUNE
                  </div>
                  <div className="text-stone-600 text-[10px]">EST. 1923</div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <h2 className="text-stone-300 font-black text-lg text-center leading-tight font-serif">
                    {headline}
                  </h2>
                </div>
                <div className="space-y-1 opacity-30">
                  <div className="h-0.5 bg-stone-600 w-full" />
                  <div className="h-0.5 bg-stone-600 w-10/12" />
                  <div className="h-0.5 bg-stone-600 w-full" />
                </div>
              </div>
            </div>

            {/* Phone tile */}
            <button
              onClick={triggerObject === 'phone' ? handleEventTrigger : undefined}
              disabled={triggerObject !== 'phone'}
              className={`relative rounded-sm overflow-hidden transition-all ${
                triggerObject === 'phone' ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default opacity-60'
              }`}
              style={{
                background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
                boxShadow: triggerObject === 'phone'
                  ? '0 0 20px rgba(251, 191, 36, 0.3), inset 0 2px 4px rgba(0,0,0,0.5)'
                  : 'inset 0 2px 4px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <div className="absolute inset-0 border border-stone-700/30" />
              <div className="p-4 h-full flex flex-col items-center justify-center">
                <div className={`text-4xl mb-2 ${triggerObject === 'phone' ? 'animate-bounce' : ''}`}>
                  📞
                </div>
                <div className="text-stone-400 text-sm font-bold uppercase tracking-wider">
                  Phone
                </div>
                {triggerObject === 'phone' && (
                  <div className="text-amber-400 text-xs mt-2 animate-pulse font-bold">
                    RINGING...
                  </div>
                )}
              </div>
            </button>

            {/* Computer tile */}
            <button
              onClick={() => setShowComputerModal(true)}
              className="relative rounded-sm overflow-hidden transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="absolute inset-0 border border-slate-700/30" />
              <div className="p-4 h-full flex flex-col items-center justify-center">
                <div className="w-16 h-12 bg-cyan-500 rounded-sm flex items-center justify-center mb-2">
                  <div className="w-12 h-8 bg-cyan-900 rounded-sm" />
                </div>
                <div className="text-white font-bold text-sm">COMPUTER</div>
                <div className="text-stone-500 text-xs mt-1">Roster • Schedule</div>
              </div>
            </button>

            {/* Files tile */}
            <button
              onClick={() => setShowFilesModal(true)}
              className="relative rounded-sm overflow-hidden transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #422006 0%, #27170a 100%)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="absolute inset-0 border border-amber-900/30" />
              <div className="p-4 h-full flex flex-col items-center justify-center">
                <div className="w-12 h-16 bg-amber-600 rounded-sm relative mb-2">
                  <div className="absolute top-2 left-1 right-1 h-3 bg-red-600 rounded-sm text-[8px] text-white font-bold flex items-center justify-center">
                    COACH
                  </div>
                </div>
                <div className="text-white font-bold text-sm">FILES</div>
                <div className="text-stone-500 text-xs mt-1">Playbook • Scouting</div>
              </div>
            </button>
          </div>

          {/* Right side - Meters and Calendar */}
          <div className="w-64 flex flex-col gap-4">
            <DeskMeters meters={eventState.meters} />
            <DeskCalendar
              currentWeek={eventState.currentWeek}
              currentDay={eventState.currentDay}
              isGameDay={isGameDay}
              onAdvance={isGameDay ? onStartGame : handleAdvanceDay}
            />
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
        <ComputerModal onClose={() => setShowComputerModal(false)} />
      )}

      {showFilesModal && (
        <FilesModal onClose={() => setShowFilesModal(false)} />
      )}

      {lastResult && !showEventModal && (
        <ResultModal result={lastResult} onContinue={onDismissResult} />
      )}
    </div>
  );
};

export default Desk;
