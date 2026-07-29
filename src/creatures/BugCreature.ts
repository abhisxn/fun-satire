import type { Creature } from "./creatureTypes.js";

export const BUG_NAT_W = 100;
export const BUG_NAT_H = 80;

export function createBugCreature(
  hx: number,
  hy: number,
  scale: number,
): Creature {
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
  };
}

export function getBugRotation(
  creature: Creature,
  avatarX: number,
  avatarY: number,
): number {
  const dx = avatarX - creature.x;
  const dy = avatarY - creature.y;
  return Math.atan2(dy, dx) * (180 / Math.PI) + 180;
}
