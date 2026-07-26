import { describe, expect, it } from "vitest";
import "../../src/audio/cues/hudCues";
import { getAudioCue } from "../../src/audio/audioCueRegistry";

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createOscillator() {
    return { type: "sine", frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, value: 1 }, connect() {} };
  }
}

const HUD_CUE_IDS = ["hud.tick", "hud.press", "hud.drawerOpen", "hud.drawerClose", "hud.cardSelect", "hud.cardDrop"];

describe("audio/cues/hudCues", () => {
  it.each(HUD_CUE_IDS)("registers %s and synthesizes without throwing", (id) => {
    const entry = getAudioCue(id);
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
  });
});
