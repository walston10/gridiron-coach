# GRIDIRON COACH — Core Gameplay Loop Design

**Status:** Approved direction. This document is the spec for rebuilding the
in-game play-calling loop. Build against THIS, not against the current
`card.types.ts` stat-sprawl direction.

**Tone reminder:** messy, dirty, gritty, funny. The fantasy is *degenerate
coach*, not *offensive coordinator*. Personality lives in card text, player
egos, and consequences — never in simulation jargon.

---

## 1. Design pillars

1. **The Bluff** — every snap is a read/commit/reveal moment with partial
   information. The player should feel clever or punished, never neutral.
2. **The Setup** — plays make *future* plays better. Play action is not a
   card; it is a payoff the player builds by lying to the defense (see §5,
   the Bite meter).
3. **Push-Your-Luck** — greed is always on the table: deep shots, 4th-down
   gambles, and the Dirty layer (Tex / Heat).
4. **One decision per ~8 seconds, mobile-first.** A card shows at most:
   a name, a yardage band bar, 1–3 risk pips, and one line of flavor.
   No stat blocks.

---

## 2. The core loop (one snap, 5 beats)

```
[READ] → [COMMIT] → [REVEAL] → [RESOLVE] → [AFTERMATH]
 ~3s       ~3s        ~1.5s      2–6s         ~2s
```

**Beat 1 — READ.** Field view fills the top ⅔ of the screen. Defender tells
(BLITZ / DEEP / MAN / etc., from existing `engine/tells.ts`) render over
defenders, gated by scout grade A–D. The Bite meter and down/distance strip
are visible. The player is forming a guess.

**Beat 2 — COMMIT.** Card rail along the bottom: 4 intent verbs (always
available) + 1–2 Spotlight player cards (rotating). Swipe a card up to the
field to commit. Cards animate away; no takebacks except audibles (§7).

**Beat 3 — REVEAL.** The defense's card flips face-up center-screen — a real
card flip, ~0.8s, this is the heartbeat of the game. Immediately stamped
with a matchup verdict in big brawler type:

- `YOU BEAT THE CALL` (your verb wins the matchup)
- `THEY READ YOU` (their verb wins)
- `DEAD EVEN` (neutral)
- `THEY BIT ON THE FAKE 🔥` (pass thrown while Bite ≥ threshold vs a
  run-committed defense — the play-action payoff moment)

The stamp tells the player *why* before they see *how much*. This is what
makes results feel earned instead of rolled.

**Beat 4 — RESOLVE.** The existing keyframed play animation
(`KeyFramedPlayResult`) plays the actual yardage out on the field. The
number is *shown, not told* — the ballcarrier gets what the resolution
engine decided (§4), including live breakaway rolls (§4.4) so a run isn't
over until he's down. Tap-to-skip snaps to the result card. A settings
toggle (`FAST MODE`) replaces animation with a 1s text ticker + result slam
for players grinding a season.

**Beat 5 — AFTERMATH.** Result slam: big yardage number, tier stamp
(`STUFFED` / `CHUNK` / `HOUSE CALL`…), one line of satirical play-by-play,
meter deltas animating (Bite, Momentum, Heat). Chain straight into the next
READ. Target: a full snap in under 15 seconds, under 5 in fast mode.

---

## 3. Cards

### 3.1 Taxonomy collapse

Kill the 13 offensive play types. The player-facing offense is **4 intent
verbs**, always in hand, never rotate out:

| Verb | What it is | Bite effect |
|---|---|---|
| **HAMMER** | Run it down their throat | +15 Bite |
| **DINK** | Quick game, checkdowns, screens | −5 Bite |
| **AIR IT OUT** | Shot plays, 15+ air yards | −15 Bite |
| **TRICK 'EM** | Reverses, flea flickers, wildcat chaos | resets Bite to 0 |

Which *actual football play* fires underneath (from `defaultPlays.ts` /
the playbook, weighted by roster) is flavor the engine picks — the player
chooses intent, the sim renders a real play. This is how "play action run,"
"draw," "counter" etc. survive: as emergent flavor inside HAMMER, chosen
partly by Bite state (a draw fires when the defense expects pass), never as
menu items.

**Special-teams / 4th-down verbs** (PUNT, KICK, GO FOR IT) appear
contextually replacing the rail on 4th down. Keep existing ST resolution.

### 3.2 Spotlight cards (the comedy engine)

