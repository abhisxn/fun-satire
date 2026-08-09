import type { CreatureMode } from "../creatures/creatureTypes";

export interface HoverToneParams {
  readonly frequency: number;
  readonly type: OscillatorType;
  readonly durationMs: number;
  readonly peakGain: number;
}

// One shared "instrument" so the four creature hover tones read as
// different notes of the same voice rather than four unrelated blips: a
// major triad + octave rooted at A4 (440Hz). Non-pitched styles below still
// derive a per-mode filter center from this same table, so every style
// stays "different per creature" even without a musical pitch.
const ROOT_HZ = 440;
const MAJOR_THIRD = 5 / 4;
const PERFECT_FIFTH = 3 / 2;
const OCTAVE = 2;

const TONE_DURATION_MS = 70;
// Kept low and short so hover feedback reads as a soft, subtle tick rather
// than a musical note competing with the sound bed and other UI cues.
const TONE_PEAK_GAIN = 0.05;

const HOVER_TONE_PARAMS: Readonly<Record<CreatureMode, HoverToneParams>> = {
  eyes: { frequency: ROOT_HZ, type: "sine", durationMs: TONE_DURATION_MS, peakGain: TONE_PEAK_GAIN },
  pointedFinger: {
    frequency: ROOT_HZ * MAJOR_THIRD,
    type: "sine",
    durationMs: TONE_DURATION_MS,
    peakGain: TONE_PEAK_GAIN,
  },
  cockroach: {
    frequency: ROOT_HZ * PERFECT_FIFTH,
    type: "sine",
    durationMs: TONE_DURATION_MS,
    peakGain: TONE_PEAK_GAIN,
  },
  placard: { frequency: ROOT_HZ * OCTAVE, type: "sine", durationMs: TONE_DURATION_MS, peakGain: TONE_PEAK_GAIN },
};

/** Pure lookup: which note (frequency/timbre/envelope) a creature mode plays on hover. */
export function getHoverToneParams(mode: CreatureMode): HoverToneParams {
  return HOVER_TONE_PARAMS[mode];
}

// --- Style selection ------------------------------------------------------
//
// Five candidate sound designs for the hover cue. Swap live from the
// devtools console while the dev server is running:
//   window.__setHoverToneStyle("pop" | "knock" | "pluck" | "whoosh" | "classic")
// The choice persists across reloads (localStorage) until changed again.

export type HoverToneStyle = "classic" | "pop" | "knock" | "pluck" | "whoosh";
const HOVER_TONE_STYLES: readonly HoverToneStyle[] = ["classic", "pop", "knock", "pluck", "whoosh"];
const STYLE_STORAGE_KEY = "hoverToneStyle";

function readStoredStyle(): HoverToneStyle {
  try {
    const stored = localStorage.getItem(STYLE_STORAGE_KEY);
    if (stored && (HOVER_TONE_STYLES as readonly string[]).includes(stored)) {
      return stored as HoverToneStyle;
    }
  } catch {
    // localStorage unavailable (e.g. private browsing) — fall through to default.
  }
  return "pop";
}

let currentStyle: HoverToneStyle = readStoredStyle();

export function setHoverToneStyle(style: HoverToneStyle): void {
  currentStyle = style;
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, style);
  } catch {
    // Non-fatal: style still applies for the rest of this session.
  }
}

export function getHoverToneStyle(): HoverToneStyle {
  return currentStyle;
}

declare global {
  interface Window {
    __setHoverToneStyle?: (style: HoverToneStyle) => void;
  }
}
if (typeof window !== "undefined") {
  window.__setHoverToneStyle = setHoverToneStyle;
}

// --- Shared helpers ---------------------------------------------------

