import { registerAudioCue } from "../audioCueRegistry";
import { playNoiseBurst } from "../synthToolkit";

registerAudioCue({
  id: "bugEat.start",
  synth: (ctx, dest) => {
    for (let i = 0; i < 4; i++) {
      playNoiseBurst(ctx, dest, { durationMs: 30, filterFreqHz: 3500 + i * 400, gainPeak: 0.15 });
    }
  },
});

registerAudioCue({
  id: "bugEat.dissolve",
  synth: (ctx, dest) => playNoiseBurst(ctx, dest, { durationMs: 100, filterFreqHz: 1800, gainPeak: 0.25 }),
});
