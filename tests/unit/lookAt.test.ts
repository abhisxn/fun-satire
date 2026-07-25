import { describe, it, expect } from "vitest";
import { computeLookAtAngle, computeLookAtRotation, LOOKAT_GAIN } from "../../src/physics/LookAt";

describe("computeLookAtAngle", () => {
  it("returns 0 when the target is directly to the east", () => {
    expect(computeLookAtAngle({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0, 6);
  });

  it("returns PI/2 when the target is directly south (canvas +y is down)", () => {
    expect(computeLookAtAngle({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2, 6);
  });

  it("returns -PI/2 when the target is directly north", () => {
    expect(computeLookAtAngle({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(-Math.PI / 2, 6);
  });
});

describe("LOOKAT_GAIN", () => {
  it("keeps eyes in the subtle 0.15-0.25 range", () => {
    expect(LOOKAT_GAIN.eyes).toBeGreaterThanOrEqual(0.15);
    expect(LOOKAT_GAIN.eyes).toBeLessThanOrEqual(0.25);
  });

  it("keeps bugs and pointedFinger in the fuller 0.7-1.0 range", () => {
    for (const gain of [LOOKAT_GAIN.bugs, LOOKAT_GAIN.pointedFinger]) {
      expect(gain).toBeGreaterThanOrEqual(0.7);
      expect(gain).toBeLessThanOrEqual(1.0);
    }
  });
});

describe("computeLookAtRotation", () => {
  it("scales the full angle by the mode's gain", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 10 };
    const fullAngle = computeLookAtAngle(from, to);
    expect(computeLookAtRotation(from, to, "eyes")).toBeCloseTo(fullAngle * LOOKAT_GAIN.eyes, 6);
    expect(computeLookAtRotation(from, to, "bugs")).toBeCloseTo(fullAngle * LOOKAT_GAIN.bugs, 6);
    expect(computeLookAtRotation(from, to, "pointedFinger")).toBeCloseTo(fullAngle * LOOKAT_GAIN.pointedFinger, 6);
  });

  it("produces a larger-magnitude rotation for bugs/pointedFinger than for eyes given the same geometry", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 5, y: 30 };
    const eyes = Math.abs(computeLookAtRotation(from, to, "eyes"));
    const bugs = Math.abs(computeLookAtRotation(from, to, "bugs"));
    expect(bugs).toBeGreaterThan(eyes);
  });
});
