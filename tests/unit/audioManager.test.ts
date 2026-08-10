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

  it("points both underlying audio beds at the sound bed asset, looping manually (not via the loop attribute)", () => {
    const manager = new AudioManager();
    const beds = (manager as unknown as { beds: readonly [HTMLAudioElement, HTMLAudioElement] }).beds;
    for (const bed of beds) {
      expect(bed.src).toContain(AUDIO_BED_SRC);
      // Looping is driven by the crossfade scheduler, not the native
      // attribute, so consecutive cycles can overlap instead of hard-cutting.
      expect(bed.loop).toBe(false);
    }
  });

  it("accepts a custom src and initial volume", () => {
    const manager = new AudioManager({ src: "/audio/other.mp3", volume: 0.25 });
    const beds = (manager as unknown as { beds: readonly [HTMLAudioElement, HTMLAudioElement] }).beds;
    for (const bed of beds) expect(bed.src).toContain("/audio/other.mp3");
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

  it("completes an in-progress crossfade immediately when the page is backgrounded, instead of leaving both beds audible", async () => {
    const manager = new AudioManager();
    await manager.play();

    const internals = manager as unknown as {
      beds: readonly [HTMLAudioElement, HTMLAudioElement];
      activeIndex: 0 | 1;
      crossfadeState: { readonly standbyIndex: 0 | 1; readonly startedAtMs: number } | null;
      startCrossfade(): void;
    };

    internals.startCrossfade();
    expect(internals.crossfadeState).not.toBeNull();
    const standbyIndex = internals.crossfadeState!.standbyIndex;
    const outgoingIndex = internals.activeIndex;

    // Simulate the fade being mid-flight when the tab is backgrounded: both
    // beds partially audible (as tickCrossfade() would have left them).
    internals.beds[outgoingIndex].volume = 0.08;
    internals.beds[standbyIndex].volume = 0.08;

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // Crossfade must resolve synchronously on backgrounding: exactly one bed
    // left audible, the other paused and reset, no lingering fade state.
    expect(internals.crossfadeState).toBeNull();
    expect(internals.activeIndex).toBe(standbyIndex);
    expect(internals.beds[standbyIndex].volume).toBeCloseTo(manager.getVolume());
    expect(internals.beds[outgoingIndex].paused).toBe(true);
    expect(internals.beds[outgoingIndex].volume).toBe(0);

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  describe("loop overlap invariant: the bed loops, but two copies never stack", () => {
    it("plays exactly one bed during normal playback", async () => {
      const manager = new AudioManager();
      await manager.play();
      const beds = (manager as unknown as { beds: readonly HTMLAudioElement[] }).beds;
      expect(beds.filter((b) => !b.paused)).toHaveLength(1);
    });

    it("refuses to start a second crossfade onto an already-playing standby bed", async () => {
      const manager = new AudioManager();
      await manager.play();
      const internals = manager as unknown as {
        beds: readonly [HTMLAudioElement, HTMLAudioElement];
        crossfadeState: { standbyIndex: 0 | 1 } | null;
        startCrossfade(): void;
      };

      internals.startCrossfade();
      const firstState = internals.crossfadeState;
      expect(firstState).not.toBeNull();

      // A stray trigger must not restart/relayer the standby bed.
      internals.crossfadeState = null;
      internals.startCrossfade();
      expect(internals.crossfadeState).toBeNull();
    });

    it("leaves exactly one bed playing once a crossfade finishes", async () => {
      const manager = new AudioManager();
      await manager.play();
      const internals = manager as unknown as {
        beds: readonly [HTMLAudioElement, HTMLAudioElement];
        startCrossfade(): void;
        crossfadeState: { readonly standbyIndex: 0 | 1; startedAtMs: number } | null;
        tickCrossfade(): void;
      };

      internals.startCrossfade();
      // Force the fade past its end so the tick resolves it synchronously.
      internals.crossfadeState!.startedAtMs = performance.now() - 60_000;
      internals.tickCrossfade();

      expect(internals.crossfadeState).toBeNull();
      expect(internals.beds.filter((b) => !b.paused)).toHaveLength(1);
    });

    it("tears the fade down instead of resuming a bed when playback stopped mid-fade", async () => {
      const manager = new AudioManager();
      await manager.play();
      const internals = manager as unknown as {
        beds: readonly [HTMLAudioElement, HTMLAudioElement];
        startCrossfade(): void;
        tickCrossfade(): void;
        crossfadeState: unknown;
        playing: boolean;
      };

      internals.startCrossfade();
      internals.playing = false;
      internals.tickCrossfade();

      expect(internals.crossfadeState).toBeNull();
      expect(internals.beds[1].paused).toBe(true);
    });
  });

  describe("muting (must not rely on element.volume — iOS ignores volume writes entirely)", () => {
    it("mutes via the elements' own muted flag, on every bed", async () => {
      const manager = new AudioManager();
      await manager.play();
      const beds = (manager as unknown as { beds: readonly [HTMLAudioElement, HTMLAudioElement] }).beds;

      manager.setMuted(true);
      await vi.waitFor(() => {
        for (const bed of beds) expect(bed.muted).toBe(true);
      });

      manager.setMuted(false);
      for (const bed of beds) expect(bed.muted).toBe(false);
    });

    it("defers the muted flag to the end of the fade, so muting is not a hard cut", async () => {
      const manager = new AudioManager();
      await manager.play();
      const beds = (manager as unknown as { beds: readonly [HTMLAudioElement, HTMLAudioElement] }).beds;

      manager.setMuted(true);

      // Setting muted up front would silence the bed instantly and make the
      // volume ramp unobservable.
      expect(manager.isMuted()).toBe(true);
      for (const bed of beds) expect(bed.muted).toBe(false);

      await vi.waitFor(() => {
        expect(beds[0].muted).toBe(true);
        expect(beds[0].volume).toBe(0);
      });
    });

    it("never applies a stale mute when unmuted again mid-fade", async () => {
      const manager = new AudioManager();
      await manager.play();
      const beds = (manager as unknown as { beds: readonly [HTMLAudioElement, HTMLAudioElement] }).beds;

      manager.setMuted(true);
      manager.setMuted(false);

      await new Promise((resolve) => setTimeout(resolve, 400));
      for (const bed of beds) expect(bed.muted).toBe(false);
      expect(beds[0].volume).toBeCloseTo(manager.getVolume());
    });

    it("still applies a mute while a crossfade is in flight", async () => {
      const manager = new AudioManager();
      await manager.play();
      const internals = manager as unknown as {
        beds: readonly [HTMLAudioElement, HTMLAudioElement];
        startCrossfade(): void;
      };

      internals.startCrossfade();
      manager.setMuted(true);

      expect(manager.isMuted()).toBe(true);
      for (const bed of internals.beds) expect(bed.muted).toBe(true);
    });
  });

  describe("when the platform refuses volume writes (iOS Safari)", () => {
    let original: PropertyDescriptor | undefined;

    beforeEach(() => {
      original = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
      Object.defineProperty(HTMLMediaElement.prototype, "volume", {
        configurable: true,
        get: () => 1,
        set: () => {},
      });
    });

    afterEach(() => {
      if (original) Object.defineProperty(HTMLMediaElement.prototype, "volume", original);
    });

    it("reports volume control as unsupported", () => {
      const manager = new AudioManager();
      expect(manager.isVolumeControlSupported()).toBe(false);
    });

    it("does not eagerly buffer a second bed it will never play", () => {
      const manager = new AudioManager();
      const beds = (manager as unknown as { beds: readonly HTMLAudioElement[] }).beds;
      // Only the primary bed is used when looping natively; the standby must
      // not download a full copy of an asset it will never play.
      expect(beds[1].preload).toBe("none");
    });

    it("falls back to native looping on a single bed instead of a volume crossfade", async () => {
      const manager = new AudioManager();
      const internals = manager as unknown as {
        beds: readonly [HTMLAudioElement, HTMLAudioElement];
        crossfadeState: unknown;
        checkCrossfadeTrigger(): void;
      };

      expect(internals.beds[0].loop).toBe(true);

      await manager.play();
      // A crossfade here would layer a second full-volume copy of the bed on
      // top of the first, since the fade's volume writes are no-ops.
      Object.defineProperty(internals.beds[0], "duration", { value: 10, configurable: true });
      internals.beds[0].currentTime = 9.9;
      internals.checkCrossfadeTrigger();
      expect(internals.crossfadeState).toBeNull();
      expect(internals.beds[1].paused).toBe(true);
    });

    it("still mutes correctly", async () => {
      const manager = new AudioManager();
      await manager.play();
      manager.setMuted(true);
      expect(manager.isMuted()).toBe(true);
      for (const bed of (manager as unknown as { beds: readonly HTMLAudioElement[] }).beds) {
        expect(bed.muted).toBe(true);
      }
    });
  });

  describe("backgrounding", () => {
    afterEach(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
    });

    it("pauses playback while the page is hidden and resumes it on return", async () => {
      const manager = new AudioManager();
      await manager.play();
      expect(manager.isPlaying()).toBe(true);

      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      expect(manager.isPlaying()).toBe(false);

      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      expect(manager.isPlaying()).toBe(true);
    });

    it("stays paused on return when the user paused it while the page was hidden", async () => {
      const manager = new AudioManager();
      await manager.play();

      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      // The user hits pause (e.g. via a media key) while backgrounded: that
      // intent has to survive the return, not be undone by the auto-resume.
      manager.pause();

      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      await Promise.resolve();

      expect(manager.isPlaying()).toBe(false);
    });

    it("does not start playing on return if the user had paused it", async () => {
      const manager = new AudioManager();
      await manager.play();
      manager.pause();

      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();

      expect(manager.isPlaying()).toBe(false);
    });

    it("notifies subscribers when backgrounding changes the real playback state", async () => {
      const manager = new AudioManager();
      const listener = vi.fn();
      manager.setStateChangeListener(listener);
      await manager.play();

      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));

      expect(listener).toHaveBeenCalled();
    });
  });
});
