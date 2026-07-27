// tests/unit/drawGazeLines.test.ts
import { describe, expect, it } from "vitest";
import { computeGazeLines } from "../../src/render/drawers/drawGazeLines";

describe("render/drawers/drawGazeLines computeGazeLines (T31)", () => {
  const singleSubject = [{ id: 1, pos: { x: 0, y: 0 } }];

  it("returns no lines when there is no subject", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 0, y: 0 } }],
      subjects: [],
      lockedSubjectId: null,
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
      subjects: singleSubject,
      lockedSubjectId: null,
      assistRadiusPx: 100,
      chargeT: 0,
    });
    expect(lines.length).toBe(1);
    expect(lines[0].x1).toBe(10);
    expect(lines[0].x2).toBe(0);
  });

  it("increases opacity as chargeT increases, for the same geometry", () => {
    const base = { eyes: [{ id: 1, pos: { x: 10, y: 0 } }], subjects: singleSubject, lockedSubjectId: null, assistRadiusPx: 100 };
    const low = computeGazeLines({ ...base, chargeT: 0 })[0];
    const high = computeGazeLines({ ...base, chargeT: 1 })[0];
    expect(high.opacity).toBeGreaterThan(low.opacity);
  });

  it("clamps opacity to a maximum of 1", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 1, y: 0 } }],
      subjects: singleSubject,
      lockedSubjectId: null,
      assistRadiusPx: 100,
      chargeT: 1,
    });
    expect(lines[0].opacity).toBeLessThanOrEqual(1);
  });

  it("does not produce NaN opacity when assistRadiusPx is 0 and an eye is exactly at subjectPos", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 0, y: 0 } }],
      subjects: singleSubject,
      lockedSubjectId: null,
      assistRadiusPx: 0,
      chargeT: 0,
    });
    expect(lines.length).toBe(1);
    expect(Number.isFinite(lines[0].opacity)).toBe(true);
  });

  it("does not produce NaN opacity when an eye is exactly at subjectPos with a positive assistRadiusPx", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 0, y: 0 } }],
      subjects: singleSubject,
      lockedSubjectId: null,
      assistRadiusPx: 100,
      chargeT: 0,
    });
    expect(lines.length).toBe(1);
    expect(Number.isFinite(lines[0].opacity)).toBe(true);
  });

  it("returns an empty array when there are no eyes", () => {
    const lines = computeGazeLines({
      eyes: [],
      subjects: singleSubject,
      lockedSubjectId: null,
      assistRadiusPx: 100,
      chargeT: 0,
    });
    expect(lines).toEqual([]);
  });

  describe("multi-subject distribution (PR2 lane 2)", () => {
    const subjects = [
      { id: 10, pos: { x: 100, y: 0 }, sizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" }, scale: 1, locked: false },
      { id: 11, pos: { x: -200, y: 0 }, sizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" }, scale: 1, locked: false },
    ];

    it("assigns each eye to its nearest subject by default", () => {
      const lines = computeGazeLines({
        eyes: [
          { id: 1, pos: { x: 60, y: 0 } },
          { id: 2, pos: { x: -250, y: 0 } },
        ],
        subjects,
        lockedSubjectId: null,
        assistRadiusPx: 1000,
        chargeT: 0,
      });
      expect(lines).toHaveLength(2);
      const byEye = new Map(lines.map((l) => [l.x1, l]));
      expect(byEye.get(60)!.x2).toBe(100);
      expect(byEye.get(-250)!.x2).toBe(-200);
    });

    it("assigns all eyes to the locked subject when lockedSubjectId is set", () => {
      const lines = computeGazeLines({
        eyes: [
          { id: 1, pos: { x: 60, y: 0 } },
          { id: 2, pos: { x: -250, y: 0 } },
        ],
        subjects,
        lockedSubjectId: 11,
        assistRadiusPx: 1000,
        chargeT: 0,
      });
      expect(lines).toHaveLength(2);
      for (const l of lines) {
        expect(l.x2).toBe(-200);
      }
    });

    it("uses squared distance for nearest-subject selection (no sqrt needed)", () => {
      const lines = computeGazeLines({
        eyes: [{ id: 1, pos: { x: 0, y: 0 } }],
        subjects: [
          { id: 10, pos: { x: 10, y: 0 }, sizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" }, scale: 1, locked: false },
          { id: 11, pos: { x: 0, y: 5 }, sizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" }, scale: 1, locked: false },
        ],
        lockedSubjectId: null,
        assistRadiusPx: 1000,
        chargeT: 0,
      });
      expect(lines[0].x2).toBe(0);
      expect(lines[0].y2).toBe(5);
    });

    it("returns no lines when subjects array is empty", () => {
      const lines = computeGazeLines({
        eyes: [{ id: 1, pos: { x: 0, y: 0 } }],
        subjects: [],
        lockedSubjectId: null,
        assistRadiusPx: 100,
        chargeT: 0,
      });
      expect(lines).toEqual([]);
    });

    it("skips eyes outside assist radius", () => {
      const lines = computeGazeLines({
        eyes: [
          { id: 1, pos: { x: 60, y: 0 } },
          { id: 2, pos: { x: 10000, y: 0 } },
        ],
        subjects,
        lockedSubjectId: null,
        assistRadiusPx: 200,
        chargeT: 0,
      });
      expect(lines).toHaveLength(1);
    });
  });
});
