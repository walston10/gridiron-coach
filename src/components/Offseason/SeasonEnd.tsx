/**
 * Season End Component
 *
 * Displays season summary, awards, and owner evaluation.
 * First phase of the offseason.
 */

import React from 'react';
import { useOffseasonStore } from '../../stores/offseasonStore';
import type { SeasonAward } from '../../types/offseason.types';

interface SeasonEndProps {
  onContinue: () => void;
}

export const SeasonEnd: React.FC<SeasonEndProps> = ({ onContinue }) => {
  const { seasonSummary, ownerEvaluation } = useOffseasonStore();

  if (!seasonSummary) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <p>Loading season summary...</p>
      </div>
    );
  }

  const { record, playoffResult, awards, topPerformers, ownerSatisfaction, jobSecure } = seasonSummary;

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Season {seasonSummary.year} Complete</h1>
        <div className="text-2xl text-amber-400">
          {record.wins}-{record.losses}
        </div>
        <div className="text-gray-400 mt-1">{getPlayoffResultText(playoffResult)}</div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* Season Stats */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
            Season Summary
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Wins" value={record.wins} color="text-green-400" />
            <StatBox label="Losses" value={record.losses} color="text-red-400" />
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Team Leaders</h3>
            <div className="space-y-2">
              <LeaderRow
                category="Passing"
                name={topPerformers.passing.name}
                stat={`${topPerformers.passing.yards} yards`}
              />
              <LeaderRow
                category="Rushing"
                name={topPerformers.rushing.name}
                stat={`${topPerformers.rushing.yards} yards`}
              />
              <LeaderRow
                category="Receiving"
                name={topPerformers.receiving.name}
                stat={`${topPerformers.receiving.yards} yards`}
              />
              <LeaderRow
                category="Sacks"
                name={topPerformers.sacks.name}
                stat={`${topPerformers.sacks.count} sacks`}
              />
            </div>
          </div>
        </div>

        {/* Awards */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
            League Awards
          </h2>

          {awards.length > 0 ? (
            <div className="space-y-3">
              {awards.map((award) => (
                <AwardCard key={award.id} award={award} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No awards this season.</p>
          )}
        </div>

        {/* Owner Evaluation */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
            Owner Evaluation
          </h2>

          <div className="flex items-start gap-6">
            {/* Owner Portrait */}
            <div className="text-6xl">
              {ownerSatisfaction >= 80 ? '😊' : ownerSatisfaction >= 50 ? '😐' : '😠'}
            </div>

            {/* Evaluation */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-lg text-white">Satisfaction:</div>
                <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      ownerSatisfaction >= 70 ? 'bg-green-500' :
                      ownerSatisfaction >= 40 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${ownerSatisfaction}%` }}
                  />
                </div>
                <div className="text-white font-bold">{ownerSatisfaction}%</div>
              </div>

              {ownerEvaluation && (
                <>
                  <p className="text-gray-300 text-lg italic mb-4">
                    "{ownerEvaluation.message}"
                  </p>

                  {ownerEvaluation.demands.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-amber-400 font-semibold mb-2">Next Season Demands:</h4>
                      <ul className="list-disc list-inside text-gray-300">
                        {ownerEvaluation.demands.map((demand, i) => (
                          <li key={i}>{demand}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {ownerEvaluation.budgetChange !== 0 && (
                      <div className={`px-3 py-1 rounded ${
                        ownerEvaluation.budgetChange > 0 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                      }`}>
                        Budget: {ownerEvaluation.budgetChange > 0 ? '+' : ''}
                        ${(ownerEvaluation.budgetChange / 1_000_000).toFixed(1)}M
                      </div>
                    )}
                    {ownerEvaluation.trustChange !== 0 && (
                      <div className={`px-3 py-1 rounded ${
                        ownerEvaluation.trustChange > 0 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                      }`}>
                        Trust: {ownerEvaluation.trustChange > 0 ? '+' : ''}{ownerEvaluation.trustChange}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className={`mt-4 px-4 py-2 rounded-lg inline-block ${
                jobSecure ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
              }`}>
                {jobSecure ? '✓ Your job is secure' : '⚠ Your job is in jeopardy'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={onContinue}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-3 rounded-lg text-lg transition-colors"
        >
          Continue to Roster Changes
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const StatBox: React.FC<{ label: string; value: number | string; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="bg-gray-700 rounded-lg p-4 text-center">
    <div className={`text-3xl font-bold ${color}`}>{value}</div>
    <div className="text-gray-400 text-sm">{label}</div>
  </div>
);

const LeaderRow: React.FC<{ category: string; name: string; stat: string }> = ({
  category,
  name,
  stat,
}) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-700">
    <span className="text-gray-400">{category}</span>
    <span className="text-white">{name}</span>
    <span className="text-amber-400">{stat}</span>
  </div>
);

const AwardCard: React.FC<{ award: SeasonAward }> = ({ award }) => (
  <div className={`p-4 rounded-lg ${award.isUserTeam ? 'bg-amber-900/30 border border-amber-600' : 'bg-gray-700'}`}>
    <div className="flex justify-between items-center">
      <div>
        <div className="text-white font-semibold">{award.name}</div>
        <div className="text-gray-400 text-sm">{award.winnerName}</div>
      </div>
      {award.stat && (
        <div className="text-amber-400 font-bold">{award.stat}</div>
      )}
    </div>
    {award.isUserTeam && (
      <div className="text-green-400 text-sm mt-1">★ Your Team</div>
    )}
  </div>
);

// =============================================================================
// HELPERS
// =============================================================================

function getPlayoffResultText(result: string): string {
  const results: Record<string, string> = {
    CHAMPION: '🏆 CHAMPIONS!',
    CHAMPIONSHIP_LOSS: 'Lost in Championship',
    CONFERENCE_LOSS: 'Lost in Conference Finals',
    DIVISIONAL_LOSS: 'Lost in Semifinals',
    WILD_CARD_LOSS: 'Lost in Wild Card',
    MISSED_PLAYOFFS: 'Missed Playoffs',
  };
  return results[result] || result;
}
