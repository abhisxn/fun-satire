import type { Entity, Vec2 } from "./Entity";
import type { EntityStore } from "./EntityStore";

export const isSubject = (entity: Entity): boolean =>
  entity.content.renderType === "subject";

export const queryAllSubjects = (store: EntityStore): Entity[] => {
  const subjects: Entity[] = [];
  store.forEach((e) => {
    if (isSubject(e)) subjects.push(e);
  });
  return subjects;
};

const distSq = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const queryNearestSubject = (
  store: EntityStore,
  pos: Vec2,
  maxRange: number,
): Entity | null => {
  if (Number.isNaN(maxRange) || maxRange <= 0) return null;
  const maxSq = Number.isFinite(maxRange) ? maxRange * maxRange : Infinity;
  let best: Entity | null = null;
  let bestDist = maxSq;
  store.forEach((e) => {
    if (!isSubject(e)) return;
    const d = distSq(e.physics.pos, pos);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  });
  return best;
};
