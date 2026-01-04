/**
 * Mobile Controls Hook
 *
 * Unified hook for mobile-first gameplay controls.
 * Handles touch/mouse input, offense/defense controls, and game actions.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { InputHandler, createInputHandler, destroyInputHandler } from '../engine/inputHandler';
import { OffenseControls } from '../engine/offenseControls';
import { DefenseControls } from '../engine/defenseControls';
import type { GameEngine } from '../engine/GameEngine';
import type { GestureEvent, InputState, Point, GestureTarget } from '../types/input.types';
import type { ControlPhase, ControlledPlayer, BlockShedPrompt, GameAction } from '../types/gameplay.types';
import type { GameState, FieldPlayer } from '../types/GameSim';

interface UseMobileControlsOptions {
  /** Game engine instance */
  engine: GameEngine | null;
  /** DOM element for touch/mouse input handling */
  canvas: HTMLElement | null;
  /** Whether user is on offense or defense */
  side: 'offense' | 'defense';
  /** Function to convert screen coords to field coords */
  screenToField?: (pos: Point) => Point;
  /** Callback when an action is executed */
  onAction?: (action: GameAction) => void;
}

interface UseMobileControlsReturn {
  /** Currently controlled player info */
  controlledPlayer: ControlledPlayer | null;
  /** Current control phase */
  phase: ControlPhase;
  /** Selected defender ID (defense only) */
  selectedDefender: string | null;
  /** Block shed prompt if active */
  blockShedPrompt: BlockShedPrompt | null;
  /** Select a specific defender */
  selectDefender: (playerId: string) => void;
  /** Auto-select best defender */
  autoSelectDefender: () => void;
  /** Get input handler instance */
  inputHandler: InputHandler | null;
}

