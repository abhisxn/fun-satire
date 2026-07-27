// src/render/drawers/drawSubject.ts
import type { SubjectColors } from "../../content/schema";
import type { SubjectSkin } from "../../hud/subjectSkinRegistry";
import { getSubjectSkinEntry } from "../../hud/subjectSkinRegistry";
import { drawSubjectText } from "./drawSubjectText";

export type DrawSubjectInput = {
  pos: { x: number; y: number };
  sizePx: number;
  subjectSkin?: SubjectSkin;
  colors: SubjectColors;
  scale: number;
  seed?: number;
  rotation?: number;
  shadowIntensity?: number;
};

export function drawSubject(ctx: CanvasRenderingContext2D, input: DrawSubjectInput): void {
  const rotation = input.rotation ?? 0;
  const subjectSkin: SubjectSkin = input.subjectSkin ?? { kind: "illustrated", id: "figure" };
  if (subjectSkin.kind === "illustrated") {
    const entry = getSubjectSkinEntry(subjectSkin.id);
    entry.drawer(ctx, {
      pos: input.pos,
      sizePx: input.sizePx,
      colors: input.colors,
      scale: input.scale,
      rotation,
      shadowIntensity: input.shadowIntensity,
    });
    return;
  }
  if (subjectSkin.kind === "avatar") {
    // Placeholder: real avatar drawer lands in Phase B Lane 2.
    return;
  }
  drawSubjectText(ctx, {
    pos: input.pos,
    sizePx: input.sizePx,
    value: subjectSkin.value,
    scale: input.scale * subjectSkin.scale,
    colors: input.colors,
    rotation,
    fontId: subjectSkin.fontId,
    align: subjectSkin.align,
  });
}
