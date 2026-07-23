import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadManifestFromText } from "../../src/content/manifestLoader";
import type { ManifestEntry, ShapeVariant } from "../../src/content/schema";

const ROOT = resolve(__dirname, "..", "..");

describe("content/manifests/eyes.roster.json (T12)", () => {
  const text = readFileSync(
    resolve(ROOT, "src/content/manifests/eyes.roster.json"),
    "utf8",
  );
  const manifest = loadManifestFromText(text);

  it("ships ≥15 distinct eye entries", () => {
    expect(manifest.entries.length).toBeGreaterThanOrEqual(15);
  });

  it("has at least 3 distinct shapeVariants", () => {
    const variants = new Set<ShapeVariant>();
    for (const e of manifest.entries) variants.add(e.visual.shapeVariant);
    expect(variants.size).toBeGreaterThanOrEqual(3);
  });

  it("uses at least 2 iris palette keys (slate/sage) from the locked palette", () => {
    const irises = new Set(manifest.entries.map((e) => e.colors.iris));
    expect([...irises].sort()).toEqual(["sage", "slate"]);
  });

  it("every entry passes the v3 styleGuardrail: 'flat-illustrated' invariant", () => {
    for (const e of manifest.entries) {
      expect(e.visual.styleGuardrail).toBe("flat-illustrated");
    }
  });

  it("every entry has a unique id", () => {
    const seen = new Set<string>();
    for (const e of manifest.entries) {
      expect(seen.has(e.id)).toBe(false);
      seen.add(e.id);
    }
  });

  it("every entry has finite baseSizePx and blink intervals that satisfy min ≤ max", () => {
    for (const e of manifest.entries) {
      expect(Number.isFinite(e.physics.baseSizePx)).toBe(true);
      expect(e.behavior.blinkIntervalMinMs).toBeLessThanOrEqual(
        e.behavior.blinkIntervalMaxMs,
      );
    }
  });

  it("stores entries as the locked-Paper-Cut-Protest palette only", () => {
    const palette = new Set<string>();
    for (const e of manifest.entries) {
      palette.add(e.colors.sclera);
      palette.add(e.colors.iris);
      palette.add(e.colors.pupil);
      if (e.colors.highlight) palette.add(e.colors.highlight);
      palette.add(e.colors.outline);
    }
    for (const k of palette) {
      expect(["cream", "slate", "sage", "ink", "coral"]).toContain(k);
    }
  });
});
