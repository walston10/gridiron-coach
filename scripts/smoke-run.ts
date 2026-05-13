/**
 * Smoke test — run a Power Run play through the simulator and print a
 * diagnostic report. Lets me verify Phase 3 mechanics fire correctly
 * without having to test visually on a phone.
 *
 * Run:   npx tsx scripts/smoke-run.ts
 *
 * Verifies (visually in the output):
 *   - Handoff fires: state.ballCarrier transitions QB -> RB
 *   - LG pulls (Power right): LG's x position moves right over time
 *   - Blocks engage with proximity: isBlocked flips only after OL is near defender
 *   - Drive blocking: blocked defenders drift back over time
 *   - Play resolves with a real tackler
 */

import { simulatePlay } from '../src/engine/PlaySimulator';
import { DEFAULT_PLAYS } from '../src/data/defaultPlays';
import type { DefensiveCard } from '../src/types/card.types';

// Pick the Power Run play. POWER scheme + designed gap right → LG should pull.
const powerRun = DEFAULT_PLAYS.find(p => p.id === 'default-power');
if (!powerRun) {
  // eslint-disable-next-line no-console
  console.error('Play not found');
  process.exit(1);
}

// Force the RB direction so we know the pull direction unambiguously.
const forcedRBPlay = {
  ...powerRun,
  assignments: powerRun.assignments.map(a =>
    a.positionSlot === 'RB'
      ? { ...a, runGap: 'B_RIGHT' as const }
      : a
  ),
};

const defense: DefensiveCard = {
  id: 'smoke-zone',
  category: 'DEFENSIVE',
  name: 'Zone Coverage',
  description: 'Smoke test defense',
  playType: 'ZONE_COVERAGE',
  rarity: 'COMMON',
  runStopRating: 70,
  passDefenseRating: 70,
  pressureRating: 30,
  bigPlayAllowed: 15,
  situationBonuses: [],
  predictionBonus: 15,
  strongAgainst: [],
  weakAgainst: [],
  generatedBy: 'smoke',
};

const result = simulatePlay(forcedRBPlay, defense, {}, {});

// ---- Diagnostic report ----

const SAMPLES = [0, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2400, 3000, 4000, 5000];

const f = (n: number) => n.toFixed(1).padStart(5);

// Header
process.stdout.write('\n=== Smoke run: Power Run (B_RIGHT) vs Zone Coverage ===\n\n');
process.stdout.write(`Play resolution: ${result.outcome.result}  yards=${result.outcome.yardsGained}  tackledBy=${result.tackledBy ?? 'none'}\n`);
process.stdout.write(`Total frames: ${result.frames.length}, total duration: ${result.totalDurationMs}ms\n\n`);

// At each sample timestamp, find the closest frame and report key positions.
for (const t of SAMPLES) {
  const frame = result.frames.reduce((best, fr) =>
    Math.abs(fr.timeMs - t) < Math.abs(best.timeMs - t) ? fr : best
  );
  process.stdout.write(`--- t=${t}ms (frame@${frame.timeMs}ms, phase=${frame.phase}) ---\n`);
  process.stdout.write(`  ball carrier: ${frame.ball.carrier ?? 'none'}\n`);

  const player = (slot: string) => frame.players.find(p => p.positionSlot === slot);
  const qb = player('QB');
  const rb = player('RB');
  const lt = player('LT'), lg = player('LG'), c = player('C'), rg = player('RG'), rt = player('RT');
  const de_l = player('DE_L'), dt_l = player('DT_L'), nt = player('NT'), dt_r = player('DT_R'), de_r = player('DE_R');
  const will = player('WILL'), mike = player('MIKE'), sam = player('SAM');

  if (qb && rb) process.stdout.write(`  QB=(${f(qb.x)},${f(qb.y)}) hasBall=${qb.hasBall}    RB=(${f(rb.x)},${f(rb.y)}) hasBall=${rb.hasBall}\n`);
  if (lg) process.stdout.write(`  LG=(${f(lg.x)},${f(lg.y)})  blocked=${lg.isBlocking}   <-- watch this pull right\n`);
  if (lt && c && rg && rt) {
    process.stdout.write(`  Other OL: LT=(${f(lt.x)},${f(lt.y)}) blk=${lt.isBlocking}  C=(${f(c.x)},${f(c.y)}) blk=${c.isBlocking}  RG=(${f(rg.x)},${f(rg.y)}) blk=${rg.isBlocking}  RT=(${f(rt.x)},${f(rt.y)}) blk=${rt.isBlocking}\n`);
  }
  if (de_l && dt_l && nt && dt_r && de_r) {
    process.stdout.write(`  DL: DE_L=(${f(de_l.x)},${f(de_l.y)}) DT_L=(${f(dt_l.x)},${f(dt_l.y)}) NT=(${f(nt.x)},${f(nt.y)}) DT_R=(${f(dt_r.x)},${f(dt_r.y)}) DE_R=(${f(de_r.x)},${f(de_r.y)})\n`);
  }
  if (will && mike && sam) {
    process.stdout.write(`  LB: WILL=(${f(will.x)},${f(will.y)}) MIKE=(${f(mike.x)},${f(mike.y)}) SAM=(${f(sam.x)},${f(sam.y)})\n`);
  }
  process.stdout.write('\n');
}

