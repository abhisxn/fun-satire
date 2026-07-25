// tests/unit/drawGazeLines.test.ts
import { describe, expect, it } from "vitest";
import { computeGazeLines } from "../../src/render/drawers/drawGazeLines";

describe("render/drawers/drawGazeLines computeGazeLines (T31)", () => {
  it("returns no lines when there is no subject", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 0, y: 0 } }],
      subjectPos: null,
      assistRadiusPx: 100,
      chargeT: 0,
    });
    expect(lines).toEqual([]);
  });

  it("includes only eyes within assistRadiusPx of the subject", () => {
    const lines = computeGazeLines({
      eyes: [
        { id: 1, pos: { x: 10, y: 0 } },
        { id: 2, pos: { x: 500, y: 500 } },
      ],
      subjectPos: { x: 0, y: 0 },
      assistRadiusPx: 100,
      chargeT: 0,
    });
    expect(lines.length).toBe(1);
    expect(lines[0].x1).toBe(10);
    expect(lines[0].x2).toBe(0);
  });

  it("increases opacity as chargeT increases, for the same geometry", () => {
    const base = { eyes: [{ id: 1, pos: { x: 10, y: 0 } }], subjectPos: { x: 0, y: 0 }, assistRadiusPx: 100 };
    const low = computeGazeLines({ ...base, chargeT: 0 })[0];
    const high = computeGazeLines({ ...base, chargeT: 1 })[0];
    expect(high.opacity).toBeGreaterThan(low.opacity);
  });

  it("clamps opacity to a maximum of 1", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 1, y: 0 } }],
      subjectPos: { x: 0, y: 0 },
      assistRadiusPx: 100,
      chargeT: 1,
    });
    expect(lines[0].opacity).toBeLessThanOrEqual(1);
  });

  it("does not produce NaN opacity when assistRadiusPx is 0 and an eye is exactly at subjectPos", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 0, y: 0 } }],
      subjectPos: { x: 0, y: 0 },
      assistRadiusPx: 0,
      chargeT: 0,
    });
    expect(lines.length).toBe(1);
    expect(Number.isFinite(lines[0].opacity)).toBe(true);
  });

  it("does not produce NaN opacity when an eye is exactly at subjectPos with a positive assistRadiusPx", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 0, y: 0 } }],
      subjectPos: { x: 0, y: 0 },
      assistRadiusPx: 100,
      chargeT: 0,
    });
    expect(lines.length).toBe(1);
    expect(Number.isFinite(lines[0].opacity)).toBe(true);
  });

  it("returns an empty array when there are no eyes", () => {
    const lines = computeGazeLines({
      eyes: [],
      subjectPos: { x: 0, y: 0 },
      assistRadiusPx: 100,
      chargeT: 0,
    });
    expect(lines).toEqual([]);
  });
});
