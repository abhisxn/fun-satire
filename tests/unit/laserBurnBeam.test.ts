import { describe, it, expect } from "vitest";
import { laserBurnEffect } from "../../src/effects/effectDefs/laserBurn";

describe("laserBurn beam/glow polish", () => {
  it("defines a beam stage with duration > 0", () => {
    const beamStage = laserBurnEffect.stages.find((s) => s.id === "beam");
    expect(beamStage).toBeDefined();
    expect(beamStage!.durationMs).toBeGreaterThan(0);
  });

  it("defines a glow stage with duration > 0", () => {
    const glowStage = laserBurnEffect.stages.find((s) => s.id === "glow");
    expect(glowStage).toBeDefined();
    expect(glowStage!.durationMs).toBeGreaterThan(0);
  });

  it("beam stage has visual parameters for beam rendering", () => {
    const beamStage = laserBurnEffect.stages.find((s) => s.id === "beam");
    expect(beamStage!.visual).toBeDefined();
    expect(beamStage!.visual!.archetype).toBe("beam");
    expect(beamStage!.visual!.widthPx).toBeGreaterThan(0);
    expect(beamStage!.visual!.color).toBeDefined();
  });

  it("glow stage has visual parameters for glow rendering", () => {
    const glowStage = laserBurnEffect.stages.find((s) => s.id === "glow");
    expect(glowStage!.visual).toBeDefined();
    expect(glowStage!.visual!.archetype).toBe("glow");
    expect(glowStage!.visual!.radiusPx).toBeGreaterThan(0);
    expect(glowStage!.visual!.color).toBeDefined();
  });
});
