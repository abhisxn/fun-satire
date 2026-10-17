import { describe, it, expect } from "vitest";
import {
  computeUnity,
  forceFactor,
  isForceBroken,
  smoothUnity,
  FORCE_BREAK_UNITY,
  FORCE_BREAK_HYSTERESIS,
  CLUSTER_TIGHT_PX,
  CLUSTER_LOOSE_PX,
} from "../../src/creatures/unity";

function ring(n: number, radius: number, cx = 700, cy = 400) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
  });
}

const base = { maxCount: 100, kindCount: 1, kindTotal: 1 };

describe("computeUnity", () => {
  it("is zero with no creatures", () => {
    const r = computeUnity({ ...base, points: [] });
    expect(r.unity).toBe(0);
    expect(r.centroid).toBeNull();
    expect(r.spread).toBe(0);
  });

  it("scores a tight crowd higher than a scattered crowd of the same size", () => {
    const tight = computeUnity({ ...base, points: ring(100, 60) });
    const scattered = computeUnity({ ...base, points: ring(100, 600) });
    expect(tight.cluster).toBe(1);
    expect(scattered.cluster).toBe(0);
    expect(tight.unity).toBeGreaterThan(scattered.unity);
  });

  it("scores a bigger crowd higher at the same tightness", () => {
    const small = computeUnity({ ...base, points: ring(10, 60) });
    const big = computeUnity({ ...base, points: ring(100, 60) });
    expect(big.size).toBe(1);
    expect(small.size).toBeCloseTo(0.1);
    expect(big.unity).toBeGreaterThan(small.unity);
  });

  it("interpolates cluster linearly between the tight and loose spreads", () => {
    const mid = (CLUSTER_TIGHT_PX + CLUSTER_LOOSE_PX) / 2;
    const r = computeUnity({ ...base, points: ring(50, mid) });
    expect(r.spread).toBeCloseTo(mid, 3);
    expect(r.cluster).toBeCloseTo(0.5, 3);
  });

  it("reports the centroid", () => {
    const r = computeUnity({ ...base, points: ring(40, 100, 300, 200) });
    expect(r.centroid!.x).toBeCloseTo(300, 3);
    expect(r.centroid!.y).toBeCloseTo(200, 3);
  });

  it("clamps size when the crowd exceeds maxCount", () => {
    const r = computeUnity({ ...base, maxCount: 10, points: ring(50, 60) });
    expect(r.size).toBe(1);
  });

  it("with one possible kind, a full tight crowd reaches unity 1 (variety weight renormalised away)", () => {
    const r = computeUnity({ ...base, points: ring(100, 60) });
    expect(r.variety).toBe(0);
    expect(r.unity).toBeCloseTo(1, 5);
  });

  it("with several kinds, more variety raises unity", () => {
    const pts = ring(100, 60);
    const one = computeUnity({ points: pts, maxCount: 100, kindCount: 1, kindTotal: 4 });
    const all = computeUnity({ points: pts, maxCount: 100, kindCount: 4, kindTotal: 4 });
    expect(all.variety).toBe(1);
    expect(all.unity).toBeGreaterThan(one.unity);
    expect(all.unity).toBeCloseTo(1, 5);
  });
});

describe("forceFactor", () => {
  it("is 1 at zero unity and 0 at the break point and above", () => {
    expect(forceFactor(0)).toBe(1);
    expect(forceFactor(FORCE_BREAK_UNITY)).toBeCloseTo(0, 5);
    expect(forceFactor(1)).toBeCloseTo(0, 5);
  });

  it("never rises as unity rises", () => {
    let prev = forceFactor(0);
    for (let u = 0.05; u <= 1; u += 0.05) {
      const f = forceFactor(u);
      expect(f).toBeLessThanOrEqual(prev + 1e-12);
      prev = f;
    }
  });

  it("is halfway at half the break point", () => {
    expect(forceFactor(FORCE_BREAK_UNITY / 2)).toBeCloseTo(0.5, 5);
  });
});

describe("isForceBroken", () => {
  it("breaks at the threshold and holds until unity drops below the hysteresis band", () => {
    expect(isForceBroken(FORCE_BREAK_UNITY - 0.01, false)).toBe(false);
    expect(isForceBroken(FORCE_BREAK_UNITY, false)).toBe(true);
    expect(isForceBroken(FORCE_BREAK_UNITY - FORCE_BREAK_HYSTERESIS + 0.01, true)).toBe(true);
    expect(isForceBroken(FORCE_BREAK_UNITY - FORCE_BREAK_HYSTERESIS - 0.01, true)).toBe(false);
  });
});

describe("smoothUnity", () => {
  it("moves toward the target, never past it", () => {
    const a = smoothUnity(0, 1, 100);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
    expect(smoothUnity(a, 1, 100)).toBeGreaterThan(a);
    expect(smoothUnity(0, 1, 100000)).toBeCloseTo(1, 5);
  });

  it("is unchanged for a non-positive time step and falls as well as rises", () => {
    expect(smoothUnity(0.5, 1, 0)).toBe(0.5);
    expect(smoothUnity(0.5, 1, -5)).toBe(0.5);
    expect(smoothUnity(0.8, 0, 200)).toBeLessThan(0.8);
  });
});
