import { playKnockBurst } from "./hoverTones";

/**
 * Percussive "knock" UI cue for the HUD's mode/settings/gallery buttons, on
 * the same shared AudioContext as everything else in src/audio/. Reuses
 * hoverTones.ts's knock renderer — same dry, detected-not-musical character
 * as the "knock" hover-tone style.
 */

const SELECT_FREQUENCY_HZ = 1400;
const SELECT_PEAK_GAIN = 0.16;

/** Crisp high knock for mode/settings/gallery buttons. */
export function playHudSelectTone(context: AudioContext): void {
  playKnockBurst(context, SELECT_FREQUENCY_HZ, SELECT_PEAK_GAIN);
}
