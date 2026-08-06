import type { Creature } from "./creatureTypes.js";

export const FINGER_NAT_W = 405;
export const FINGER_NAT_H = 171;

export function createFingerCreature(
  hx: number,
  hy: number,
  scale: number,
): Creature {
  const w = FINGER_NAT_W * scale;
  const h = FINGER_NAT_H * scale;

  const el = document.createElement('div');
  el.className = 'wrap';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;

  const img = document.createElement('img');
  img.src = '/creatures/finger.png';
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
    spawnPopAtMs: 0,
    spawnDone: false,
    fadeStartMs: 0,
  };
}

export function getFingerRotation(
  creature: Creature,
  avatarX: number,
  avatarY: number,
): number {
  const dx = avatarX - creature.x;
  const dy = avatarY - creature.y;
  return Math.atan2(dy, dx) * (180 / Math.PI) + 180;
}
