// tests/unit/drawSubject.test.ts
import { describe, expect, it } from "vitest";
import { drawSubject } from "../../src/render/drawers/drawSubject";

const baseColors = { suit: "slate" as const, shirt: "cream" as const, outline: "ink" as const };

const makeCtx = () => {
  const calls: string[] = [];
  const ctx: Record<string, unknown> = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    closePath: () => calls.push("closePath"),
    arc: () => calls.push("arc"),
    fill: () => calls.push("fill"),
    translate: () => calls.push("translate"),
    rotate: () => calls.push("rotate"),
    quadraticCurveTo: () => calls.push("quadraticCurveTo"),
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: "",
    fillStyle: "",
  };
  ctx.calls = calls;
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
};

describe("render/drawers/drawSubject (T30)", () => {
  it("draws head + shoulders using only fill/arc/paperCut-path calls at scale 1", () => {
    const ctx = makeCtx();
    drawSubject(ctx, { pos: { x: 100, y: 200 }, sizePx: 96, colors: baseColors, scale: 1 });
    expect(ctx.calls).toContain("save");
    expect(ctx.calls).toContain("restore");
    expect(ctx.calls.filter((c) => c === "fill").length).toBeGreaterThanOrEqual(4);
    expect(ctx.calls.filter((c) => c === "arc").length).toBeGreaterThanOrEqual(2);
  });

  it("draws nothing when scale is effectively zero", () => {
    const ctx = makeCtx();
    drawSubject(ctx, { pos: { x: 100, y: 200 }, sizePx: 96, colors: baseColors, scale: 0.01 });
    expect(ctx.calls.filter((c) => c === "fill").length).toBe(0);
  });

  it("throws when given a color name outside the locked palette", () => {
    const ctx = makeCtx();
    expect(() =>
      drawSubject(ctx, {
        pos: { x: 0, y: 0 },
        sizePx: 96,
        colors: { suit: "neon" as never, shirt: "cream", outline: "ink" },
        scale: 1,
      }),
    ).toThrow();
  });
});
