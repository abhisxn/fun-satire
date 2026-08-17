const DEFLATE_DURATION_SEC = 0.26;
const DEFLATE_PEAK_GAIN = 0.22;

/**
 * Fires one short falling-pitch "deflate" blip on the given (shared) AudioContext: a
 * sine sweeping downward in frequency — the mirror of playInflateTone — for when the
 * sticker's size tier shrinks a step, including the full-power win's snap to its
 * fixed floor scale. Fire-and-forget, like playPoofTone — the nodes disconnect
 * themselves once the envelope ends.
 */
export function playDeflateTone(context: AudioContext): void {
  const now = context.currentTime;

  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(480, now);
  oscillator.frequency.exponentialRampToValueAtTime(160, now + DEFLATE_DURATION_SEC);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(DEFLATE_PEAK_GAIN, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + DEFLATE_DURATION_SEC);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + DEFLATE_DURATION_SEC + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
