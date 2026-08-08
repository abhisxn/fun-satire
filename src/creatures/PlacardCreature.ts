import type { Creature } from "./creatureTypes.js";
import { playHoverTone } from "../audio/hoverTones";

export const STICK_NAT_W = 36;
export const STICK_NAT_H = 444;

/** Position of the `+` anchor mark on the stick artwork, as a fraction of STICK_NAT_W/H. */
export const STICK_ANCHOR_PCT = { x: 0.5, y: 135 / 444 } as const;

export interface PlacardAsset {
  src: string;
  w: number;
  h: number;
}

export const PLACARD_POOL: PlacardAsset[] = [
  { src: '/creatures/placards/placard_01.png', w: 1314, h: 684 },
  { src: '/creatures/placards/placard_02.png', w: 1341, h: 684 },
  { src: '/creatures/placards/placard_03.png', w: 900, h: 684 },
  { src: '/creatures/placards/placard_04.png', w: 1665, h: 588 },
  { src: '/creatures/placards/placard_05.png', w: 1071, h: 588 },
  { src: '/creatures/placards/placard_06.png', w: 1089, h: 588 },
  { src: '/creatures/placards/placard_07.png', w: 1665, h: 732 },
  { src: '/creatures/placards/placard_08.png', w: 1419, h: 588 },
  { src: '/creatures/placards/placard_09.png', w: 1212, h: 588 },
  { src: '/creatures/placards/placard_10.png', w: 1071, h: 588 },
  { src: '/creatures/placards/placard_11.png', w: 1269, h: 732 },
  { src: '/creatures/placards/placard_12.png', w: 1071, h: 1020 },
  { src: '/creatures/placards/placard_13.png', w: 1071, h: 1020 },
  { src: '/creatures/placards/placard_14.png', w: 819, h: 444 },
  { src: '/creatures/placards/placard_15.png', w: 1401, h: 588 },
  { src: '/creatures/placards/placard_16.png', w: 1071, h: 588 },
  { src: '/creatures/placards/placard_17.png', w: 1071, h: 732 },
  { src: '/creatures/placards/placard_18.png', w: 1416, h: 732 },
];

/** Placard display width reference, in px, at signScale = 1. Tune by eye. */
export const PLACARD_BASE_W = 150;

export function pickRandomPlacard(): PlacardAsset {
  const index = Math.floor(Math.random() * PLACARD_POOL.length);
  return PLACARD_POOL[index];
}

/** Sign size randomized independently from the stick's scale, kept legible. */
function pickSignScale(): number {
  return 0.3 + Math.pow(Math.random(), 1.5) * 0.5;
}

export function createPlacardCreature(
  hx: number,
  hy: number,
  scale: number,
): Creature {
  const w = STICK_NAT_W * scale;
  const h = STICK_NAT_H * scale;

  const el = document.createElement('div');
  el.className = 'wrap';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;

  const stickImg = document.createElement('img');
  stickImg.src = '/creatures/placard_stick.png';
  stickImg.style.width = '100%';
  stickImg.style.height = '100%';
  stickImg.style.objectFit = 'contain';
  stickImg.style.display = 'block';
  stickImg.draggable = false;
  el.appendChild(stickImg);

  const asset = pickRandomPlacard();
  const signScale = pickSignScale();
  const placardW = PLACARD_BASE_W * signScale;
  const placardH = placardW * (asset.h / asset.w);
  const anchorPx = {
    x: STICK_ANCHOR_PCT.x * w,
    y: STICK_ANCHOR_PCT.y * h,
  };

  const placardImg = document.createElement('img');
  placardImg.src = asset.src;
  placardImg.style.position = 'absolute';
  placardImg.style.width = `${placardW}px`;
  placardImg.style.height = `${placardH}px`;
  placardImg.style.left = `${anchorPx.x - placardW / 2}px`;
  placardImg.style.top = `${anchorPx.y - placardH / 2}px`;
  placardImg.style.display = 'block';
  placardImg.draggable = false;
  el.appendChild(placardImg);

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
    waitingRespawn: false,
  };
}

export function getPlacardRotation(
  creature: Creature,
  avatarX: number,
  avatarY: number,
): number {
  const dx = avatarX - creature.x;
  const dy = avatarY - creature.y;
  return Math.atan2(dy, dx) * (180 / Math.PI) + 90;
}

/** Trigger point only: called by CreatureGrid on hover-enter for placard-mode creatures. */
export function triggerPlacardHoverTone(context: AudioContext): void {
  playHoverTone(context, "placard");
}
