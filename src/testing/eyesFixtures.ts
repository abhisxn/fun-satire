import type { Entity } from "../entities/Entity";
import { spawnSubject } from "../entities/EntityFactory";
import type { EntityStore } from "../entities/EntityStore";
import type { EffectSystem } from "../effects/EffectSystem";
import { selectCollectiveContributors } from "../effects/collectiveContributors";
import { LASER_BURN } from "../effects/effectDefs/laserBurn";
import type { SubjectManifestEntry } from "../content/schema";

export function applyEyesFixtureState(
  entities: readonly Entity[],
  pupilOffsets: Map<number, { x: number; y: number }>,
  viewport: Readonly<{ width: number; height: number }>,
): void {
  const sorted = [...entities].sort((a, b) => a.id - b.id);
  const columns = Math.max(1, Math.ceil(Math.sqrt(sorted.length * viewport.width / viewport.height)));
  const rows = Math.max(1, Math.ceil(sorted.length / columns));
  const insetX = Math.min(96, viewport.width * 0.12);
  const insetY = Math.min(96, viewport.height * 0.14);
  const availableWidth = Math.max(0, viewport.width - insetX * 2);
  const availableHeight = Math.max(0, viewport.height - insetY * 2);

  pupilOffsets.clear();
  sorted.forEach((entity, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const pos = {
      x: insetX + availableWidth * ((column + 0.5) / columns),
      y: insetY + availableHeight * ((row + 0.5) / rows),
    };
    entity.physics.pos = pos;
    entity.physics.home = { ...pos };
    entity.physics.vel = { x: 0, y: 0 };
    entity.physics.rotation = 0;
    pupilOffsets.set(entity.id, { x: 0, y: 0 });
  });
}

export function materializeEyesAttackFixture(input: Readonly<{
  store: EntityStore;
  effects: EffectSystem;
  subjectManifest: readonly SubjectManifestEntry[];
  nextId: number;
  viewport: Readonly<{ width: number; height: number }>;
  nowMs: number;
  progress: number;
}>): Readonly<{ targetId: number; contributorIds: readonly number[] }> {
  const target = { x: input.viewport.width / 2, y: input.viewport.height / 2 };
  const subject = spawnSubject({
    manifest: input.subjectManifest,
    cursor: target,
    nextId: input.nextId,
  });
  if (!subject) throw new Error("Visual attack fixture requires a subject manifest");
  subject.physics.scale = 1;
  input.store.insert(subject);

  const crowd: Array<{ id: number; pos: { x: number; y: number } }> = [];
  input.store.forEachAlive((entity) => {
    if (entity.content.renderType === "eye") crowd.push({ id: entity.id, pos: entity.physics.pos });
  });
  const contributors = selectCollectiveContributors({
    crowd,
    targetPos: target,
    archetype: "beam",
    maxContributors: 16,
  });

  const progress = Math.max(0, Math.min(1, input.progress));
  const startedAtMs = input.nowMs - LASER_BURN.totalDurationMs * progress;
  const effect = input.effects.start("laserBurn", subject.id, target, startedAtMs);
  if (!effect) throw new Error("Visual attack fixture could not start laserBurn");
  input.effects.update(input.nowMs);

  return {
    targetId: subject.id,
    contributorIds: contributors.map(({ id }) => id),
  };
}