function createNoiseBuffer(context: AudioContext, durationSec: number): AudioBuffer {
  const size = Math.max(1, Math.floor(context.sampleRate * durationSec));
  const buffer = context.createBuffer(1, size, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// --- Style renderers ---------------------------------------------------
// Each takes the resolved per-mode params and fires one short, self
// -disconnecting envelope — same fire-and-forget contract regardless of style.

function playClassicTone(context: AudioContext, params: HoverToneParams): void {
  const now = context.currentTime;
  const durationSec = params.durationMs / 1000;
  const attackSec = Math.min(0.012, durationSec / 3);

  const oscillator = context.createOscillator();
  oscillator.type = params.type;
  oscillator.frequency.setValueAtTime(params.frequency, now);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(params.peakGain, now + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + durationSec + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

/** Soft filtered-noise pop/bubble — no pitch, just a per-mode filter center. */
function playPopTone(context: AudioContext, params: HoverToneParams): void {
  const now = context.currentTime;
  const durationSec = 0.06;

  const noise = context.createBufferSource();
  noise.buffer = createNoiseBuffer(context, durationSec);

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(3, now);
  filter.frequency.setValueAtTime(params.frequency * 2, now);
  filter.frequency.exponentialRampToValueAtTime(params.frequency * 0.9, now + durationSec);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(params.peakGain * 2.2, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  noise.start(now);
  noise.stop(now + durationSec + 0.02);
  noise.onended = () => {
    noise.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

/**
 * Very short, dry percussive tick — reads as "detected"/"pressed", not
 * musical. Shared by the "knock" hover-tone style below and by the HUD's
 * button sounds (src/audio/hudTones.ts), so both use the same percussive
 * character at different pitches/gains rather than two unrelated timbres.
 */
export function playKnockBurst(
  context: AudioContext,
  frequency: number,
  peakGain: number,
  durationSec = 0.035,
): void {
  const now = context.currentTime;

  const noise = context.createBufferSource();
  noise.buffer = createNoiseBuffer(context, durationSec);

  const filter = context.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(frequency * 1.5, now);
  filter.Q.setValueAtTime(0.7, now);

  const gain = context.createGain();
  gain.gain.setValueAtTime(peakGain, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  noise.start(now);
  noise.stop(now + durationSec + 0.02);
  noise.onended = () => {
    noise.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

function playKnockTone(context: AudioContext, params: HoverToneParams): void {
  playKnockBurst(context, params.frequency, params.peakGain * 2.6);
}

/** Plucked/marimba-style note — keeps the musical pitch mapping, warmer timbre than sine. */
function playPluckTone(context: AudioContext, params: HoverToneParams): void {
  const now = context.currentTime;
  const durationSec = 0.14;

  const oscillator = context.createOscillator();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(params.frequency, now);

  const gain = context.createGain();
  gain.gain.setValueAtTime(params.peakGain * 1.6, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + durationSec + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

/** Airy pitched-noise swish — breathy, closer in character to poof/drag-scratch. */
function playWhooshTone(context: AudioContext, params: HoverToneParams): void {
  const now = context.currentTime;
  const durationSec = 0.11;

  const noise = context.createBufferSource();
  noise.buffer = createNoiseBuffer(context, durationSec);

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(1.1, now);
  filter.frequency.setValueAtTime(params.frequency * 0.5, now);
  filter.frequency.exponentialRampToValueAtTime(params.frequency * 2.5, now + durationSec);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(params.peakGain * 1.8, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  noise.start(now);
  noise.stop(now + durationSec + 0.02);
  noise.onended = () => {
    noise.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

/**
 * Fires one short envelope-shaped hover cue on the given (shared)
 * AudioContext for the given creature mode, rendered in whichever style is
 * currently selected (see setHoverToneStyle). Fire-and-forget: every style's
 * nodes disconnect themselves once the envelope ends.
 */
export function playHoverTone(context: AudioContext, mode: CreatureMode): void {
  const params = getHoverToneParams(mode);
  switch (currentStyle) {
    case "pop":
      playPopTone(context, params);
      return;
    case "knock":
      playKnockTone(context, params);
      return;
    case "pluck":
      playPluckTone(context, params);
      return;
    case "whoosh":
      playWhooshTone(context, params);
      return;
    case "classic":
    default:
      playClassicTone(context, params);
  }
}
