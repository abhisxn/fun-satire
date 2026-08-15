import type { Creature } from "./creatureTypes";

export interface AvatarPos {
  x: number;
  y: number;
}

export interface Repulsor extends AvatarPos {
  radius?: number;
}

export interface PhysicsParams {
  repelRadius: number;
  repelStrength: number;
  springStrength: number;
  damping: number;
}

const EPS = 1e-6;

export function applyRepulsion(
  creature: Creature,
  source: AvatarPos,
  params: PhysicsParams,
  radius?: number,
): void {
  const repelRadius = radius ?? params.repelRadius;
  const { repelStrength } = params;
  const dx = creature.x - source.x;
  const dy = creature.y - source.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < repelRadius && dist > EPS) {
    const force = (1 - dist / repelRadius) * repelStrength;
    creature.vx += (dx / dist) * force;
    creature.vy += (dy / dist) * force;
  }
}

export function updateCreature(
  creature: Creature,
  avatar: AvatarPos,
  params: PhysicsParams,
  repulsors: Repulsor[] = [],
): void {
  const { springStrength, damping } = params;

  applyRepulsion(creature, avatar, params);
  for (const repulsor of repulsors) {
    applyRepulsion(creature, repulsor, params, repulsor.radius);
  }

  // Spring to home
  creature.vx += (creature.hx - creature.x) * springStrength;
  creature.vy += (creature.hy - creature.y) * springStrength;

  // Damping
  creature.vx *= damping;
  creature.vy *= damping;

  // Position update (semi-implicit Euler)
  creature.x += creature.vx;
  creature.y += creature.vy;
}

export function updateAllCreatures(
  creatures: Creature[],
  avatar: AvatarPos,
  params: PhysicsParams,
): void {
  for (const c of creatures) {
    updateCreature(c, avatar, params);
  }
}
