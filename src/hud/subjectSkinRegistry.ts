import type { IllustratedSubjectId, SubjectColors } from "../content/schema";
import { drawSubjectFigure } from "../render/drawers/drawSubjectFigure";
import { drawSubjectLotus } from "../render/drawers/drawSubjectLotus";

export type SubjectSkin =
  | { kind: "illustrated"; id: IllustratedSubjectId }
  | { kind: "text"; value: string; scale: number };

export type DrawSubjectSkinFn = (
  ctx: CanvasRenderingContext2D,
  input: {
    pos: { x: number; y: number };
    sizePx: number;
    colors: SubjectColors;
    scale: number;
    rotation: number;
  },
) => void;

export type SubjectSkinRegistryEntry = {
  id: IllustratedSubjectId;
  label: string;
  drawer: DrawSubjectSkinFn;
};

export const SUBJECT_SKIN_REGISTRY: readonly SubjectSkinRegistryEntry[] = [
  { id: "figure", label: "figure", drawer: drawSubjectFigure },
  { id: "lotus", label: "lotus", drawer: drawSubjectLotus },
];

export function getSubjectSkinEntry(id: IllustratedSubjectId): SubjectSkinRegistryEntry {
  const entry = SUBJECT_SKIN_REGISTRY.find((e) => e.id === id);
  if (!entry) throw new Error(`subjectSkinRegistry: unknown illustrated subject id "${id}"`);
  return entry;
}
