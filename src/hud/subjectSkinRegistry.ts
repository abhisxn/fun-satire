import type { IllustratedSubjectId, SubjectColors } from "../content/schema";
import { FIGMA_ASSETS } from "../assets/figmaAssetRegistry";
import { drawSubjectFigure } from "../render/drawers/drawSubjectFigure";
import { drawSubjectLotus } from "../render/drawers/drawSubjectLotus";
import { drawSubjectScribe } from "../render/drawers/drawSubjectScribe";
import { drawSubjectHerald } from "../render/drawers/drawSubjectHerald";
import { drawSubjectJester } from "../render/drawers/drawSubjectJester";

export type AvatarAssetId = string;

export type SubjectSkin =
  | { kind: "illustrated"; id: IllustratedSubjectId }
  | { kind: "text"; value: string; scale: number; fontId?: string; align?: "left" | "center" | "right" }
  | { kind: "avatar"; assetId: AvatarAssetId };

export type DrawSubjectSkinFn = (
  ctx: CanvasRenderingContext2D,
  input: {
    pos: { x: number; y: number };
    sizePx: number;
    colors: SubjectColors;
    scale: number;
    rotation: number;
    shadowIntensity?: number;
  },
) => void;

export type SubjectSkinRegistryEntry = {
  id: IllustratedSubjectId;
  label: string;
  drawer: DrawSubjectSkinFn;
  figmaAssetId: string | null;
};

// Approved Figma subject exports. Figure and lotus ship exact Figma artwork;
// scribe / herald / jester have no Figma export yet and remain procedural
// placeholders. The assetId here is the canonical FIGMA_ASSETS id; the URL
// is resolved through FIGMA_ASSETS so it stays in lock-step with the frozen
// provenance table.
const FIGMA_BACKED_IDS: Readonly<Record<"figure" | "lotus", string>> = Object.freeze({
  figure: "subject-elder-figure",
  lotus: "subject-lotus",
});

const figmaAssetById = new Map(
  FIGMA_ASSETS.filter((a) => a.role === "subject").map((a) => [a.id, a]),
);

export function subjectAssetEntryFor(id: IllustratedSubjectId) {
  const figmaId = FIGMA_BACKED_IDS[id as keyof typeof FIGMA_BACKED_IDS];
  if (!figmaId) return null;
  return figmaAssetById.get(figmaId) ?? null;
}

export const SUBJECT_SKIN_REGISTRY: readonly SubjectSkinRegistryEntry[] = [
  { id: "figure", label: "figure", drawer: drawSubjectFigure, figmaAssetId: FIGMA_BACKED_IDS.figure },
  { id: "lotus", label: "lotus", drawer: drawSubjectLotus, figmaAssetId: FIGMA_BACKED_IDS.lotus },
  { id: "scribe", label: "scribe", drawer: drawSubjectScribe, figmaAssetId: null },
  { id: "herald", label: "herald", drawer: drawSubjectHerald, figmaAssetId: null },
  { id: "jester", label: "jester", drawer: drawSubjectJester, figmaAssetId: null },
];

export function getSubjectSkinEntry(id: IllustratedSubjectId): SubjectSkinRegistryEntry {
  const entry = SUBJECT_SKIN_REGISTRY.find((e) => e.id === id);
  if (!entry) throw new Error(`subjectSkinRegistry: unknown illustrated subject id "${id}"`);
  return entry;
}