1–2 rotating cards per drive, generated from roster players (reuse
`playHand.ts` deal logic and `cardGenerator.ts`). A Spotlight card is a
verb instance wearing a personality:

> **"FEED DEMARCUS"** *(AIR IT OUT)* — He told the media he's open every
> play. Prove it. **+20% this drive. Ignore it 2 drives in a row: morale
> hit.**

Spotlight cards carry ego hooks: bonuses for use, consequences for neglect,
hot/cold streaks, ties into the Events/personality systems
(`personalityMoments.ts`, `eventTemplates.ts`). This is where rarity lives
(COMMON→LEGENDARY) — verbs have no rarity.

### 3.3 Card anatomy (what renders on a card)

- Name (verb or spotlight name)
- **Yardage band bar** — horizontal bar from floor to ceiling with the
  typical range highlighted (see §4.2 for bands). NOT a single number,
  NOT a percentage.
- **Risk pips** — 0–3 skulls (turnover/sack exposure)
- Active stamps (e.g. `🔥 THEY'RE BITING +1 TIER` on pass verbs when Bite
  is hot)
- One line of flavor text

Nothing else. All other current card fields (`baseYards`, `successChance`,
`bigPlayChance`, situational bonus lists, counters, stamina) become
internal engine inputs or get deleted.

### 3.4 Dirty is a button, not a deck

Dirty cards no longer compete for hand space. Tex is a phone icon in the
corner that glows on eligible moments (opponent big play just happened, 4th
and short, your star just got hurt). Tapping it opens the existing Call
menu (`theCallSystem.ts`) — slush fund cost, Heat, catch chance, voice
lines. Unchanged mechanically; relocated in UX.

---

## 4. Resolution model (the actual math)

Two-stage resolution. Stage 1 picks an **outcome tier** (the drama). Stage
2 rolls **yards within the tier's band** (the texture). Players learn tiers
fast — "beat their call, jump a tier" — which keeps randomness legible.

### 4.1 Outcome tiers

| Tier | Yards | Notes |
|---|---|---|
| DISASTER | turnover | INT / fumble / strip-sack; return yards possible |
| BUST | −8 … 0 | sack, TFL, or incompletion (0) |
| STUFF | 0 … 2 | |
| MODEST | 3 … 6 | |
| SOLID | 7 … 12 | |
| BIG | 13 … 25 | |
| HUGE | 26+ | breakaway; live TD chance during animation |

### 4.2 Verb base bands (what the card bar shows)

- **HAMMER:** floor −2, typical 2–5, ceiling ~15. 0 risk pips. Almost never
  DISASTER/BUST; almost never BIG without a matchup win.
- **DINK:** floor 0, typical 4–7, ceiling ~12. 1 pip. Reliable, capped.
- **AIR IT OUT:** bimodal — heavy BUST weight (incomplete/sack), typical
  when it hits 18–35. 2–3 pips. The greed card.
- **TRICK 'EM:** wildest variance, real DISASTER weight, HUGE ceiling.
  3 pips. Big bonus vs aggressive defensive verbs.

### 4.3 Stage 1 — tier weights

Each (offense verb × defense verb) pairing has a base tier-weight table.
Defense verbs (also 4–5, mirrored design): **SELL OUT** (run blitz),
**BLITZ**, **LOCKDOWN** (man), **UMBRELLA** (deep zone), **ROBBER**
(gamble/guess). Example pairings to anchor tuning (weights sum to 100):

| Matchup | DISASTER | BUST | STUFF | MODEST | SOLID | BIG | HUGE |
|---|---|---|---|---|---|---|---|
| HAMMER vs SELL OUT (they read you) | 3 | 12 | 45 | 30 | 8 | 2 | 0 |
| HAMMER vs UMBRELLA (you beat the call) | 1 | 2 | 8 | 30 | 35 | 18 | 6 |
| AIR IT OUT vs SELL OUT + Bite≥60 (🔥) | 4 | 18 | 0 | 3 | 15 | 35 | 25 |
| AIR IT OUT vs UMBRELLA (they read you) | 10 | 55 | 0 | 5 | 20 | 8 | 2 |
| DINK vs BLITZ (hot read) | 3 | 15 | 5 | 25 | 35 | 14 | 3 |
| TRICK 'EM vs ROBBER (disaster) | 25 | 40 | 15 | 10 | 5 | 3 | 2 |

Opus: build the full matrix as a data table in `src/data/` so it's tunable
without touching engine code. Pattern: winning the matchup shifts ~2 tiers
of weight upward; losing shifts ~1–2 down; ROBBER is high-variance both
ways (it beats what it guesses, gets shredded otherwise).

