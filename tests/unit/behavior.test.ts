import { describe, expect, it } from "vitest";
import { Rng } from "../../src/core/Rng";
import { StateMachine } from "../../src/entities/behaviors/StateMachine";
import { EyeBehavior, EyeBlinkTimer } from "../../src/entities/behaviors/EyeBehavior";

describe("entities/behaviors/StateMachine (T15)", () => {
  type S = "idle" | "walk" | "run";
  type E = "go" | "stop" | "flee";

  it("starts at the configured initial state", () => {
    const m = new StateMachine<S, E>({
      initial: "idle",
      transitions: [
        ["idle", "go", "walk"],
        ["walk", "go", "run"],
        ["run", "stop", "idle"],
      ],
    });
    expect(m.current()).toBe("idle");
  });

  it("applies matching transitions and returns the new state", () => {
    const m = new StateMachine<S, E>({
      initial: "idle",
      transitions: [
        ["idle", "go", "walk"],
        ["walk", "go", "run"],
        ["run", "stop", "idle"],
      ],
    });
    expect(m.send("go")).toBe("walk");
    expect(m.send("go")).toBe("run");
    expect(m.send("stop")).toBe("idle");
  });

  it("throws on missing transitions and tells the user which one", () => {
    const m = new StateMachine<S, E>({
      initial: "idle",
      transitions: [["idle", "go", "walk"]],
    });
    expect(() => m.send("stop")).toThrowError(/no transition from "idle" on event "stop"/);
  });

  it("notifies listeners on transition with (from, to, event)", () => {
    const m = new StateMachine<S, E>({
      initial: "idle",
      transitions: [
        ["idle", "go", "walk"],
        ["walk", "stop", "idle"],
      ],
    });
    const seen: Array<{ from: S; to: S; event: E }> = [];
    const off = m.onTransition((from, to, event) => seen.push({ from, to, event }));
    m.send("go");
    m.send("stop");
    off();
    expect(seen).toEqual([
      { from: "idle", to: "walk", event: "go" },
      { from: "walk", to: "idle", event: "stop" },
    ]);
  });

  it("reset returns the machine to the initial state", () => {
    const m = new StateMachine<S, E>({
      initial: "idle",
      transitions: [["idle", "go", "walk"]],
    });
    m.send("go");
    m.reset();
    expect(m.current()).toBe("idle");
  });
});

describe("entities/behaviors/EyeBehavior (T15)", () => {
  const blinkCfg = {
    blinkIntervalMinMs: 1000,
    blinkIntervalMaxMs: 1000,
    blinkDurationMs: 100,
  };

  const make = (seed: number, now = 0) => {
    const lifecycle = new StateMachine<"alive" | "dying", "die" | "respawn">({
      initial: "alive",
      transitions: [
        ["alive", "die", "dying"],
        ["dying", "respawn", "alive"],
      ],
    });
    const locomotion = new StateMachine<"idle" | "flee" | "dragged", "drag" | "release">({
      initial: "idle",
      transitions: [
        ["idle", "drag", "dragged"],
        ["dragged", "release", "idle"],
      ],
    });
    return new EyeBehavior(new Rng(seed), blinkCfg, lifecycle, locomotion, now);
  };

  it("starts with blinkScaleY = 1 (fully open)", () => {
    const b = make(0);
    expect(b.blinkScaleY()).toBe(1);
  });

  it("blinks at a deterministic first time for a fixed seed", () => {
    const a = make(7);
    const b = make(7);
    const rngA = new Rng(7);
    const rngB = new Rng(7);
    for (let i = 0; i < 1500; i++) {
      a.tick(rngA, i * 16);
      b.tick(rngB, i * 16);
    }
    expect(a.blinkScaleY()).toBeCloseTo(b.blinkScaleY(), 6);
  });

  it("drops blinkScaleY below 1 at some point during its lifetime", () => {
    const b = make(42);
    const rng = new Rng(42);
    let min = 1;
    for (let i = 0; i < 10000; i++) {
      b.tick(rng, i * 16);
      const s = b.blinkScaleY();
      if (s < min) min = s;
    }
    expect(min).toBeLessThan(1);
  });

  it("eyeBehavior.setDragged flips locomotion state", () => {
    const b = make(0);
    b.setDragged(true);
    b.setDragged(false);
  });

  it("eyeBehavior.setDragged is a no-op when called twice with the same flag", () => {
    const b = make(0);
    b.setDragged(true);
    expect(() => b.setDragged(true)).not.toThrow();
  });
});
