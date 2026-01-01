import { useEffect, useRef, useCallback } from 'react';
import type { Vector2 } from '../types/GameSim';

interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

interface UseInputHandlerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onMove: (direction: Vector2) => void;
  onSnap: () => void;
  onThrow: (location: Vector2) => void;
  onHandoff: () => void;
  onNextPlay: () => void;
  phase: 'PRE_SNAP' | 'SNAP' | 'ACTIVE' | 'TACKLE' | 'WHISTLE';
  enabled?: boolean;
}

export function useInputHandler({
  canvasRef,
  onMove,
  onSnap,
  onThrow,
  onHandoff,
  onNextPlay,
  phase,
  enabled = true,
}: UseInputHandlerProps) {
  const inputState = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
  });

  const animationFrameRef = useRef<number | null>(null);

  // Convert canvas click to field coordinates
  const canvasToField = useCallback((e: MouseEvent): Vector2 | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [canvasRef]);

  // Movement loop - runs every frame when keys are held
  const updateMovement = useCallback(() => {
    const state = inputState.current;

    const direction: Vector2 = { x: 0, y: 0 };

    if (state.up) direction.y = 1;    // Up field (toward opponent endzone)
    if (state.down) direction.y = -1; // Back
    if (state.left) direction.x = -1;
    if (state.right) direction.x = 1;

    // Normalize diagonal movement
    if (direction.x !== 0 && direction.y !== 0) {
      direction.x *= 0.707;
      direction.y *= 0.707;
    }

    // Sprint multiplier
    if (state.sprint && (direction.x !== 0 || direction.y !== 0)) {
      direction.x *= 1.5;
      direction.y *= 1.5;
    }

    if (direction.x !== 0 || direction.y !== 0) {
      onMove(direction);
    }

    animationFrameRef.current = requestAnimationFrame(updateMovement);
  }, [onMove]);

  // Keyboard handlers
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for game keys
      if (['w', 'a', 's', 'd', ' ', 'e', 'Enter'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      switch (e.key.toLowerCase()) {
        case 'w':
          inputState.current.up = true;
          break;
        case 's':
          inputState.current.down = true;
          break;
        case 'a':
          inputState.current.left = true;
          break;
        case 'd':
          inputState.current.right = true;
          break;
        case 'shift':
          inputState.current.sprint = true;
          break;
        case ' ': // Space
          if (phase === 'PRE_SNAP') {
            onSnap();
          }
          // Future: dive/truck when ball carrier
          break;
        case 'e': // Handoff
          if (phase === 'SNAP') {
            onHandoff();
          }
          break;
        case 'enter':
          if (phase === 'WHISTLE') {
            onNextPlay();
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
          inputState.current.up = false;
          break;
        case 's':
          inputState.current.down = false;
          break;
        case 'a':
          inputState.current.left = false;
          break;
        case 'd':
          inputState.current.right = false;
          break;
        case 'shift':
          inputState.current.sprint = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, phase, onSnap, onHandoff, onNextPlay]);

  // Start/stop movement loop based on phase
  useEffect(() => {
    if (!enabled) return;

    if (phase === 'SNAP' || phase === 'ACTIVE') {
      animationFrameRef.current = requestAnimationFrame(updateMovement);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, phase, updateMovement]);

  // Mouse click handler for passing
  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      if (phase !== 'SNAP') return; // Can only throw right after snap

      const fieldLocation = canvasToField(e);
      if (fieldLocation) {
        onThrow(fieldLocation);
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [enabled, phase, canvasRef, canvasToField, onThrow]);

  // Clear input state when disabled or phase changes to whistle
  useEffect(() => {
    if (!enabled || phase === 'WHISTLE' || phase === 'PRE_SNAP') {
      inputState.current = {
        up: false,
        down: false,
        left: false,
        right: false,
        sprint: false,
      };
    }
  }, [enabled, phase]);

  return {
    inputState: inputState.current,
  };
}