export function useMobileControls({
  engine,
  canvas,
  side,
  screenToField,
  onAction,
}: UseMobileControlsOptions): UseMobileControlsReturn {
  const [phase, setPhase] = useState<ControlPhase>('play-dead');
  const [controlledPlayer, setControlledPlayer] = useState<ControlledPlayer | null>(null);
  const [selectedDefender, setSelectedDefender] = useState<string | null>(null);
  const [blockShedPrompt, setBlockShedPrompt] = useState<BlockShedPrompt | null>(null);

  const inputHandlerRef = useRef<InputHandler | null>(null);
  const offenseControlsRef = useRef<OffenseControls | null>(null);
  const defenseControlsRef = useRef<DefenseControls | null>(null);

  // Initialize control systems when engine is available
  useEffect(() => {
    if (!engine) return;

    offenseControlsRef.current = new OffenseControls(engine);
    defenseControlsRef.current = new DefenseControls(engine);

    return () => {
      offenseControlsRef.current = null;
      defenseControlsRef.current = null;
    };
  }, [engine]);

  // Find player at field position (for gesture targeting)
  const findPlayerAtPos = useCallback(
    (fieldPos: Point): GestureTarget | undefined => {
      if (!engine) return undefined;

      const state = engine.getState();
      const hitRadius = 12; // ~4 yards

      // Check offensive players
      for (const player of state.offensivePlayers) {
        const dx = player.location.x - fieldPos.x;
        const dy = player.location.y - fieldPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < hitRadius) {
          return {
            type: 'player',
            playerId: player.id,
            team: 'offense',
          };
        }
      }

      // Check defensive players
      for (const player of state.defensivePlayers) {
        const dx = player.location.x - fieldPos.x;
        const dy = player.location.y - fieldPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < hitRadius) {
          return {
            type: 'player',
            playerId: player.id,
            team: 'defense',
          };
        }
      }

      return undefined;
    },
    [engine]
  );

  // Handle gesture events
  const handleGesture = useCallback(
    (gesture: GestureEvent) => {
      if (!engine) return;

      const controls = side === 'offense' ? offenseControlsRef.current : defenseControlsRef.current;
      if (!controls) return;

      let action;
      if (side === 'offense' && offenseControlsRef.current) {
        action = offenseControlsRef.current.handleGesture(gesture, phase, controlledPlayer);
        if (action) {
          offenseControlsRef.current.executeAction(action);
          onAction?.({ side: 'offense', action });
        }
      } else if (side === 'defense' && defenseControlsRef.current) {
        action = defenseControlsRef.current.handleGesture(gesture, phase, controlledPlayer);
        if (action) {
          defenseControlsRef.current.executeAction(action);
          onAction?.({ side: 'defense', action });

          // Update selected defender if changed
          if (action.type === 'select-defender') {
            setSelectedDefender(action.playerId);
          }
        }
      }
    },
    [engine, side, phase, controlledPlayer, onAction]
  );

  // Handle continuous input state
  const handleInputState = useCallback(
    (state: InputState) => {
      if (!engine) return;

      let action;
      if (side === 'offense' && offenseControlsRef.current) {
        action = offenseControlsRef.current.handleInputState(state, phase, controlledPlayer);
        if (action) {
          offenseControlsRef.current.executeAction(action);
        }
      } else if (side === 'defense' && defenseControlsRef.current) {
        action = defenseControlsRef.current.handleInputState(state, phase, controlledPlayer);
        if (action) {
          defenseControlsRef.current.executeAction(action);
        }
      }
    },
    [engine, side, phase, controlledPlayer]
  );

  // Initialize input handler when canvas is available
  // IMPORTANT: Only recreate when canvas changes, not when callbacks change
  // Otherwise, ongoing gestures are interrupted when phase/controlledPlayer updates
  useEffect(() => {
    if (!canvas) return;

    inputHandlerRef.current = createInputHandler({
      canvas,
      onGesture: handleGesture,
      onInputState: handleInputState,
      screenToField,
      findPlayerAtPos,
    });

    return () => {
      destroyInputHandler();
      inputHandlerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas]);

  // Update callbacks dynamically without recreating the InputHandler
  // This preserves gesture state (like isActive) during gameplay
  useEffect(() => {
    if (inputHandlerRef.current) {
      inputHandlerRef.current.setOnGesture(handleGesture);
      inputHandlerRef.current.setOnInputState(handleInputState);
    }
  }, [handleGesture, handleInputState]);

  // Update coordinate converters dynamically
  useEffect(() => {
    if (inputHandlerRef.current) {
      if (screenToField) {
        inputHandlerRef.current.setScreenToField(screenToField);
      }
      inputHandlerRef.current.setFindPlayerAtPos(findPlayerAtPos);
    }
  }, [screenToField, findPlayerAtPos]);

  // Update phase based on game state
  useEffect(() => {
    if (!engine) return;

    const updatePhase = () => {
      const state = engine.getState();

      switch (state.phase) {
        case 'HUDDLE':
        case 'BREAKING_HUDDLE':
        case 'PRE_SNAP':
          setPhase(side === 'offense' ? 'pre-snap-offense' : 'pre-snap-defense');
          break;

        case 'SNAP':
        case 'ACTIVE':
          if (state.passFlight) {
            setPhase('ball-in-air');
          } else {
            setPhase(side === 'offense' ? 'live-offense' : 'live-defense');
          }
          break;

        case 'TACKLE':
        case 'WHISTLE':
          setPhase('play-dead');
          break;

        default:
          setPhase('play-dead');
      }
    };

    // Update immediately
    updatePhase();

    // Set up interval to check for updates
    const interval = setInterval(updatePhase, 50);

    return () => clearInterval(interval);
  }, [engine, side]);

  // Update controlled player based on game state
  useEffect(() => {
    if (!engine) return;

    const updateControlled = () => {
      const state = engine.getState();

      if (side === 'offense') {
        // Control ball carrier
        const ballCarrierId = state.ballCarrier;
        if (ballCarrierId) {
          const player = state.offensivePlayers.find((p) => p.id === ballCarrierId);
          if (player) {
            const isQB = player.id.toLowerCase() === 'qb' || player.rosterPosition === 'QB';
            setControlledPlayer({
              playerId: player.id,
              role: isQB ? 'qb' : 'runner',
              hasBall: true,
              isBlocked: false,
            });
            return;
          }
        }
        setControlledPlayer(null);
      } else {
        // Control selected defender
        if (selectedDefender) {
          const player = state.defensivePlayers.find((p) => p.id === selectedDefender);
          if (player) {
            const isBlocked = player.engagementState === 'ENGAGED';

            // Update block shed prompt if blocked
            if (isBlocked && defenseControlsRef.current) {
              const prompt = defenseControlsRef.current.getBlockShedPrompt();
              setBlockShedPrompt(prompt);
            } else {
              setBlockShedPrompt(null);
            }

            setControlledPlayer({
              playerId: player.id,
              role: 'defender',
              hasBall: false,
              isBlocked,
            });
            return;
          }
        }
        setControlledPlayer(null);
      }
    };

    const interval = setInterval(updateControlled, 50);
    return () => clearInterval(interval);
  }, [engine, side, selectedDefender]);

  // Public methods
  const selectDefender = useCallback((playerId: string) => {
    setSelectedDefender(playerId);
    defenseControlsRef.current?.setSelectedDefender(playerId);
  }, []);

  const autoSelectDefender = useCallback(() => {
    if (defenseControlsRef.current) {
      const id = defenseControlsRef.current.autoSelectDefender();
      if (id) {
        setSelectedDefender(id);
      }
    }
  }, []);

  return {
    controlledPlayer,
    phase,
    selectedDefender,
    blockShedPrompt,
    selectDefender,
    autoSelectDefender,
    inputHandler: inputHandlerRef.current,
  };
}

export default useMobileControls;
