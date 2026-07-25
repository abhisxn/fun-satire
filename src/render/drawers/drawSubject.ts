// src/render/drawers/drawSubject.ts
import type { SubjectColors, IllustratedSubjectId } from "../../content/schema";
import { drawSubjectFigure } from "./drawSubjectFigure";
import { drawSubjectLotus } from "./drawSubjectLotus";

export type DrawSubjectInput = {
  pos: { x: number; y: number };
  sizePx: number;
  subjectSkin?: IllustratedSubjectId;
  colors: SubjectColors;
  scale: number;
  seed?: number;
  rotation?: number;
  shadowIntensity?: number;
};

export function drawSubject(ctx: CanvasRenderingContext2D, input: DrawSubjectInput): void {
  const rotation = input.rotation ?? 0;
  const skin = input.subjectSkin ?? "figure";
  switch (skin) {
    case "figure":
      drawSubjectFigure(ctx, { pos: input.pos, sizePx: input.sizePx, colors: input.colors, scale: input.scale, rotation, shadowIntensity: input.shadowIntensity });
      return;
    case "lotus":
      drawSubjectLotus(ctx, { pos: input.pos, sizePx: input.sizePx, colors: input.colors, scale: input.scale, rotation, shadowIntensity: input.shadowIntensity });
      return;
    default:
      throw new Error(`drawSubject: unknown subjectSkin "${skin as string}"`);
  }
}
