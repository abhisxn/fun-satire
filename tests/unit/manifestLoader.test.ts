import { describe, expect, it } from "vitest";
import { validateManifest, loadManifestFromText } from "../../src/content/manifestLoader";
import { ManifestLoadError } from "../../src/content/schema";

const validEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "eye-1",
  rig: "eye",
  renderType: "eye",
  visual: { styleGuardrail: "flat-illustrated", shapeVariant: "almond" },
  colors: { sclera: "cream", iris: "slate", pupil: "ink", highlight: "coral", outline: "ink" },
  physics: { baseSizePx: 56 },
  behavior: { blinkIntervalMinMs: 2200, blinkIntervalMaxMs: 6500, blinkDurationMs: 110, pupilTrackMs: 90 },
  ...overrides,
});

const valid = (entries: unknown[] = [validEntry()]) => ({
  schemaVersion: "1.0.0",
  name: "eyes-roster-test",
  entries,
});

describe("content/manifestLoader (T11)", () => {
  it("round-trips a valid manifest with one eye", () => {
    const m = validateManifest(valid());
    expect(m.entries).toHaveLength(1);
    expect(m.entries[0].id).toBe("eye-1");
  });

  it("throws ManifestLoadError on missing styleGuardrail (the v3 guardrail)", () => {
    const bad = valid([validEntry({ visual: { styleGuardrail: "photoreal", shapeVariant: "almond" } })]);
    expect(() => validateManifest(bad)).toThrowError(/styleGuardrail/);
    try {
      validateManifest(bad);
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestLoadError);
      expect((err as ManifestLoadError).issues[0].path).toBe("/entries/0/visual/styleGuardrail");
    }
  });

  it("throws on schemaVersion mismatch", () => {
    const bad = valid();
    (bad as Record<string, unknown>).schemaVersion = "0.9.0";
    expect(() => validateManifest(bad)).toThrowError(/schemaVersion/);
  });

  it("throws on missing id", () => {
    const e = validEntry();
    delete (e as Record<string, unknown>).id;
    expect(() => validateManifest(valid([e]))).toThrowError(/id/);
  });

  it("throws on unknown shapeVariant", () => {
    const e = validEntry({
      visual: { styleGuardrail: "flat-illustrated", shapeVariant: "weird" },
    });
    expect(() => validateManifest(valid([e]))).toThrowError(/shapeVariant/);
  });

  it("throws on iris color outside the locked palette", () => {
    const e = validEntry({
      colors: { sclera: "cream", iris: "purple", pupil: "ink", highlight: "coral", outline: "ink" },
    });
    expect(() => validateManifest(valid([e]))).toThrowError(/iris/);
  });

  it("throws on sclera color other than cream", () => {
    const e = validEntry({
      colors: { sclera: "white", iris: "slate", pupil: "ink", highlight: "coral", outline: "ink" },
    });
    expect(() => validateManifest(valid([e]))).toThrowError(/sclera/);
  });

  it("throws on duplicate ids across entries", () => {
    const e2 = validEntry({ id: "eye-1" });
    expect(() => validateManifest(valid([validEntry(), e2]))).toThrowError(/duplicate/);
  });

  it("throws when blinkIntervalMin exceeds blinkIntervalMax", () => {
    const e = validEntry({
      behavior: { blinkIntervalMinMs: 8000, blinkIntervalMaxMs: 2500, blinkDurationMs: 110, pupilTrackMs: 90 },
    });
    expect(() => validateManifest(valid([e]))).toThrowError(/blinkIntervalMinMs/);
  });

  it("throws on negative or zero baseSizePx", () => {
    expect(() => validateManifest(valid([validEntry({ physics: { baseSizePx: -1 } })]))).toThrowError();
    expect(() => validateManifest(valid([validEntry({ physics: { baseSizePx: 0 } })]))).toThrowError();
  });

  it("loadManifestFromText parses JSON and validates", () => {
    const text = JSON.stringify(valid());
    const m = loadManifestFromText(text);
    expect(m.name).toBe("eyes-roster-test");
  });

  it("loadManifestFromText throws with JSON-parse context on malformed JSON", () => {
    expect(() => loadManifestFromText("{not-json")).toThrowError(/invalid JSON/);
  });

  it("manifest must contain at least one entry", () => {
    expect(() => validateManifest(valid([]))).toThrowError(/at least one entry/);
  });
});
