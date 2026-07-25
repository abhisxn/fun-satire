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
});
