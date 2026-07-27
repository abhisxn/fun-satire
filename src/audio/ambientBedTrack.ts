import type { AudioEngine } from "./AudioEngine";

export type AmbientBedHandle = { stop(): void };

export function synthAmbientBed(ctx: AudioContext, destination: AudioNode): AmbientBedHandle {
  const now = ctx.currentTime;

  const layerAGain = ctx.createGain();
  layerAGain.gain.value = 0.15;
  layerAGain.connect(destination);

  const droneOsc = ctx.createOscillator();
  droneOsc.type = "sine";
  droneOsc.frequency.value = 80;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.1;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 10;

  lfo.connect(lfoGain);
  lfoGain.connect(droneOsc.frequency);
  droneOsc.connect(layerAGain);

  droneOsc.start(now);
  lfo.start(now);

  const layerCGain = ctx.createGain();
  layerCGain.gain.value = 0;
  layerCGain.connect(destination);

  const padFreqs = [219.5, 220, 220.5];
  const padOscs = padFreqs.map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(layerCGain);
    osc.start(now);
    return osc;
  });

  const attackTime = 2;
  layerCGain.gain.setValueAtTime(0.0001, now);
  layerCGain.gain.linearRampToValueAtTime(0.12, now + attackTime);

  return {
    stop: () => {
      const stopTime = ctx.currentTime;
      const releaseTime = 1;

      layerCGain.gain.cancelScheduledValues(stopTime);
      layerCGain.gain.setValueAtTime(layerCGain.gain.value, stopTime);
      layerCGain.gain.linearRampToValueAtTime(0.0001, stopTime + releaseTime);

      setTimeout(() => {
        droneOsc.stop();
        droneOsc.disconnect();
        lfo.stop();
        lfo.disconnect();
        lfoGain.disconnect();
        layerAGain.disconnect();

        for (const osc of padOscs) {
          osc.stop();
          osc.disconnect();
        }
        layerCGain.disconnect();
      }, releaseTime * 1000);
    },
  };
}

export async function startAmbientBedTrack(engine: AudioEngine, _url?: string): Promise<AmbientBedHandle> {
  const ctx = engine.getContext();
  const ambientBus = engine.getBus("ambient");
  return synthAmbientBed(ctx, ambientBus);
}
