/**
 * Desk Page
 *
 * Main page that wraps the Desk component with the event system hook.
 * This is the entry point for the dashboard/management view.
 */

import React, { useEffect, useCallback } from 'react';
import { Desk } from './Desk';
import { useEventSystem } from '../../hooks/useEventSystem';

interface DeskPageProps {
  teamName?: string;
  ownerId?: string;
  onStartGame?: () => void;
  onGameOver?: (reason: 'FIRED' | 'INDICTED') => void;
}

export const DeskPage: React.FC<DeskPageProps> = ({
  teamName = 'Moles',
  ownerId = 'tex',
  onStartGame,
  onGameOver,
}) => {
  const eventSystem = useEventSystem({
    ownerId,
    onGameOver,
  });

  // Track wins/losses from game state (placeholder for now)
  const record = { wins: 2, losses: 1 };

  // Select event when day changes or on initial load
  useEffect(() => {
    if (!eventSystem.currentEvent && eventSystem.state.currentDay !== 'SUNDAY') {
      eventSystem.selectEvent();
    }
  }, [eventSystem.state.currentDay]);

  // Handle advancing to next day
  const handleAdvanceDay = useCallback(() => {
    eventSystem.advanceToNextDay();
  }, [eventSystem]);

  // Handle selecting event (called after advancing)
  const handleSelectEvent = useCallback(() => {
    eventSystem.selectEvent();
  }, [eventSystem]);

  // Handle dismissing result
  const handleDismissResult = useCallback(() => {
    eventSystem.dismissEvent();
  }, [eventSystem]);

  // Handle game over
  useEffect(() => {
    if (eventSystem.gameOver.fired) {
      onGameOver?.('FIRED');
    } else if (eventSystem.gameOver.indicted) {
      onGameOver?.('INDICTED');
    }
  }, [eventSystem.gameOver, onGameOver]);

  return (
    <Desk
      eventState={eventSystem.state}
      owner={eventSystem.owner}
      record={record}
      teamName={teamName}
      currentEvent={eventSystem.currentEvent}
      lastResult={eventSystem.lastResult}
      onSelectEvent={handleSelectEvent}
      onMakeChoice={eventSystem.makeChoice}
      onAdvanceDay={handleAdvanceDay}
      onDismissResult={handleDismissResult}
      onStartGame={onStartGame}
    />
  );
};

export default DeskPage;
