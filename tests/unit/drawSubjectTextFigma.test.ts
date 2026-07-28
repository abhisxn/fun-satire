// tests/unit/drawSubjectTextFigma.test.ts
// Lane C / Task C2 — text subjects keep their typography/alignment contract
// after the leaf drawer changes; no entity mutation.
import { describe, expect, it, vi } from "vitest";
import { drawSubjectText, SUBJECT_TEXT_DRAW } from "../../src/render/drawers/drawSubjectText";
import { drawSubject } from "../../src/render/drawers/drawSubject";

const colors = { suit: "slate" as const, shirt: "cream" as const, outline: "ink" as const };

function makeCtxSpy() {
  const fontAssignments: string[] = [];
  const alignAssignments: string[] = [];
  const fillTextCalls: unknown[][] = [];
  const noop = vi.fn();
  const ctx: Record<string, unknown> = {
    drawImage: noop,
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    arc: noop,
    ellipse: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    fillRect: noop,
    clearRect: noop,
    bezierCurveTo: noop,
    quadraticCurveTo: noop,
    translate: noop,
    rotate: noop,
    fillText: (...args: unknown[]) => {
      fillTextCalls.push(args);
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    lineCap: "",
    lineJoin: "",
    shadowColor: "",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
  };
  Object.defineProperty(ctx, "font", {
    get: () => fontAssignments[fontAssignments.length - 1] ?? "",
    set: (v: string) => fontAssignments.push(v),
  });
  Object.defineProperty(ctx, "textAlign", {
    get: () => alignAssignments[alignAssignments.length - 1] ?? "",
    set: (v: string) => alignAssignments.push(v),
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fontAssignments, alignAssignments, fillTextCalls };
}

describe("drawSubject text typography and alignment (Task C2)", () => {
  it("preserves the existing default font (Space Mono) and center alignment", () => {
    const { ctx, fontAssignments, alignAssignments } = makeCtxSpy();
    drawSubjectText(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, value: "Recall", scale: 1, colors, rotation: 0 });
    const lastFont = fontAssignments[fontAssignments.length - 1] ?? "";
    const lastAlign = alignAssignments[alignAssignments.length - 1] ?? "";
    expect(lastFont).toContain("Space Mono");
    expect(lastAlign).toBe("center");
  });

  it("honors a left-aligned Fraunces text skin end-to-end", () => {
    const { ctx, fontAssignments, alignAssignments } = makeCtxSpy();
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
    expect(fontAssignments[fontAssignments.length - 1]).toContain("Fraunces");
    expect(alignAssignments[alignAssignments.length - 1]).toBe("left");
  });

  it("truncates strings beyond the max character limit (dimension-stable text)", () => {
    const { ctx, fillTextCalls } = makeCtxSpy();
    const long = "x".repeat(200);
    drawSubjectText(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, value: long, scale: 1, colors, rotation: 0 });
    const rendered = fillTextCalls[0]?.[0] as string;
    expect(rendered.length).toBeLessThanOrEqual(SUBJECT_TEXT_DRAW.maxChars);
  });

  it("drawSubject dispatch routes a text skin to drawSubjectText (no entity mutation)", () => {
    const { ctx } = makeCtxSpy();
    const skin = { kind: "text" as const, value: "Resign", scale: 1 };
    const before = JSON.stringify(skin);
    drawSubject(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 80,
      subjectSkin: skin,
      colors,
      scale: 1,
    });
    expect(JSON.stringify(skin)).toBe(before);
  });
});
