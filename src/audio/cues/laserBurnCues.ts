import { registerAudioCue } from "../audioCueRegistry";
import { playTone, playNoiseBurst } from "../synthToolkit";
import { LASER_BURN } from "../../effects/effectDefs/laserBurn";

registerAudioCue({
  id: "laserBurn.glow",
  synth: (ctx, dest) =>
    playTone(ctx, dest, {
      freqStartHz: 300,
      freqEndHz: 1200,
      durationMs: LASER_BURN.glowMs + LASER_BURN.lineMs,
      shape: "sawtooth",
      gainPeak: 0.3,
      attackMs: 200,
      releaseMs: 300,
    }),
});

registerAudioCue({
  id: "laserBurn.dissolve",
  synth: (ctx, dest) =>
    playNoiseBurst(ctx, dest, { durationMs: LASER_BURN.dissolveMs, filterFreqHz: 2200, gainPeak: 0.35 }),
});
