/**
 * Injury System
 *
 * Handles injury rolls during user games, applies debuffs to rosters,
 * and heals injuries between weeks.
 *
 * Injury chance: 3% per play involving a player
 * - 1/3 QUESTIONABLE (75% buffs, 1 week)
 * - 1/3 BANGED_UP (50% buffs, 1-2 weeks)
 * - 1/3 INJURED (25% buffs, 2-3 weeks)
 */

import type { PlayerInjury, InjurySeverity } from '../types/league.types';
import { INJURY_CONFIG, INJURY_CHANCE_PER_PLAY } from '../types/league.types';
import type { Roster } from '../types/player.types';

// =============================================================================
// INJURY ROLLING
// =============================================================================

/**
 * Roll for injury after a play involving a specific player
 * Returns a new injury if one occurred, null otherwise
 *
 * @param playerId - The player's ID
 * @param playerName - The player's display name
 * @param position - The player's position (e.g., "QB", "RB", "WR1")
 * @param existingInjuries - Current injuries (to avoid double-injuring)
 */
export function rollForInjury(
  playerId: string,
  playerName: string,
  position: string,
  existingInjuries: PlayerInjury[]
): PlayerInjury | null {
  // Don't injure already injured players
  if (existingInjuries.some(inj => inj.playerId === playerId)) {
    return null;
  }

  // 3% chance of injury per play
  if (Math.random() >= INJURY_CHANCE_PER_PLAY) {
    return null;
  }

  // Determine severity (equal 1/3 chance each)
  const severityRoll = Math.random();
  let severity: InjurySeverity;

  if (severityRoll < 0.333) {
    severity = 'QUESTIONABLE';
  } else if (severityRoll < 0.666) {
    severity = 'BANGED_UP';
  } else {
    severity = 'INJURED';
  }

  const config = INJURY_CONFIG[severity];

  // Determine weeks (random within range)
  const weeksRange = config.weeksMax - config.weeksMin;
  const weeksRemaining = config.weeksMin + Math.floor(Math.random() * (weeksRange + 1));

  return {
    playerId,
    playerName,
    position,
    severity,
    weeksRemaining,
    buffMultiplier: config.buffMultiplier,
  };
}

/**
 * Roll for injuries for all players involved in a play
 * Typically called after each play with the players who participated
 */
export function rollForPlayInjuries(
  involvedPlayers: Array<{ id: string; name: string; position: string }>,
  existingInjuries: PlayerInjury[]
): PlayerInjury[] {
  const newInjuries: PlayerInjury[] = [];

  for (const player of involvedPlayers) {
    const injury = rollForInjury(
      player.id,
      player.name,
      player.position,
      [...existingInjuries, ...newInjuries]
    );

    if (injury) {
      newInjuries.push(injury);
    }
  }

  return newInjuries;
}

// =============================================================================
// INJURY HEALING
// =============================================================================

/**
 * Heal injuries between weeks
 * Decrements weeksRemaining and removes fully healed injuries
 */
export function healInjuries(injuries: PlayerInjury[]): PlayerInjury[] {
  return injuries
    .map(injury => ({
      ...injury,
      weeksRemaining: injury.weeksRemaining - 1,
    }))
    .filter(injury => injury.weeksRemaining > 0);
}

/**
 * Check if a specific player is injured
 */
export function isPlayerInjured(
  playerId: string,
  injuries: PlayerInjury[]
): boolean {
  return injuries.some(inj => inj.playerId === playerId);
}

/**
 * Get a player's injury if they have one
 */
export function getPlayerInjury(
  playerId: string,
  injuries: PlayerInjury[]
): PlayerInjury | null {
  return injuries.find(inj => inj.playerId === playerId) || null;
}

/**
 * Get the buff multiplier for a player (1.0 if healthy)
 */
export function getPlayerBuffMultiplier(
  playerId: string,
  injuries: PlayerInjury[]
): number {
  const injury = getPlayerInjury(playerId, injuries);
  return injury ? injury.buffMultiplier : 1.0;
}

// =============================================================================
// ROSTER INJURY APPLICATION
// =============================================================================

