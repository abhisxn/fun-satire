import type { Creature } from "./creatureTypes.js";
import { playHoverTone } from "../audio/hoverTones";

export const EYE_NAT_W = 115;
export const EYE_NAT_H = 57;

const IRIS_BASE_CX = 40.25;
const IRIS_BASE_CY = 28.75;
const EYE_CX = 57.5;
const EYE_CY = 26.83;
const ELLIPSE_A = 35;
const ELLIPSE_B = 5;

const IRIS_COLORS = ['#3D3229', '#2D2520', '#4A3528', '#5C4033', '#3D3229', '#5B7B8A', '#5B7B8A', '#4A5E4A'];

/** Pupil radius as a fraction of the iris's own radius. */
const PUPIL_RADIUS_RATIO = 0.35;
/** How much darker the pupil is than the iris (0-1). */
const PUPIL_DARKEN_AMOUNT = 0.2;

export interface EyeCreature extends Creature {
  iris: SVGCircleElement;
  pupil: SVGCircleElement;
  nextBlink: number;
  blinking: boolean;
  blinkStart: number;
  rotFactor: number;
}

/** Pure: darkens a "#rrggbb" hex color by `amount` (0-1), channel-wise. */
export function darkenHexColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const toHex = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r * (1 - amount))}${toHex(g * (1 - amount))}${toHex(b * (1 - amount))}`;
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

  const iris = svg!.querySelector('circle') as SVGCircleElement;
  const irisColor = IRIS_COLORS[Math.floor(Math.random() * IRIS_COLORS.length)]!;
  iris.setAttribute('fill', irisColor);

  // The pupil doesn't exist in the static SVG asset — created here, sized off
  // the iris's own radius so it scales correctly whichever markup is passed in
  // (the real eye.svg or a smaller test fixture), and inserted right after the
  // iris in the same <svg> so it paints on top.
  const irisRadius = parseFloat(iris.getAttribute('r') || '0');
  const pupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pupil.setAttribute('cx', iris.getAttribute('cx') || String(IRIS_BASE_CX));
  pupil.setAttribute('cy', iris.getAttribute('cy') || String(IRIS_BASE_CY));
  pupil.setAttribute('r', String(irisRadius * PUPIL_RADIUS_RATIO));
  pupil.setAttribute('fill', darkenHexColor(irisColor, PUPIL_DARKEN_AMOUNT));
  iris.parentNode?.appendChild(pupil);

  return {
    el,
    iris,
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

  // Calculate gaze target on ellipse
  const theta = Math.atan2(localDirY, localDirX);
  const targetX = EYE_CX + ELLIPSE_A * Math.cos(theta);
  const targetY = EYE_CY + ELLIPSE_B * Math.sin(theta);
  const ox = targetX - IRIS_BASE_CX;
  const oy = targetY - IRIS_BASE_CY;

  // Move iris + pupil toward avatar together (concentric), with distance falloff
  const distFactor = Math.min(1, td / 150);
  const cx = String(IRIS_BASE_CX + ox * distFactor);
  const cy = String(IRIS_BASE_CY + oy * distFactor);
  eye.iris.setAttribute('cx', cx);
  eye.iris.setAttribute('cy', cy);
  eye.pupil.setAttribute('cx', cx);
  eye.pupil.setAttribute('cy', cy);
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
