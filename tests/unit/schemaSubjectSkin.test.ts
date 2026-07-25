import { describe, it, expect } from "vitest";
import type { ManifestEntry, SubjectSkin } from "../../src/content/schema";

describe("SubjectSkin", () => {
  it("accepts both figure and lotus as valid values on a ManifestEntry", () => {
    const base: Omit<ManifestEntry, "subjectSkin"> = {
      id: "subject-1",
      rig: "eye",
      renderType: "eye",
      visual: { styleGuardrail: "flat-illustrated", shapeVariant: "almond" },
      colors: { sclera: "cream", iris: "slate", pupil: "ink", highlight: "cream", outline: "ink" },
      physics: { baseSizePx: 80 },
      behavior: { blinkIntervalMinMs: 2000, blinkIntervalMaxMs: 5000, blinkDurationMs: 140, pupilTrackMs: 120 },
    };
    const figure: ManifestEntry = { ...base, subjectSkin: "figure" };
    const lotus: ManifestEntry = { ...base, subjectSkin: "lotus" };
    const figureSkin: SubjectSkin = figure.subjectSkin!;
    const lotusSkin: SubjectSkin = lotus.subjectSkin!;
    expect(figureSkin).toBe("figure");
    expect(lotusSkin).toBe("lotus");
  });
});
