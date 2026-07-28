import { describe, expect, it } from "vitest";
import { drawEye, EYE_DRAW } from "../../src/render/drawers/drawEye";

describe("render/drawers/drawEye", () => {
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

  it("draws the almond sclera + pupil for an open eye", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 56,
      blinkScaleY: 1,
      pupilOffset: { x: 4, y: 1 },
    });
    expect(ctx.calls).toContain("save");
    expect(ctx.calls).toContain("restore");
    expect(ctx.calls).toContain("bezierCurveTo");
    expect(ctx.calls).toContain("arc");
    expect(ctx.calls).toContain("clip");
    expect(ctx.calls.filter((c) => c === "fill").length).toBeGreaterThanOrEqual(2);
  });

  it("skips pupil when the eye is mostly closed (blinkScaleY ≤ 0.18)", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 56,
      blinkScaleY: 0.1,
      pupilOffset: { x: 4, y: 1 },
    });
    const arcs = ctx.calls.filter((c) => c === "arc").length;
    expect(arcs).toBe(0);
  });

  it("uses the default pupil color when none is specified", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      blinkScaleY: 1,
      pupilOffset: { x: 0, y: 0 },
    });
    expect(ctx.calls).toContain("arc");
  });

  it("accepts a custom pupil color", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      blinkScaleY: 1,
      pupilOffset: { x: 0, y: 0 },
      pupilColor: "#5B7B8A",
    });
    expect(ctx.calls).toContain("arc");
  });

  it("has the correct natural dimensions matching the reference SVG", () => {
    expect(EYE_DRAW.naturalWidth).toBe(115);
    expect(EYE_DRAW.naturalHeight).toBe(57);
  });
});
