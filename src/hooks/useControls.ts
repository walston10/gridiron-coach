import { useEffect, useState, useCallback } from 'react';

type Controls = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action1: boolean;  // juke/spin
  action2: boolean;  // truck/dive
};

export const useControls = () => {
  const [controls, setControls] = useState<Controls>({
    up: false,
    down: false,
    left: false,
    right: false,
    action1: false,
    action2: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    setControls(prev => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          return { ...prev, up: true };
        case 'ArrowDown':
        case 's':
        case 'S':
          return { ...prev, down: true };
        case 'ArrowLeft':
        case 'a':
        case 'A':
          return { ...prev, left: true };
        case 'ArrowRight':
        case 'd':
        case 'D':
          return { ...prev, right: true };
        case 'j':
        case 'J':
        case ' ':
          return { ...prev, action1: true };
        case 'k':
        case 'K':
        case 'Shift':
          return { ...prev, action2: true };
        default:
          return prev;
      }
    });
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setControls(prev => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          return { ...prev, up: false };
        case 'ArrowDown':
        case 's':
        case 'S':
          return { ...prev, down: false };
        case 'ArrowLeft':
        case 'a':
        case 'A':
          return { ...prev, left: false };
        case 'ArrowRight':
        case 'd':
        case 'D':
          return { ...prev, right: false };
        case 'j':
        case 'J':
        case ' ':
          return { ...prev, action1: false };
        case 'k':
        case 'K':
        case 'Shift':
          return { ...prev, action2: false };
        default:
          return prev;
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return controls;
};