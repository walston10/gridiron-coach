// src/engine/deckGenerator.ts
// Generates a deck of cards from a roster for the simple card game

import type { Card } from '../stores/simpleCardGameStore';

/**
 * Generate a deck of playable cards from a roster.
 * Creates offensive cards based on player ratings.
 */
export function generateDeckFromRoster(roster: any): Card[] {
  const cards: Card[] = [];

  // QB cards
  if (roster?.offense?.QB) {
    const qb = roster.offense.QB;
    const qbRatings = qb.ratings || {};

    cards.push({
      id: `${qb.id}-short`,
      name: 'Quick Slant',
      type: 'pass',
      cost: 1,
      playerId: qb.id,
      target: roster.offense.WR?.[0]?.lastName || 'WR1',
      successRate: Math.round(50 + (qbRatings.throwing || 80) / 4),
      yardRange: { min: 5, max: 12 },
      breakawayChance: 8,
      intRisk: 3,
    });

    cards.push({
      id: `${qb.id}-deep`,
      name: 'Go Route',
      type: 'pass',
      cost: 3,
      playerId: qb.id,
      target: roster.offense.WR?.[0]?.lastName || 'WR1',
      successRate: Math.round(30 + (qbRatings.throwing || 75) / 5),
      yardRange: { min: 25, max: 50 },
      breakawayChance: 20,
      intRisk: 8,
    });

    cards.push({
      id: `${qb.id}-medium`,
      name: 'Comeback Route',
      type: 'pass',
      cost: 2,
      playerId: qb.id,
      target: roster.offense.WR?.[1]?.lastName || 'WR2',
      successRate: Math.round(45 + (qbRatings.throwing || 78) / 4),
      yardRange: { min: 10, max: 18 },
      breakawayChance: 5,
      intRisk: 4,
    });

    cards.push({
      id: `${qb.id}-scramble`,
      name: 'QB Scramble',
      type: 'run',
      cost: 2,
      playerId: qb.id,
      target: `${qb.firstName} ${qb.lastName}`,
      successRate: Math.round(40 + (qbRatings.speed || 60) / 5),
      yardRange: { min: 2, max: 15 },
      breakawayChance: 10,
      fumbleRisk: 4,
    });
  }

  // RB cards
  if (roster?.offense?.RB) {
    const rb = roster.offense.RB;
    const rbRatings = rb.ratings || {};

    cards.push({
      id: `${rb.id}-dive`,
      name: 'HB Dive',
      type: 'run',
      cost: 1,
      playerId: rb.id,
      target: `${rb.firstName} ${rb.lastName}`,
      successRate: Math.round(55 + (rbRatings.strength || 75) / 5),
      yardRange: { min: 2, max: 6 },
      breakawayChance: 5,
      fumbleRisk: 2,
    });

    cards.push({
      id: `${rb.id}-stretch`,
      name: 'Stretch Run',
      type: 'run',
      cost: 2,
      playerId: rb.id,
      target: `${rb.firstName} ${rb.lastName}`,
      successRate: Math.round(45 + (rbRatings.speed || 82) / 5),
      yardRange: { min: 0, max: 15 },
      breakawayChance: 15,
      fumbleRisk: 3,
    });

    cards.push({
      id: `${rb.id}-screen`,
      name: 'RB Screen',
      type: 'pass',
      cost: 2,
      playerId: rb.id,
      target: `${rb.firstName} ${rb.lastName}`,
      successRate: Math.round(50 + (rbRatings.catching || 70) / 5),
      yardRange: { min: 3, max: 12 },
      breakawayChance: 12,
      intRisk: 2,
    });

    cards.push({
      id: `${rb.id}-power`,
      name: 'Power Run',
      type: 'run',
      cost: 1,
      playerId: rb.id,
      target: `${rb.firstName} ${rb.lastName}`,
      successRate: Math.round(50 + (rbRatings.strength || 75) / 6),
      yardRange: { min: 1, max: 5 },
      breakawayChance: 3,
      fumbleRisk: 2,
    });
  }

  // WR cards
  if (roster?.offense?.WR) {
    const wrs = Array.isArray(roster.offense.WR) ? roster.offense.WR : [roster.offense.WR];

    wrs.forEach((wr: any, idx: number) => {
      if (!wr) return;
      const wrRatings = wr.ratings || {};

      cards.push({
        id: `${wr.id}-slant`,
        name: idx === 0 ? 'Slant Route' : 'Quick Out',
        type: 'pass',
        cost: 1,
        playerId: wr.id,
        target: `${wr.firstName} ${wr.lastName}`,
        successRate: Math.round(50 + (wrRatings.catching || 78) / 4),
        yardRange: { min: 6, max: 14 },
        breakawayChance: 10,
        intRisk: 3,
      });

      if (idx === 0) {
        cards.push({
          id: `${wr.id}-deep`,
          name: 'Deep Post',
          type: 'pass',
          cost: 3,
          playerId: wr.id,
          target: `${wr.firstName} ${wr.lastName}`,
          successRate: Math.round(35 + (wrRatings.speed || 85) / 5),
          yardRange: { min: 20, max: 45 },
          breakawayChance: 25,
          intRisk: 6,
        });
      }
    });
  }

  // TE card
  if (roster?.offense?.TE) {
    const te = roster.offense.TE;
    const teRatings = te.ratings || {};

    cards.push({
      id: `${te.id}-seam`,
      name: 'TE Seam',
      type: 'pass',
      cost: 2,
      playerId: te.id,
      target: `${te.firstName} ${te.lastName}`,
      successRate: Math.round(48 + (teRatings.catching || 75) / 5),
      yardRange: { min: 12, max: 25 },
      breakawayChance: 8,
      intRisk: 5,
    });

    cards.push({
      id: `${te.id}-flat`,
      name: 'TE Flat',
      type: 'pass',
      cost: 1,
      playerId: te.id,
      target: `${te.firstName} ${te.lastName}`,
      successRate: Math.round(55 + (teRatings.catching || 75) / 6),
      yardRange: { min: 4, max: 10 },
      breakawayChance: 5,
      intRisk: 2,
    });
  }

  // Ensure minimum deck size with generic plays
  while (cards.length < 10) {
    const i = cards.length;
    cards.push({
      id: `generic-${i}`,
      name: i % 2 === 0 ? 'Quick Pass' : 'Draw Play',
      type: i % 2 === 0 ? 'pass' : 'run',
      cost: 1,
      successRate: 55,
      yardRange: { min: 3, max: 8 },
      breakawayChance: 5,
      intRisk: i % 2 === 0 ? 3 : 0,
      fumbleRisk: i % 2 === 0 ? 0 : 2,
    });
  }

  return cards;
}

export default generateDeckFromRoster;
