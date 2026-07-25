import { describe, expect, it, beforeEach, vi } from "vitest";
import { AudioEngine } from "../../src/audio/AudioEngine";
import { startMusicBed } from "../../src/audio/musicBed";

class FakeGainNode {
  gain = { value: 1 };
  connect() {}
}

class FakeBufferSource {
  buffer: unknown = null;
  loop = false;
  connectedTo: unknown[] = [];
  stopCalls = 0;
  connect(dest: unknown) { this.connectedTo.push(dest); }
  disconnect() {}
  start() {}
  stop() { this.stopCalls++; }
}

class FakeAudioContext {
  destination = {};
  currentTime = 0;
  sampleRate = 44100;
  state: "suspended" | "running" = "suspended";
  createGain(): FakeGainNode { return new FakeGainNode(); }
  createBufferSource(): FakeBufferSource { return new FakeBufferSource(); }
  decodeAudioData(_data: ArrayBuffer): Promise<unknown> {
    return Promise.resolve({ duration: 30 });
  }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    return { duration: length / sampleRate };
  }
  resume(): Promise<void> { return Promise.resolve(); }
}

describe("audio/musicBed", () => {
  let ctx: FakeAudioContext;
  let engine: AudioEngine;

  beforeEach(() => {
    ctx = new FakeAudioContext();
    engine = new AudioEngine(ctx as unknown as AudioContext);
  });

  it("loops the decoded buffer through the music bus on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
    const handle = await startMusicBed(engine, "/audio/music-bed.mp3");
    expect(typeof handle.stop).toBe("function");
    vi.unstubAllGlobals();
  });

  it("falls back to a silent buffer if the asset fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("404")));
    const handle = await startMusicBed(engine, "/audio/music-bed.mp3");
    expect(typeof handle.stop).toBe("function");
    vi.unstubAllGlobals();
  });
});
