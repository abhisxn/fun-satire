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

export function updateCreature(
  creature: Creature,
  avatar: AvatarPos,
  params: PhysicsParams,
): void {
  const { repelRadius, repelStrength, springStrength, damping } = params;

  // Repulsion from avatar
  const dx = creature.x - avatar.x;
  const dy = creature.y - avatar.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < repelRadius && dist > EPS) {
    const force = (1 - dist / repelRadius) * repelStrength;
    creature.vx += (dx / dist) * force;
    creature.vy += (dy / dist) * force;
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
