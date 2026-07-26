import { registerAudioCue } from "../audioCueRegistry";
import { playTone, playNoiseBurst } from "../synthToolkit";

registerAudioCue({
  id: "electricBurn.start",
  synth: (ctx, dest) => {
    playTone(ctx, dest, { freqStartHz: 180, freqEndHz: 60, durationMs: 90, shape: "square", gainPeak: 0.25 });
    playNoiseBurst(ctx, dest, { durationMs: 90, filterFreqHz: 3000, gainPeak: 0.2 });
  },
});

registerAudioCue({
  id: "electricBurn.dissolve",
  synth: (ctx, dest) => playNoiseBurst(ctx, dest, { durationMs: 140, filterFreqHz: 2600, gainPeak: 0.3 }),
});
