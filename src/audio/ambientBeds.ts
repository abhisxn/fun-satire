import type { AudioEngine } from "./AudioEngine";

export type AmbientHandle = { stop(): void };

type TextureSpec = {
  durationMs: number;
  filterFreqHz: number;
  gainPeak: number;
};

const MODE_TEXTURES: Record<string, TextureSpec> = {
  bugs: { durationMs: 900, filterFreqHz: 3200, gainPeak: 0.12 },
  pointedFinger: { durationMs: 1400, filterFreqHz: 140, gainPeak: 0.1 },
};

const TENSE_FILLER: TextureSpec = { durationMs: 4000, filterFreqHz: 260, gainPeak: 0.08 };

function loopTexture(ctx: AudioContext, destination: AudioNode, spec: TextureSpec): AmbientHandle {
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * (spec.durationMs / 1000)));
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = spec.filterFreqHz;
  const gain = ctx.createGain();
  gain.gain.value = spec.gainPeak;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(ctx.currentTime);
  return {
    stop: () => {
      source.stop();
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    },
  };
}

let activeModeAmbient: AmbientHandle | null = null;
let activeTenseFiller: AmbientHandle | null = null;

export function startAmbientForMode(engine: AudioEngine, modeId: string): void {
  stopAmbientMode();
  const spec = MODE_TEXTURES[modeId];
  if (!spec) return;
  activeModeAmbient = loopTexture(engine.getContext(), engine.getBus("sfx"), spec);
}

export function stopAmbientMode(): void {
  activeModeAmbient?.stop();
  activeModeAmbient = null;
}

export function startTenseFiller(engine: AudioEngine): void {
  if (activeTenseFiller) return;
  activeTenseFiller = loopTexture(engine.getContext(), engine.getBus("sfx"), TENSE_FILLER);
}

export function stopTenseFiller(): void {
  activeTenseFiller?.stop();
  activeTenseFiller = null;
}
