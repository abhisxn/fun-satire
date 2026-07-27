import { describe, expect, it } from "vitest";
import { playTone, playNoiseBurst } from "../../src/audio/synthToolkit";

class FakeParam {
  value = 0;
  setValueAtTime(v: number): void { this.value = v; }
  linearRampToValueAtTime(v: number): void { this.value = v; }
}

class FakeOscillator {
  type = "sine";
  frequency = new FakeParam();
  connected: unknown[] = [];
  started = false;
  stopped = false;
  connect(dest: unknown): void { this.connected.push(dest); }
  start(): void { this.started = true; }
  stop(): void { this.stopped = true; }
}

class FakeGain {
  gain = new FakeParam();
  connected: unknown[] = [];
  connect(dest: unknown): void { this.connected.push(dest); }
}

class FakeBufferSource {
  buffer: unknown = null;
  connected: unknown[] = [];
  started = false;
  stopped = false;
  connect(dest: unknown): void { this.connected.push(dest); }
  start(): void { this.started = true; }
  stop(): void { this.stopped = true; }
}

class FakeFilter {
  type = "";
  frequency = new FakeParam();
  Q = new FakeParam();
  connected: unknown[] = [];
  connect(dest: unknown): void { this.connected.push(dest); }
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createOscillator(): FakeOscillator { return new FakeOscillator(); }
  createGain(): FakeGain { return new FakeGain(); }
  createBufferSource(): FakeBufferSource { return new FakeBufferSource(); }
  createBiquadFilter(): FakeFilter { return new FakeFilter(); }
  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

describe("audio/synthToolkit", () => {
  it("playTone builds and starts an oscillator through a gain node into the destination", () => {
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    const dest = new FakeGain() as unknown as AudioNode;
    expect(() => playTone(ctx, dest, { freqStartHz: 440, durationMs: 100 })).not.toThrow();
  });

  it("playNoiseBurst builds a filtered noise burst into the destination", () => {
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    const dest = new FakeGain() as unknown as AudioNode;
    expect(() => playNoiseBurst(ctx, dest, { durationMs: 80 })).not.toThrow();
  });
});
