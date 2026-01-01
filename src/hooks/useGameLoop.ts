import { useRef, useEffect, useCallback } from 'react';

export const useGameLoop = (callback: (deltaTime: number) => void, isRunning: boolean) => {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== null) {
      const deltaTime = time - previousTimeRef.current;
      // Cap deltaTime to prevent huge jumps (max 100ms = 10fps minimum)
      const cappedDelta = Math.min(deltaTime, 100);
      callback(cappedDelta);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);

  useEffect(() => {
    if (isRunning) {
      // Reset previous time when starting to prevent stale delta
      previousTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        previousTimeRef.current = null; // Reset on cleanup too
      }
    };
  }, [isRunning, animate]);
};