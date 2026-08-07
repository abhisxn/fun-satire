import type { Creature } from "./creatureTypes";

export interface AvatarPos {
  x: number;
  y: number;
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
): void {
  const { repelRadius, repelStrength } = params;
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
  repulsor?: AvatarPos | null,
): void {
  const { springStrength, damping } = params;

  applyRepulsion(creature, avatar, params);
  if (repulsor) applyRepulsion(creature, repulsor, params);

  // Spring to home
  creature.vx += (creature.hx - creature.x) * springStrength;
  creature.vy += (creature.hy - creature.y) * springStrength;

  // Damping
  creature.vx *= damping;
  creature.vy *= damping;

  // Position update (semi-implicit Euler)
  creature.x += creature.vx;
  creature.y += creature.vy;

  // Rotation: face AWAY from avatar
  const angle = Math.atan2(avatar.y - creature.y, avatar.x - creature.x) * (180 / Math.PI) + 180;

  // Update DOM transform
  creature.el.style.transform = `translate(${creature.x - creature.w * creature.scale * 0.5}px, ${creature.y - creature.h * creature.scale * 0.5}px) scale(${creature.scale}) rotate(${angle}deg)`;
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
