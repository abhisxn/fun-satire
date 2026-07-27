import { describe, expect, it } from "vitest";
import "../../src/audio/cues/laserBurnCues";
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
  createBufferSource() {
    return { buffer: null, connect() {}, start() {}, stop() {} };
  }
  createBiquadFilter() {
    return { type: "", frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, Q: { value: 1 }, connect() {} };
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

describe("audio/cues/laserBurnCues", () => {
  it.each(["laserBurn.glow", "laserBurn.dissolve"])("registers %s", (id) => {
    const entry = getAudioCue(id);
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
  });
});
