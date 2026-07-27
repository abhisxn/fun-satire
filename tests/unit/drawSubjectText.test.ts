// tests/unit/drawSubjectText.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawSubjectText, SUBJECT_TEXT_DRAW } from "../../src/render/drawers/drawSubjectText";
import { TEXT_FONT_REGISTRY, getTextFontEntry } from "../../src/hud/textFontRegistry";

const fakeCtx = () => {
  const shadowColors: string[] = [];
  const fillTextCalls: unknown[] = [];
  const fontAssignments: string[] = [];
  const alignAssignments: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "canvas") return {};
        if (prop === "fillText") return (...args: unknown[]) => fillTextCalls.push(args);
        return typeof prop === "string" ? vi.fn() : undefined;
      },
      set: (target, prop, value) => {
        if (prop === "font") fontAssignments.push(String(value));
        if (prop === "textAlign") alignAssignments.push(String(value));
        (target as Record<string | symbol, unknown>)[prop as string] = value;
        return true;
      },
    },
  );
  Object.defineProperty(ctx, "shadowColor", {
    set: (v: string) => shadowColors.push(v),
    get: () => "",
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, shadowColors, fillTextCalls, fontAssignments, alignAssignments };
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

  it("defaults to Space Mono and center alignment when fontId/align are absent", () => {
    const { ctx, fontAssignments, alignAssignments } = fakeCtx();
    drawSubjectText(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, value: "Recall", scale: 1, colors, rotation: 0 });
    const lastFont = fontAssignments[fontAssignments.length - 1] ?? "";
    const lastAlign = alignAssignments[alignAssignments.length - 1] ?? "";
    expect(lastFont).toContain("Space Mono");
    expect(lastAlign).toBe("center");
  });

  it("renders Fraunces family with left alignment when requested", () => {
    const { ctx, fontAssignments, alignAssignments } = fakeCtx();
    drawSubjectText(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 80,
      value: "Recall",
      scale: 1,
      colors,
      rotation: 0,
      fontId: "fraunces",
      align: "left",
    });
    const lastFont = fontAssignments[fontAssignments.length - 1] ?? "";
    const lastAlign = alignAssignments[alignAssignments.length - 1] ?? "";
    expect(lastFont).toContain("Fraunces");
    expect(lastAlign).toBe("left");
  });

  it("renders Orbitron family when fontId is orbitron", () => {
    const { ctx, fontAssignments, alignAssignments } = fakeCtx();
    drawSubjectText(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 80,
      value: "Recall",
      scale: 1,
      colors,
      rotation: 0,
      fontId: "orbitron",
    });
    const lastFont = fontAssignments[fontAssignments.length - 1] ?? "";
    const lastAlign = alignAssignments[alignAssignments.length - 1] ?? "";
    expect(lastFont).toContain("Orbitron");
    expect(lastAlign).toBe("center");
  });
});

describe("textFontRegistry", () => {
  it("exposes all 13 user-selectable fonts", () => {
    expect(TEXT_FONT_REGISTRY.length).toBe(13);
    const ids = TEXT_FONT_REGISTRY.map((f) => f.id);
    expect(ids).toContain("spaceMono");
    expect(ids).toContain("fraunces");
    expect(ids).toContain("barriecito");
    expect(ids).toContain("nabla");
    expect(ids).toContain("bungeeTint");
    expect(ids).toContain("unbounded");
    expect(ids).toContain("spaceGrotesk");
    expect(ids).toContain("bricolageGrotesque");
    expect(ids).toContain("tektur");
    expect(ids).toContain("orbitron");
    expect(ids).toContain("syneMono");
    expect(ids).toContain("pixelifySans");
    expect(ids).toContain("doto");
  });

  it("resolves unknown ids to the spaceMono default", () => {
    const entry = getTextFontEntry("nope");
    expect(entry.id).toBe("spaceMono");
  });
});
