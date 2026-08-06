import type { Creature } from "./creatureTypes.js";

export const PLACARD_NAT_W = 405;
export const PLACARD_NAT_H = 171;

export function createPlacardCreature(
  hx: number,
  hy: number,
  scale: number,
): Creature {
  const w = PLACARD_NAT_W * scale;
  const h = PLACARD_NAT_H * scale;

  const el = document.createElement('div');
  el.className = 'wrap';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.position = 'absolute';
  el.style.pointerEvents = 'none';
  el.style.willChange = 'transform';

  const img = document.createElement('img');
  img.src = '/creatures/placard_stick.png';
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

export function getPlacardRotation(
  creature: Creature,
  avatarX: number,
  avatarY: number,
): number {
  const dx = avatarX - creature.x;
  const dy = avatarY - creature.y;
  return Math.atan2(dy, dx) * (180 / Math.PI) + 180;
}
