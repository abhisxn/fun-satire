import { describe, expect, it } from "vitest";
import { integrate, steerToward } from "../../src/physics/Integrator";

describe("physics/Integrator (T8)", () => {
  it("step integrates a stationary body falling under acceleration", () => {
    const r = integrate({
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      acc: { x: 0, y: 9.8 },
      dtSeconds: 0.05,
      maxSpeed: 100,
    });
    expect(r.vel.y).toBeCloseTo(0.49, 5);
    expect(r.pos.y).toBeCloseTo(0.0245, 5);
  });

  it("clamps velocity to maxSpeed", () => {
    const r = integrate({
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      acc: { x: 0, y: 1e9 },
      dtSeconds: 1,
      maxSpeed: 50,
    });
    const m = Math.sqrt(r.vel.x * r.vel.x + r.vel.y * r.vel.y);
    expect(m).toBeLessThanOrEqual(50 + 1e-9);
  });

  it("clamps absurd dt to 0.1s so a tab-blur spike doesn't tunnel a body off-canvas", () => {
    const r = integrate({
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      acc: { x: 1000, y: 0 },
      dtSeconds: 50,
      maxSpeed: 200,
    });
    expect(r.vel.x).toBe(100);
    expect(r.pos.x).toBe(110);
  });

  it("clamps negative or NaN dt to 0", () => {
    const a = integrate({
      pos: { x: 0, y: 0 },
      vel: { x: 1, y: 0 },
      acc: { x: 0, y: 0 },
      dtSeconds: -1,
    });
    expect(a.pos.x).toBe(0);
    const b = integrate({
      pos: { x: 0, y: 0 },
      vel: { x: 1, y: 0 },
      acc: { x: 0, y: 0 },
      dtSeconds: Number.NaN,
    });
    expect(b.pos.x).toBe(0);
  });

  it("keeps NaN out of the public API even when the input is finite", () => {
    for (let i = 0; i < 32; i++) {
      const r = integrate({
        pos: { x: i * 3, y: (i * 5) % 200 },
        vel: { x: 7, y: -3 },
        acc: { x: -1.2, y: 0.4 },
        dtSeconds: 0.016,
      });
      expect(Number.isFinite(r.pos.x)).toBe(true);
      expect(Number.isFinite(r.pos.y)).toBe(true);
      expect(Number.isFinite(r.vel.x)).toBe(true);
      expect(Number.isFinite(r.vel.y)).toBe(true);
    }
  });

  it("steerToward returns a force vector toward the target", () => {
    const a = steerToward({
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      target: { x: 100, y: 0 },
      acceleration: 2,
      dtSeconds: 0.5,
    });
    expect(a.x).toBeGreaterThan(0);
    expect(a.y).toBeCloseTo(0, 5);
  });
});
