// tests/unit/drawSubjectText.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawSubjectText, SUBJECT_TEXT_DRAW } from "../../src/render/drawers/drawSubjectText";

const fakeCtx = () => {
  const shadowColors: string[] = [];
  const fillTextCalls: unknown[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "canvas") return {};
        if (prop === "fillText") return (...args: unknown[]) => fillTextCalls.push(args);
        return typeof prop === "string" ? vi.fn() : undefined;
      },
      set: (target, prop, value) => {
        (target as Record<string | symbol, unknown>)[prop as string] = value;
        return true;
      },
    },
  );
  Object.defineProperty(ctx, "shadowColor", {
    set: (v: string) => shadowColors.push(v),
    get: () => "",
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, shadowColors, fillTextCalls };
};

const colors = { suit: "slate", shirt: "cream", outline: "ink" } as const;

describe("drawSubjectText", () => {
  it("does not throw for a short string", () => {
    const { ctx } = fakeCtx();
    expect(() =>
      drawSubjectText(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, value: "Resign", scale: 1, colors, rotation: 0 }),
    ).not.toThrow();
  });

  it("truncates values beyond the max character limit", () => {
    const { ctx, fillTextCalls } = fakeCtx();
    const long = "x".repeat(200);
    drawSubjectText(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, value: long, scale: 1, colors, rotation: 0 });
    const rendered = fillTextCalls[0]?.[0] as string;
    expect(rendered.length).toBeLessThanOrEqual(SUBJECT_TEXT_DRAW.maxChars);
  });

  it("applies the shared paper-cut shadow treatment", () => {
    const { ctx, shadowColors } = fakeCtx();
    drawSubjectText(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, value: "Recall", scale: 1, colors, rotation: 0 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
