// src/render/drawers/drawSubject.ts
import type { SubjectColors, SubjectSkin } from "../../content/schema";
import { drawSubjectFigure } from "./drawSubjectFigure";
import { drawSubjectLotus } from "./drawSubjectLotus";

export type DrawSubjectInput = {
  pos: { x: number; y: number };
  sizePx: number;
  subjectSkin?: SubjectSkin;
  colors: SubjectColors;
  scale: number;
  seed?: number;
  rotation?: number;
};

export function drawSubject(ctx: CanvasRenderingContext2D, input: DrawSubjectInput): void {
  const rotation = input.rotation ?? 0;
  const skin = input.subjectSkin ?? "figure";
  switch (skin) {
    case "figure":
      drawSubjectFigure(ctx, { pos: input.pos, sizePx: input.sizePx, colors: input.colors, scale: input.scale, rotation });
      return;
    case "lotus":
      drawSubjectLotus(ctx, { pos: input.pos, sizePx: input.sizePx, colors: input.colors, scale: input.scale, rotation });
      return;
    default:
      throw new Error(`drawSubject: unknown subjectSkin "${skin as string}"`);
  }
}
