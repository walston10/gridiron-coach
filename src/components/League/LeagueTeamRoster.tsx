/**
 * League Team Roster Component
 *
 * Displays a team's roster with player ratings.
 * Works for both AI teams (from staticTeams) and user team.
 */

import React from 'react';
import { getStaticTeam } from '../../data/staticTeams';
import { getTeamName, getTeamAbbreviation } from '../../stores/leagueStore';
import type { Player, Roster, OLineUnit, DLineUnit } from '../../types/player.types';

// =============================================================================
// TYPES
// =============================================================================

interface LeagueTeamRosterProps {
  teamId: string;
  userRoster?: Roster;  // If viewing user team, pass their roster
  onClose?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LeagueTeamRoster: React.FC<LeagueTeamRosterProps> = ({
  teamId,
  userRoster,
  onClose,
}) => {
  // Get team data
  const staticTeam = getStaticTeam(teamId);
  const isStaticTeam = !!staticTeam;

  const roster = isStaticTeam ? staticTeam.roster : userRoster;
  const teamName = getTeamName(teamId);
  const teamAbbr = getTeamAbbreviation(teamId);
  const primaryColor = staticTeam?.info.primaryColor || '#4a5568';
  const identity = staticTeam?.info.identity;

  if (!roster) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-gray-400 text-center">Roster not available</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="p-4 border-b border-gray-700"
        style={{ background: `linear-gradient(135deg, ${primaryColor}40, ${primaryColor}10)` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {teamAbbr.slice(0, 2)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{teamName}</h2>
              {identity && (
                <>
                  <div className="text-sm text-gray-300 mt-1">
                    Overall: <span className="font-bold text-white">{identity.overall}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {identity.description}
                  </div>
                </>
              )}
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Team Style */}
        {identity && (
          <div className="flex gap-4 mt-4">
            <div className="bg-gray-800/50 rounded px-3 py-1.5">
              <span className="text-xs text-gray-400">Offense: </span>
              <span className="text-sm text-white font-medium">
                {formatStyle(identity.offenseStyle)}
              </span>
            </div>
            <div className="bg-gray-800/50 rounded px-3 py-1.5">
              <span className="text-xs text-gray-400">Defense: </span>
              <span className="text-sm text-white font-medium">
                {formatStyle(identity.defenseStyle)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Roster Sections */}
      <div className="p-4 space-y-6">
        {/* Offense */}
        <div>
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Offense
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PlayerCard player={roster.offense.QB} position="QB" />
            <PlayerCard player={roster.offense.RB} position="RB" />
            <PlayerCard player={roster.offense.WR1} position="WR1" />
            <PlayerCard player={roster.offense.WR2} position="WR2" />
            <PlayerCard player={roster.offense.TE} position="TE" />
            <OLineCard unit={roster.offense.OL} />
          </div>
          {roster.flex && (
            <div className="mt-3">
              <PlayerCard player={roster.flex.player} position={roster.flex.type} isFlex />
            </div>
          )}
        </div>

        {/* Defense */}
        <div>
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            Defense
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DLineCard unit={roster.defense.DL} />
            <PlayerCard player={roster.defense.LB} position="LB" />
            <PlayerCard player={roster.defense.CB1} position="CB1" />
            <PlayerCard player={roster.defense.CB2} position="CB2" />
            <PlayerCard player={roster.defense.S} position="S" />
          </div>
        </div>

        {/* Special Teams */}
        <div>
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            Special Teams
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PlayerCard player={roster.specialTeams.KP} position="K/P" isKicker />
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// PLAYER CARD
// =============================================================================

interface PlayerCardProps {
  player: Player;
  position: string;
  isFlex?: boolean;
  isKicker?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  position,
  isFlex = false,
  isKicker = false,
}) => {
  const getOverallColor = (ovr: number) => {
    if (ovr >= 90) return 'text-purple-400';
    if (ovr >= 85) return 'text-blue-400';
    if (ovr >= 80) return 'text-green-400';
    if (ovr >= 75) return 'text-yellow-400';
    if (ovr >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getKeyRatings = () => {
    const pos = player.position;
    const r = player.ratings;

    if (pos === 'QB' || position === 'QB') {
      return [
        { label: 'THR', value: r.throwing },
        { label: 'SPD', value: r.speed },
        { label: 'AWR', value: r.awareness },
      ];
    }
    if (pos === 'RB' || position.includes('RB')) {
      return [
        { label: 'SPD', value: r.speed },
        { label: 'CAR', value: r.carrying },
        { label: 'AGI', value: r.agility },
      ];
    }
    if (pos === 'WR' || position.includes('WR')) {
      return [
        { label: 'SPD', value: r.speed },
        { label: 'CTH', value: r.catching },
        { label: 'AGI', value: r.agility },
      ];
    }
    if (pos === 'TE' || position.includes('TE')) {
      return [
        { label: 'CTH', value: r.catching },
        { label: 'BLK', value: r.blocking },
        { label: 'SPD', value: r.speed },
      ];
    }
    if (pos === 'LB' || position === 'LB') {
      return [
        { label: 'TKL', value: r.tackling },
        { label: 'COV', value: r.coverage },
        { label: 'SPD', value: r.speed },
      ];
    }
    if (pos === 'CB' || position.includes('CB')) {
      return [
        { label: 'COV', value: r.coverage },
        { label: 'SPD', value: r.speed },
        { label: 'AGI', value: r.agility },
      ];
    }
    if (pos === 'S' || position === 'S') {
      return [
        { label: 'COV', value: r.coverage },
        { label: 'TKL', value: r.tackling },
        { label: 'SPD', value: r.speed },
      ];
    }
    if (isKicker) {
      return [
        { label: 'PWR', value: r.kickPower },
        { label: 'ACC', value: r.kickAccuracy },
        { label: 'CLT', value: r.clutchKicking },
      ];
    }

    return [
      { label: 'SPD', value: r.speed },
      { label: 'STR', value: r.strength },
      { label: 'AWR', value: r.awareness },
    ];
  };

  const keyRatings = getKeyRatings();

  return (
    <div className={`bg-gray-800 rounded-lg p-3 ${isFlex ? 'border border-dashed border-gray-600' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-700 rounded px-2 py-1">
            <span className="text-xs font-bold text-gray-300">{position}</span>
          </div>
          <div>
            <div className="text-white font-medium">
              {player.firstName} {player.lastName}
            </div>
            <div className="text-xs text-gray-500">
              Age {player.age} | {player.experience}yr exp
            </div>
          </div>
        </div>

        <div className={`text-2xl font-bold ${getOverallColor(player.overall)}`}>
          {player.overall}
        </div>
      </div>

      {/* Key Ratings */}
      <div className="flex gap-4 mt-3">
        {keyRatings.map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`text-sm font-bold ${getRatingColor(value)}`}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// O-LINE CARD
// =============================================================================

interface OLineCardProps {
  unit: OLineUnit;
}

const OLineCard: React.FC<OLineCardProps> = ({ unit }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-700 rounded px-2 py-1">
            <span className="text-xs font-bold text-gray-300">OL</span>
          </div>
          <div>
            <div className="text-white font-medium">{unit.name}</div>
            <div className="text-xs text-gray-500">{unit.personality}</div>
          </div>
        </div>

        <div className={`text-2xl font-bold ${getOverallColorNum(unit.overall)}`}>
          {unit.overall}
        </div>
      </div>

      <div className="flex gap-4 mt-3">
        <div className="text-center">
          <div className="text-xs text-gray-500">PASS BLK</div>
          <div className={`text-sm font-bold ${getRatingColor(unit.passBlockRating)}`}>
            {unit.passBlockRating}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">RUN BLK</div>
          <div className={`text-sm font-bold ${getRatingColor(unit.runBlockRating)}`}>
            {unit.runBlockRating}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// D-LINE CARD
// =============================================================================

interface DLineCardProps {
  unit: DLineUnit;
}

const DLineCard: React.FC<DLineCardProps> = ({ unit }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-700 rounded px-2 py-1">
            <span className="text-xs font-bold text-gray-300">DL</span>
          </div>
          <div>
            <div className="text-white font-medium">{unit.name}</div>
            <div className="text-xs text-gray-500">{unit.personality}</div>
          </div>
        </div>

        <div className={`text-2xl font-bold ${getOverallColorNum(unit.overall)}`}>
          {unit.overall}
        </div>
      </div>

      <div className="flex gap-4 mt-3">
        <div className="text-center">
          <div className="text-xs text-gray-500">PASS RSH</div>
          <div className={`text-sm font-bold ${getRatingColor(unit.passRushRating)}`}>
            {unit.passRushRating}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">RUN STP</div>
          <div className={`text-sm font-bold ${getRatingColor(unit.runStopRating)}`}>
            {unit.runStopRating}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function formatStyle(style: string): string {
  return style.split('_').map(word =>
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
}

function getRatingColor(rating: number): string {
  if (rating >= 90) return 'text-purple-400';
  if (rating >= 85) return 'text-blue-400';
  if (rating >= 80) return 'text-green-400';
  if (rating >= 75) return 'text-yellow-400';
  if (rating >= 70) return 'text-orange-400';
  return 'text-red-400';
}

function getOverallColorNum(ovr: number): string {
  return getRatingColor(ovr);
}

export default LeagueTeamRoster;