**Weight modifiers (shift weights, never yards directly):**
- Bite stamp (🔥): halve BUST/STUFF weight, +1 tier shift on pass verbs
- Player ratings via existing `rosterBuffs` / `playCalculator` inputs:
  ±10% weight tilt
- Momentum: ±5% tilt
- Spotlight card bonuses: as printed on the card
- Dirty effects: as per `theCallSystem` / dirty effect types
- Situation (red zone compresses bands: HUGE impossible, STUFF likelier)

### 4.4 Stage 2 — yards + the breakaway roll

Roll yards within the tier band (triangular distribution peaked low). If
tier is BIG or HUGE, resolution hands the animation a **breakaway
sequence**: at the catch/hole moment, 1–2 live "tackle broken?" rolls
(weighted by ballcarrier ratings) each extend the run. The player watches
these happen on the field — this is the slot-machine beat. A HUGE tier with
two broken tackles that started at the 40 is a touchdown the player will
screenshot.

Turnovers, penalties, injuries: keep routing through existing
`PenaltyEngine`, `injurySystem`, and dirty-card outcome paths.

---

## 5. The Bite meter (play action, done right)

A 0–100 meter, always visible, representing how hard the defense is
cheating against the run.

- HAMMER +15, DINK −5, AIR IT OUT −15, TRICK 'EM resets to 0
- Decays 5 per snap passively
- **Defense AI reads it too:** high Bite raises their SELL OUT frequency —
  which is exactly what makes the payoff real
- At Bite ≥ 60, pass verbs get the `🔥 THEY'RE BITING` stamp (§4.3)
- The meter renders as linebacker silhouettes creeping toward the line —
  diegetic, on the field, matching the tells

This makes three 2-yard dives *fun*: the player is loading a gun, and the
game shows them loading it.

---

## 6. Reads, audibles, tells

- Reuse `engine/tells.ts` and scout grades A–D exactly as built.
- **Audibles: 3 per game.** After tells render but before commit, the
  player may burn an audible to force the defense to re-roll its call
  (new tells render). Scarcity → stories.
- Scout grade improves via the franchise layer (scouting staff), giving the
  management game a direct hook into moment-to-moment fun.

---

## 7. Defense possessions

Mirror loop, lighter: the player picks a defensive verb (SELL OUT / BLITZ /
LOCKDOWN / UMBRELLA / ROBBER), sees *offensive* tells (formation, personnel,
motion — build a thin offensive-tells equivalent), same reveal flip, same
tier table read from the other side. ROBBER is the defensive greed card:
name the offense's verb; right = massive shift toward DISASTER-for-them,
wrong = tier shift against you. Optional setting: sim defense entirely for
players who only want to call O.

---

## 8. What to reuse / deprecate

**Reuse as-is:** `tells.ts`, `theCallSystem.ts`, `playHand.ts` (deal
logic), keyframe animation stack (`keyFrame.ts`, `KeyFramedPlayResult`),
`PenaltyEngine`, `injurySystem`, `FatigueEngine`, `gameClock`, drive/season
/franchise layers, `personalityMoments.ts`.

**Refactor:** `cardGenerator.ts` → generates Spotlight cards only.
`playApproach.ts` → becomes the verb definitions + play-selection weights.
`playResolver.ts` / `playCalculator.ts` → implement the two-stage tier
model; keep their outputs feeding the keyframe sim so animation matches
result.

**Deprecate:** the 13-play-type offensive card taxonomy and per-card stat
blocks in `card.types.ts`; dirty cards as hand cards (mechanic survives via
Tex button); `RARITY_DRAW_WEIGHTS` for verbs (rarity is Spotlight-only).

## 9. Build phases

1. **Engine:** tier tables in `src/data/matchupMatrix.ts`, two-stage
   resolver, Bite meter state in `cardGameStore`, verb → concrete-play
   selection. Unit-test tier distributions.
2. **Loop UI:** card rail (4 verbs), commit gesture, reveal flip + verdict
   stamp, result slam, Bite meter render. Wire to existing animation.
3. **Spotlight cards** + ego hooks into events/morale.
4. **Defense possessions** + offensive tells.
5. **Tex relocation** (button + glow moments) and audibles.
6. **Tuning pass:** target full-game length 12–18 min animated, ≤6 min
   fast mode; a coin-flip matchup should feel ~55/45 in the reader's favor.
