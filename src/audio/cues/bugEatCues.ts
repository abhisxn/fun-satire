import { registerAudioCue } from "../audioCueRegistry";
import { playNoiseBurst } from "../synthToolkit";

registerAudioCue({
  id: "bugEat.start",
  synth: (ctx, dest) => {
    playNoiseBurst(ctx, dest, { durationMs: 150, filterFreqHz: 5000, filterEndHz: 600, filterType: "lowpass", gainPeak: 0.25, attackMs: 5, releaseMs: 20 });
  },
});

registerAudioCue({
  id: "bugEat.dissolve",
  synth: (ctx, dest) => playNoiseBurst(ctx, dest, { durationMs: 100, filterFreqHz: 1800, gainPeak: 0.25 }),
});
