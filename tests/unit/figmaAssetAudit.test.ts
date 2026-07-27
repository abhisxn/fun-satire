import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../figma-assets.source.json";
import {
  assertPayloadBudget,
  assertSafeSvg,
  canonicalizeAssets,
  dimensionsOf,
  normalizeSceneReference,
  optimizePngLosslessly,
  resampleRgbaSrgb,
  safeOutputPath,
  validateGoldenInventory,
  validateManifest,
  verifyNoUnlistedFiles,
} from "../../scripts/figma-asset-audit.mjs";

function cloneManifest(): typeof manifest {
  return structuredClone(manifest);
}

function reviewedGoldenInventory() {
  return JSON.parse(readFileSync(resolve(__dirname, "../../figma-assets.golden.json"), "utf8"));
}

describe("Figma asset manifest audit", () => {
  it("accepts the reviewed manifest and complete approved-node inventory", () => {
    expect(() => validateManifest(manifest)).not.toThrow();
  });

  it.each(["id", "destination", "sourceHash"] as const)("rejects duplicate %s values", (field) => {
    const candidate = cloneManifest();
    candidate.assets[1][field] = candidate.assets[0][field];
    expect(() => validateManifest(candidate)).toThrow(/duplicate/i);
  });

  it("rejects destinations that escape after path normalization", () => {
    const candidate = cloneManifest();
    candidate.assets[0].destination = "public/assets/figma/eyes/../../../../escape.svg";
    expect(() => validateManifest(candidate)).toThrow(/destination|escape|outside/i);
    expect(() => safeOutputPath("/repo", candidate.assets[0].destination)).toThrow(/outside/i);
  });

  it.each([
    "<svg><script>alert(1)</script></svg>",
    "<svg onload=\"alert(1)\"></svg>",
    "<svg><foreignObject /></svg>",
    "<svg><image href=\"https://evil.example/a.png\" /></svg>",
    "<svg><use href=\"data:text/html;base64,WA==\" /></svg>",
    "<svg><image src=\"https://evil.example/a.png\" /></svg>",
    "<svg><path fill=\"url(https://evil.example/a.svg#x)\" /></svg>",
    "<svg><style>@import 'https://evil.example/a.css';</style></svg>",
    "<svg><animate attributeName=\"href\" values=\"#safe;javascript:alert(1)\" /></svg>",
    "<svg><set attributeName=\"onclick\" to=\"alert(1)\" /></svg>",
    "<svg><animateMotion path=\"M0 0\" /></svg>",
    "<svg><animateTransform attributeName=\"transform\" /></svg>",
    "<svg><discard begin=\"1s\" /></svg>",
    "<svg><use href=\"javascript:alert(1)\" /></svg>",
    "<svg><use xlink:href=\"//evil.example/a.svg#x\" /></svg>",
    "<svg><image src=\"data:image/svg+xml;base64,WA==\" /></svg>",
    "<svg><path style=\"fill:javascript:alert(1)\" /></svg>",
    "<svg><path style=\"behavior:url(#x)\" /></svg>",
  ])("rejects unsafe SVG content", (svg) => {
    expect(() => assertSafeSvg(Buffer.from(svg))).toThrow(/unsafe svg/i);
  });

  it("allows self-contained Figma SVGs", () => {
    expect(() => assertSafeSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="a" /></defs><g clip-path="url(#a)" /></svg>')))
      .not.toThrow();
  });

  it.each([
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg"><s:script>alert(1)</s:script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg"><s:animate attributeName="href" values="java&#x73;cript:alert(1)" /></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:&#x75;rl(https://evil.example/a.svg#x)" /></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:evil="https://evil.example/ns"><evil:path /></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:evil="https://evil.example/ns"><path evil:onload="alert(1)" /></svg>',
  ])("rejects namespace-aware or encoded SVG attacks", (svg) => {
    expect(() => assertSafeSvg(Buffer.from(svg))).toThrow(/unsafe svg|malformed xml/i);
  });

  it("accepts every committed Figma SVG through the XML allowlist", () => {
    const svgAssets = manifest.assets.filter((entry) => entry.format === "svg");
    expect(svgAssets).toHaveLength(77);
    for (const asset of svgAssets) {
      const bytes = readFileSync(resolve(__dirname, `../../${asset.destination}`));
      expect(() => assertSafeSvg(bytes), asset.id).not.toThrow();
    }
  });

  it("rejects files that are absent from or extra to the manifest", async () => {
    const root = mkdtempSync(join(tmpdir(), "figma-audit-"));
    const destination = "public/assets/figma/eyes/eye.svg";
    mkdirSync(resolve(root, "public/assets/figma/eyes"), { recursive: true });
    writeFileSync(resolve(root, destination), "listed");
    await expect(verifyNoUnlistedFiles(root, [{ destination }])).resolves.toBeUndefined();
    writeFileSync(resolve(root, "public/assets/figma/eyes/extra.svg"), "extra");
    await expect(verifyNoUnlistedFiles(root, [{ destination }])).rejects.toThrow(/unlisted/i);
  });

  it("sorts canonically regardless of manifest order", () => {
    expect(canonicalizeAssets([...manifest.assets].reverse()).map((asset) => asset.id))
      .toEqual(canonicalizeAssets(manifest.assets).map((asset) => asset.id));
  });

  it("requires committed canonical asset and requiredFor ordering", () => {
    const reversed = cloneManifest();
    reversed.assets.reverse();
    expect(() => validateManifest(reversed)).toThrow(/canonical asset order/i);

    const swapped = cloneManifest();
    [swapped.assets[0], swapped.assets[1]] = [swapped.assets[1], swapped.assets[0]];
    expect(() => validateManifest(swapped)).toThrow(/canonical asset order/i);

    const repeated = cloneManifest();
    repeated.assets.find((entry) => entry.requiredFor.length > 1)!.requiredFor.push("18:113");
    expect(() => validateManifest(repeated)).toThrow(/requiredFor/i);

    const reordered = cloneManifest();
    reordered.assets.find((entry) => entry.requiredFor.length > 1)!.requiredFor.reverse();
    expect(() => validateManifest(reordered)).toThrow(/requiredFor/i);
  });

  it("matches the independent reviewed non-reference inventory exactly", () => {
    const golden = reviewedGoldenInventory();
    expect(Object.keys(golden.assets[0])).toEqual(["id", "sourceNodeId", "sourceHash", "role", "requiredFor"]);
    expect(() => validateGoldenInventory(manifest, golden)).not.toThrow();

    for (const mutation of ["missing", "additional", "drift"] as const) {
      const candidate = cloneManifest();
      const nonReference = candidate.assets.find((entry) => entry.role !== "reference")!;
      if (mutation === "missing") candidate.assets = candidate.assets.filter((entry) => entry.id !== nonReference.id);
      if (mutation === "additional") candidate.assets.push({ ...nonReference, id: "eye-unreviewed", sourceHash: "f".repeat(40) });
      if (mutation === "drift") nonReference.sourceHash = "e".repeat(40);
      expect(() => validateGoldenInventory(candidate, golden)).toThrow(/golden inventory/i);
    }
  });

  it("enforces payload budgets", () => {
    expect(() => assertPayloadBudget({ id: "x", maxBytes: 4 }, Buffer.alloc(5))).toThrow(/budget/i);
    const candidate = cloneManifest();
    candidate.payloadBudgetBytes = 1;
    expect(() => validateManifest(candidate)).toThrow(/total payload budget/i);
  });

  it("records lossless lotus optimization against the original source payload", () => {
    const lotus = manifest.assets.find((entry) => entry.id === "subject-lotus");
    expect(lotus).toMatchObject({ optimization: "lossless-deflate", maxBytes: 700_000 });
    expect(lotus?.sourceByteLength).toBeGreaterThan(lotus?.byteLength ?? Infinity);
    expect(lotus?.sourceSha256).not.toBe(lotus?.sha256);
  });

  it("rejects non-semantic IDs and disallowed role-format combinations", () => {
    const badId = cloneManifest();
    badId.assets[0].id = "Frame 38";
    expect(() => validateManifest(badId)).toThrow(/semantic/i);
    const badFormat = cloneManifest();
    badFormat.assets[0].format = "png";
    expect(() => validateManifest(badFormat)).toThrow(/disallowed/i);
  });

  it("rejects source-kind, endpoint, and screenshot provenance drift", () => {
    const badEndpoint = cloneManifest();
    const endpoint = badEndpoint.assets.find((entry) => entry.sourceKind === "figma-asset-endpoint");
    if (!endpoint) throw new Error("Missing endpoint fixture");
    endpoint.sourceUrl = "http://localhost:3845/assets/not-the-source.svg";
    expect(() => validateManifest(badEndpoint)).toThrow(/source url|provenance/i);

    const badReference = cloneManifest();
    const reference = badReference.assets.find((entry) => entry.role === "reference");
    if (!reference) throw new Error("Missing reference fixture");
    reference.sourceKind = "figma-asset-endpoint";
    expect(() => validateManifest(badReference)).toThrow(/source kind|provenance/i);
  });

  it("rejects page, source-node, and timestamp provenance drift", () => {
    const badPage = cloneManifest();
    badPage.assets[0].provenance.pageNodeId = "9:9";
    expect(() => validateManifest(badPage)).toThrow(/page|provenance/i);

    const badNode = cloneManifest();
    badNode.assets[0].provenance.sourceNodeId = "9:9";
    expect(() => validateManifest(badNode)).toThrow(/source node|provenance/i);

    const badTimestamp = cloneManifest();
    badTimestamp.exportProvenance.capturedAt = "not-an-iso-timestamp";
    expect(() => validateManifest(badTimestamp)).toThrow(/capturedAt|timestamp/i);
  });

  it("resamples a capped full-scene capture to the reviewed 20:13 mapping", () => {
    const source = readFileSync(resolve(__dirname, "../../public/assets/figma/references/reference-eyes-default.png"));
    const normalized = normalizeSceneReference(source);
    expect(dimensionsOf(normalized, "png")).toEqual({ width: 1020, height: 663 });
  });

  it("matches the reviewed linear-light sRGB pixel fixture", () => {
    const source = Buffer.from([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const expected = Buffer.from([
      255, 0, 0, 255, 188, 188, 0, 255, 0, 255, 0, 255,
      188, 0, 188, 255, 188, 188, 188, 255, 188, 255, 188, 255,
      0, 0, 255, 255, 188, 188, 255, 255, 255, 255, 255, 255,
    ]);
    const actual = resampleRgbaSrgb(source, 2, 2, 3, 3);
    expect(actual).toEqual(expected);
    expect(createHash("sha256").update(actual).digest("hex"))
      .toBe("4a061ed773abed7341bba4d98987e77449e307b76e072f8f1287cd3d1ba2dc32");
  });

  it("rejects mismatched, cropped, or nonuniform parity mappings", () => {
    const reference = manifest.assets.find((entry) => entry.id === "reference-eyes-default");
    if (!reference) throw new Error("Missing scene reference fixture");

    const wrongDimensions = cloneManifest();
    const wrongDimensionsReference = wrongDimensions.assets.find((entry) => entry.id === reference.id)!;
    wrongDimensionsReference.width = 1024;
    expect(() => validateManifest(wrongDimensions)).toThrow(/normalized|mapping/i);

    const nonuniform = cloneManifest();
    const nonuniformReference = nonuniform.assets.find((entry) => entry.id === reference.id)!;
    nonuniformReference.provenance.parityMapping.scaleY = 0.8;
    expect(() => validateManifest(nonuniform)).toThrow(/uniform|mapping/i);

    const cropped = cloneManifest();
    const croppedReference = cropped.assets.find((entry) => entry.id === reference.id)!;
    croppedReference.provenance.parityMapping.sourceCrop.width = 1279;
    expect(() => validateManifest(cropped)).toThrow(/crop|mapping/i);
  });

  it("losslessly recompresses PNG image data", () => {
    const source = readFileSync(resolve(__dirname, "../../public/assets/figma/subjects/subject-lotus.png"));
    const optimized = optimizePngLosslessly(source);
    expect(optimized.subarray(0, 8)).toEqual(source.subarray(0, 8));
    expect(optimized.length).toBeLessThanOrEqual(source.length);
    expect(() => assertPayloadBudget({ id: "pixel", maxBytes: optimized.length }, optimized)).not.toThrow();
  });
});
