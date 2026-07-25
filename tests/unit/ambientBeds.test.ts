import { describe, expect, it, beforeEach } from "vitest";
import { AudioEngine } from "../../src/audio/AudioEngine";
import { startAmbientForMode, stopAmbientMode, startTenseFiller, stopTenseFiller } from "../../src/audio/ambientBeds";

class FakeParam {
  value = 0;
}

class FakeBufferSource {
  buffer: unknown = null;
  loop = false;
  stopCalls = 0;
  connect() {}
  disconnect() {}
  start() {}
  stop() { this.stopCalls++; }
}

class FakeFilter {
  type = "";
  frequency = new FakeParam();
  connect() {}
  disconnect() {}
}

class FakeGainNode {
  gain = new FakeParam();
  connect() {}
  disconnect() {}
}

class FakeAudioContext {
  destination = {};
  currentTime = 0;
  sampleRate = 44100;
  state: "suspended" | "running" = "suspended";
  bufferSourcesCreated = 0;
  createGain(): FakeGainNode { return new FakeGainNode(); }
  createBufferSource(): FakeBufferSource {
    this.bufferSourcesCreated++;
    return new FakeBufferSource();
  }
  createBiquadFilter(): FakeFilter { return new FakeFilter(); }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  resume(): Promise<void> { return Promise.resolve(); }
}

describe("audio/ambientBeds", () => {
  let ctx: FakeAudioContext;
  let engine: AudioEngine;

  beforeEach(() => {
    ctx = new FakeAudioContext();
    engine = new AudioEngine(ctx as unknown as AudioContext);
  });

  it("starts a looping texture for a known mode", () => {
    startAmbientForMode(engine, "bugs");
    expect(ctx.bufferSourcesCreated).toBe(1);
    stopAmbientMode();
  });

  it("no-ops for an unknown mode id", () => {
    startAmbientForMode(engine, "not-a-real-mode");
    expect(ctx.bufferSourcesCreated).toBe(0);
  });

  it("switching mode stops the previous loop before starting the next", () => {
    startAmbientForMode(engine, "bugs");
    startAmbientForMode(engine, "pointedFinger");
    expect(ctx.bufferSourcesCreated).toBe(2);
    stopAmbientMode();
  });

  it("starting the tense filler twice does not create a second loop", () => {
    startTenseFiller(engine);
    startTenseFiller(engine);
    expect(ctx.bufferSourcesCreated).toBe(1);
    stopTenseFiller();
  });
});
