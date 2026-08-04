import type { Creature } from "./creatureTypes.js";
import type { PhysicsParams } from "./creaturePhysics.js";

export const COCKROACH_NAT_W = 420;
export const COCKROACH_NAT_H = 216;

export interface CockroachCreature extends Creature {
  crawlAngle: number;
  crawlSpeed: number;
  nextTurn: number;
}

export function createCockroachCreature(
  hx: number,
  hy: number,
  scale: number,
): CockroachCreature {
  const w = COCKROACH_NAT_W * scale;
  const h = COCKROACH_NAT_H * scale;

  const el = document.createElement('div');
  el.className = 'wrap';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.position = 'absolute';
  el.style.pointerEvents = 'none';
  el.style.willChange = 'transform';

  const img = document.createElement('img');
  img.src = '/creatures/cockroach.png';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.display = 'block';
  img.draggable = false;
  el.appendChild(img);

  return {
    el,
    hx,
    hy,
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    scale,
    w,
    h,
    crawlAngle: Math.random() * Math.PI * 2,
    crawlSpeed: 0.5 + Math.random() * 1.5,
    nextTurn: Date.now() + 1000 + Math.random() * 3000,
  };
}

export function updateCockroach(
  cockroach: CockroachCreature,
  avatar: { x: number; y: number },
  params: PhysicsParams,
  vw: number,
  vh: number,
): void {
  const now = Date.now();
  
  // Random crawling behavior
  if (now > cockroach.nextTurn) {
    cockroach.crawlAngle += (Math.random() - 0.5) * Math.PI;
    cockroach.nextTurn = now + 1000 + Math.random() * 3000;
  }
  
  // Add crawling velocity
  const crawlVx = Math.cos(cockroach.crawlAngle) * cockroach.crawlSpeed;
  const crawlVy = Math.sin(cockroach.crawlAngle) * cockroach.crawlSpeed;
  
  // Apply repulsion from avatar
  const dx = cockroach.x - avatar.x;
  const dy = cockroach.y - avatar.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  
  let fx = (cockroach.hx - cockroach.x) * params.springStrength;
  let fy = (cockroach.hy - cockroach.y) * params.springStrength;
  
  if (dist < params.repelRadius) {
    const f = (1 - dist / params.repelRadius) * params.repelStrength;
    fx += (dx / dist) * f;
    fy += (dy / dist) * f;
  }
  
  // Combine crawling with physics
  cockroach.vx = (cockroach.vx + fx + crawlVx) * params.damping;
  cockroach.vy = (cockroach.vy + fy + crawlVy) * params.damping;
  cockroach.x += cockroach.vx;
  cockroach.y += cockroach.vy;
  
  // Wrap around screen edges
  if (cockroach.x < -cockroach.w) cockroach.x = vw;
  if (cockroach.x > vw) cockroach.x = -cockroach.w;
  if (cockroach.y < -cockroach.h) cockroach.y = vh;
  if (cockroach.y > vh) cockroach.y = -cockroach.h;
}

export function getCockroachRotation(
  creature: CockroachCreature,
): number {
  // Rotate to face crawling direction
  return creature.crawlAngle * (180 / Math.PI) + 180;
}
