import { registerAudioCue } from "../audioCueRegistry";
import { playTone, playNoiseBurst } from "../synthToolkit";
import { LASER_BURN } from "../../effects/effectDefs/laserBurn";

registerAudioCue({
  id: "laserBurn.glow",
  synth: (ctx, dest) =>
    playTone(ctx, dest, {
      freqStartHz: 500,
      freqEndHz: 1400,
      durationMs: LASER_BURN.glowMs + LASER_BURN.lineMs,
      shape: "sawtooth",
      gainPeak: 0.3,
    }),
});

registerAudioCue({
  id: "laserBurn.dissolve",
  synth: (ctx, dest) =>
    playNoiseBurst(ctx, dest, { durationMs: LASER_BURN.dissolveMs, filterFreqHz: 2200, gainPeak: 0.35 }),
});
