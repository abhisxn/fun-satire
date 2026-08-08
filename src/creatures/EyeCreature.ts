import type { Creature } from "./creatureTypes.js";
import { playHoverTone } from "../audio/hoverTones";

export const EYE_NAT_W = 115;
export const EYE_NAT_H = 57;

const PUPIL_BASE_CX = 40.25;
const PUPIL_BASE_CY = 28.75;
const EYE_CX = 57.5;
const EYE_CY = 26.83;
const ELLIPSE_A = 35;
const ELLIPSE_B = 5;

const PUPIL_COLORS = ['#3D3229', '#2D2520', '#4A3528', '#5C4033', '#3D3229', '#5B7B8A', '#5B7B8A', '#4A5E4A'];

export interface EyeCreature extends Creature {
  pupil: SVGCircleElement;
  nextBlink: number;
  blinking: boolean;
  blinkStart: number;
  rotFactor: number;
}

export function createEyeCreature(
  hx: number,
  hy: number,
  scale: number,
  svgMarkup: string,
  uid: string,
): EyeCreature {
  const w = EYE_NAT_W * scale;
  const h = EYE_NAT_H * scale;

  const el = document.createElement('div');
  el.className = 'wrap';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;

  // Make SVG IDs unique to avoid conflicts
  let markup = svgMarkup
    .replace(/clip0_18_102/g, `clip_${uid}`)
    .replace(/mask0_18_102/g, `mask_${uid}`);
  el.innerHTML = markup;

  const svg = el.querySelector('svg');
  svg!.style.display = 'block';
  svg!.style.width = '100%';
  svg!.style.height = '100%';
  const pupil = svg!.querySelector('circle') as SVGCircleElement;
  pupil.setAttribute('fill', PUPIL_COLORS[Math.floor(Math.random() * PUPIL_COLORS.length)]);

  return {
    el,
    pupil,
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
    nextBlink: Date.now() + 2000 + Math.random() * 4000,
    blinking: false,
    blinkStart: 0,
    rotFactor: 0.06 + Math.random() * 0.14,
  };
}

export function updateEyePupil(
  eye: EyeCreature,
  avatarX: number,
  avatarY: number,
): void {
  // Calculate direction from eye to avatar
  const tmx = avatarX - eye.x;
  const tmy = avatarY - eye.y;
  const td = Math.sqrt(tmx * tmx + tmy * tmy) || 1;
  const dirX = tmx / td;
  const dirY = tmy / td;

  // Apply rotation to get local direction
  const angleRad = Math.atan2(tmy, tmx);
  const fullAngle = angleRad * (180 / Math.PI);
  const rotation = fullAngle * eye.rotFactor;
  const rotRad = rotation * (Math.PI / 180);
  const cos = Math.cos(-rotRad);
  const sin = Math.sin(-rotRad);
  const localDirX = dirX * cos - dirY * sin;
  const localDirY = dirX * sin + dirY * cos;

  // Calculate pupil position on ellipse
  const theta = Math.atan2(localDirY, localDirX);
  const targetX = EYE_CX + ELLIPSE_A * Math.cos(theta);
  const targetY = EYE_CY + ELLIPSE_B * Math.sin(theta);
  const ox = targetX - PUPIL_BASE_CX;
  const oy = targetY - PUPIL_BASE_CY;

  // Move pupil toward avatar, with distance falloff
  const distFactor = Math.min(1, td / 150);
  eye.pupil.setAttribute('cx', String(PUPIL_BASE_CX + ox * distFactor));
  eye.pupil.setAttribute('cy', String(PUPIL_BASE_CY + oy * distFactor));
}

export function updateEyeBlink(eye: EyeCreature): number {
  const now = Date.now();
  let scaleY = 1;

  if (!eye.blinking && now > eye.nextBlink) {
    eye.blinking = true;
    eye.blinkStart = now;
  }

  if (eye.blinking) {
    const elapsed = now - eye.blinkStart;
    const blinkDuration = 120;
    if (elapsed < blinkDuration) {
      const half = blinkDuration / 2;
      if (elapsed < half) {
        scaleY = 1 - (elapsed / half) * 0.95;
      } else {
        scaleY = 0.05 + ((elapsed - half) / half) * 0.95;
      }
    } else {
      eye.blinking = false;
      eye.nextBlink = now + 2000 + Math.random() * 4000;
    }
  }

  return scaleY;
}

/** Trigger point only: called by CreatureGrid on hover-enter for eye-mode creatures. */
export function triggerEyeHoverTone(context: AudioContext): void {
  playHoverTone(context, "eyes");
}

export function loadEyeSvg(): Promise<string> {
  return fetch('/creatures/eye.svg')
    .then(r => r.text())
    .then(s => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(s, 'image/svg+xml');
      const circle = doc.querySelector('circle');
      if (circle) {
        circle.removeAttribute('transform');
        circle.setAttribute('cx', '40.25');
        circle.setAttribute('cy', '28.75');
      }
      return new XMLSerializer().serializeToString(doc);
    });
}
