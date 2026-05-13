/**
 * Synthesized audio stingers — no asset files required.
 *
 * Each stinger schedules a few oscillators / envelopes on the shared
 * AudioContext to produce a short, recognizable cue for a play outcome.
 * Mute toggle short-circuits playback. Browsers require a user gesture
 * before AudioContext.resume() works, so the first stinger may be silent;
 * subsequent ones play normally.
 */

export type StingerKind =
  | 'TOUCHDOWN'
  | 'INTERCEPTION'
  | 'FUMBLE'
  | 'SACK'
  | 'BIG_PLAY'
  | 'FIRST_DOWN'
  | 'INCOMPLETE'
  | 'TWO_MINUTE'
  | 'QUARTER_END'
  | 'TAP';

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      // @ts-expect-error — webkitAudioContext is a legacy fallback in Safari.
      const Ctor: typeof AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  // Some browsers suspend the context until a user gesture; resume best-effort.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(m: boolean): void {
  muted = m;
}

export function isMuted(): boolean {
  return muted;
}

/**
 * Play a stinger. No-ops if muted or audio is unavailable.
 */
export function playStinger(kind: StingerKind): void {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;

  switch (kind) {
    case 'TOUCHDOWN':
      // C major arpeggio ascending — bright and celebratory.
      blip(audio, now, 523.25, 0.16, 'sine', 0.18);     // C5
      blip(audio, now + 0.10, 659.25, 0.16, 'sine', 0.18);  // E5
      blip(audio, now + 0.20, 783.99, 0.16, 'sine', 0.18);  // G5
      blip(audio, now + 0.32, 1046.50, 0.32, 'sine', 0.22); // C6 (held)
      break;

    case 'INTERCEPTION':
    case 'FUMBLE':
      // Descending dissonant — ominous.
      blip(audio, now, 311.13, 0.18, 'sawtooth', 0.14);   // Eb4
      blip(audio, now + 0.10, 277.18, 0.22, 'sawtooth', 0.14); // C#4
      blip(audio, now + 0.22, 233.08, 0.36, 'sawtooth', 0.16); // Bb3
      break;

    case 'SACK':
      // Short low thump.
      blip(audio, now, 90, 0.18, 'square', 0.20);
      blip(audio, now + 0.04, 60, 0.22, 'square', 0.18);
      break;

    case 'BIG_PLAY':
      // Rising whoosh — frequency sweep over 0.4s.
      sweep(audio, now, 220, 800, 0.42, 'triangle', 0.18);
      break;

    case 'FIRST_DOWN':
      // Short pleasant chime, two notes.
      blip(audio, now, 659.25, 0.12, 'sine', 0.16);  // E5
      blip(audio, now + 0.08, 880.00, 0.20, 'sine', 0.16);  // A5
      break;

    case 'INCOMPLETE':
      // Quick noise burst — incomplete pass / OOB feel.
      noise(audio, now, 0.10, 0.08);
      break;

    case 'TWO_MINUTE':
      // Old-school PA-style three-beep tone — tense.
      blip(audio, now, 880, 0.18, 'square', 0.12);
      blip(audio, now + 0.22, 880, 0.18, 'square', 0.12);
      blip(audio, now + 0.44, 880, 0.30, 'square', 0.14);
      break;

    case 'QUARTER_END':
      // Brief horn — descending pair.
      blip(audio, now, 392, 0.30, 'sawtooth', 0.14);     // G4
      blip(audio, now + 0.08, 311.13, 0.36, 'sawtooth', 0.12); // Eb4
      break;

    case 'TAP':
      // Soft tick for UI taps.
      blip(audio, now, 1200, 0.04, 'sine', 0.08);
      break;
  }
}

/**
 * Schedule a single tone with a quick attack / decay envelope.
 */
function blip(
  audio: AudioContext,
  start: number,
  freq: number,
  duration: number,
  type: OscillatorType,
  peak: number
): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/**
 * Frequency sweep — used for whooshes.
 */
function sweep(
  audio: AudioContext,
  start: number,
  fromHz: number,
  toHz: number,
  duration: number,
  type: OscillatorType,
  peak: number
): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromHz, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/**
 * White-noise burst — used for incomplete-pass type cues.
 */
function noise(audio: AudioContext, start: number, duration: number, peak: number): void {
  const bufferSize = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.connect(gain).connect(audio.destination);
  src.start(start);
  src.stop(start + duration + 0.02);
}
