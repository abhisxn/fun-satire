import { describe, expect, it } from "vitest";
import { laserBurnEffect } from "../../src/effects/effectDefs/laserBurn";
import { electricBurnEffect } from "../../src/effects/effectDefs/electricBurn";
import { bugEatEffect } from "../../src/effects/effectDefs/bugEat";
import type { EffectVisual } from "../../src/effects/EffectSystem";

const ARCHETYPES = new Set(["beam", "arc", "bite", "glow"]);

function assertVisual(
  v: EffectVisual | undefined,
  expectedArchetype: EffectVisual["archetype"],
): void {
  expect(v).toBeDefined();
  expect(ARCHETYPES.has(v!.archetype)).toBe(true);
  expect(v!.archetype).toBe(expectedArchetype);
  expect(typeof v!.color).toBe("string");
  expect(v!.color.length).toBeGreaterThan(0);
  expect(typeof v!.opacity).toBe("number");
  expect(v!.opacity).toBeGreaterThanOrEqual(0);
  expect(v!.opacity).toBeLessThanOrEqual(1);
}

describe("EffectStage.visual archetype schema", () => {
  it("laserBurn beam stage uses beam archetype", () => {
    const stage = laserBurnEffect.stages.find((s) => s.id === "beam");
    assertVisual(stage?.visual, "beam");
  });

  it("laserBurn glow stage uses glow archetype", () => {
    const stage = laserBurnEffect.stages.find((s) => s.id === "glow");
    assertVisual(stage?.visual, "glow");
  });

  it("electricBurn stages use arc archetype", () => {
    const stages = electricBurnEffect.stages.filter((s) => s.visual);
    expect(stages.length).toBeGreaterThan(0);
    for (const stage of stages) {
      assertVisual(stage.visual, "arc");
    }
  });

  it("bugEat stages use bite archetype", () => {
    const stages = bugEatEffect.stages.filter((s) => s.visual);
    expect(stages.length).toBeGreaterThan(0);
    for (const stage of stages) {
      assertVisual(stage.visual, "bite");
    }
  });
});
