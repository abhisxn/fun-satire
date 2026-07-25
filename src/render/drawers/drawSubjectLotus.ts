// src/render/drawers/drawSubjectLotus.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectLotusInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  scale: number;
  rotation: number;
};

function colorByName(k: string): string {
  switch (k) {
    case "cream":
      return PALETTE.cream;
    case "slate":
      return PALETTE.slate;
    case "sage":
      return PALETTE.sage;
    case "ink":
      return PALETTE.ink;
    case "coral":
      return PALETTE.coral;
    default:
      throw new Error(`drawSubjectLotus: color "${k}" is not in the locked palette`);
  }
}

export function drawSubjectLotus(ctx: CanvasRenderingContext2D, input: DrawSubjectLotusInput): void {
  const { pos, sizePx, colors, scale, rotation } = input;
  const s = sizePx * scale;
  const petalCount = 5;
  const petalLen = s * 0.48;
  const petalW = s * 0.22;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(angle);
    withPaperCutShadow(ctx, () => {
      paperCutEdgePath(ctx, { cx: 0, cy: -petalLen * 0.55, rx: petalW * 0.55, ry: petalLen * 0.55, seed: i + 1 });
      ctx.fillStyle = colorByName(colors.outline);
      ctx.fill();
    });
    paperCutEdgePath(ctx, { cx: 0, cy: -petalLen * 0.55, rx: petalW * 0.45, ry: petalLen * 0.48, seed: i + 1 });
    ctx.fillStyle = colorByName(i % 2 === 0 ? colors.suit : colors.shirt);
    ctx.fill();
    ctx.restore();
  }

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: s * 0.16, ry: s * 0.16, seed: 21 });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: s * 0.12, ry: s * 0.12, seed: 21 });
  ctx.fillStyle = colorByName(colors.outline);
  ctx.fill();

  ctx.restore();
}
