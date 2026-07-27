export type ToneShape = "sine" | "square" | "sawtooth" | "triangle";

export type ToneOptions = {
  freqStartHz: number;
  freqEndHz?: number;
  durationMs: number;
  shape?: ToneShape;
  gainPeak?: number;
  attackMs?: number;
  releaseMs?: number;
};

export function playTone(ctx: AudioContext, destination: AudioNode, opts: ToneOptions): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.shape ?? "sine";
  const now = ctx.currentTime;
  const durationSec = opts.durationMs / 1000;
  const attackSec = (opts.attackMs ?? 10) / 1000;
  const releaseSec = (opts.releaseMs ?? Math.min(10, opts.durationMs / 4)) / 1000;
  osc.frequency.setValueAtTime(opts.freqStartHz, now);
  if (opts.freqEndHz !== undefined) {
    const sweepEnd = Math.max(0, durationSec - releaseSec);
    osc.frequency.linearRampToValueAtTime(opts.freqEndHz, now + sweepEnd);
  }
  const peak = opts.gainPeak ?? 0.4;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + attackSec);
  const releaseStart = Math.max(attackSec, durationSec - releaseSec);
  gain.gain.setValueAtTime(peak, now + releaseStart);
  gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + durationSec);
}

export type NoiseBurstOptions = {
  durationMs: number;
  filterFreqHz?: number;
  filterEndHz?: number;
  filterType?: BiquadFilterType;
  gainPeak?: number;
  attackMs?: number;
  releaseMs?: number;
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
  filter.type = opts.filterType ?? "bandpass";
  const now = ctx.currentTime;
  const startFreq = opts.filterFreqHz ?? 1200;
  filter.frequency.setValueAtTime(startFreq, now);
  if (opts.filterEndHz !== undefined) {
    filter.frequency.linearRampToValueAtTime(opts.filterEndHz, now + durationSec);
  }
  const gain = ctx.createGain();
  const peak = opts.gainPeak ?? 0.3;
  const attackSec = (opts.attackMs ?? 0) / 1000;
  const releaseSec = (opts.releaseMs ?? 0) / 1000;
  if (attackSec > 0) {
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attackSec);
  } else {
    gain.gain.setValueAtTime(peak, now);
  }
  if (releaseSec > 0) {
    const releaseStart = Math.max(attackSec, durationSec - releaseSec);
    gain.gain.setValueAtTime(peak, now + releaseStart);
    gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
  } else {
    gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
  }
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(now);
  source.stop(now + durationSec);
}

export type BuzzOptions = {
  centerHz: number;
  modulationHz?: number;
  modulationDepthHz?: number;
  gainPeak?: number;
};

export function playBuzz(ctx: AudioContext, destination: AudioNode, opts: BuzzOptions): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = opts.centerHz;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = opts.modulationHz ?? 30;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = opts.modulationDepthHz ?? 15;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = opts.centerHz;
  filter.Q.value = 4;

  const gain = ctx.createGain();
  gain.gain.value = opts.gainPeak ?? 0.2;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(now);
  lfo.start(now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(opts.gainPeak ?? 0.2, now + 0.05);

  osc.stop(now + 0.2);
  lfo.stop(now + 0.2);
  gain.gain.linearRampToValueAtTime(0.0001, now + 0.2);
}
