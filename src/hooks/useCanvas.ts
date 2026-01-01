import { useRef, useEffect, useCallback } from 'react';

export const useCanvas = (
  draw: (ctx: CanvasRenderingContext2D, frameCount: number) => void,
  width: number = 800,
  height: number = 400
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCountRef = useRef(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameCountRef.current++;
    draw(ctx, frameCountRef.current);
  }, [draw]);

  useEffect(() => {
    let animationId: number;
    
    const loop = () => {
      render();
      animationId = requestAnimationFrame(loop);
    };
    
    loop();
    
    return () => cancelAnimationFrame(animationId);
  }, [render]);

  return { canvasRef, width, height };
};