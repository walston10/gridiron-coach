import React, { useCallback } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import type { PlayerAssignment, FormationType, OLBlockingAssignment } from '../../types';
import { getRoutePoints } from '../../data/routes';

interface FieldCanvasProps {
  formation: FormationType;
  assignments: PlayerAssignment[];
  selectedPlayer: string | null;
  onPlayerClick: (slot: string) => void;
  playType?: 'PASS' | 'RUN';
}

const getBlockingIndicator = (blocking: OLBlockingAssignment): { symbol: string; color: string } => {
  switch (blocking) {
    case 'PASS_PRO': return { symbol: '|', color: '#3b82f6' };
    case 'MAN': return { symbol: '|', color: '#8b5cf6' };
    case 'ZONE_LEFT': return { symbol: '←', color: '#22c55e' };
    case 'ZONE_RIGHT': return { symbol: '→', color: '#22c55e' };
    case 'PULL_LEFT': return { symbol: '⟲', color: '#f59e0b' };
    case 'PULL_RIGHT': return { symbol: '⟳', color: '#f59e0b' };
    case 'TRAP': return { symbol: 'T', color: '#f59e0b' };
    case 'DOUBLE_TEAM': return { symbol: 'D', color: '#ec4899' };
    default: return { symbol: '|', color: '#6b7280' };
  }
};

