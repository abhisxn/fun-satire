// tests/unit/drawBug.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawBug, computeScuttleJitter, BUG_DRAW } from "../../src/render/drawers/drawBug";

const fakeCtx = () =>
  new Proxy(
    {},
    { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
  ) as unknown as CanvasRenderingContext2D;

const colors = { sclera: "cream", iris: "sage", pupil: "ink", highlight: "cream", outline: "ink" } as const;

describe("computeScuttleJitter", () => {
  it("is a pure, deterministic function of (id, timeMs)", () => {
    const a = computeScuttleJitter(7, 1234);
    const b = computeScuttleJitter(7, 1234);
    expect(a).toEqual(b);
  });

  it("produces different jitter for different ids at the same time", () => {
    const a = computeScuttleJitter(1, 1000);
    const b = computeScuttleJitter(2, 1000);
    expect(a).not.toEqual(b);
  });

  it("stays within the configured jitter amplitude", () => {
    for (let t = 0; t < 5000; t += 250) {
      const j = computeScuttleJitter(3, t);
      expect(Math.abs(j.x)).toBeLessThanOrEqual(BUG_DRAW.jitterAmpPx + 1e-6);
      expect(Math.abs(j.y)).toBeLessThanOrEqual(BUG_DRAW.jitterAmpPx + 1e-6);
    }
  });
});

describe("drawBug", () => {
  it("does not throw with a rotation applied", () => {
    expect(() =>
      drawBug(fakeCtx(), { pos: { x: 20, y: 20 }, sizePx: 40, colors, timeMs: 500, id: 5, rotation: 0.4 }),
    ).not.toThrow();
  });

  it("defaults rotation to 0 when omitted", () => {
    expect(() => drawBug(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 40, colors, timeMs: 0, id: 1 })).not.toThrow();
  });
});

// Design-system requirement: drawBug's body silhouette must use the shared
// paperCut.ts utility (paperCutEdgePath + withPaperCutShadow), the same
// treatment drawEye.ts/drawSubject*.ts use — not a bespoke ctx.ellipse fill.
// withPaperCutShadow sets a fixed shadowColor ("rgba(42, 36, 32, 0.22)")
// while active, so its presence during the draw call is a reliable signal
// the shared utility ran.
describe("paperCut.ts consistency (no bespoke edge/shadow styling)", () => {
  it("drawBug applies the shared paper-cut shadow treatment to its body", () => {
    const shadowColors: string[] = [];
    const ctx = new Proxy(
      {},
      { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
    );
    Object.defineProperty(ctx, "shadowColor", {
      set: (v: string) => shadowColors.push(v),
      get: () => "",
    });
    drawBug(ctx as unknown as CanvasRenderingContext2D, { pos: { x: 20, y: 20 }, sizePx: 40, colors, timeMs: 500, id: 5 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
