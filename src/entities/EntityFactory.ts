import type { Entity, EntityId, Vec2 } from "../entities/Entity";
import { type Rng } from "../core/Rng";
import type { EyeManifestEntry, EyeColors } from "../content/schema";

export const ENTITY_FACTORY = Object.freeze({
  minSeparationPx: 64,
  maxAttempts: 64,
} as const);

export type EntityFactoryOptions = {
  rng: Rng;
  width: number;
  height: number;
  count?: number;
  manifest: readonly EyeManifestEntry[];
};

export type FactoryResult = {
  entities: Entity[];
  rejected: number;
};

const paletteRef = (entry: EyeManifestEntry): EyeColors => entry.colors;

const jitterScale = (entry: EyeManifestEntry, rng: Rng): number => {
  if (entry.physics.jitterScale !== undefined) {
    const j = entry.physics.jitterScale;
    return 1 + rng.range(-1, 1) * (j - 1) * 0.5;
  }
  return 1;
};

const buildEntity = (
  id: EntityId,
  entry: EyeManifestEntry,
  pos: Vec2,
  scale: number,
): Entity => ({
  id,
  content: {
    manifestId: entry.id,
    rig: entry.rig,
    renderType: entry.renderType,
    palette: { ...paletteRef(entry) },
  },
  physics: { pos, vel: { x: 0, y: 0 }, home: { ...pos }, scale, rotation: 0 },
  behavior: {
    data: {
      shapeVariant: entry.visual.shapeVariant,
      colors: paletteRef(entry),
      blinkIntervalMinMs: entry.behavior.blinkIntervalMinMs,
      blinkIntervalMaxMs: entry.behavior.blinkIntervalMaxMs,
      blinkDurationMs: entry.behavior.blinkDurationMs,
      pupilTrackMs: entry.behavior.pupilTrackMs,
    },
  },
  lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
});

const overlapsAny = (pos: Vec2, list: Entity[], sepSq: number): boolean => {
  for (const e of list) {
    const dx = e.physics.pos.x - pos.x;
    const dy = e.physics.pos.y - pos.y;
    if (dx * dx + dy * dy < sepSq) return true;
  }
  return false;
};

const samplePos = (
  rng: Rng,
  entry: EyeManifestEntry,
  width: number,
  height: number,
): Vec2 => {
  const margin = Math.max(40, entry.physics.baseSizePx + 8);
  return {
    x: rng.range(margin, Math.max(margin + 1, width - margin)),
    y: rng.range(margin, Math.max(margin + 1, height - margin)),
  };
};

export function spawnEyes(opts: EntityFactoryOptions): FactoryResult {
  const { rng, width, height, manifest } = opts;
  if (width <= 0 || height <= 0) return { entities: [], rejected: 0 };
  const requested = opts.count ?? manifest.length;
  if (!Number.isFinite(requested) || requested <= 0) return { entities: [], rejected: 0 };
  const target = Math.min(requested, manifest.length);
  const placed: Entity[] = [];
  let rejected = 0;
  let nextId = 1;
  for (let i = 0; i < target; i++) {
    const entry = manifest[i % manifest.length]!;
    const sepSq = Math.pow(
      ENTITY_FACTORY.minSeparationPx * (entry.physics.baseSizePx / 56),
      2,
    );
    let attempt = 0;
    let placedOk = false;
    for (attempt = 0; attempt < ENTITY_FACTORY.maxAttempts; attempt++) {
      const pos = samplePos(rng, entry, width, height);
      if (!overlapsAny(pos, placed, sepSq)) {
        placed.push(
          buildEntity(nextId++, entry, pos, jitterScale(entry, rng)),
        );
        placedOk = true;
        break;
      }
    }
    if (!placedOk) rejected++;
  }
  return { entities: placed, rejected };
}
