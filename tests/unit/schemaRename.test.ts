// tests/unit/schemaRename.test.ts
import { describe, expect, it } from "vitest";
import type { EyeColors, EyePhysics, EyeBehaviorConfig } from "../../src/content/schema";
import type { EntityColorPalette } from "../../src/entities/Entity";

describe("content/schema renamed types (T25)", () => {
  it("EyeColors/EyePhysics/EyeBehaviorConfig are usable type names", () => {
    const colors: EyeColors = { sclera: "cream", iris: "slate", pupil: "ink", highlight: null, outline: "ink" };
    const physics: EyePhysics = { baseSizePx: 56 };
    const behavior: EyeBehaviorConfig = {
      blinkIntervalMinMs: 2000,
      blinkIntervalMaxMs: 5000,
      blinkDurationMs: 120,
      pupilTrackMs: 180,
    };
    expect(colors.outline).toBe("ink");
    expect(physics.baseSizePx).toBe(56);
    expect(behavior.pupilTrackMs).toBe(180);
  });

  it("EntityColorPalette is a usable type name on entities/Entity", () => {
    const palette: EntityColorPalette = { sclera: "#EDE7DD", iris: "#5B7A8C", pupil: "#2A2420", highlight: null, outline: "#2A2420" };
    expect(palette.sclera).toBe("#EDE7DD");
  });
});
