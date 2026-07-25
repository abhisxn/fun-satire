import { describe, expect, it } from "vitest";
import { computePupilOffset } from "../../src/render/pupilTrack";

describe("render/pupilTrack (T16)", () => {
  it("returns zero offset when the cursor is inactive", () => {
    const r = computePupilOffset({
      eyePos: { x: 100, y: 100 },
      cursor: { x: 200, y: 100, active: false },
      socketRx: 28,
      socketRy: 20,
    });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it("points in the cursor's direction with monotonic ease from previous offset", () => {
    const r = computePupilOffset({
      eyePos: { x: 100, y: 100 },
      cursor: { x: 200, y: 100, active: true },
      socketRx: 28,
      socketRy: 20,
    });
    expect(r.x).toBeGreaterThan(0);
    expect(r.y).toBeCloseTo(0, 5);
  });

  it("clamps inside the elliptical socket bounds for extreme cursor positions", () => {
    const samples = [
      { x: 10000, y: 100 },
      { x: -10000, y: 100 },
      { x: 100, y: 10000 },
      { x: 100, y: -10000 },
      { x: 10000, y: 10000 },
    ];
    for (const c of samples) {
      const r = computePupilOffset({
        eyePos: { x: 500, y: 500 },
        cursor: { x: c.x, y: c.y, active: true },
        socketRx: 28,
        socketRy: 20,
        easedPrev: { x: 0, y: 0 },
      });
      const unitX = r.x / 28;
      const unitY = r.y / 20;
      expect(unitX * unitX + unitY * unitY).toBeLessThanOrEqual(1.0001);
    }
  });

  it("eases toward the target across multiple calls (does not snap)", () => {
    const eye = { x: 0, y: 0 };
    const cursor = { x: 200, y: 0, active: true };
    let prev = { x: 0, y: 0 };
    const xs: number[] = [];
    for (let i = 0; i < 20; i++) {
      const r = computePupilOffset({
        eyePos: eye,
        cursor,
        socketRx: 28,
        socketRy: 20,
        easedPrev: prev,
      });
      xs.push(r.x);
      prev = { x: r.x, y: r.y };
    }
    expect(xs[0]).toBeLessThan(xs[10]);
    for (let i = 1; i < xs.length; i++) {
      expect(Math.abs(xs[i] - xs[i - 1])).toBeLessThan(Math.abs(xs[0] - xs[1]) + 0.01);
    }
  });

  it("returns zero when the cursor sits exactly on the eye", () => {
    const r = computePupilOffset({
      eyePos: { x: 100, y: 100 },
      cursor: { x: 100, y: 100, active: true },
      socketRx: 28,
      socketRy: 20,
    });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.magnitude).toBe(0);
  });

  it("no NaN with degenerate socket sizes", () => {
    const r = computePupilOffset({
      eyePos: { x: 100, y: 100 },
      cursor: { x: 200, y: 100, active: true },
      socketRx: 0,
      socketRy: 0,
    });
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.y)).toBe(true);
  });
});
