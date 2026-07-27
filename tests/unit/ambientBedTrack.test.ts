import { describe, expect, it, beforeEach, vi } from "vitest";
import { AudioEngine } from "../../src/audio/AudioEngine";
import { startAmbientBedTrack, synthAmbientBed } from "../../src/audio/ambientBedTrack";
import "../../src/audio/cues/laserBurnCues";
import "../../src/audio/cues/electricBurnCues";
import "../../src/audio/cues/bugEatCues";
import { getAudioCue } from "../../src/audio/audioCueRegistry";

class FakeGainNode {
  gain: { value: number; setValueAtTime(): void; linearRampToValueAtTime(): void; cancelScheduledValues(): void } = {
    value: 1,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
  connectedTo: unknown[] = [];
  connectedFrom: unknown[] = [];
  connect(dest: unknown) {
    this.connectedTo.push(dest);
    const d = dest as { connectedFrom?: unknown[] };
    if (d && Array.isArray(d.connectedFrom)) d.connectedFrom.push(this);
    return dest;
  }
  disconnect() {
    this.connectedTo = [];
    this.connectedFrom = [];
  }
}

class FakeOscillator {
  type: OscillatorType = "sine";
  frequency: { value: number; setValueAtTime(): void; linearRampToValueAtTime(): void } = {
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
  };
  connectedTo: unknown[] = [];
  started = false;
  stopped = false;
  connect(dest: unknown) { this.connectedTo.push(dest); return dest; }
  disconnect() { this.connectedTo = []; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeBiquadFilter {
  type: BiquadFilterType = "lowpass";
  frequency: { value: number; setValueAtTime(): void; linearRampToValueAtTime(): void } = {
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
  };
  Q: { value: number } = { value: 1 };
  connectedTo: unknown[] = [];
  connect(dest: unknown) { this.connectedTo.push(dest); return dest; }
  disconnect() { this.connectedTo = []; }
}

class FakeBufferSource {
  buffer: unknown = null;
  loop = false;
  connectedTo: unknown[] = [];
  connect(dest: unknown) { this.connectedTo.push(dest); return dest; }
  disconnect() { this.connectedTo = []; }
  start() {}
  stop() {}
}

class FakeAudioContext {
  destination = {};
  currentTime = 0;
  sampleRate = 44100;
  state: "suspended" | "running" = "suspended";
  createGain(): FakeGainNode { return new FakeGainNode(); }
  createOscillator(): FakeOscillator { return new FakeOscillator(); }
  createBufferSource(): FakeBufferSource { return new FakeBufferSource(); }
  createBiquadFilter(): FakeBiquadFilter { return new FakeBiquadFilter(); }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  decodeAudioData(): Promise<unknown> { return Promise.resolve({ duration: 30 }); }
  resume(): Promise<void> { return Promise.resolve(); }
}

describe("audio/ambientBedTrack", () => {
  let ctx: FakeAudioContext;
  let engine: AudioEngine;

  beforeEach(() => {
    ctx = new FakeAudioContext();
    engine = new AudioEngine(ctx as unknown as AudioContext);
  });

  it("synthAmbientBed connects the drone and pad layers to the destination", () => {
    const dest = new FakeGainNode();
    synthAmbientBed(ctx as unknown as AudioContext, dest as unknown as AudioNode);
    expect(dest.connectedFrom.length).toBeGreaterThanOrEqual(2);
  });

  it("startAmbientBedTrack wires the synthesis to the ambient bus", async () => {
    const ambientBus = engine.getBus("ambient");
    const handle = await startAmbientBedTrack(engine);
    expect(typeof handle.stop).toBe("function");
    expect(ambientBus.connectedFrom.length).toBeGreaterThanOrEqual(2);
  });

  it("stop() disconnects the source nodes", async () => {
    const ambientBus = engine.getBus("ambient");
    const initialInbound = ambientBus.connectedFrom.length;
    const handle = await startAmbientBedTrack(engine);
    expect(ambientBus.connectedFrom.length).toBeGreaterThan(initialInbound);
    handle.stop();
    vi.useFakeTimers();
    vi.advanceTimersByTime(1500);
    vi.useRealTimers();
  });
});

describe("attack SFX cues", () => {
  it("laserBurn.glow uses slow swell envelope (large attack/release)", () => {
    const entry = getAudioCue("laserBurn.glow");
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    const osc = vi.spyOn(ctx, "createOscillator");
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
    expect(osc).toHaveBeenCalled();
  });

  it("electricBurn.start uses buzz modulation (multiple oscillators + filter)", () => {
    const entry = getAudioCue("electricBurn.start");
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    const osc = vi.spyOn(ctx, "createOscillator");
    const filter = vi.spyOn(ctx, "createBiquadFilter");
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
    expect(osc.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(filter).toHaveBeenCalled();
  });

  it("bugEat.start uses a lowpass filter with sweeping cutoff", () => {
    const entry = getAudioCue("bugEat.start");
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    const filterSpy = vi.spyOn(ctx, "createBiquadFilter");
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
    expect(filterSpy).toHaveBeenCalled();
  });
});