/**
 * Get a modified roster with injury debuffs applied
 * This is used when starting a game to apply injury penalties
 *
 * Note: This doesn't mutate the original roster, returns modified ratings
 */
export function getInjuryModifiedRatings(
  playerId: string,
  baseRatings: Record<string, number>,
  injuries: PlayerInjury[]
): Record<string, number> {
  const multiplier = getPlayerBuffMultiplier(playerId, injuries);

  if (multiplier === 1.0) {
    return baseRatings;  // No modification needed
  }

  // Apply multiplier to all ratings
  const modified: Record<string, number> = {};
  for (const [key, value] of Object.entries(baseRatings)) {
    // Apply multiplier but keep a minimum of 40
    modified[key] = Math.max(40, Math.round(value * multiplier));
  }

  return modified;
}

/**
 * Get injury report summary for display
 */
export function getInjuryReport(injuries: PlayerInjury[]): string[] {
  if (injuries.length === 0) {
    return ['No injuries'];
  }

  return injuries.map(inj => {
    const statusText = inj.severity === 'QUESTIONABLE' ? 'Questionable'
      : inj.severity === 'BANGED_UP' ? 'Banged Up'
      : 'Injured';

    const weeksText = inj.weeksRemaining === 1 ? '1 week' : `${inj.weeksRemaining} weeks`;
    const buffText = `${Math.round(inj.buffMultiplier * 100)}%`;

    return `${inj.position} ${inj.playerName} - ${statusText} (${buffText} effectiveness, ${weeksText})`;
  });
}

/**
 * Get players involved in an offensive play (for injury rolling)
 * Returns the players based on play type and target
 */
export function getPlayersInvolvedInPlay(
  roster: Roster,
  playType: string,
  target?: string
): Array<{ id: string; name: string; position: string }> {
  const involved: Array<{ id: string; name: string; position: string }> = [];

  // QB is always involved
  involved.push({
    id: roster.offense.QB.id,
    name: `${roster.offense.QB.firstName} ${roster.offense.QB.lastName}`,
    position: 'QB',
  });

  // Determine who else based on play type
  const isRunPlay = ['INSIDE_RUN', 'OUTSIDE_RUN', 'POWER_RUN', 'DRAW', 'QB_RUN'].includes(playType);
  const isPassPlay = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(playType);

  if (isRunPlay) {
    // RB is involved in run plays
    involved.push({
      id: roster.offense.RB.id,
      name: `${roster.offense.RB.firstName} ${roster.offense.RB.lastName}`,
      position: 'RB',
    });
  }

  if (isPassPlay && target) {
    // Add the targeted receiver
    switch (target) {
      case 'WR1':
        involved.push({
          id: roster.offense.WR1.id,
          name: `${roster.offense.WR1.firstName} ${roster.offense.WR1.lastName}`,
          position: 'WR1',
        });
        break;
      case 'WR2':
        involved.push({
          id: roster.offense.WR2.id,
          name: `${roster.offense.WR2.firstName} ${roster.offense.WR2.lastName}`,
          position: 'WR2',
        });
        break;
      case 'TE':
        involved.push({
          id: roster.offense.TE.id,
          name: `${roster.offense.TE.firstName} ${roster.offense.TE.lastName}`,
          position: 'TE',
        });
        break;
      case 'RB':
        involved.push({
          id: roster.offense.RB.id,
          name: `${roster.offense.RB.firstName} ${roster.offense.RB.lastName}`,
          position: 'RB',
        });
        break;
    }
  }

  return involved;
}

// =============================================================================
// INJURY SEVERITY HELPERS
// =============================================================================

/**
 * Get display color for injury severity
 */
export function getInjurySeverityColor(severity: InjurySeverity): string {
  switch (severity) {
    case 'QUESTIONABLE':
      return 'text-yellow-400';
    case 'BANGED_UP':
      return 'text-orange-400';
    case 'INJURED':
      return 'text-red-400';
  }
}

/**
 * Get short display text for injury severity
 */
export function getInjurySeverityLabel(severity: InjurySeverity): string {
  switch (severity) {
    case 'QUESTIONABLE':
      return 'Q';
    case 'BANGED_UP':
      return 'BU';
    case 'INJURED':
      return 'INJ';
  }
}
