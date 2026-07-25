// tests/unit/drawSubjectSkins.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawSubject } from "../../src/render/drawers/drawSubject";
import { drawSubjectFigure } from "../../src/render/drawers/drawSubjectFigure";
import { drawSubjectLotus } from "../../src/render/drawers/drawSubjectLotus";

const fakeCtx = () =>
  new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "canvas") return {};
        return typeof prop === "string" ? vi.fn() : undefined;
      },
    },
  ) as unknown as CanvasRenderingContext2D;

const colors = { suit: "slate", shirt: "cream", outline: "ink" } as const;

describe("drawSubject dispatch", () => {
  it("does not throw for subjectSkin 'figure'", () => {
    expect(() =>
      drawSubject(fakeCtx(), { pos: { x: 10, y: 10 }, sizePx: 80, subjectSkin: "figure", colors, scale: 1, seed: 1 }),
    ).not.toThrow();
  });

  it("does not throw for subjectSkin 'lotus'", () => {
    expect(() =>
      drawSubject(fakeCtx(), { pos: { x: 10, y: 10 }, sizePx: 80, subjectSkin: "lotus", colors, scale: 1, seed: 1 }),
    ).not.toThrow();
  });

  it("throws for an unknown subjectSkin", () => {
    expect(() =>
      drawSubject(fakeCtx(), {
        pos: { x: 0, y: 0 },
        sizePx: 80,
        // @ts-expect-error intentionally invalid
        subjectSkin: "not-a-skin",
        colors,
        scale: 1,
        seed: 1,
      }),
    ).toThrow(/subjectSkin/);
  });

  it("drawSubjectFigure and drawSubjectLotus are independently callable", () => {
    expect(() => drawSubjectFigure(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 80, colors, scale: 1, rotation: 0 })).not.toThrow();
    expect(() => drawSubjectLotus(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 80, colors, scale: 1, rotation: 0 })).not.toThrow();
  });
});

function fakeCtxWithShadowSpy(): { ctx: CanvasRenderingContext2D; shadowColors: string[] } {
  const shadowColors: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "canvas") return {};
        return typeof prop === "string" ? vi.fn() : undefined;
      },
    },
  );
  Object.defineProperty(ctx, "shadowColor", {
    set: (v: string) => shadowColors.push(v),
    get: () => "",
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, shadowColors };
}

describe("paperCut.ts consistency (no bespoke edge/shadow styling)", () => {
  it("drawSubjectFigure applies the shared paper-cut shadow treatment", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    drawSubjectFigure(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, colors, scale: 1, rotation: 0 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });

  it("drawSubjectLotus applies the shared paper-cut shadow treatment", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    drawSubjectLotus(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, colors, scale: 1, rotation: 0 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
