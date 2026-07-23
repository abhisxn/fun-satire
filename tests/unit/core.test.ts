import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

describe("core/Rng (T5)", () => {
  it("mulberry32 returns a function that yields deterministic 32-bit unsigned ints", async () => {
    const { mulberry32 } = await import("../../src/core/Rng");
    const a = mulberry32(0xA17C5B);
    const b = mulberry32(0xA17C5B);
    for (let i = 0; i < 8; i++) {
      const av = a();
      const bv = b();
      expect(av).toBe(bv);
      expect(av).toBeGreaterThanOrEqual(0);
      expect(av).toBeLessThanOrEqual(0xFFFFFFFF);
    }
  });

  it("matches the documented mulberry32 reference output for seed 1", async () => {
    const { mulberry32 } = await import("../../src/core/Rng");
    const r = mulberry32(1);
    const expected = [
      0xa087eaf3, 0x00b349c9, 0x8706c4eb, 0xfb2627fd,
      0xf7e79d2b, 0x47f66630, 0x9ce301f0, 0xb8829f5c,
    ];
    for (const want of expected) {
      expect(r()).toBe(want >>> 0);
    }
  });

  it("different seeds produce different streams from sample 1", async () => {
    const { mulberry32 } = await import("../../src/core/Rng");
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it("Rng class supports float() in [0, 1) and range()", async () => {
    const { Rng } = await import("../../src/core/Rng");
    const r = new Rng(42);
    for (let i = 0; i < 32; i++) {
      const v = r.float();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const ranged = r.range(5, 10);
      expect(ranged).toBeGreaterThanOrEqual(5);
      expect(ranged).toBeLessThanOrEqual(10);
    }
  });

  it("Rng.pick returns a deterministic element for a fixed seed and index", async () => {
    const { Rng } = await import("../../src/core/Rng");
    const r1 = new Rng(7);
    const r2 = new Rng(7);
    expect(r1.pick(["cream", "slate", "sage", "ink", "coral"])).toBe(
      r2.pick(["cream", "slate", "sage", "ink", "coral"]),
    );
  });

  it("Rng.fromQueryString parses ?seed=N", async () => {
    const { Rng } = await import("../../src/core/Rng");
    expect(Rng.fromQueryString("?seed=99", 1).next()).toBe(new Rng(99).next());
  });
});

describe("core/Clock (T5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts the clock at construction time", async () => {
    const { Clock } = await import("../../src/core/Clock");
    const c = new Clock(1000);
    expect(c.startMs).toBe(1000);
  });

  it("accumulates real dt on each tick and reports it in ms", async () => {
    const { Clock } = await import("../../src/core/Clock");
    const c = new Clock(1000);
    expect(c.tick(1100)).toBe(100);
    expect(c.tick(1175)).toBe(75);
  });

  it("clamps dt to MAX_DT_MS so tab-blur spikes don't blow up physics", async () => {
    const { Clock, MAX_DT_MS } = await import("../../src/core/Clock");
    const c = new Clock(1000);
    expect(c.tick(1000 + MAX_DT_MS + 5000)).toBe(MAX_DT_MS);
  });

  it("does not clamp a normal 100ms frame", async () => {
    const { Clock } = await import("../../src/core/Clock");
    const c = new Clock(1000);
    expect(c.tick(1100)).toBe(100);
  });

  it("can be advanced manually by a fixed step", async () => {
    const { Clock } = await import("../../src/core/Clock");
    const c = new Clock(1000);
    expect(c.advanceBy(16.6667)).toBeCloseTo(16.6667, 3);
    expect(c.advanceBy(16.6667)).toBeCloseTo(16.6667, 3);
  });
});

describe("core/EventBus (T5)", () => {
  it("emits payloads in subscription order and supports unsubscribe", async () => {
    const { EventBus } = await import("../../src/core/EventBus");
    const bus = new EventBus<{ punch: { n: number }; wink: void }>();
    const received: number[] = [];
    const off = bus.on("punch", (p) => received.push(p.n));
    bus.emit("punch", { n: 1 });
    bus.emit("punch", { n: 2 });
    off();
    bus.emit("punch", { n: 3 });
    expect(received).toEqual([1, 2]);
  });

  it("returns the listener count after subscribe/unsubscribe", async () => {
    const { EventBus } = await import("../../src/core/EventBus");
    const bus = new EventBus<{ tick: number }>();
    const offA = bus.on("tick", () => undefined);
    const offB = bus.on("tick", () => undefined);
    expect(bus.listenerCount("tick")).toBe(2);
    offA();
    expect(bus.listenerCount("tick")).toBe(1);
    offB();
    expect(bus.listenerCount("tick")).toBe(0);
  });

  it("removing all listeners for an event yields zero count", async () => {
    const { EventBus } = await import("../../src/core/EventBus");
    const bus = new EventBus<{ ping: void }>();
    bus.on("ping", () => undefined);
    bus.on("ping", () => undefined);
    bus.clear("ping");
    expect(bus.listenerCount("ping")).toBe(0);
  });
});
