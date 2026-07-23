import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeFieldLines, drawFieldLines } from "../../src/render/drawers/drawFieldLines";

const ROOT = resolve(__dirname, "..", "..");

describe("render/drawers/drawFieldLines (T9)", () => {
  it("drawFieldLines imports ForceField (single source of truth)", () => {
    const src = readFileSync(
      resolve(ROOT, "src/render/drawers/drawFieldLines.ts"),
      "utf8",
    );
    expect(src).toMatch(/from\s+["']\.\.\/\.\.\/physics\/ForceField["']/);
  });

  it("returns zero lines when the cursor is inactive", () => {
    const lines = computeFieldLines({
      cursor: { x: 0, y: 0, active: false },
      origin: { x: 100, y: 100 },
      maxLength: 200,
    });
    expect(lines).toEqual([]);
  });

  it("returns at most maxLines lines and never zero-length when active", () => {
    const lines = computeFieldLines({
      cursor: { x: 50, y: 50, active: true },
      origin: { x: 200, y: 200 },
      maxLength: 100,
      maxLines: 8,
    });
    expect(lines.length).toBeLessThanOrEqual(8);
    for (const l of lines) {
      const dx = l.x2 - l.x1;
      const dy = l.y2 - l.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      expect(len).toBeGreaterThan(0);
      expect(l.opacity).toBeGreaterThan(0);
      expect(l.opacity).toBeLessThanOrEqual(1);
    }
  });

  it("increases visible-line count when the cursor is closer (more reach)", () => {
    const close = computeFieldLines({
      cursor: { x: 100, y: 100, active: true },
      origin: { x: 0, y: 0 },
      maxLength: 100,
      maxLines: 16,
    });
    const far = computeFieldLines({
      cursor: { x: 400, y: 400, active: true },
      origin: { x: 0, y: 0 },
      maxLength: 100,
      maxLines: 16,
    });
    expect(close.length).toBeGreaterThanOrEqual(far.length);
  });

  it("drawFieldLines calls save/restore/beginPath/stroke on the canvas context", () => {
    const lines = computeFieldLines({
      cursor: { x: 50, y: 50, active: true },
      origin: { x: 0, y: 0 },
      maxLength: 100,
    });
    const calls: string[] = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      beginPath: () => calls.push("beginPath"),
      moveTo: () => calls.push("moveTo"),
      lineTo: () => calls.push("lineTo"),
      stroke: () => calls.push("stroke"),
      lineCap: "",
      lineWidth: 0,
      globalAlpha: 1,
      strokeStyle: "",
    } as unknown as CanvasRenderingContext2D;
    drawFieldLines(ctx, lines, { stroke: "#5B7A8C", ink: "#2A2420" });
    expect(calls).toContain("save");
    expect(calls).toContain("restore");
    expect(calls.length).toBeGreaterThan(3);
  });

  it("drawFieldLines is a no-op on an empty line array", () => {
    const calls: string[] = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
    } as unknown as CanvasRenderingContext2D;
    drawFieldLines(ctx, [], { stroke: "#5B7A8C", ink: "#2A2420" });
    expect(calls).toEqual([]);
  });
});
