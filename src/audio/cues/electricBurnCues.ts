import { registerAudioCue } from "../audioCueRegistry";
import { playTone, playNoiseBurst, playBuzz } from "../synthToolkit";

registerAudioCue({
  id: "electricBurn.start",
  synth: (ctx, dest) => {
    playTone(ctx, dest, { freqStartHz: 120, freqEndHz: 80, durationMs: 180, shape: "square", gainPeak: 0.18, attackMs: 10, releaseMs: 40 });
    playBuzz(ctx, dest, { centerHz: 220, modulationHz: 25, modulationDepthHz: 20, gainPeak: 0.18 });
    playNoiseBurst(ctx, dest, { durationMs: 180, filterFreqHz: 2400, filterType: "bandpass", gainPeak: 0.15, attackMs: 15, releaseMs: 40 });
  },
});

registerAudioCue({
  id: "electricBurn.dissolve",
  synth: (ctx, dest) => playNoiseBurst(ctx, dest, { durationMs: 140, filterFreqHz: 2600, gainPeak: 0.3 }),
});
