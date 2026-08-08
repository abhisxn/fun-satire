import type { CreatureMode } from "../creatures/creatureTypes";

export interface HoverToneParams {
  readonly frequency: number;
  readonly type: OscillatorType;
  readonly durationMs: number;
  readonly peakGain: number;
}

// One shared "instrument" so the four creature hover tones read as
// different notes of the same voice rather than four unrelated blips: a
// major triad + octave rooted at A4 (440Hz).
const ROOT_HZ = 440;
const MAJOR_THIRD = 5 / 4;
const PERFECT_FIFTH = 3 / 2;
const OCTAVE = 2;

const TONE_DURATION_MS = 90;
const TONE_PEAK_GAIN = 0.16;

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

/**
 * Fires one short envelope-shaped oscillator blip on the given (shared)
 * AudioContext for the given creature mode. Fire-and-forget: the
 * oscillator/gain nodes disconnect themselves once the envelope ends, so
 * callers don't need to track or clean up anything.
 */
export function playHoverTone(context: AudioContext, mode: CreatureMode): void {
  const params = getHoverToneParams(mode);
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
