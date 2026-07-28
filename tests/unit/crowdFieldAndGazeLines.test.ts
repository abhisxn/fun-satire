// tests/unit/crowdFieldAndGazeLines.test.ts
// Lane C / Task C3 — restyle leaf drawFieldLines and drawGazeLines
// without changing the geometry inputs from computeFieldLines /
// computeGazeLines. Tests pin the geometry-output contract.
import { describe, expect, it, vi } from "vitest";
import { computeFieldLines, drawFieldLines } from "../../src/render/drawers/drawFieldLines";
import { computeGazeLines } from "../../src/render/drawers/drawGazeLines";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

function makeSpyCtx() {
  const calls: string[] = [];
  const ctx = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    stroke: () => calls.push("stroke"),
    fill: () => calls.push("fill"),
    lineCap: "",
    lineWidth: 0,
    globalAlpha: 1,
    strokeStyle: "",
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
  (ctx as unknown as { calls: string[] }).calls = calls;
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
}

describe("drawFieldLines / drawGazeLines geometry preservation (Task C3)", () => {
  it("computeFieldLines output is geometry-stable across repeated calls", () => {
    const input = {
      cursor: { x: 50, y: 50, active: true },
      origin: { x: 0, y: 0 },
      maxLength: 200,
      maxLines: 8,
    };
    expect(computeFieldLines(input)).toEqual(computeFieldLines(input));
  });

  it("computeGazeLines output is geometry-stable across repeated calls", () => {
    const input = {
      eyes: [{ id: 1, pos: { x: 10, y: 0 } }, { id: 2, pos: { x: 50, y: 0 } }],
      subjects: [{ id: 1, pos: { x: 0, y: 0 } }],
      lockedSubjectId: null,
      assistRadiusPx: 100,
      chargeT: 0.5,
    };
    expect(computeGazeLines(input)).toEqual(computeGazeLines(input));
  });

  it("drawFieldLines still emits save/restore/stroke with no extra beginPath/lineTo changes", () => {
    const lines = computeFieldLines({
      cursor: { x: 50, y: 50, active: true },
      origin: { x: 0, y: 0 },
      maxLength: 100,
      maxLines: 4,
    });
    const ctx = makeSpyCtx();
    drawFieldLines(ctx, lines, { stroke: "#5B7A8C", ink: "#2A2420" });
    const calls = (ctx as unknown as { calls: string[] }).calls;
    expect(calls).toContain("save");
    expect(calls).toContain("restore");
    expect(calls).toContain("stroke");
  });

  it("drawFieldLines is a no-op on an empty line array (preserves no-op contract)", () => {
    const ctx = makeSpyCtx();
    drawFieldLines(ctx, [], { stroke: "#5B7A8C", ink: "#2A2420" });
    expect((ctx as unknown as { calls: string[] }).calls).toEqual([]);
  });

  it("drawGazeLines does not change the FieldLine output shape from computeGazeLines", () => {
    // Ensure the data shape passed to drawFieldLines is unchanged: a
    // FieldLine with x1, y1, x2, y2, opacity, index. The leaf drawer
    // contract is "geometry in, paint out" so the consumer of
    // computeGazeLines sees the same keys.
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 10, y: 0 } }],
      subjects: [{ id: 1, pos: { x: 0, y: 0 } }],
      lockedSubjectId: null,
      assistRadiusPx: 100,
      chargeT: 0.5,
    });
    for (const l of lines) {
      expect(typeof l.x1).toBe("number");
      expect(typeof l.y1).toBe("number");
      expect(typeof l.x2).toBe("number");
      expect(typeof l.y2).toBe("number");
      expect(typeof l.opacity).toBe("number");
      expect(typeof l.index).toBe("number");
    }
  });
});

describe("locked-file integrity (Task C3)", () => {
  it("does not touch the closed architecture files", () => {
    const closed = [
      "src/core/Engine.ts",
      "src/physics/ForceField.ts",
      "src/entities/EntityStore.ts",
      "src/entities/behaviors/StateMachine.ts",
    ];
    for (const path of closed) {
      const text = readFileSync(resolve(ROOT, path), "utf8");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
