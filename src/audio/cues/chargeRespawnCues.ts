import { registerAudioCue } from "../audioCueRegistry";
import { playTone } from "../synthToolkit";
import { LASER_BURN } from "../../effects/effectDefs/laserBurn";

registerAudioCue({
  id: "charge.start",
  synth: (ctx, dest) =>
    playTone(ctx, dest, {
      freqStartHz: 220,
      freqEndHz: 880,
      durationMs: LASER_BURN.chargeThresholdMs,
      shape: "sawtooth",
      gainPeak: 0.2,
    }),
});

registerAudioCue({
  id: "respawn.scheduled",
  synth: (ctx, dest) =>
    playTone(ctx, dest, { freqStartHz: 260, freqEndHz: 180, durationMs: 90, shape: "sine", gainPeak: 0.25 }),
});

registerAudioCue({
  id: "respawn.complete",
  synth: (ctx, dest) =>
    playTone(ctx, dest, { freqStartHz: 440, freqEndHz: 660, durationMs: 110, shape: "sine", gainPeak: 0.3 }),
});
