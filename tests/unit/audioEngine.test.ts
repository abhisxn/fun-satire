import { describe, expect, it } from "vitest";
import { AudioEngine } from "../../src/audio/AudioEngine";
import { registerAudioCue } from "../../src/audio/audioCueRegistry";

class FakeGainNode {
  gain = { value: 1 };
  connectedTo: unknown[] = [];
  connect(dest: unknown): void { this.connectedTo.push(dest); }
}

class FakeAudioContext {
  destination = {};
  state: "suspended" | "running" = "suspended";
  currentTime = 0;
  resumeCalls = 0;
  createGain(): FakeGainNode { return new FakeGainNode(); }
  resume(): Promise<void> {
    this.resumeCalls++;
    this.state = "running";
    return Promise.resolve();
  }
}

function makeEngine(): { engine: AudioEngine; ctx: FakeAudioContext } {
  const ctx = new FakeAudioContext();
  const engine = new AudioEngine(ctx as unknown as AudioContext);
  return { engine, ctx };
}

describe("audio/AudioEngine", () => {
  it("defaults to 0.8 master volume and unmuted", () => {
    const { engine } = makeEngine();
    expect(engine.getMasterVolume()).toBe(0.8);
    expect(engine.isMuted()).toBe(false);
  });

  it("setMasterVolume clamps into [0, 1]", () => {
    const { engine } = makeEngine();
    engine.setMasterVolume(1.5);
    expect(engine.getMasterVolume()).toBe(1);
    engine.setMasterVolume(-1);
    expect(engine.getMasterVolume()).toBe(0);
  });

  it("toggleMute silences the master bus and restores it", () => {
    const { engine } = makeEngine();
    const masterBus = engine.getBus("sfx");
    void masterBus;
    expect(engine.toggleMute()).toBe(true);
    expect(engine.isMuted()).toBe(true);
    expect(engine.toggleMute()).toBe(false);
    expect(engine.isMuted()).toBe(false);
  });

  it("unlock resumes a suspended context exactly once", () => {
    const { engine, ctx } = makeEngine();
    expect(engine.isUnlocked()).toBe(false);
    engine.unlock();
    engine.unlock();
    expect(engine.isUnlocked()).toBe(true);
    expect(ctx.resumeCalls).toBe(1);
  });

  it("play() looks up the cue registry and calls its synth with the sfx bus", () => {
    const { engine, ctx } = makeEngine();
    const calls: unknown[][] = [];
    registerAudioCue({
      id: "test.engine.cue",
      synth: (synthCtx, dest) => calls.push([synthCtx, dest]),
    });
    engine.play("test.engine.cue");
    expect(calls.length).toBe(1);
    expect(calls[0]![0]).toBe(ctx);
    expect(calls[0]![1]).toBe(engine.getBus("sfx"));
  });
});
