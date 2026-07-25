import type { PaletteKey } from "../config/tokens";

export type ShapeVariant = "almond" | "round" | "hooded" | "wide" | "narrow";

export type IrisColor = Extract<PaletteKey, "slate" | "sage"> | "cream";

export type ScleraColor = "cream";

export type PupilColor = "ink";

export type HighlightColor = "coral";

export type EyeColors = {
  sclera: ScleraColor;
  iris: IrisColor;
  pupil: PupilColor;
  highlight: HighlightColor | null;
  outline: "ink";
};

export type EyePhysics = {
  baseSizePx: number;
  jitterScale?: number;
};

export type EyeBehaviorConfig = {
  blinkIntervalMinMs: number;
  blinkIntervalMaxMs: number;
  blinkDurationMs: number;
  pupilTrackMs: number;
};

export type ManifestEntry = {
  id: string;
  rig: "eye";
  renderType: "eye";
  visual: {
    styleGuardrail: "flat-illustrated";
    shapeVariant: ShapeVariant;
  };
  colors: EyeColors;
  physics: EyePhysics;
  behavior: EyeBehaviorConfig;
};

export type Manifest = {
  schemaVersion: "1.0.0";
  name: string;
  entries: ManifestEntry[];
};

export type ManifestLoadIssue = {
  path: string;
  message: string;
  entryId?: string;
};

export class ManifestLoadError extends Error {
  readonly issues: ManifestLoadIssue[];
  constructor(issues: ManifestLoadIssue[]) {
    super(
      `Manifest validation failed:\n` +
        issues.map((i) => `  ${i.path}: ${i.message}`).join("\n"),
    );
    this.issues = issues;
    this.name = "ManifestLoadError";
  }
}
