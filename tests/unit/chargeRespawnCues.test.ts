import { describe, expect, it } from "vitest";
import "../../src/audio/cues/chargeRespawnCues";
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

describe("audio/cues/chargeRespawnCues", () => {
  it.each(["charge.start", "respawn.scheduled", "respawn.complete"])("registers %s", (id) => {
    const entry = getAudioCue(id);
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
  });
});
