import { ManifestLoadError } from "./schema";
export { ManifestLoadError } from "./schema";
import type {
  Manifest,
  ManifestEntry,
  ManifestLoadIssue,
  EyeManifestEntry,
  SubjectManifestEntry,
} from "./schema";
import { EYE_ASSET_IDS, eyeAssetForEntity } from "../assets/eyeAssetRegistry";

const SHAPE_VARIANTS = new Set([
  "almond",
  "round",
  "hooded",
  "wide",
  "narrow",
] as const);

const SCLERA = new Set(["cream"] as const);
const IRIS = new Set(["slate", "sage", "cream"] as const);
const PUPIL = new Set(["ink"] as const);
const HIGHLIGHT = new Set(["coral", null] as const);
const OUTLINE = new Set(["ink"] as const);

const between = (v: number, lo: number, hi: number, path: string, issues: ManifestLoadIssue[]) => {
  if (!Number.isFinite(v)) {
    issues.push({ path, message: "must be a finite number" });
    return;
  }
  if (v < lo || v > hi) {
    issues.push({ path: `${path}`, message: `must be between ${lo} and ${hi}` });
  }
};

const validateEntry = (raw: unknown, index: number, issues: ManifestLoadIssue[]): ManifestEntry | null => {
  const base = `/entries/${index}`;
  if (typeof raw !== "object" || raw === null) {
    issues.push({ path: base, message: "must be an object" });
    return null;
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !/^[a-z0-9-_]{2,32}$/.test(r.id)) {
    issues.push({ path: `${base}/id`, message: "must match /^[a-z0-9-_]{2,32}$/" });
    return null;
  }
  if (r.rig === "subject") {
    return validateSubjectEntry(r, base, issues);
  }
  if (r.rig !== "eye") {
    issues.push({ path: `${base}/rig`, message: `must equal "eye" or "subject"` });
  }
  return validateEyeEntry(r, base, issues);
};

const validateEyeEntry = (r: Record<string, unknown>, base: string, issues: ManifestLoadIssue[]): EyeManifestEntry | null => {
  if (r.renderType !== "eye") {
    issues.push({ path: `${base}/renderType`, message: `must equal "eye"` });
  }

  const v = (r.visual as Record<string, unknown> | undefined) ?? {};
  if (v.styleGuardrail !== "flat-illustrated") {
    issues.push({
      path: `${base}/visual/styleGuardrail`,
      message: `must equal "flat-illustrated" (the v3 content guardrail)`,
    });
  }
  if (!SHAPE_VARIANTS.has(v.shapeVariant as never)) {
    issues.push({
      path: `${base}/visual/shapeVariant`,
      message: `must be one of ${[...SHAPE_VARIANTS].join(", ")}`,
    });
  }
  if (typeof v.assetId === "string") {
    if (!(EYE_ASSET_IDS as readonly string[]).includes(v.assetId)) {
      issues.push({
        path: `${base}/visual/assetId`,
        message: `must be one of ${EYE_ASSET_IDS.join(", ")}`,
      });
    }
  } else {
    (r as Record<string, unknown>).visual = { ...v, assetId: eyeAssetForEntity(r.id as string).id };
  }

  const c = (r.colors as Record<string, unknown> | undefined) ?? {};
  if (!SCLERA.has(c.sclera as never)) {
    issues.push({ path: `${base}/colors/sclera`, message: `must be "cream"` });
  }
  if (!IRIS.has(c.iris as never)) {
    issues.push({ path: `${base}/colors/iris`, message: `must be "slate", "sage", or "cream"` });
  }
  if (!PUPIL.has(c.pupil as never)) {
    issues.push({ path: `${base}/colors/pupil`, message: `must be "ink"` });
  }
  if (!HIGHLIGHT.has(c.highlight as never)) {
    issues.push({ path: `${base}/colors/highlight`, message: `must be "coral" or null` });
  }
  if (!OUTLINE.has(c.outline as never)) {
    issues.push({ path: `${base}/colors/outline`, message: `must be "ink"` });
  }

  const p = (r.physics as Record<string, unknown> | undefined) ?? {};
  between(typeof p.baseSizePx === "number" ? p.baseSizePx : NaN, 24, 120, `${base}/physics/baseSizePx`, issues);
  if (p.jitterScale !== undefined) {
    between(typeof p.jitterScale === "number" ? p.jitterScale : NaN, 0.5, 2, `${base}/physics/jitterScale`, issues);
  }

  const b = (r.behavior as Record<string, unknown> | undefined) ?? {};
  between(typeof b.blinkIntervalMinMs === "number" ? b.blinkIntervalMinMs : NaN, 1000, 15000, `${base}/behavior/blinkIntervalMinMs`, issues);
  between(typeof b.blinkIntervalMaxMs === "number" ? b.blinkIntervalMaxMs : NaN, 1000, 15000, `${base}/behavior/blinkIntervalMaxMs`, issues);
  between(typeof b.blinkDurationMs === "number" ? b.blinkDurationMs : NaN, 60, 240, `${base}/behavior/blinkDurationMs`, issues);
  between(typeof b.pupilTrackMs === "number" ? b.pupilTrackMs : NaN, 40, 250, `${base}/behavior/pupilTrackMs`, issues);

  if (typeof b.blinkIntervalMinMs === "number" && typeof b.blinkIntervalMaxMs === "number" &&
      b.blinkIntervalMinMs > b.blinkIntervalMaxMs) {
    issues.push({
      path: `${base}/behavior`,
      message: `blinkIntervalMinMs (${b.blinkIntervalMinMs}) > blinkIntervalMaxMs (${b.blinkIntervalMaxMs})`,
    });
  }

  if (issues.length > 0) return null;
  return r as unknown as EyeManifestEntry;
};

