import { describe, it, expect, vi } from "vitest";
import { drawPointedFinger, computePointShake, FINGER_DRAW } from "../../src/render/drawers/drawPointedFinger";

const fakeCtx = () =>
  new Proxy(
    {},
    { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
  ) as unknown as CanvasRenderingContext2D;

const colors = { suit: "slate", shirt: "cream", outline: "ink" } as const;

describe("computePointShake", () => {
  it("is a pure, deterministic function of (id, timeMs)", () => {
    expect(computePointShake(4, 2000)).toBe(computePointShake(4, 2000));
  });

  it("stays within the configured shake amplitude", () => {
    for (let t = 0; t < 5000; t += 200) {
      const s = computePointShake(2, t);
      expect(Math.abs(s)).toBeLessThanOrEqual(FINGER_DRAW.shakeAmpRad + 1e-6);
    }
  });
});

describe("drawPointedFinger", () => {
  it("does not throw with a rotation applied", () => {
    expect(() =>
      drawPointedFinger(fakeCtx(), { pos: { x: 5, y: 5 }, sizePx: 44, colors, timeMs: 300, id: 9, rotation: -0.5 }),
    ).not.toThrow();
  });

  it("defaults rotation to 0 when omitted", () => {
    expect(() => drawPointedFinger(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 44, colors, timeMs: 0, id: 1 })).not.toThrow();
  });
});

// Design-system requirement: drawPointedFinger's fist silhouette must use the
// shared paperCut.ts utility (paperCutEdgePath + withPaperCutShadow), the
// same treatment drawEye.ts/drawSubject*.ts/drawBug.ts use — not a bespoke
// ctx.ellipse fill. withPaperCutShadow sets a fixed shadowColor
// ("rgba(42, 36, 32, 0.22)") while active, so its presence during the draw
// call is a reliable signal the shared utility ran.
describe("paperCut.ts consistency (no bespoke edge/shadow styling)", () => {
  it("drawPointedFinger applies the shared paper-cut shadow treatment to its fist", () => {
    const shadowColors: string[] = [];
    const ctx = new Proxy(
      {},
      { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
    );
    Object.defineProperty(ctx, "shadowColor", {
      set: (v: string) => shadowColors.push(v),
      get: () => "",
    });
    drawPointedFinger(ctx as unknown as CanvasRenderingContext2D, { pos: { x: 5, y: 5 }, sizePx: 44, colors, timeMs: 300, id: 9 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
