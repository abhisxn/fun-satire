import { describe, expect, it } from "vitest";
import {
  FIGMA_ASSETS,
  requiredAssetsFor,
} from "../../src/assets/figmaAssetRegistry";
import {
  EYE_ASSETS,
  EYE_ASSET_IDS,
  eyeAssetForEntity,
} from "../../src/assets/eyeAssetRegistry";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");
const APPROVED_NODES = ["18:113", "103:2490", "103:3579", "103:3593", "109:3669"];
const GOLDEN_EYE_IDS = [
  "eye-compact-01", "eye-compact-02", "eye-compact-02-attack", "eye-compact-03",
  "eye-compact-04", "eye-compact-05", "eye-compact-06", "eye-compact-07",
  "eye-compact-08", "eye-compact-09", "eye-giant-01", "eye-giant-02",
  "eye-giant-03", "eye-giant-04", "eye-large-01", "eye-large-02", "eye-large-03",
  "eye-large-04", "eye-large-05", "eye-large-06", "eye-large-07", "eye-large-08",
  "eye-medium-01", "eye-medium-02", "eye-medium-03", "eye-medium-04",
  "eye-medium-05", "eye-medium-06", "eye-small-01", "eye-small-02", "eye-small-03",
  "eye-small-04", "eye-small-05",
] as const;

function attribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`));
  if (!match) throw new Error(`Missing ${name} in ${tag}`);
  return match[1];
}

function expectedEyeGeometry(svg: string) {
  const svgTag = svg.match(/<svg\b[^>]*>/)?.[0];
  const socketTag = svg.match(/<path\b[^>]*id=["']Ellipse 1["'][^>]*>/)?.[0];
  const maskBody = svg.match(/<mask\b[^>]*>([\s\S]*?)<\/mask>/)?.[1];
  const clipTag = maskBody?.match(/<path\b[^>]*>/)?.[0] ?? socketTag;
  const irisTag = svg.match(/<circle\b[^>]*id=["']Ellipse 2["'][^>]*>/)?.[0];
  const cropTag = svg.match(/<clipPath\b[^>]*>[\s\S]*?<rect\b[^>]*>/)?.[0].match(/<rect\b[^>]*>/)?.[0];
  if (!svgTag || !socketTag || !clipTag || !irisTag || !cropTag) throw new Error("Incomplete eye SVG");

  const [x, y, width, height] = attribute(svgTag, "viewBox").split(/\s+/).map(Number);
  const irisX = Number(attribute(irisTag, "cx"));
  const irisY = Number(attribute(irisTag, "cy"));
  const fill = attribute(irisTag, "fill").match(/#[0-9a-f]{6}/i)?.[0];
  if (!fill) throw new Error("Missing iris fallback fill");

  return {
    viewBox: { x, y, width, height },
    crop: {
      x: Number(cropTag.match(/\bx=["']([^"']+)/)?.[1] ?? 0),
      y: Number(cropTag.match(/\by=["']([^"']+)/)?.[1] ?? 0),
      width: Number(attribute(cropTag, "width")),
      height: Number(attribute(cropTag, "height")),
    },
    socketPath: attribute(socketTag, "d"),
    clipPath: attribute(clipTag, "d"),
    iris: { centerX: irisX, centerY: irisY, radius: Number(attribute(irisTag, "r")), fill },
    irisSourceOffset: { x: irisX - (x + width / 2), y: irisY - (y + height / 2) },
  };
}

describe("FIGMA_ASSETS", () => {
  it("uses unique semantic IDs and runtime-local asset URLs", () => {
    const ids = FIGMA_ASSETS.map((asset) => asset.id);
    const urls = FIGMA_ASSETS.map((asset) => asset.url);
    const sourceHashes = FIGMA_ASSETS.map((asset) => asset.sourceHash);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(urls).size).toBe(urls.length);
    expect(new Set(sourceHashes).size).toBe(sourceHashes.length);
    for (const asset of FIGMA_ASSETS) {
      expect(asset.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(asset.url).toMatch(/^\/assets\/figma\/(eyes|subjects|icons|crowd|effects|references)\//);
      expect(asset.url).not.toContain("localhost:3845");
      expect(asset.byteLength).toBeGreaterThan(0);
      expect(asset.byteLength).toBeLessThanOrEqual(asset.maxBytes);
      expect(asset.provenance.fileKey).toBe("oPAdd7oWLQVMTP1v6pJOW0");
      expect(asset.provenance.sourceVersion).toBe("figma-dev-mode-mcp@1.0.0");
    }
  });

  it("records auditable source metadata and positive dimensions", () => {
    for (const asset of FIGMA_ASSETS) {
      expect(asset.nodeId).toMatch(/^\d+:\d+$/);
      expect(asset.sourceHash).toMatch(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
      expect(asset.requiredFor.length).toBeGreaterThan(0);
    }
  });

  it("indexes every approved source node", () => {
    for (const nodeId of APPROVED_NODES) {
      expect(requiredAssetsFor(nodeId).length).toBeGreaterThan(0);
    }
  });

  it("has exactly one full-node PNG parity reference for each approved node", () => {
    const references = FIGMA_ASSETS.filter((asset) => asset.role === "reference");
    expect(references).toHaveLength(APPROVED_NODES.length);
    for (const nodeId of APPROVED_NODES) {
      const matches = references.filter((asset) => asset.nodeId === nodeId);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({ format: "png", requiredFor: [nodeId] });
      expect(matches[0].url).toMatch(/^\/assets\/figma\/references\/reference-.+\.png$/);
    }
  });

  it("reserves crowd and effect roles for scene fragments", () => {
    const crowdBugs = FIGMA_ASSETS.filter((asset) => asset.id.startsWith("crowd-bug-"));
    expect(crowdBugs).toHaveLength(3);
    expect(crowdBugs.every((asset) => asset.role === "crowd")).toBe(true);
    expect(FIGMA_ASSETS.find((asset) => asset.id === "effect-attack-target-glow")?.role).toBe("effect");
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

  it("uses a canonical golden order independent of manifest ordering", () => {
    expect(EYE_ASSET_IDS).toEqual(GOLDEN_EYE_IDS);
    expect(EYE_ASSETS.map((asset) => asset.id)).toEqual(GOLDEN_EYE_IDS);
  });

  it("records exact movable-iris geometry from every source SVG", () => {
    for (const asset of EYE_ASSETS) {
      const svg = readFileSync(resolve(ROOT, `public${asset.url}`), "utf8");
      expect(asset.geometry).toEqual(expectedEyeGeometry(svg));
    }
  });
});
