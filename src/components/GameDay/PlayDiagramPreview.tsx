import React, { useCallback, useEffect, useRef } from 'react';
import type { Play, PlayerAssignment, OLBlockingAssignment } from '../../types';
import { getRoutePoints } from '../../data/routes';

interface PlayDiagramPreviewProps {
  play: Play;
  width?: number;
  height?: number;
  isFlipped?: boolean;
}

// Helper to flip field side
const flipFieldSide = (side: 'LEFT' | 'CENTER' | 'RIGHT'): 'LEFT' | 'CENTER' | 'RIGHT' => {
  if (side === 'LEFT') return 'RIGHT';
  if (side === 'RIGHT') return 'LEFT';
  return 'CENTER';
};

// Helper to flip blocking assignment
const flipBlocking = (blocking: OLBlockingAssignment | undefined): OLBlockingAssignment | undefined => {
  if (!blocking) return undefined;
  if (blocking === 'ZONE_LEFT') return 'ZONE_RIGHT';
  if (blocking === 'ZONE_RIGHT') return 'ZONE_LEFT';
  if (blocking === 'PULL_LEFT') return 'PULL_RIGHT';
  if (blocking === 'PULL_RIGHT') return 'PULL_LEFT';
  return blocking;
};

export const PlayDiagramPreview: React.FC<PlayDiagramPreviewProps> = ({
  play,
  width = 280,
  height = 180,
  isFlipped = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert field coordinates (0-100) to canvas pixels
  const toCanvasX = useCallback((x: number) => {
    const flippedX = isFlipped ? (100 - x) : x;
    return (flippedX / 100) * width;
  }, [width, isFlipped]);

  const toCanvasY = useCallback((y: number) => (y / 100) * height, [height]);

  // Helper to get OL blocking - check both olBlocking and blockingAssignment
  const getOLBlocking = (assignment: PlayerAssignment): OLBlockingAssignment | undefined => {
    const blocking = assignment.olBlocking || assignment.blockingAssignment;
    return isFlipped ? flipBlocking(blocking) : blocking;
  };

  // Get effective field side considering flip
  const getEffectiveFieldSide = useCallback((side: 'LEFT' | 'CENTER' | 'RIGHT') => {
    return isFlipped ? flipFieldSide(side) : side;
  }, [isFlipped]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const assignments = play.assignments;

    // Clear canvas with field green
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, width, height);

    // Yard lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const y = (i / 6) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Line of scrimmage
    const losY = height * 0.5;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, losY);
    ctx.lineTo(width, losY);
    ctx.stroke();

    // Hash marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(width * 0.4, 0);
    ctx.lineTo(width * 0.4, height);
    ctx.moveTo(width * 0.6, 0);
    ctx.lineTo(width * 0.6, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw blocking arrows for OL
    assignments.forEach(assignment => {
      const blocking = getOLBlocking(assignment);
      if (!assignment.canRunRoutes && blocking) {
        const x = toCanvasX(assignment.startX);
        const y = toCanvasY(assignment.startY);

        if (blocking === 'PULL_LEFT' || blocking === 'PULL_RIGHT') {
          const dir = blocking === 'PULL_LEFT' ? -1 : 1;
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y + 10);
          ctx.lineTo(x, y + 18);
          ctx.lineTo(x + (22 * dir), y + 18);
          ctx.stroke();

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          const ax = x + (22 * dir);
          ctx.moveTo(ax, y + 18);
          ctx.lineTo(ax - (5 * dir), y + 15);
          ctx.lineTo(ax - (5 * dir), y + 21);
          ctx.closePath();
          ctx.fill();
        }

        if (blocking === 'ZONE_LEFT' || blocking === 'ZONE_RIGHT') {
          const dir = blocking === 'ZONE_LEFT' ? -1 : 1;
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y - 10);
          ctx.lineTo(x + (8 * dir), y - 14);
          ctx.stroke();

          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          const endX = x + (8 * dir);
          const endY = y - 14;
          const angle = Math.atan2(-4, 8 * dir);
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - 4 * Math.cos(angle - 0.5), endY - 4 * Math.sin(angle - 0.5));
          ctx.lineTo(endX - 4 * Math.cos(angle + 0.5), endY - 4 * Math.sin(angle + 0.5));
          ctx.closePath();
          ctx.fill();
        }
      }
    });

    // Draw receiver blocking arrows
    assignments.forEach(assignment => {
      if (assignment.canRunRoutes && assignment.receiverBlock) {
        const x = toCanvasX(assignment.startX);
        const y = toCanvasY(assignment.startY);
        const fieldSide = getEffectiveFieldSide(assignment.fieldSide);

        let endX = x;
        let endY = y - 16;

        if (assignment.receiverBlock === 'CRACK_BLOCK') {
          const insideDir = fieldSide === 'LEFT' ? 1 : fieldSide === 'RIGHT' ? -1 : 0;
          endX = x + (12 * insideDir);
          endY = y - 12;
        } else if (assignment.receiverBlock === 'STALK_BLOCK') {
          endY = y - 12;
        } else if (assignment.receiverBlock === 'LEAD_BLOCK') {
          const insideDir = fieldSide === 'LEFT' ? 1 : fieldSide === 'RIGHT' ? -1 : 0;
          endX = x + (6 * insideDir);
          endY = y - 16;
        }

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const crossSize = 4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(endX - crossSize, endY - crossSize);
        ctx.lineTo(endX + crossSize, endY + crossSize);
        ctx.moveTo(endX + crossSize, endY - crossSize);
        ctx.lineTo(endX - crossSize, endY + crossSize);
        ctx.stroke();
      }
    });

    // Draw routes
    assignments.forEach(assignment => {
      if (assignment.route && assignment.fieldSide) {
        const effectiveFieldSide = getEffectiveFieldSide(assignment.fieldSide);
        const effectiveStartX = isFlipped ? (100 - assignment.startX) : assignment.startX;

        const routePoints = getRoutePoints(
          assignment.route,
          effectiveFieldSide,
          effectiveStartX,
          assignment.startY
        );

        if (routePoints.length > 0) {
          const startX = toCanvasX(assignment.startX);
          const startY = toCanvasY(assignment.startY);

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(startX, startY);

          routePoints.forEach(point => {
            ctx.lineTo((point.x / 100) * width, toCanvasY(point.y));
          });
          ctx.stroke();

          // Arrow
          const last = routePoints[routePoints.length - 1];
          const prev = routePoints.length > 1 ? routePoints[routePoints.length - 2] : { x: effectiveStartX, y: assignment.startY };
          const endX = (last.x / 100) * width;
          const endY = toCanvasY(last.y);
          const prevX = (prev.x / 100) * width;
          const prevY = toCanvasY(prev.y);
          const angle = Math.atan2(endY - prevY, endX - prevX);

          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - 6 * Math.cos(angle - 0.4), endY - 6 * Math.sin(angle - 0.4));
          ctx.lineTo(endX - 6 * Math.cos(angle + 0.4), endY - 6 * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();
        }
      }
    });

    // Draw run paths for ball carrier
    assignments.forEach(assignment => {
      if (assignment.isBallCarrier && assignment.runAssignment) {
        const x = toCanvasX(assignment.startX);
        const y = toCanvasY(assignment.startY);
        const effectiveFieldSide = getEffectiveFieldSide(assignment.fieldSide);

        let pathPoints: { x: number; y: number }[] = [];

        switch (assignment.runAssignment) {
          case 'INSIDE_ZONE':
          case 'DIVE':
            pathPoints = [{ x: x, y: y - 25 }];
            break;
          case 'OUTSIDE_ZONE':
          case 'SWEEP':
          case 'TOSS':
            const sweepDir = effectiveFieldSide === 'LEFT' ? -1 : 1;
            pathPoints = [{ x: x + (18 * sweepDir), y: y - 6 }, { x: x + (36 * sweepDir), y: y - 18 }];
            break;
          case 'POWER':
          case 'COUNTER':
            pathPoints = [{ x: x + 10, y: y - 22 }];
            break;
          case 'DRAW':
            pathPoints = [{ x: x, y: y + 6 }, { x: x, y: y - 25 }];
            break;
          default:
            pathPoints = [{ x: x, y: y - 22 }];
        }

        if (pathPoints.length > 0) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          pathPoints.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.stroke();

          const last = pathPoints[pathPoints.length - 1];
          const prev = pathPoints.length > 1 ? pathPoints[pathPoints.length - 2] : { x, y };
          const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(last.x - 6 * Math.cos(angle - 0.4), last.y - 6 * Math.sin(angle - 0.4));
          ctx.lineTo(last.x - 6 * Math.cos(angle + 0.4), last.y - 6 * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();
        }
      }
    });

    // Draw players
    assignments.forEach(assignment => {
      const x = toCanvasX(assignment.startX);
      const y = toCanvasY(assignment.startY);

      if (assignment.positionSlot === 'QB') {
        // QB - Red circle
        const r = 10;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('QB', x, y);

      } else if (!assignment.canRunRoutes) {
        // OL - Squares
        const size = 16;

        ctx.fillStyle = '#4b5563';
        ctx.fillRect(x - size/2, y - size/2, size, size);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - size/2, y - size/2, size, size);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(assignment.label, x, y);

      } else {
        // Receivers - Circles
        const r = 9;

        if (assignment.isOnLine) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#2d5a27';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        ctx.fillStyle = assignment.isOnLine ? '#000000' : '#ffffff';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(assignment.label, x, y);

        // Ball carrier star
        if (assignment.isBallCarrier) {
          ctx.fillStyle = '#22c55e';
          ctx.font = '10px Arial';
          ctx.fillText('\u2605', x + r + 3, y - r);
        }
      }
    });

  }, [play, width, height, isFlipped, toCanvasX, toCanvasY, getEffectiveFieldSide]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-600 rounded"
    />
  );
};
