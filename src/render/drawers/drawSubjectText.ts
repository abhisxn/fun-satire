// src/render/drawers/drawSubjectText.ts
import { PALETTE, FONT } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";
import { getTextFontEntry, type TextFontId } from "../../hud/textFontRegistry";

export type DrawSubjectTextInput = {
  pos: { x: number; y: number };
  sizePx: number;
  value: string;
  scale: number;
  colors: SubjectColors;
  rotation: number;
  fontId?: TextFontId | string;
  align?: "left" | "center" | "right";
};

export const SUBJECT_TEXT_DRAW = Object.freeze({
  maxChars: 24,
  paddingXFraction: 0.14,
  paddingYFraction: 0.28,
  fontSizeFraction: 0.22,
  paperCutSeed: 61,
} as const);

const colorByName = (k: string): string => {
  switch (k) {
    case "cream": return PALETTE.cream;
    case "slate": return PALETTE.slate;
    case "sage": return PALETTE.sage;
    case "ink": return PALETTE.ink;
    case "coral": return PALETTE.coral;
    default: throw new Error(`drawSubjectText: color "${k}" is not in the locked palette`);
  }
};

/** Generic paper-cut placard bearing user-typed text — the only visual for every typed-text subject. */
export function drawSubjectText(ctx: CanvasRenderingContext2D, input: DrawSubjectTextInput): void {
  const { pos, sizePx, scale, rotation, colors } = input;
  const s = sizePx * scale;
  const text = input.value.length > SUBJECT_TEXT_DRAW.maxChars
    ? input.value.slice(0, SUBJECT_TEXT_DRAW.maxChars)
    : input.value;
  const rx = s * (0.5 + SUBJECT_TEXT_DRAW.paddingXFraction);
  const ry = s * (0.28 + SUBJECT_TEXT_DRAW.paddingYFraction);

  const fontEntry = getTextFontEntry(input.fontId);
  const align = input.align ?? "center";
  const fontFamily = fontEntry.id === "spaceMono" ? FONT.mono : fontEntry.cssFontFamily;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y, rx, ry, seed: SUBJECT_TEXT_DRAW.paperCutSeed });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y, rx: rx * 0.92, ry: ry * 0.86, seed: SUBJECT_TEXT_DRAW.paperCutSeed });
  ctx.fillStyle = colorByName(colors.shirt);
  ctx.fill();

  ctx.fillStyle = colorByName(colors.outline);
  ctx.font = `700 ${Math.max(10, s * SUBJECT_TEXT_DRAW.fontSizeFraction)}px ${fontFamily}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  const xOffset = align === "left"
    ? -rx * 0.78
    : align === "right"
      ? rx * 0.78
      : 0;
  ctx.fillText(text, pos.x + xOffset, pos.y);

  ctx.restore();
}
