import { describe, expect, it } from "vitest";
import { EYE_ASSET_IDS, eyeAssetForEntity } from "../../src/assets/eyeAssetRegistry";
import { loadManifestFromText } from "../../src/content/manifestLoader";
import type { EyeManifestEntry } from "../../src/content/schema";

describe("content/schema eye asset binding", () => {
  it("every eye entry has a valid assetId from the frozen registry", () => {
    const roster = JSON.parse(
      `{
        "schemaVersion": "1.0.0",
        "name": "eyes-roster-asset-binding",
        "entries": [
          { "id": "eye-watchful-01", "rig": "eye", "renderType": "eye", "visual": { "styleGuardrail": "flat-illustrated", "shapeVariant": "almond", "assetId": "eye-compact-01" }, "colors": { "sclera": "cream", "iris": "slate", "pupil": "ink", "highlight": "coral", "outline": "ink" }, "physics": { "baseSizePx": 58 }, "behavior": { "blinkIntervalMinMs": 2200, "blinkIntervalMaxMs": 5400, "blinkDurationMs": 110, "pupilTrackMs": 90 } },
          { "id": "eye-watchful-02", "rig": "eye", "renderType": "eye", "visual": { "styleGuardrail": "flat-illustrated", "shapeVariant": "round", "assetId": "eye-medium-04" }, "colors": { "sclera": "cream", "iris": "sage", "pupil": "ink", "highlight": "coral", "outline": "ink" }, "physics": { "baseSizePx": 52 }, "behavior": { "blinkIntervalMinMs": 2800, "blinkIntervalMaxMs": 6800, "blinkDurationMs": 130, "pupilTrackMs": 100 } }
        ]
      }`,
    );
    const m = loadManifestFromText(JSON.stringify(roster));
    expect(m.entries).toHaveLength(2);
    for (const entry of m.entries) {
      const eye = entry as EyeManifestEntry;
      expect(eye.visual.assetId).toBeDefined();
      expect(EYE_ASSET_IDS).toContain(eye.visual.assetId);
      expect(eye.visual.shapeVariant).toMatch(/almond|round|hooded|wide|narrow/);
    }
  });

  it("rejects an eye entry whose assetId is not in the frozen registry", () => {
    const bad = {
      schemaVersion: "1.0.0",
      name: "eyes-roster-asset-binding-bad",
      entries: [
        {
          id: "eye-bad-01",
          rig: "eye",
          renderType: "eye",
          visual: {
            styleGuardrail: "flat-illustrated",
            shapeVariant: "almond",
            assetId: "eye-from-another-universe-99",
          },
          colors: { sclera: "cream", iris: "slate", pupil: "ink", highlight: "coral", outline: "ink" },
          physics: { baseSizePx: 58 },
          behavior: { blinkIntervalMinMs: 2200, blinkIntervalMaxMs: 5400, blinkDurationMs: 110, pupilTrackMs: 90 },
        },
      ],
    };
    expect(() => loadManifestFromText(JSON.stringify(bad))).toThrowError(/assetId/);
  });

  it("deterministically fills missing assetId from eyeAssetForEntity when omitted", () => {
    const noAsset = {
      schemaVersion: "1.0.0",
      name: "eyes-roster-asset-binding-default",
      entries: [
        {
          id: "eye-default-asset-01",
          rig: "eye",
          renderType: "eye",
          visual: { styleGuardrail: "flat-illustrated", shapeVariant: "almond" },
          colors: { sclera: "cream", iris: "slate", pupil: "ink", highlight: "coral", outline: "ink" },
          physics: { baseSizePx: 58 },
          behavior: { blinkIntervalMinMs: 2200, blinkIntervalMaxMs: 5400, blinkDurationMs: 110, pupilTrackMs: 90 },
        },
      ],
    };
    const m = loadManifestFromText(JSON.stringify(noAsset));
    const eye = m.entries[0] as EyeManifestEntry;
    expect(eye.visual.assetId).toBe(eyeAssetForEntity("eye-default-asset-01").id);
  });
});