export const FieldCanvas: React.FC<FieldCanvasProps> = ({
  formation: _formation,
  assignments,
  selectedPlayer,
  onPlayerClick,
  playType = 'PASS',
}) => {
  const width = 700;
  const height = 400;

  // Convert field coordinates (0-100) to canvas pixels
  const toCanvasX = (x: number) => (x / 100) * width;
  const toCanvasY = (y: number) => (y / 100) * height;

  // Convert canvas pixels to field coordinates
  const toFieldX = (px: number) => (px / width) * 100;
  const toFieldY = (py: number) => (py / height) * 100;

  // Helper to get OL blocking - check both olBlocking and blockingAssignment
  const getOLBlocking = (assignment: PlayerAssignment): OLBlockingAssignment | undefined => {
    return assignment.olBlocking || assignment.blockingAssignment;
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, width, height);

    // Yard lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Line of scrimmage
    const losY = height * 0.5;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, losY);
    ctx.lineTo(width, losY);
    ctx.stroke();

    ctx.fillStyle = '#3b82f6';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LINE OF SCRIMMAGE', 10, losY - 8);

    // Hash marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 10]);
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
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y + 15);
          ctx.lineTo(x, y + 28);
          ctx.lineTo(x + (35 * dir), y + 28);
          ctx.stroke();

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          const ax = x + (35 * dir);
          ctx.moveTo(ax, y + 28);
          ctx.lineTo(ax - (8 * dir), y + 24);
          ctx.lineTo(ax - (8 * dir), y + 32);
          ctx.closePath();
          ctx.fill();
        }

        if (blocking === 'ZONE_LEFT' || blocking === 'ZONE_RIGHT') {
          const dir = blocking === 'ZONE_LEFT' ? -1 : 1;
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y - 15);
          ctx.lineTo(x + (12 * dir), y - 22);
          ctx.stroke();

          // Arrow head
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          const endX = x + (12 * dir);
          const endY = y - 22;
          const angle = Math.atan2(-7, 12 * dir);
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - 6 * Math.cos(angle - 0.5), endY - 6 * Math.sin(angle - 0.5));
          ctx.lineTo(endX - 6 * Math.cos(angle + 0.5), endY - 6 * Math.sin(angle + 0.5));
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
        const fieldSide = assignment.fieldSide;

        // Determine block direction based on type and field side
        let endX = x;
        let endY = y - 25; // Default: straight ahead

        if (assignment.receiverBlock === 'CRACK_BLOCK') {
          // Crack block goes diagonally inside
          const insideDir = fieldSide === 'LEFT' ? 1 : fieldSide === 'RIGHT' ? -1 : 0;
          endX = x + (20 * insideDir);
          endY = y - 20;
        } else if (assignment.receiverBlock === 'STALK_BLOCK') {
          // Stalk block goes straight ahead
          endY = y - 20;
        } else if (assignment.receiverBlock === 'LEAD_BLOCK') {
          // Lead block goes forward and slightly inside
          const insideDir = fieldSide === 'LEFT' ? 1 : fieldSide === 'RIGHT' ? -1 : 0;
          endX = x + (10 * insideDir);
          endY = y - 25;
        }

        // Draw the blocking line
        ctx.strokeStyle = '#ef4444'; // Red for blocking
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw blocking "X" at the end
        const crossSize = 6;
        ctx.lineWidth = 3;
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
        const routePoints = getRoutePoints(
          assignment.route,
          assignment.fieldSide,
          assignment.startX,
          assignment.startY
        );

        if (routePoints.length > 0) {
          const startX = toCanvasX(assignment.startX);
          const startY = toCanvasY(assignment.startY);

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);

          routePoints.forEach(point => {
            ctx.lineTo(toCanvasX(point.x), toCanvasY(point.y));
          });
          ctx.stroke();

          // Arrow
          const last = routePoints[routePoints.length - 1];
          const prev = routePoints.length > 1 ? routePoints[routePoints.length - 2] : { x: assignment.startX, y: assignment.startY };
          const endX = toCanvasX(last.x);
          const endY = toCanvasY(last.y);
          const angle = Math.atan2(toCanvasY(last.y) - toCanvasY(prev.y), toCanvasX(last.x) - toCanvasX(prev.x));

          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - 10 * Math.cos(angle - 0.4), endY - 10 * Math.sin(angle - 0.4));
          ctx.lineTo(endX - 10 * Math.cos(angle + 0.4), endY - 10 * Math.sin(angle + 0.4));
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

        // Determine run path based on assignment
        let pathPoints: { x: number; y: number }[] = [];

        switch (assignment.runAssignment) {
          case 'INSIDE_ZONE':
          case 'DIVE':
            pathPoints = [{ x: x, y: y - 40 }];
            break;
          case 'OUTSIDE_ZONE':
          case 'SWEEP':
          case 'TOSS':
            const sweepDir = assignment.fieldSide === 'LEFT' ? -1 : 1;
            pathPoints = [{ x: x + (30 * sweepDir), y: y - 10 }, { x: x + (60 * sweepDir), y: y - 30 }];
            break;
          case 'POWER':
          case 'COUNTER':
            pathPoints = [{ x: x + 15, y: y - 35 }];
            break;
          case 'DRAW':
            pathPoints = [{ x: x, y: y + 10 }, { x: x, y: y - 40 }];
            break;
          default:
            pathPoints = [{ x: x, y: y - 35 }];
        }

        if (pathPoints.length > 0) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          pathPoints.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.stroke();

          // Arrow at end
          const last = pathPoints[pathPoints.length - 1];
          const prev = pathPoints.length > 1 ? pathPoints[pathPoints.length - 2] : { x, y };
          const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(last.x - 10 * Math.cos(angle - 0.4), last.y - 10 * Math.sin(angle - 0.4));
          ctx.lineTo(last.x - 10 * Math.cos(angle + 0.4), last.y - 10 * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();
        }
      }
    });

    // Draw players
    assignments.forEach(assignment => {
      const x = toCanvasX(assignment.startX);
      const y = toCanvasY(assignment.startY);
      const isSelected = assignment.positionSlot === selectedPlayer;

      if (assignment.positionSlot === 'QB') {
        // QB - Red circle
        const r = 16;
        ctx.fillStyle = isSelected ? '#fbbf24' : '#dc2626';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('QB', x, y);

      } else if (!assignment.canRunRoutes) {
        // OL - Squares
        const size = 26;
        const blocking = getOLBlocking(assignment);
        const indicator = blocking ? getBlockingIndicator(blocking) : { symbol: '|', color: '#6b7280' };

        ctx.fillStyle = isSelected ? '#fbbf24' : '#4b5563';
        ctx.fillRect(x - size/2, y - size/2, size, size);
        ctx.strokeStyle = isSelected ? '#ffffff' : '#1f2937';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - size/2, y - size/2, size, size);

        // Position label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(assignment.label, x, y);

        // Blocking indicator below
        ctx.fillStyle = indicator.color;
        ctx.font = 'bold 14px Arial';
        ctx.fillText(indicator.symbol, x, y + size/2 + 12);

      } else {
        // Receivers - Circles
        const r = 15;

        if (assignment.isOnLine) {
          ctx.fillStyle = isSelected ? '#fbbf24' : '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#2d5a27';
          ctx.strokeStyle = isSelected ? '#fbbf24' : '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = assignment.isOnLine ? '#000000' : (isSelected ? '#fbbf24' : '#ffffff');
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(assignment.label, x, y);

        // Assignment label below
        let assignmentText = '';
        if (assignment.route) assignmentText = assignment.route;
        else if (assignment.receiverBlock) assignmentText = assignment.receiverBlock.replace('_BLOCK', '');
        else if (assignment.runAssignment) assignmentText = assignment.runAssignment.replace('_', ' ').slice(0, 8);

        if (assignmentText) {
          ctx.fillStyle = assignment.receiverBlock ? '#ef4444' : '#fbbf24';
          ctx.font = '9px Arial';
          ctx.fillText(assignmentText, x, y + r + 10);
        }

        // Ball carrier star
        if (assignment.isBallCarrier) {
          ctx.fillStyle = '#22c55e';
          ctx.font = '16px Arial';
          ctx.fillText('★', x + r + 5, y - r);
        }
      }
    });

    // Legend
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('● On Line   ○ Off Line   ■ Lineman   ★ Ball Carrier   ✕ Block', 10, height - 10);

  }, [assignments, selectedPlayer, width, height, playType]);

  const { canvasRef } = useCanvas(draw, width, height);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = toFieldX(e.clientX - rect.left);
    const clickY = toFieldY(e.clientY - rect.top);

    // Check if click is on QB - if so, don't match to nearby players
    const qb = assignments.find(a => a.positionSlot === 'QB');
    if (qb) {
      const qbDx = qb.startX - clickX;
      const qbDy = qb.startY - clickY;
      const qbDist = Math.sqrt(qbDx * qbDx + qbDy * qbDy);
      if (qbDist < 5) {
        // Clicked on QB - do nothing (QB not editable)
        return;
      }
    }

    // Find the CLOSEST player to the click point
    let closestPlayer: string | null = null;
    let closestDistance = Infinity;

    for (const assignment of assignments) {
      // Skip QB - not clickable on canvas (no assignments for QB currently)
      if (assignment.positionSlot === 'QB') continue;

      const dx = assignment.startX - clickX;
      const dy = assignment.startY - clickY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Use generous click radius, closest player wins
      const maxRadius = 8;

      if (dist < closestDistance && dist < maxRadius) {
        closestDistance = dist;
        closestPlayer = assignment.positionSlot;
      }
    }

    if (closestPlayer) {
      onPlayerClick(closestPlayer);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      className="border border-gray-600 rounded cursor-pointer"
    />
  );
};
