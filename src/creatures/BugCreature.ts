import type { Creature } from "./creatureTypes.js";
import type { PhysicsParams } from "./creaturePhysics.js";

export const BUG_NAT_W = 100;
export const BUG_NAT_H = 80;

export interface BugCreature extends Creature {
  crawlAngle: number;
  crawlSpeed: number;
  nextTurn: number;
}

export function createBugCreature(
  hx: number,
  hy: number,
  scale: number,
): BugCreature {
  const w = BUG_NAT_W * scale;
  const h = BUG_NAT_H * scale;

  const el = document.createElement('div');
  el.className = 'wrap';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.position = 'absolute';
  el.style.pointerEvents = 'none';
  el.style.willChange = 'transform';

  const img = document.createElement('img');
  img.src = '/creatures/bug.svg';
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

export function updateBug(
  bug: BugCreature,
  avatar: { x: number; y: number },
  params: PhysicsParams,
  vw: number,
  vh: number,
): void {
  const now = Date.now();

  // Random crawling behavior
  if (now > bug.nextTurn) {
    bug.crawlAngle += (Math.random() - 0.5) * Math.PI;
    bug.nextTurn = now + 1000 + Math.random() * 3000;
  }

  // Add crawling velocity
  const crawlVx = Math.cos(bug.crawlAngle) * bug.crawlSpeed;
  const crawlVy = Math.sin(bug.crawlAngle) * bug.crawlSpeed;

  // Apply repulsion from avatar
  const dx = bug.x - avatar.x;
  const dy = bug.y - avatar.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  let fx = (bug.hx - bug.x) * params.springStrength;
  let fy = (bug.hy - bug.y) * params.springStrength;

  if (dist < params.repelRadius) {
    const f = (1 - dist / params.repelRadius) * params.repelStrength;
    fx += (dx / dist) * f;
    fy += (dy / dist) * f;
  }

  // Combine crawling with physics
  bug.vx = (bug.vx + fx + crawlVx) * params.damping;
  bug.vy = (bug.vy + fy + crawlVy) * params.damping;
  bug.x += bug.vx;
  bug.y += bug.vy;

  // Wrap around screen edges
  if (bug.x < -bug.w) bug.x = vw;
  if (bug.x > vw) bug.x = -bug.w;
  if (bug.y < -bug.h) bug.y = vh;
  if (bug.y > vh) bug.y = -bug.h;
}

export function getBugRotation(bug: BugCreature): number {
  // Rotate to face crawling direction
  return bug.crawlAngle * (180 / Math.PI) + 180;
}
