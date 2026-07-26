import { describe, it, expect, vi } from "vitest";
import { drawSubjectScribe } from "../../src/render/drawers/drawSubjectScribe";
import { drawSubjectHerald } from "../../src/render/drawers/drawSubjectHerald";
import { drawSubjectJester } from "../../src/render/drawers/drawSubjectJester";

const fakeCtxWithShadowSpy = () => {
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
};

const colors = { suit: "slate", shirt: "cream", outline: "ink" } as const;
const input = { pos: { x: 10, y: 10 }, sizePx: 80, colors, scale: 1, rotation: 0 };

describe("placeholder illustrated subjects", () => {
  it("drawSubjectScribe does not throw and applies the shared paper-cut shadow", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    expect(() => drawSubjectScribe(ctx, input)).not.toThrow();
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });

  it("drawSubjectHerald does not throw and applies the shared paper-cut shadow", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    expect(() => drawSubjectHerald(ctx, input)).not.toThrow();
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });

  it("drawSubjectJester does not throw and applies the shared paper-cut shadow", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    expect(() => drawSubjectJester(ctx, input)).not.toThrow();
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
