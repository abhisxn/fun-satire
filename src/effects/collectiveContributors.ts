import { isWithinBurnAssistRange } from "../entities/behaviors/EyeBehavior";
import type { EntityId, Vec2 } from "../entities/Entity";

export type CollectiveArchetype = "beam" | "arc" | "bite" | "glow";

export type CollectiveCrowdMember = {
  id: EntityId;
  pos: Vec2;
};

export type Contributor = {
  id: EntityId;
  pos: Vec2;
};

export type SelectCollectiveContributorsInput = {
  crowd: readonly CollectiveCrowdMember[];
  targetPos: Vec2;
  archetype: CollectiveArchetype;
  maxContributors: number;
  assistRadiusPx?: number;
};

/**
 * Selects the entities that will visually "contribute" to a staged effect
 * (e.g. a beam from the ceiling, an arc/bite snapped at a point). Different
 * archetypes use different selection rules:
 *   - "beam": any crowd member, capped at `maxContributors` (no distance filter
 *     — the beam is a global action that recruits from the whole crowd).
 *   - "arc" | "bite": only members within `assistRadiusPx` of `targetPos`
 *     (per `isWithinBurnAssistRange`), capped at `maxContributors`. These are
 *     the eyes close enough to the subject to be "assisting" the burn.
 *
 * Crowd iteration order is preserved (insertion order from EntityStore).
 */
export function selectCollectiveContributors(
  input: SelectCollectiveContributorsInput,
): Contributor[] {
  const { crowd, targetPos, archetype, maxContributors } = input;
  if (maxContributors <= 0 || crowd.length === 0) return [];

  if (archetype === "beam") {
    const out: Contributor[] = [];
    for (const c of crowd) {
      if (out.length >= maxContributors) break;
      out.push({ id: c.id, pos: c.pos });
    }
    return out;
  }

  const radius = input.assistRadiusPx ?? 0;
  const out: Contributor[] = [];
  for (const c of crowd) {
    if (out.length >= maxContributors) break;
    if (isWithinBurnAssistRange(c.pos, targetPos, radius)) {
      out.push({ id: c.id, pos: c.pos });
    }
  }
  return out;
}
