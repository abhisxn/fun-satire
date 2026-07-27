import { describe, expect, it } from "vitest";
import { Rng } from "../../src/core/Rng";
import { spawnEyes, ENTITY_FACTORY } from "../../src/entities/EntityFactory";
import type { ManifestEntry } from "../../src/content/schema";

const entry = (id: string, size = 56): ManifestEntry => ({
  id,
  rig: "eye",
  renderType: "eye",
  visual: { styleGuardrail: "flat-illustrated", shapeVariant: "almond" },
  colors: { sclera: "cream", iris: "slate", pupil: "ink", highlight: "coral", outline: "ink" },
  physics: { baseSizePx: size },
  behavior: { blinkIntervalMinMs: 2200, blinkIntervalMaxMs: 5400, blinkDurationMs: 110, pupilTrackMs: 90 },
});

describe("entities/EntityFactory (T13)", () => {
  it("is deterministic for a fixed seed and canvas size", () => {
    const manifest = Array.from({ length: 18 }, (_, i) => entry(`eye-${i}`));
    const a = spawnEyes({ rng: new Rng(4242), width: 1280, height: 720, manifest });
    const b = spawnEyes({ rng: new Rng(4242), width: 1280, height: 720, manifest });
    expect(a.entities.length).toBe(b.entities.length);
    for (let i = 0; i < a.entities.length; i++) {
      expect(a.entities[i].physics.pos.x).toBeCloseTo(b.entities[i].physics.pos.x, 6);
      expect(a.entities[i].physics.pos.y).toBeCloseTo(b.entities[i].physics.pos.y, 6);
    }
  });

  it("places every entity in-canvas with a comfortable margin", () => {
    const manifest = Array.from({ length: 18 }, (_, i) => entry(`eye-${i}`));
    const { entities } = spawnEyes({ rng: new Rng(7), width: 1280, height: 720, manifest });
    expect(entities.length).toBeGreaterThan(0);
    for (const e of entities) {
      expect(e.physics.pos.x).toBeGreaterThan(40);
      expect(e.physics.pos.x).toBeLessThan(1280 - 40);
      expect(e.physics.pos.y).toBeGreaterThan(40);
      expect(e.physics.pos.y).toBeLessThan(720 - 40);
    }
  });

  it("respects separation so no two entities overlap", () => {
    const manifest = Array.from({ length: 18 }, (_, i) => entry(`eye-${i}`));
    const { entities } = spawnEyes({
      rng: new Rng(99),
      width: 1280,
      height: 720,
      manifest,
    });
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const dx = entities[i].physics.pos.x - entities[j].physics.pos.x;
        const dy = entities[i].physics.pos.y - entities[j].physics.pos.y;
        const minSep = ENTITY_FACTORY.minSeparationPx;
        expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(Math.pow(minSep - 4, 2));
      }
    }
  });

  it("returns rejected count for entries that couldn't be placed", () => {
    const manifest = Array.from({ length: 80 }, (_, i) => entry(`eye-${i}`));
    const { entities, rejected } = spawnEyes({
      rng: new Rng(11),
      width: 200,
      height: 200,
      manifest,
    });
    expect(entities.length + rejected).toBeGreaterThan(0);
    expect(rejected).toBeGreaterThan(0);
  });

  it("seed variation produces visibly different layouts", () => {
    const manifest = Array.from({ length: 12 }, (_, i) => entry(`eye-${i}`));
    const a = spawnEyes({ rng: new Rng(1), width: 1280, height: 720, manifest });
    const b = spawnEyes({ rng: new Rng(2), width: 1280, height: 720, manifest });
    const moved = a.entities.some((e, i) => {
      const o = b.entities[i];
      if (!o) return true;
      return (
        Math.abs(e.physics.pos.x - o.physics.pos.x) > 1e-3 ||
        Math.abs(e.physics.pos.y - o.physics.pos.y) > 1e-3
      );
    });
    expect(moved).toBe(true);
  });

  it("randomizes crowd member size per entity using the seeded rng", () => {
    const manifest = Array.from({ length: 18 }, (_, i) => entry(`eye-${i}`));
    const { entities } = spawnEyes({ rng: new Rng(7), width: 1280, height: 720, manifest });
    const scales = new Set([1.4, 1.15, 1.0, 0.8]);
    expect(entities.length).toBeGreaterThan(0);
    for (const e of entities) {
      const data = e.behavior.data as Record<string, unknown>;
      expect(scales.has(data.sizeScale as number)).toBe(true);
      expect(data.sizeClass).toBeDefined();
    }
  });

  it("keeps size randomization deterministic for a fixed seed", () => {
    const manifest = Array.from({ length: 18 }, (_, i) => entry(`eye-${i}`));
    const a = spawnEyes({ rng: new Rng(4242), width: 1280, height: 720, manifest });
    const b = spawnEyes({ rng: new Rng(4242), width: 1280, height: 720, manifest });
    expect(a.entities.length).toBe(b.entities.length);
    for (let i = 0; i < a.entities.length; i++) {
      expect(a.entities[i].physics.pos.x).toBeCloseTo(b.entities[i].physics.pos.x, 6);
      expect(a.entities[i].physics.pos.y).toBeCloseTo(b.entities[i].physics.pos.y, 6);
      expect(a.entities[i].behavior.data.sizeScale).toBe(b.entities[i].behavior.data.sizeScale);
      expect(a.entities[i].behavior.data.sizeClass).toBe(b.entities[i].behavior.data.sizeClass);
    }
  });

  it("attaches the manifest entry data into behavior.data", () => {
    const manifest = [entry("eye-pinned", 72)];
    const { entities } = spawnEyes({ rng: new Rng(0), width: 800, height: 600, manifest });
    expect(entities.length).toBe(1);
    const data = entities[0].behavior.data as Record<string, unknown>;
    expect(data.manifestId ?? entities[0].content.manifestId).toBe("eye-pinned");
    expect(typeof data.blinkDurationMs).toBe("number");
  });
});
