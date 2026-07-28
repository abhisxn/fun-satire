import { describe, expect, it } from "vitest";
import {
  CROWD_ASSETS,
  CROWD_ASSET_IDS,
  crowdAssetForEntity,
  getCrowdAssetEntry,
  type CrowdAssetEntry,
} from "../../src/render/crowdAssetRegistry";
import { FIGMA_ASSETS } from "../../src/assets/figmaAssetRegistry";

describe("crowdAssetRegistry (Lane C / Task C1)", () => {
  it("exposes the registered crowd-bug-* entries from the frozen figma registry", () => {
    const ids = CROWD_ASSET_IDS;
    expect(ids).toContain("crowd-bug-left");
    expect(ids).toContain("crowd-bug-right");
    expect(ids).toContain("crowd-bug-upright");
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      const entry = getCrowdAssetEntry(id);
      expect(entry).not.toBeNull();
      expect(entry!.role).toBe("crowd");
    }
  });

  it("all entries share the same canonical Figma provenance", () => {
    for (const entry of CROWD_ASSETS) {
      expect(entry.provenance.fileKey).toBe("oPAdd7oWLQVMTP1v6pJOW0");
      expect(entry.provenance.sourceVersion).toBe("figma-dev-mode-mcp@1.0.0");
      expect(entry.provenance.pageNodeId).toBe("0:1");
      expect(entry.url).toMatch(/^\/assets\/figma\/crowd\//);
      expect(entry.url).not.toContain("localhost:3845");
      expect(entry.width).toBeGreaterThan(0);
      expect(entry.height).toBeGreaterThan(0);
    }
  });

  it("frozen list matches the underlying FIGMA_ASSETS role:crowd entries", () => {
    const source = FIGMA_ASSETS.filter((a) => a.role === "crowd").map((a) => a.id).sort();
    expect([...CROWD_ASSET_IDS].sort()).toEqual(source);
  });

  it("selecting the same entity id always returns the same entry", () => {
    const a = crowdAssetForEntity("bug-7");
    const b = crowdAssetForEntity("bug-7");
    expect(a).toBe(b);
    expect(CROWD_ASSET_IDS).toContain(a.id);
  });

  it("intrinsic dimensions match the source registry exactly", () => {
    for (const entry of CROWD_ASSETS) {
      const source = FIGMA_ASSETS.find((a) => a.id === entry.id);
      expect(source).toBeDefined();
      expect({ width: entry.width, height: entry.height })
        .toEqual({ width: source!.width, height: source!.height });
    }
  });
});

describe("getCrowdAssetEntry lookup", () => {
  it("returns null for unknown ids", () => {
    expect(getCrowdAssetEntry("crowd-bug-99")).toBeNull();
  });

  it("returns a frozen, readonly entry for known ids", () => {
    const entry = getCrowdAssetEntry("crowd-bug-upright") as CrowdAssetEntry | null;
    expect(entry).not.toBeNull();
    expect(entry!.id).toBe("crowd-bug-upright");
    expect(entry!.url).toBe("/assets/figma/crowd/crowd-bug-upright.svg");
    expect(typeof entry!.width).toBe("number");
    expect(typeof entry!.height).toBe("number");
  });
});
