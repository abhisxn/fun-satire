import { describe, expect, it } from "vitest";
import "../../src/audio/cues/bugEatCues";
import { getAudioCue } from "../../src/audio/audioCueRegistry";

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createBufferSource() {
    return { buffer: null, connect() {}, start() {}, stop() {} };
  }
  createBiquadFilter() {
    return { type: "", frequency: { value: 0 }, connect() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, value: 1 }, connect() {} };
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

describe("audio/cues/bugEatCues", () => {
  it.each(["bugEat.start", "bugEat.dissolve"])("registers %s", (id) => {
    const entry = getAudioCue(id);
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
  });
});
