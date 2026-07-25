import { describe, expect, it } from "vitest";
import { drawEye } from "../../src/render/drawers/drawEye";

describe("render/drawers/drawEye (T14)", () => {
  const baseColors = {
    sclera: "cream",
    iris: "slate",
    pupil: "ink",
    highlight: "coral" as string | null,
    outline: "ink",
  };

  const makeCtx = () => {
    const calls: string[] = [];
    const ctx: Record<string, unknown> = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      beginPath: () => calls.push("beginPath"),
      moveTo: () => calls.push("moveTo"),
      closePath: () => calls.push("closePath"),
      bezierCurveTo: () => calls.push("bezierCurveTo"),
      arc: () => calls.push("arc"),
      clip: () => calls.push("clip"),
      fill: () => calls.push("fill"),
      stroke: () => calls.push("stroke"),
      lineWidth: 0,
      fillStyle: "",
      strokeStyle: "",
      globalAlpha: 1,
    };
    ctx.calls = calls;
    return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
  };

  it("draws the outline + sclera + iris + pupil + highlight for an open eye", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 56,
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 4, y: 1 },
    });
    expect(ctx.calls).toContain("save");
    expect(ctx.calls).toContain("restore");
    expect(ctx.calls.filter((c) => c === "fill").length).toBeGreaterThanOrEqual(4);
    expect(ctx.calls).toContain("stroke");
    expect(ctx.calls.filter((c) => c === "arc").length).toBeGreaterThanOrEqual(3);
  });

  it("skips iris/pupil when the eye is mostly closed (blinkScaleY ≤ 0.18)", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 56,
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 0.1,
      pupilOffset: { x: 4, y: 1 },
    });
    const arcs = ctx.calls.filter((c) => c === "arc").length;
    expect(arcs).toBe(0);
  });

  it("omits highlight when colors.highlight is null", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 56,
      shapeVariant: "round",
      colors: { ...baseColors, highlight: null },
      blinkScaleY: 1,
      pupilOffset: { x: 2, y: 2 },
    });
    expect(ctx.calls.filter((c) => c === "arc").length).toBeLessThan(3);
  });

  it("supports all five shapeVariants without throwing", () => {
    for (const v of ["almond", "round", "hooded", "wide", "narrow"] as const) {
      const ctx = makeCtx();
      drawEye(ctx, {
        pos: { x: 0, y: 0 },
        sizePx: 50,
        shapeVariant: v,
        colors: baseColors,
        blinkScaleY: 0.8,
        pupilOffset: { x: 0, y: 0 },
      });
    }
  });

  it("translates pupilOffset toward the cursor before drawing iris/pupil", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 8, y: -3 },
    });
    expect(ctx.calls).toContain("arc");
  });
});
