// tests/unit/entityFactorySubject.test.ts
import { describe, expect, it } from "vitest";
import { spawnSubject } from "../../src/entities/EntityFactory";
import type { SubjectManifestEntry } from "../../src/content/schema";
import type { SubjectSkin } from "../../src/hud/subjectSkinRegistry";

const entry: SubjectManifestEntry = {
  id: "subject-figure-01",
  rig: "subject",
  renderType: "subject",
  visual: { styleGuardrail: "flat-illustrated" },
  colors: { suit: "slate", shirt: "cream", outline: "ink" },
  physics: { baseSizePx: 96 },
};

const entryWithSkin: SubjectManifestEntry = {
  ...entry,
  id: "subject-with-skin",
  subjectSkin: "lotus",
};

describe("entities/EntityFactory spawnSubject (T28)", () => {
  it("returns null when the manifest has no entries", () => {
    const e = spawnSubject({ manifest: [], cursor: { x: 10, y: 10 }, nextId: 1 });
    expect(e).toBeNull();
  });

  it("builds a single Entity at the cursor position, scale 0, using the given id", () => {
    const e = spawnSubject({ manifest: [entry], cursor: { x: 200, y: 150 }, nextId: 42 });
    expect(e).not.toBeNull();
    expect(e!.id).toBe(42);
    expect(e!.content.rig).toBe("subject");
    expect(e!.content.renderType).toBe("subject");
    expect(e!.physics.pos).toEqual({ x: 200, y: 150 });
    expect(e!.physics.home).toEqual({ x: 200, y: 150 });
    expect(e!.physics.scale).toBe(0);
    expect(e!.lifecycle.alive).toBe(true);
    expect(e!.lifecycle.dying).toBe(false);
    expect(e!.behavior.data.baseSizePx).toBe(96);
    expect((e!.behavior.data.colors as typeof entry.colors).suit).toBe("slate");
  });

  it("stamps opts.skin into behavior.data.subjectSkin when provided", () => {
    const skin: SubjectSkin = { kind: "text", value: "x", scale: 1 };
    const e = spawnSubject({
      manifest: [entry],
      cursor: { x: 0, y: 0 },
      nextId: 1,
      skin,
    });
    expect(e).not.toBeNull();
    expect(e!.behavior.data.subjectSkin).toEqual(skin);
  });

  it("falls back to manifest entry's subjectSkin when opts.skin is omitted", () => {
    const e = spawnSubject({
      manifest: [entryWithSkin],
      cursor: { x: 0, y: 0 },
      nextId: 1,
    });
    expect(e).not.toBeNull();
    expect(e!.behavior.data.subjectSkin).toEqual({ kind: "illustrated", id: "lotus" });
  });

  it("falls back to { kind: 'illustrated', id: 'figure' } when neither opts.skin nor entry.subjectSkin is set", () => {
    const e = spawnSubject({
      manifest: [entry],
      cursor: { x: 0, y: 0 },
      nextId: 1,
    });
    expect(e).not.toBeNull();
    expect(e!.behavior.data.subjectSkin).toEqual({ kind: "illustrated", id: "figure" });
  });
});
