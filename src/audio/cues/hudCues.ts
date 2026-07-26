import { registerAudioCue } from "../audioCueRegistry";
import { playTone } from "../synthToolkit";

registerAudioCue({
  id: "hud.tick",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 900, durationMs: 40, shape: "square", gainPeak: 0.25 }),
});

registerAudioCue({
  id: "hud.press",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 520, durationMs: 60, shape: "triangle", gainPeak: 0.3 }),
});

registerAudioCue({
  id: "hud.drawerOpen",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 400, freqEndHz: 700, durationMs: 140, shape: "sine", gainPeak: 0.3 }),
});

registerAudioCue({
  id: "hud.drawerClose",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 700, freqEndHz: 400, durationMs: 120, shape: "sine", gainPeak: 0.3 }),
});

registerAudioCue({
  id: "hud.cardSelect",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 660, durationMs: 70, shape: "triangle", gainPeak: 0.3 }),
});

registerAudioCue({
  id: "hud.cardDrop",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 300, freqEndHz: 220, durationMs: 90, shape: "sine", gainPeak: 0.35 }),
});
