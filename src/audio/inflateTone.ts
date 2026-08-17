const INFLATE_DURATION_SEC = 0.22;
const INFLATE_PEAK_GAIN = 0.22;

/**
 * Fires one short rising-pitch "inflate" blip on the given (shared) AudioContext: a
 * sine sweeping upward in frequency, for when the sticker's size tier grows a step.
 * Fire-and-forget, like playPoofTone — the nodes disconnect themselves once the
 * envelope ends.
 */
export function playInflateTone(context: AudioContext): void {
  const now = context.currentTime;

  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(220, now);
  oscillator.frequency.exponentialRampToValueAtTime(520, now + INFLATE_DURATION_SEC);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(INFLATE_PEAK_GAIN, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + INFLATE_DURATION_SEC);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + INFLATE_DURATION_SEC + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
