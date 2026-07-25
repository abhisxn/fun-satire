import { describe, it, expect } from "vitest";
import { electricBurnEffect, ELECTRIC_BURN } from "../../src/effects/effectDefs/electricBurn";

describe("electricBurn effectDef", () => {
  it("is an EffectDef object with id and stages", () => {
    expect(typeof electricBurnEffect).toBe("object");
    expect(electricBurnEffect.id).toBe("electricBurn");
    expect(Array.isArray(electricBurnEffect.stages)).toBe(true);
    expect(electricBurnEffect.stages.length).toBeGreaterThan(0);
  });

  it("has all required stages with durationMs, easing, and update", () => {
    for (const stage of electricBurnEffect.stages) {
      expect(stage.durationMs).toBeGreaterThan(0);
      expect(typeof stage.easing).toBe("function");
      expect(typeof stage.update).toBe("function");
    }
  });

  it("exports frozen config constants", () => {
    expect(ELECTRIC_BURN).toBeDefined();
    expect(Object.isFrozen(ELECTRIC_BURN)).toBe(true);
    expect(ELECTRIC_BURN.totalDurationMs).toBeGreaterThan(0);
  });
});
