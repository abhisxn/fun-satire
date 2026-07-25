import { describe, expect, it } from "vitest";
import {
  FORCEFIELD,
  compute as computeField,
  falloff,
  sampleAlongRay,
} from "../../src/physics/ForceField";

describe("physics/ForceField (T7)", () => {
  it("returns zero force when the cursor is inactive", () => {
    const r = computeField({
      cursor: { x: 0, y: 0, active: false },
      entityPos: { x: 100, y: 100 },
    });
    expect(r.fx).toBe(0);
    expect(r.fy).toBe(0);
    expect(r.magnitude).toBe(0);
  });

  it("returns zero force when the entity sits exactly on the cursor", () => {
    const r = computeField({
      cursor: { x: 50, y: 50, active: true },
      entityPos: { x: 50, y: 50 },
    });
    expect(r.fx).toBe(0);
    expect(r.fy).toBe(0);
  });

  it("returns a unit-length direction pointing away from the cursor", () => {
    const r = computeField({
      cursor: { x: 100, y: 100, active: true },
      entityPos: { x: 200, y: 100 },
    });
    const len = Math.sqrt(r.dirX * r.dirX + r.dirY * r.dirY);
    expect(len).toBeCloseTo(1, 5);
    expect(r.dirX).toBeGreaterThan(0);
    expect(r.dirY).toBeCloseTo(0, 5);
  });

  it("falloff is monotonic decreasing on raw distance and zero at maxR", () => {
    expect(falloff(FORCEFIELD.repulsionMinR + 1)).toBeGreaterThanOrEqual(falloff(FORCEFIELD.repulsionMinR + 30));
    expect(falloff(FORCEFIELD.repulsionMaxR)).toBe(0);
    expect(falloff(FORCEFIELD.repulsionMaxR + 1000)).toBe(0);
  });

  it("force vector is continuous and never NaN across a sample grid", () => {
    for (let i = 0; i < 64; i++) {
      const r = computeField({
        cursor: { x: 0, y: 0, active: true },
        entityPos: { x: i * 5, y: (i * 7) % 200 },
      });
      expect(Number.isFinite(r.fx)).toBe(true);
      expect(Number.isFinite(r.fy)).toBe(true);
      expect(Number.isFinite(r.magnitude)).toBe(true);
    }
  });

  it("sampleAlongRay returns the same number of samples requested and stays in [0, 1] strength", () => {
    const s = sampleAlongRay(
      { x: 0, y: 0 },
      { x: 50, y: 50, active: true },
      { origin: { x: 0, y: 0 }, dir: { x: 1, y: 0 }, maxDist: 100, samples: 8 },
    );
    expect(s).toHaveLength(8);
    for (const sample of s) {
      expect(sample.t).toBeGreaterThanOrEqual(0);
      expect(sample.t).toBeLessThanOrEqual(1);
      expect(sample.strength).toBeGreaterThanOrEqual(0);
      expect(sample.strength).toBeLessThanOrEqual(1);
    }
  });

  it("sampleAlongRay returns zeros when the cursor is inactive", () => {
    const s = sampleAlongRay(
      { x: 0, y: 0 },
      { x: 0, y: 0, active: false },
      { origin: { x: 0, y: 0 }, dir: { x: 1, y: 0 }, maxDist: 100, samples: 4 },
    );
    expect(s.every((v) => v.strength === 0)).toBe(true);
  });
});

import {
  SPRINGHOME,
  compute as computeSpring,
} from "../../src/physics/SpringHome";

describe("physics/SpringHome (T7)", () => {
  it("produces acceleration toward home with damping", () => {
    const r = computeSpring({
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      home: { x: 0, y: 0 },
      dtSeconds: 0.016,
    });
    expect(r.ax).toBeLessThan(0);
    expect(r.ay).toBeLessThan(0);
  });

  it("damps velocity against motion (no oscillation growth over 1000 steps)", () => {
    const pos = { x: 50, y: 50 };
    const vel = { x: 10, y: -10 };
    const home = { x: 0, y: 0 };
    let maxR2 = 0;
    let lastR2 = 50 * 50 + 10 * 10 + 10 * 10;
    for (let i = 0; i < 1000; i++) {
      const a = computeSpring({
        pos,
        vel,
        home,
        dtSeconds: 0.016,
      });
      vel.x += a.ax * 0.016;
      vel.y += a.ay * 0.016;
      pos.x += vel.x * 0.016;
      pos.y += vel.y * 0.016;
      const r2 = pos.x * pos.x + pos.y * pos.y;
      if (r2 > maxR2) maxR2 = r2;
      if (i === 999) {
        expect(r2).toBeLessThan(lastR2);
      }
    }
    expect(maxR2).toBeLessThan(100 * 100);
  });

  it("clamps huge accelerations to SPRINGHOME.maxAccel", () => {
    const r = computeSpring({
      pos: { x: -1e6, y: -1e6 },
      vel: { x: 0, y: 0 },
      home: { x: 0, y: 0 },
      dtSeconds: 0.016,
    });
    const m = Math.sqrt(r.ax * r.ax + r.ay * r.ay);
    expect(m).toBeLessThanOrEqual(SPRINGHOME.maxAccel + 1e-6);
  });

  it("never returns NaN", () => {
    const r = computeSpring({
      pos: { x: Number.NaN, y: 0 },
      vel: { x: 0, y: 0 },
      home: { x: 0, y: 0 },
      dtSeconds: 0.016,
    });
    expect(Number.isFinite(r.ax)).toBe(false);
  });
});