// Specific verifications
process.stdout.write('=== Verifications ===\n');

// LG should have moved RIGHT (positive x increase) by end of play.
// Threshold = 2 units: a pull is any horizontal movement past a base step.
const lgStart = result.frames[0].players.find(p => p.positionSlot === 'LG');
const lgMid = result.frames[Math.floor(result.frames.length / 2)].players.find(p => p.positionSlot === 'LG');
const lgEnd = result.frames[result.frames.length - 1].players.find(p => p.positionSlot === 'LG');
if (lgStart && lgEnd) {
  const delta = lgEnd.x - lgStart.x;
  process.stdout.write(`LG x movement: ${f(lgStart.x)} -> ${f(lgEnd.x)} (delta=${f(delta)})  ${delta > 2 ? '✓ PULLED' : '✗ NO PULL'}\n`);
  if (lgMid) process.stdout.write(`  mid-play LG.x = ${f(lgMid.x)}\n`);
}

// Drive blocking: pair LT (always priority-blocks DE_L) with DE_L's y movement.
// Frame data doesn't expose defender isBlocked, but y drift toward 0 implies
// the defender was held + driven back vs free-pursuing the carrier.
const ltEnd = result.frames[result.frames.length - 1].players.find(p => p.positionSlot === 'LT');
const delStart = result.frames[0].players.find(p => p.positionSlot === 'DE_L');
const delEnd = result.frames[result.frames.length - 1].players.find(p => p.positionSlot === 'DE_L');
if (ltEnd && delStart && delEnd) {
  const yDelta = delEnd.y - delStart.y;
  const ltBlocked = ltEnd.isBlocking;
  process.stdout.write(`LT engaged: ${ltBlocked}, DE_L y ${f(delStart.y)} -> ${f(delEnd.y)} (drift=${f(yDelta)})  ${ltBlocked && yDelta < -0.3 ? '✓ DRIVEN BACK' : ltBlocked ? '~ engaged, no drive' : '~ no engagement'}\n`);
}

// Did handoff happen? Look for first frame where ball.carrier === 'RB'
const handoffFrame = result.frames.find(fr => fr.ball.carrier === 'RB');
if (handoffFrame) {
  process.stdout.write(`Handoff at t=${handoffFrame.timeMs}ms  ✓\n`);
} else {
  process.stdout.write(`No handoff detected  ✗ (ball stayed with ${result.frames[0].ball.carrier})\n`);
}

// Was anyone blocked at end of play?
const lastFrame = result.frames[result.frames.length - 1];
const blockedOL = lastFrame.players.filter(p => p.isBlocking).map(p => p.positionSlot);
process.stdout.write(`Final blocked OL: ${blockedOL.join(', ') || '(none)'}\n`);

// Drive blocking — pick DT_L (LG's default target) and see if it moved down (y decreased)
const dtlStart = result.frames[0].players.find(p => p.positionSlot === 'DT_L');
const dtlEnd = result.frames[result.frames.length - 1].players.find(p => p.positionSlot === 'DT_L');
if (dtlStart && dtlEnd) {
  const yDelta = dtlEnd.y - dtlStart.y;
  process.stdout.write(`DT_L drive: y ${f(dtlStart.y)} -> ${f(dtlEnd.y)}  ${yDelta < -0.5 ? '✓ driven back' : '~ no drive'}\n`);
}

process.stdout.write('\n');
