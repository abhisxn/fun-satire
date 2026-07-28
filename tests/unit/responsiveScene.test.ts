import { describe, expect, it } from "vitest";
import { resolveCrowdMetrics, resolveScenePolicy } from "../../src/render/responsiveScene";

describe("resolveScenePolicy", () => {
  it("classifies 1280x832 as desktop with full scale", () => {
    expect(resolveScenePolicy(1280, 832)).toEqual({
      crowdScale: 1,
      targetCrowdCount: 18,
      controlVariant: "desktop",
    });
  });

  it("classifies 1440x900 as desktop with full scale", () => {
    expect(resolveScenePolicy(1440, 900)).toEqual({
      crowdScale: 1,
      targetCrowdCount: 18,
      controlVariant: "desktop",
    });
  });

  it("classifies 390x844 (iPhone 12 portrait) as portrait-sheet with reduced scale", () => {
    expect(resolveScenePolicy(390, 844)).toEqual({
      crowdScale: 0.72,
      targetCrowdCount: 15,
      controlVariant: "portrait-sheet",
    });
  });

  it("classifies 844x390 (landscape phone tray) as landscape-tray with tighter scale", () => {
    expect(resolveScenePolicy(844, 390)).toEqual({
      crowdScale: 0.68,
      targetCrowdCount: 12,
      controlVariant: "landscape-tray",
    });
  });

  it("classifies 1024x768 (tablet landscape) as tablet", () => {
    expect(resolveScenePolicy(1024, 768)).toEqual({
      crowdScale: 0.9,
      targetCrowdCount: 16,
      controlVariant: "tablet",
    });
  });

  it("classifies 768x1024 (tablet portrait) as tablet with portrait-leaning scale", () => {
    expect(resolveScenePolicy(768, 1024)).toEqual({
      crowdScale: 0.82,
      targetCrowdCount: 16,
      controlVariant: "tablet",
    });
  });

  it("is pure: no DOM/window access and no mutation across calls", () => {
    const a = resolveScenePolicy(1280, 832);
    const b = resolveScenePolicy(1280, 832);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe("resolveCrowdMetrics", () => {
  it("returns baseSizePx and a radius of baseSizePx/2 when scenePolicy is full-scale desktop", () => {
    const policy = resolveScenePolicy(1280, 832);
    expect(resolveCrowdMetrics(56, policy)).toEqual({
      visualSizePx: 56,
      collisionRadiusPx: 28,
    });
  });

  it("scales visual size and collision radius by crowdScale for portrait-sheet", () => {
    const policy = resolveScenePolicy(390, 844);
    expect(resolveCrowdMetrics(56, policy).visualSizePx).toBeCloseTo(56 * 0.72, 5);
    expect(resolveCrowdMetrics(56, policy).collisionRadiusPx).toBeCloseTo(56 * 0.72 * 0.5, 5);
  });

  it("scales visual size and collision radius by crowdScale for landscape-tray", () => {
    const policy = resolveScenePolicy(844, 390);
    expect(resolveCrowdMetrics(80, policy).visualSizePx).toBeCloseTo(80 * 0.68, 5);
    expect(resolveCrowdMetrics(80, policy).collisionRadiusPx).toBeCloseTo(80 * 0.68 * 0.5, 5);
  });

  it("keeps the canonical baseSizePx untouched and does not mutate the scenePolicy", () => {
    const policy = resolveScenePolicy(1024, 768);
    const snapshot = { ...policy };
    const m = resolveCrowdMetrics(64, policy);
    expect(m.visualSizePx).toBeCloseTo(64 * 0.9, 5);
    expect(policy).toEqual(snapshot);
  });
});
