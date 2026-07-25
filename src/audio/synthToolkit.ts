export type ToneShape = "sine" | "square" | "sawtooth" | "triangle";

export type ToneOptions = {
  freqStartHz: number;
  freqEndHz?: number;
  durationMs: number;
  shape?: ToneShape;
  gainPeak?: number;
};

export function playTone(ctx: AudioContext, destination: AudioNode, opts: ToneOptions): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.shape ?? "sine";
  const now = ctx.currentTime;
  const durationSec = opts.durationMs / 1000;
  osc.frequency.setValueAtTime(opts.freqStartHz, now);
  if (opts.freqEndHz !== undefined) {
    osc.frequency.linearRampToValueAtTime(opts.freqEndHz, now + durationSec);
  }
  const peak = opts.gainPeak ?? 0.4;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + Math.min(0.01, durationSec / 4));
  gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + durationSec);
}

export type NoiseBurstOptions = {
  durationMs: number;
  filterFreqHz?: number;
  gainPeak?: number;
};

export function playNoiseBurst(ctx: AudioContext, destination: AudioNode, opts: NoiseBurstOptions): void {
  const durationSec = opts.durationMs / 1000;
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = opts.filterFreqHz ?? 1200;
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  const peak = opts.gainPeak ?? 0.3;
  gain.gain.setValueAtTime(peak, now);
  gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(now);
  source.stop(now + durationSec);
}
