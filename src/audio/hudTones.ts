import { playKnockBurst } from "./hoverTones";

/**
 * Percussive "knock" UI cues for the HUD (mode/settings/gallery buttons and
 * the attack/protest button), on the same shared AudioContext as everything
 * else in src/audio/. Reuses hoverTones.ts's knock renderer — same dry,
 * detected-not-musical character as the "knock" hover-tone style — at
 * different pitches/gains per button kind.
 */

const SELECT_FREQUENCY_HZ = 1400;
const SELECT_PEAK_GAIN = 0.16;

/** Crisp high knock for mode/settings/gallery buttons. */
export function playHudSelectTone(context: AudioContext): void {
  playKnockBurst(context, SELECT_FREQUENCY_HZ, SELECT_PEAK_GAIN);
}

const PRESS_FREQUENCY_HZ = 500;
const PRESS_PEAK_GAIN = 0.22;
const PRESS_DURATION_SEC = 0.05;

/** Lower, slightly longer knock for the attack/protest button's press. */
export function playHudPressTone(context: AudioContext): void {
  playKnockBurst(context, PRESS_FREQUENCY_HZ, PRESS_PEAK_GAIN, PRESS_DURATION_SEC);
}
