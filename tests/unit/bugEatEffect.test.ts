import { describe, it, expect } from "vitest";
import { bugEatEffect } from "../../src/effects/effectDefs/bugEat";

describe("bugEat effectDef", () => {
  it("is an EffectDef object with an id", () => {
    expect(bugEatEffect).toBeDefined();
    expect(bugEatEffect.id).toBe("bugEat");
  });

  it("has a stages array", () => {
    expect(Array.isArray(bugEatEffect.stages)).toBe(true);
    expect(bugEatEffect.stages.length).toBeGreaterThan(0);
  });
});
