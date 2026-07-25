// tests/unit/forceFieldSeparation.test.ts
import { describe, it, expect } from "vitest";
import { compute, computeSeparation, accumulateSeparation } from "../../src/physics/ForceField";

describe("ForceField repelMultiplier", () => {
  it("defaults to a multiplier of 1 when omitted", () => {
    const withDefault = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 } });
    const withOne = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 }, repelMultiplier: 1 });
    expect(withDefault.magnitude).toBeCloseTo(withOne.magnitude, 6);
  });

  it("scales magnitude linearly with repelMultiplier", () => {
    const base = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 }, repelMultiplier: 1 });
    const doubled = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 }, repelMultiplier: 2 });
    expect(doubled.magnitude).toBeCloseTo(base.magnitude * 2, 6);
  });

  it("clamps a negative repelMultiplier to zero force", () => {
    const result = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 }, repelMultiplier: -3 });
    expect(result.magnitude).toBe(0);
  });
});

describe("computeSeparation", () => {
  it("returns zero force for two members far enough apart", () => {
    const a = { pos: { x: 0, y: 0 }, radiusPx: 10 };
    const b = { pos: { x: 100, y: 0 }, radiusPx: 10 };
    const f = computeSeparation(a, b);
    expect(f.fx).toBe(0);
    expect(f.fy).toBe(0);
  });

  it("pushes apart along the connecting axis when overlapping", () => {
    const a = { pos: { x: 0, y: 0 }, radiusPx: 20 };
    const b = { pos: { x: 10, y: 0 }, radiusPx: 20 };
    const f = computeSeparation(a, b);
    expect(f.fx).toBeLessThan(0);
    expect(f.fy).toBeCloseTo(0, 6);
  });

  it("scales push magnitude with overlap depth", () => {
    const a = { pos: { x: 0, y: 0 }, radiusPx: 20 };
    const shallow = computeSeparation(a, { pos: { x: 38, y: 0 }, radiusPx: 20 });
    const deep = computeSeparation(a, { pos: { x: 10, y: 0 }, radiusPx: 20 });
    expect(Math.abs(deep.fx)).toBeGreaterThan(Math.abs(shallow.fx));
  });

  it("falls back to a stable push direction when members are exactly coincident", () => {
    const a = { pos: { x: 5, y: 5 }, radiusPx: 20 };
    const b = { pos: { x: 5, y: 5 }, radiusPx: 20 };
    const f = computeSeparation(a, b);
    expect(Number.isFinite(f.fx)).toBe(true);
    expect(Number.isFinite(f.fy)).toBe(true);
    expect(f.fx !== 0 || f.fy !== 0).toBe(true);
  });
});

describe("accumulateSeparation", () => {
  it("returns a zero force for a single isolated member", () => {
    const forces = accumulateSeparation([{ id: 1, pos: { x: 0, y: 0 }, radiusPx: 10 }]);
    expect(forces.get(1)).toEqual({ fx: 0, fy: 0 });
  });

  it("applies equal-and-opposite pushes to a close pair", () => {
    const forces = accumulateSeparation([
      { id: 1, pos: { x: 0, y: 0 }, radiusPx: 20 },
      { id: 2, pos: { x: 10, y: 0 }, radiusPx: 20 },
    ]);
    const f1 = forces.get(1)!;
    const f2 = forces.get(2)!;
    expect(f1.fx).toBeCloseTo(-f2.fx, 6);
    expect(f1.fy).toBeCloseTo(-f2.fy, 6);
  });

  it("resolves a dense 30-member cluster without leaving any member unresolved", () => {
    const members = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      pos: { x: (i % 6) * 8, y: Math.floor(i / 6) * 8 },
      radiusPx: 18,
    }));
    const forces = accumulateSeparation(members);
    expect(forces.size).toBe(30);
    let anyNonZero = false;
    for (const f of forces.values()) {
      expect(Number.isFinite(f.fx)).toBe(true);
      expect(Number.isFinite(f.fy)).toBe(true);
      if (f.fx !== 0 || f.fy !== 0) anyNonZero = true;
    }
    expect(anyNonZero).toBe(true);
  });

  it("scales all pushes by strengthMultiplier", () => {
    const members = [
      { id: 1, pos: { x: 0, y: 0 }, radiusPx: 20 },
      { id: 2, pos: { x: 10, y: 0 }, radiusPx: 20 },
    ];
    const base = accumulateSeparation(members).get(1)!;
    const doubled = accumulateSeparation(members, { strengthMultiplier: 2 }).get(1)!;
    expect(doubled.fx).toBeCloseTo(base.fx * 2, 6);
  });
});
