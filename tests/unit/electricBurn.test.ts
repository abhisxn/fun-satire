import { describe, expect, it, vi } from "vitest";
import {
  electricBurnEffect,
  electricBurnProgressAt,
  ELECTRIC_BURN,
} from "../../src/effects/effectDefs/electricBurn";

describe("effects/effectDefs/electricBurn (T12)", () => {
  it("has ordered stages crackle -> flash -> shrink -> soot", () => {
    expect(electricBurnEffect.stages.map((s) => s.durationMs)).toEqual([
      ELECTRIC_BURN.crackleMs,
      ELECTRIC_BURN.flashMs,
      ELECTRIC_BURN.shrinkMs,
      ELECTRIC_BURN.sootMs,
    ]);
  });

  it("electricBurnProgressAt returns crackle at the start and the correct stages in sequence", () => {
    expect(electricBurnProgressAt(0).stage).toBe("crackle");
    expect(electricBurnProgressAt(ELECTRIC_BURN.crackleMs - 1).stage).toBe("crackle");
    expect(electricBurnProgressAt(ELECTRIC_BURN.crackleMs + 1).stage).toBe("flash");
    expect(electricBurnProgressAt(
      ELECTRIC_BURN.crackleMs + ELECTRIC_BURN.flashMs + 1,
    ).stage).toBe("shrink");
    expect(electricBurnProgressAt(
      ELECTRIC_BURN.crackleMs + ELECTRIC_BURN.flashMs + ELECTRIC_BURN.shrinkMs + 1,
    ).stage).toBe("soot");
    expect(electricBurnProgressAt(
      ELECTRIC_BURN.crackleMs + ELECTRIC_BURN.flashMs + ELECTRIC_BURN.shrinkMs + ELECTRIC_BURN.sootMs + 1,
    ).stage).toBe("done");
  });

  it("each progress metric stays in [0, 1] and progresses monotonically", () => {
    let prev = 0;
    for (const metric of ["crackle", "flash", "shrink", "soot"] as const) {
      prev = 0;
      for (let t = 0; t < ELECTRIC_BURN.totalDurationMs + 100; t += 25) {
        const p = electricBurnProgressAt(t);
        const v = p[metric];
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        if (v > 0) expect(v + 1e-6).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    }
  });

  it("overallProgress stays in [0, 1] and reaches 1 at totalDurationMs", () => {
    expect(electricBurnProgressAt(0).overallProgress).toBeGreaterThanOrEqual(0);
    expect(electricBurnProgressAt(ELECTRIC_BURN.totalDurationMs).overallProgress).toBe(1);
    expect(electricBurnProgressAt(ELECTRIC_BURN.totalDurationMs + 500).overallProgress).toBeLessThanOrEqual(1);
  });

  it("charge threshold is exported and >= 500ms and <= 600ms", () => {
    expect(ELECTRIC_BURN.chargeThresholdMs).toBeGreaterThanOrEqual(500);
    expect(ELECTRIC_BURN.chargeThresholdMs).toBeLessThanOrEqual(600);
  });

  it("total burn duration matches the sum of stage durations (~340ms)", () => {
    const total = ELECTRIC_BURN.crackleMs + ELECTRIC_BURN.flashMs + ELECTRIC_BURN.shrinkMs + ELECTRIC_BURN.sootMs;
    expect(total).toBe(ELECTRIC_BURN.totalDurationMs);
    expect(total).toBeGreaterThanOrEqual(320);
    expect(total).toBeLessThanOrEqual(360);
  });

  it("eased values come from cubic-bezier / power-style curves (not linear)", () => {
    expect(ELECTRIC_BURN.shrinkEase(0)).toBe(0);
    expect(ELECTRIC_BURN.shrinkEase(1)).toBe(1);
    expect(ELECTRIC_BURN.shrinkEase(0.5)).not.toBe(0.5);
  });

  it("effectDef has the correct id", () => {
    expect(electricBurnEffect.id).toBe("electricBurn");
  });

  it("each stage has a durationMs > 0", () => {
    for (const stage of electricBurnEffect.stages) {
      expect(stage.durationMs).toBeGreaterThan(0);
    }
  });

  it("totalDurationMs equals the sum of all stage durations", () => {
    const sum = electricBurnEffect.stages.reduce((acc, s) => acc + s.durationMs, 0);
    expect(sum).toBe(ELECTRIC_BURN.totalDurationMs);
  });

  it("onStart hooks are callable and don't throw", () => {
    const mockCtx = {
      entity: {
        id: "e1" as const,
        content: { palette: { iris: "coral" }, renderType: "eye" },
        behavior: { data: {} },
        physics: { scale: 1 },
      },
      target: { x: 100, y: 200 },
      particles: { spawn: vi.fn() },
      audio: { play: vi.fn() },
      rng: {
        float: () => 0.5,
        range: (min: number, max: number) => (min + max) / 2,
        rangeInt: (min: number, max: number) => Math.floor((min + max) / 2),
      },
      world: {
        markDying: vi.fn(),
        startRespawn: vi.fn(),
        getEntity: vi.fn(),
      },
      stageIndex: 0,
      effect: {
        id: 1,
        defId: "electricBurn",
        entityId: "e1" as const,
        startedAtMs: 0,
        target: { x: 100, y: 200 },
        stageIndex: 0,
        stageStartedAtMs: 0,
        done: false,
      },
    };

    const shrinkStage = electricBurnEffect.stages[2];
    const sootStage = electricBurnEffect.stages[3];

    expect(shrinkStage.onStart).toBeDefined();
    expect(() => shrinkStage.onStart!(mockCtx as never)).not.toThrow();
    expect(mockCtx.particles.spawn).toHaveBeenCalledTimes(ELECTRIC_BURN.sparkCount);
    expect(mockCtx.world.markDying).toHaveBeenCalledWith("e1");

    expect(sootStage.onStart).toBeDefined();
    expect(() => sootStage.onStart!(mockCtx as never)).not.toThrow();
    expect(mockCtx.particles.spawn).toHaveBeenCalledTimes(
      ELECTRIC_BURN.sparkCount + ELECTRIC_BURN.sootCount,
    );
    expect(mockCtx.world.startRespawn).toHaveBeenCalledWith("e1", expect.any(Number));
  });
});
