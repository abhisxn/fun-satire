const POOF_DURATION_SEC = 0.35;
const POOF_PEAK_GAIN = 0.35;

/**
 * Fires one airy "poof" burst on the given (shared) AudioContext: a short
 * bandpass-filtered noise cloud swept downward in frequency, echoing the
 * visual smoke burst in poofEffect.ts. Fire-and-forget, like playHoverTone
 * in hoverTones.ts — the nodes disconnect themselves once the envelope ends.
 */
export function playPoofTone(context: AudioContext): void {
  const now = context.currentTime;

  const bufferSize = Math.max(1, Math.floor(context.sampleRate * POOF_DURATION_SEC));
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = context.createBufferSource();
  noise.buffer = buffer;

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(0.8, now);
  filter.frequency.setValueAtTime(1200, now);
  filter.frequency.exponentialRampToValueAtTime(220, now + POOF_DURATION_SEC);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(POOF_PEAK_GAIN, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + POOF_DURATION_SEC);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  noise.start(now);
  noise.stop(now + POOF_DURATION_SEC + 0.02);
  noise.onended = () => {
    noise.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}
