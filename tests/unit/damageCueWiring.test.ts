import { describe, expect, it } from "vitest";
import { electricBurnEffect } from "../../src/effects/effectDefs/electricBurn";
import { bugEatEffect } from "../../src/effects/effectDefs/bugEat";

describe("damage effectDef cue wiring", () => {
  it("electricBurn's first stage plays electricBurn.start", () => {
    expect(electricBurnEffect.stages[0]!.cue).toBe("electricBurn.start");
  });

  it("electricBurn has a stage that plays electricBurn.dissolve", () => {
    expect(electricBurnEffect.stages.some((s) => s.cue === "electricBurn.dissolve")).toBe(true);
  });

  it("bugEat's first stage plays bugEat.start", () => {
    expect(bugEatEffect.stages[0]!.cue).toBe("bugEat.start");
  });

  it("bugEat has a stage that plays bugEat.dissolve", () => {
    expect(bugEatEffect.stages.some((s) => s.cue === "bugEat.dissolve")).toBe(true);
  });
});
