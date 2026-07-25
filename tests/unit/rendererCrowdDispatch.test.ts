import { describe, it, expect } from "vitest";
import { drawBug, drawPointedFinger, drawSubject, drawSubjectFigure, drawSubjectLotus } from "../../src/render/drawers";

describe("render/drawers barrel", () => {
  it("re-exports the new crowd and Subject-skin drawers", () => {
    expect(typeof drawBug).toBe("function");
    expect(typeof drawPointedFinger).toBe("function");
    expect(typeof drawSubject).toBe("function");
    expect(typeof drawSubjectFigure).toBe("function");
    expect(typeof drawSubjectLotus).toBe("function");
  });
});

import { computeCrowdDrawOrder, computeShadowIntensity } from "../../src/render/Renderer";

describe("computeCrowdDrawOrder", () => {
  it("sorts crowd members by ascending y so members lower on screen draw last (on top)", () => {
    const members = [
      { id: 1, pos: { x: 0, y: 300 } },
      { id: 2, pos: { x: 0, y: 50 } },
      { id: 3, pos: { x: 0, y: 150 } },
    ];
    expect(computeCrowdDrawOrder(members).map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it("is stable for members that share the same y", () => {
    const members = [
      { id: 1, pos: { x: 0, y: 100 } },
      { id: 2, pos: { x: 10, y: 100 } },
    ];
    expect(computeCrowdDrawOrder(members).map((m) => m.id)).toEqual([1, 2]);
  });
});

describe("computeShadowIntensity", () => {
  it("returns the baseline 1.0 at the default quantity/repel (20, 1)", () => {
    expect(computeShadowIntensity({ quantity: 20, repelMultiplier: 1 })).toBeCloseTo(1, 5);
  });

  it("increases as quantity rises above the baseline", () => {
    const low = computeShadowIntensity({ quantity: 20, repelMultiplier: 1 });
    const high = computeShadowIntensity({ quantity: 60, repelMultiplier: 1 });
    expect(high).toBeGreaterThan(low);
  });

  it("decreases as repelMultiplier rises above the baseline", () => {
    const low = computeShadowIntensity({ quantity: 20, repelMultiplier: 1 });
    const high = computeShadowIntensity({ quantity: 20, repelMultiplier: 2 });
    expect(high).toBeLessThan(low);
  });

  it("stays clamped to [0.4, 1.8] across the full quantity/repel range", () => {
    for (const quantity of [1, 20, 60]) {
      for (const repelMultiplier of [0, 1, 2]) {
        const v = computeShadowIntensity({ quantity, repelMultiplier });
        expect(v).toBeGreaterThanOrEqual(0.4);
        expect(v).toBeLessThanOrEqual(1.8);
      }
    }
  });
});
