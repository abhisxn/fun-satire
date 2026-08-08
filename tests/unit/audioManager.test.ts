// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioManager, AUDIO_BED_SRC } from "../../src/audio/AudioManager";

type AudioContextState = "suspended" | "running" | "closed";

class FakeAudioContext {
  state: AudioContextState = "suspended";
  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
}

describe("AudioManager", () => {
  beforeEach(() => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("points the underlying audio element at the sound bed asset and loops it", () => {
    const manager = new AudioManager();
    const audio = (manager as unknown as { audio: HTMLAudioElement }).audio;
    expect(audio.src).toContain(AUDIO_BED_SRC);
    expect(audio.loop).toBe(true);
  });

  it("accepts a custom src and initial volume", () => {
    const manager = new AudioManager({ src: "/audio/other.mp3", volume: 0.25 });
    const audio = (manager as unknown as { audio: HTMLAudioElement }).audio;
    expect(audio.src).toContain("/audio/other.mp3");
    expect(manager.getVolume()).toBeCloseTo(0.25);
  });

  it("clamps volume into [0, 1]", () => {
    const manager = new AudioManager();
    manager.setVolume(2);
    expect(manager.getVolume()).toBe(1);
    manager.setVolume(-1);
    expect(manager.getVolume()).toBe(0);
    manager.setVolume(0.42);
    expect(manager.getVolume()).toBeCloseTo(0.42);
  });

  it("reports isPlaying/isMuted from the real element state, not an optimistic flag", async () => {
    const manager = new AudioManager();
    expect(manager.isPlaying()).toBe(false);

    await manager.play();
    expect(manager.isPlaying()).toBe(true);

    manager.pause();
    expect(manager.isPlaying()).toBe(false);

    expect(manager.isMuted()).toBe(false);
    manager.setMuted(true);
    expect(manager.isMuted()).toBe(true);
    manager.setMuted(false);
    expect(manager.isMuted()).toBe(false);
  });

  it("lazily creates a single shared AudioContext and reuses it", () => {
    const manager = new AudioManager();
    const ctx1 = manager.getAudioContext();
    const ctx2 = manager.getAudioContext();
    expect(ctx1).toBe(ctx2);
    expect(ctx1).toBeInstanceOf(FakeAudioContext);
  });

  it("resumes a suspended shared AudioContext whenever it is accessed", () => {
    const manager = new AudioManager();
    const ctx = manager.getAudioContext() as unknown as FakeAudioContext;
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("returns null when no AudioContext constructor is available", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("AudioContext", undefined);
    const manager = new AudioManager();
    expect(manager.getAudioContext()).toBeNull();
  });

  it("destroy() pauses playback and closes the shared context", async () => {
    const manager = new AudioManager();
    await manager.play();
    const ctx = manager.getAudioContext() as unknown as FakeAudioContext;

    manager.destroy();

    expect(manager.isPlaying()).toBe(false);
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });
});
