import { describe, expect, it } from "vitest";
import {
  laserBurnEffect,
  laserBurnProgressAt,
  LASER_BURN,
} from "../../src/effects/effectDefs/laserBurn";

describe("effects/effectDefs/laserBurn (T19)", () => {
  it("has ordered stages glow -> line -> shrink -> dissolve -> beam -> glow", () => {
    expect(laserBurnEffect.stages.map((s) => s.durationMs)).toEqual([
      LASER_BURN.glowMs,
      LASER_BURN.lineMs,
      LASER_BURN.shrinkMs,
      LASER_BURN.dissolveMs,
      LASER_BURN.beamMs,
      LASER_BURN.impactGlowMs,
    ]);
  });

  it("laserBurnProgressAt returns glow at the start and the correct stages in sequence", () => {
    expect(laserBurnProgressAt(0).stage).toBe("glow");
    expect(laserBurnProgressAt(LASER_BURN.glowMs - 1).stage).toBe("glow");
    expect(laserBurnProgressAt(LASER_BURN.glowMs + 1).stage).toBe("line");
    expect(laserBurnProgressAt(
      LASER_BURN.glowMs + LASER_BURN.lineMs + 1,
    ).stage).toBe("shrink");
    expect(laserBurnProgressAt(
      LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs + 1,
    ).stage).toBe("dissolve");
    expect(laserBurnProgressAt(
      LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs + LASER_BURN.dissolveMs + 1,
    ).stage).toBe("beam");
    expect(laserBurnProgressAt(
      LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs + LASER_BURN.dissolveMs + LASER_BURN.beamMs + 1,
    ).stage).toBe("impactGlow");
    expect(laserBurnProgressAt(
      LASER_BURN.totalDurationMs + 1,
    ).stage).toBe("done");
  });

  it("each progress metric stays in [0, 1] and progresses monotonically", () => {
    let prev = 0;
    for (const metric of ["glow", "line", "shrink", "dissolve"] as const) {
      prev = 0;
      for (let t = 0; t < LASER_BURN.totalDurationMs + 100; t += 25) {
        const p = laserBurnProgressAt(t);
        const v = p[metric];
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        if (v > 0) expect(v + 1e-6).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    }
  });

  it("charge threshold is exported and >= 500ms and <= 600ms", () => {
    expect(LASER_BURN.chargeThresholdMs).toBeGreaterThanOrEqual(500);
    expect(LASER_BURN.chargeThresholdMs).toBeLessThanOrEqual(600);
  });

  it("total burn duration matches the spec (~720ms with beam/glow polish)", () => {
    const total = LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs + LASER_BURN.dissolveMs + LASER_BURN.beamMs + LASER_BURN.impactGlowMs;
    expect(total).toBe(LASER_BURN.totalDurationMs);
    expect(total).toBeGreaterThanOrEqual(700);
    expect(total).toBeLessThanOrEqual(750);
  });

  it("eased values come from cubic-bezier / power-style curves (not linear)", () => {
    expect(LASER_BURN.shrinkEase(0)).toBe(0);
    expect(LASER_BURN.shrinkEase(1)).toBe(1);
    expect(LASER_BURN.shrinkEase(0.5)).not.toBe(0.5);
  });
});
