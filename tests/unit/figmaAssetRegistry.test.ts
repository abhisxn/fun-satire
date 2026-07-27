import { describe, expect, it } from "vitest";
import {
  FIGMA_ASSETS,
  requiredAssetsFor,
} from "../../src/assets/figmaAssetRegistry";
import {
  EYE_ASSETS,
  eyeAssetForEntity,
} from "../../src/assets/eyeAssetRegistry";

describe("FIGMA_ASSETS", () => {
  it("uses unique semantic IDs and runtime-local asset URLs", () => {
    const ids = FIGMA_ASSETS.map((asset) => asset.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const asset of FIGMA_ASSETS) {
      expect(asset.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(asset.url).toMatch(/^\/assets\/figma\/(eyes|subjects|icons|references)\//);
      expect(asset.url).not.toContain("localhost:3845");
    }
  });

  it("records auditable source metadata and positive dimensions", () => {
    for (const asset of FIGMA_ASSETS) {
      expect(asset.nodeId).toMatch(/^\d+:\d+$/);
      expect(asset.sourceHash).toMatch(/^[a-f0-9]{40}$/);
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
      expect(asset.requiredFor.length).toBeGreaterThan(0);
    }
  });

  it("indexes every approved source node", () => {
    for (const nodeId of ["18:113", "103:2490", "103:3579", "103:3593", "109:3669"]) {
      expect(requiredAssetsFor(nodeId).length).toBeGreaterThan(0);
    }
  });
});

describe("EYE_ASSETS", () => {
  it("contains only eye-role entries", () => {
    expect(EYE_ASSETS.length).toBeGreaterThan(0);
    expect(EYE_ASSETS.every((asset) => asset.role === "eye")).toBe(true);
  });

  it("selects the same exact eye for the same entity ID", () => {
    expect(eyeAssetForEntity("eye-17")).toBe(eyeAssetForEntity("eye-17"));
    expect(EYE_ASSETS).toContain(eyeAssetForEntity("eye-17"));
  });
});
