// tests/unit/paperCut.test.ts
import { describe, expect, it } from "vitest";
import { paperCutEdgePath, withPaperCutShadow } from "../../src/render/paperCut";

const makeCtx = () => {
  const calls: string[] = [];
  const ctx: Record<string, unknown> = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    closePath: () => calls.push("closePath"),
    fill: () => calls.push("fill"),
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: "",
  };
  ctx.calls = calls;
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
};

describe("render/paperCut (T29)", () => {
  it("paperCutEdgePath draws a closed polygon with beginPath/moveTo/lineTo/closePath", () => {
    const ctx = makeCtx();
    paperCutEdgePath(ctx, { cx: 50, cy: 50, rx: 40, ry: 30, seed: 3 });
    const c = (ctx as unknown as { calls: string[] }).calls;
    expect(c).toContain("beginPath");
    expect(c).toContain("moveTo");
    expect(c.filter((x) => x === "lineTo").length).toBeGreaterThan(4);
    expect(c).toContain("closePath");
  });

  it("paperCutEdgePath is deterministic for the same seed", () => {
    const points: Array<{ moveTo?: [number, number]; lineTo: Array<[number, number]> }> = [];
    for (let i = 0; i < 2; i++) {
      const lineTo: Array<[number, number]> = [];
      let moveTo: [number, number] | undefined;
      const ctx: Record<string, unknown> = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: (x: number, y: number) => (moveTo = [x, y]),
        lineTo: (x: number, y: number) => lineTo.push([x, y]),
        closePath: () => {},
        fill: () => {},
      };
      paperCutEdgePath(ctx as unknown as CanvasRenderingContext2D, { cx: 50, cy: 50, rx: 40, ry: 30, seed: 3 });
      points.push({ moveTo, lineTo });
    }
    expect(points[0]).toEqual(points[1]);
  });

  it("withPaperCutShadow sets shadow properties around the draw callback then restores", () => {
    const ctx = makeCtx();
    let sawShadow = false;
    withPaperCutShadow(ctx, () => {
      sawShadow = (ctx.shadowBlur as number) > 0;
    });
    expect(sawShadow).toBe(true);
    expect(ctx.shadowBlur).toBe(0);
  });
});