const SUIT_COLORS = new Set(["slate", "sage", "ink"]);

const validateSubjectEntry = (
  r: Record<string, unknown>,
  base: string,
  issues: ManifestLoadIssue[],
): SubjectManifestEntry | null => {
  if (r.renderType !== "subject") {
    issues.push({ path: `${base}/renderType`, message: 'renderType must equal "subject"' });
  }
  const visual = (r.visual as Record<string, unknown> | undefined) ?? {};
  if (visual.styleGuardrail === "flat-illustrated") {
    // validated; no extra fields required
  } else if (visual.styleGuardrail === "curated-avatar") {
    if (typeof visual.assetId !== "string" || visual.assetId.length === 0) {
      issues.push({ path: `${base}/visual/assetId`, message: "assetId must be a non-empty string" });
    }
  } else {
    issues.push({ path: `${base}/visual/styleGuardrail`, message: 'styleGuardrail must equal "flat-illustrated" or "curated-avatar"' });
  }
  const colors = (r.colors as Record<string, unknown> | undefined) ?? {};
  if (typeof colors.suit !== "string" || !SUIT_COLORS.has(colors.suit)) {
    issues.push({ path: `${base}/colors/suit`, message: 'suit must be "slate", "sage", or "ink"' });
  }
  if (colors.shirt !== "cream") {
    issues.push({ path: `${base}/colors/shirt`, message: 'shirt must equal "cream"' });
  }
  if (colors.outline !== "ink") {
    issues.push({ path: `${base}/colors/outline`, message: 'outline must equal "ink"' });
  }
  const physics = (r.physics as Record<string, unknown> | undefined) ?? {};
  const baseSizePx = typeof physics.baseSizePx === "number" ? physics.baseSizePx : NaN;
  between(baseSizePx, 24, 160, `${base}/physics/baseSizePx`, issues);

  if (issues.length > 0) return null;
  return r as unknown as SubjectManifestEntry;
};

export function validateManifest(raw: unknown): Manifest {
  const issues: ManifestLoadIssue[] = [];
  if (typeof raw !== "object" || raw === null) {
    throw new ManifestLoadError([{ path: "/", message: "manifest must be an object" }]);
  }
  const r = raw as Record<string, unknown>;
  if (r.schemaVersion !== "1.0.0") {
    issues.push({ path: "/schemaVersion", message: 'must equal "1.0.0"' });
  }
  if (typeof r.name !== "string" || r.name.length === 0) {
    issues.push({ path: "/name", message: "must be a non-empty string" });
  }
  if (!Array.isArray(r.entries)) {
    issues.push({ path: "/entries", message: "must be an array" });
    throw new ManifestLoadError(issues);
  }
  const seen = new Set<string>();
  const entries: ManifestEntry[] = [];
  r.entries.forEach((e, i) => {
    const validated = validateEntry(e, i, issues);
    if (validated) {
      if (seen.has(validated.id)) {
        issues.push({ path: `/entries/${i}/id`, message: `duplicate id "${validated.id}"` });
      }
      seen.add(validated.id);
      entries.push(validated);
    }
  });
  if (entries.length < 1) {
    issues.push({ path: "/entries", message: "must contain at least one entry" });
  }
  if (issues.length > 0) throw new ManifestLoadError(issues);
  return { schemaVersion: "1.0.0", name: r.name as string, entries };
}

export const loadManifest = validateManifest;

export const loadManifestFromText = (text: string): Manifest => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new ManifestLoadError([
      {
        path: "/",
        message: `invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      },
    ]);
  }
  return validateManifest(parsed);
};
