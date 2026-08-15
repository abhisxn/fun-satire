# Eye Iris + Pupil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the eye creature's single colored circle from `pupil` to `iris` (it's anatomically the iris), and add a real pupil — a smaller circle, concentric with the iris, in a darker shade of the iris's own color, tracking the cursor/avatar in lockstep with it.

**Architecture:** One core change in `EyeCreature.ts` (interface, `createEyeCreature`, `updateEyePupil`, a new pure `darkenHexColor` helper), plus updates to the four test files that reference the old `pupil` field — one that tests `EyeCreature.ts` directly, three that hand-construct minimal fake eye objects to exercise `CreatureGrid`'s eye-mode render path without a real SVG asset.

**Tech Stack:** TypeScript, vitest + happy-dom.

**Spec:** [docs/superpowers/specs/2026-08-16-eye-iris-pupil-design.md](../specs/2026-08-16-eye-iris-pupil-design.md)

---

## Task 1: EyeCreature.ts — rename pupil to iris, add the real pupil

**Files:**
- Modify: `src/creatures/EyeCreature.ts` (whole file — see full replacement below)
- Test: `tests/unit/eyeCreature.test.ts`

- [ ] **Step 1: Update the existing tests that reference `.pupil` for what is now `.iris`**

In `tests/unit/eyeCreature.test.ts`, replace the `'assigns random pupil color'` test:

```typescript
    it('assigns a random iris color', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'test3');

      const fill = eye.iris.getAttribute('fill');
      expect(fill).not.toBeNull();
      expect(fill).not.toBe('');
    });
```

Replace the `describe('updateEyePupil', ...)` block's three tests:

```typescript
  describe('updateEyePupil', () => {
    it('moves the iris toward the avatar', () => {
      const eye = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil1');
      const initialCx = parseFloat(eye.iris.getAttribute('cx')!);

      updateEyePupil(eye, 200, 100);

      const newCx = parseFloat(eye.iris.getAttribute('cx')!);
      expect(newCx).not.toBe(initialCx);
    });

    it('moves the pupil in lockstep with the iris', () => {
      const eye = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil1b');

      updateEyePupil(eye, 200, 100);

      expect(eye.pupil.getAttribute('cx')).toBe(eye.iris.getAttribute('cx'));
      expect(eye.pupil.getAttribute('cy')).toBe(eye.iris.getAttribute('cy'));
    });

    it('handles avatar at same position', () => {
      const eye = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil2');

      expect(() => {
        updateEyePupil(eye, 100, 100);
      }).not.toThrow();
    });

    it('applies distance falloff', () => {
      const eye1 = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil3');
      const eye2 = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil4');

      updateEyePupil(eye1, 150, 100);
      updateEyePupil(eye2, 1000, 100);

      const cx1 = parseFloat(eye1.iris.getAttribute('cx')!);
      const cx2 = parseFloat(eye2.iris.getAttribute('cx')!);

      expect(Math.abs(cx2 - 40.25)).toBeGreaterThan(Math.abs(cx1 - 40.25));
    });
  });
```

Add a new `describe` block for the pupil's creation-time properties and the new color helper (place it after the `createEyeCreature` describe block):

```typescript
  describe('pupil creation', () => {
    it('is concentric with the iris and sized as a fraction of its radius', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'pupilcreate1');

      expect(eye.pupil.getAttribute('cx')).toBe(eye.iris.getAttribute('cx'));
      expect(eye.pupil.getAttribute('cy')).toBe(eye.iris.getAttribute('cy'));

      const irisR = parseFloat(eye.iris.getAttribute('r')!);
      const pupilR = parseFloat(eye.pupil.getAttribute('r')!);
      expect(pupilR).toBeCloseTo(irisR * 0.35, 5);
    });

    it('is a darkened shade of the iris\'s own color', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'pupilcreate2');

      const irisFill = eye.iris.getAttribute('fill')!;
      const pupilFill = eye.pupil.getAttribute('fill')!;

      expect(pupilFill).toBe(darkenHexColor(irisFill, 0.2));
      expect(pupilFill).not.toBe(irisFill);
    });
  });

  describe('darkenHexColor', () => {
    it('scales each channel down by the given amount', () => {
      expect(darkenHexColor('#ffffff', 0.2)).toBe('#cccccc');
    });

    it('leaves black unchanged', () => {
      expect(darkenHexColor('#000000', 0.5)).toBe('#000000');
    });

    it('rounds and clamps correctly for an arbitrary color', () => {
      expect(darkenHexColor('#5b7b8a', 0.2)).toBe('#49626e');
    });
  });
```

Update the import at the top of the file to include the new helper:

```typescript
import {
  createEyeCreature,
  updateEyePupil,
  updateEyeBlink,
  darkenHexColor,
  EYE_NAT_W,
  EYE_NAT_H,
} from '../../src/creatures/EyeCreature';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- eyeCreature`
Expected: FAIL — `eye.iris` is `undefined` (the field is still called `pupil`), and `darkenHexColor` isn't exported yet.

- [ ] **Step 3: Replace `src/creatures/EyeCreature.ts` in full**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- eyeCreature`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add src/creatures/EyeCreature.ts tests/unit/eyeCreature.test.ts
git commit -m "feat: split eye's single circle into iris + pupil

Renames the existing colored circle from pupil to iris (it's
anatomically the iris) and adds a real pupil: a smaller circle,
concentric with the iris, in a darkened shade of the iris's own
color (via a new darkenHexColor helper), tracking the avatar in
lockstep with the iris using the same gaze-tracking math."
```

---

## Task 2: Update the CreatureGrid-level fake-eye test mocks

**Files:**
- Modify: `tests/unit/creatureGridHoverTones.test.ts`
- Modify: `tests/unit/creatureGrid.test.ts`
- Modify: `tests/unit/creatureGridPopIn.test.ts`

Each of these files mocks `EyeCreature.ts` (`vi.mock('../../src/creatures/EyeCreature', ...)`) but spreads in the *real* module via `...actual` — so the real (now-renamed) `updateEyePupil`/`updateEyeBlink` still run against whatever `createEyeCreature` returns here. Each mock's `createEyeCreature` currently returns a stub with only `pupil: circle` — after Task 1, the real `updateEyePupil` expects both `eye.iris` and `eye.pupil` to be `SVGCircleElement`s, so these stubs need a second circle.

- [ ] **Step 1: Update `tests/unit/creatureGridHoverTones.test.ts`**

Replace the `createEyeCreature` stub inside its `vi.mock('../../src/creatures/EyeCreature', ...)` factory:

```typescript
    createEyeCreature: (hx: number, hy: number, scale: number) => {
      const el = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const iris = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      iris.setAttribute('cx', '40.25');
      iris.setAttribute('cy', '28.75');
      iris.setAttribute('r', '10');
      const pupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pupil.setAttribute('cx', '40.25');
      pupil.setAttribute('cy', '28.75');
      pupil.setAttribute('r', '3.5');
      svg.appendChild(iris);
      svg.appendChild(pupil);
      el.appendChild(svg);
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
        w: 115 * scale,
        h: 57 * scale,
        spawnPopAtMs: 0,
        spawnDone: false,
        fadeStartMs: 0,
        waitingRespawn: false,
        nextBlink: Date.now() + 10000,
        blinking: false,
        blinkStart: 0,
        rotFactor: 0.1,
      };
    },
```

- [ ] **Step 2: Update `tests/unit/creatureGrid.test.ts`**

Replace its `createEyeCreature` stub the same way:

```typescript
    createEyeCreature: (hx: number, hy: number, scale: number, _svgMarkup: string, _uid: string) => {
      const el = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const iris = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      iris.setAttribute('cx', '40.25');
      iris.setAttribute('cy', '28.75');
      iris.setAttribute('r', '10');
      const pupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pupil.setAttribute('cx', '40.25');
      pupil.setAttribute('cy', '28.75');
      pupil.setAttribute('r', '3.5');
      svg.appendChild(iris);
      svg.appendChild(pupil);
      el.appendChild(svg);
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
        w: 115 * scale,
        h: 57 * scale,
        nextBlink: Date.now() + 10000,
        blinking: false,
        blinkStart: 0,
        rotFactor: 0.1,
      };
    },
```

- [ ] **Step 3: Update `tests/unit/creatureGridPopIn.test.ts`**

Replace its `createEyeCreature` stub the same way (this one includes the spawn-state fields, matching its original):

```typescript
    createEyeCreature: (hx: number, hy: number, scale: number, _svgMarkup: string, _uid: string) => {
      const el = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const iris = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      iris.setAttribute('cx', '40.25');
      iris.setAttribute('cy', '28.75');
      iris.setAttribute('r', '10');
      const pupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pupil.setAttribute('cx', '40.25');
      pupil.setAttribute('cy', '28.75');
      pupil.setAttribute('r', '3.5');
      svg.appendChild(iris);
      svg.appendChild(pupil);
      el.appendChild(svg);
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
        w: 115 * scale,
        h: 57 * scale,
        spawnPopAtMs: 0,
        spawnDone: false,
        fadeStartMs: 0,
        waitingRespawn: false,
        nextBlink: Date.now() + 10000,
        blinking: false,
        blinkStart: 0,
        rotFactor: 0.1,
      };
```

(Leave the closing `};` and `},` that follow exactly as they already are in the file — this replaces only the body shown above.)

- [ ] **Step 4: Run all three affected test files**

Run: `npm test -- creatureGridHoverTones creatureGrid creatureGridPopIn`
Expected: PASS (all three files) — before this task, these would fail with something like "Cannot read properties of undefined (reading 'setAttribute')" the moment `CreatureGrid.update()` calls the real `updateEyePupil` against a stub missing `.iris`/`.pupil`.

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS (every file)

- [ ] **Step 6: Manually verify in the browser**

Run: `npm run dev`, switch to Eye mode (the eye-shaped HUD button), and confirm each eye shows a distinct smaller pupil circle inside its iris — both visibly tracking the cursor/avatar together as you move it around.

- [ ] **Step 7: Commit**

```bash
git add tests/unit/creatureGridHoverTones.test.ts tests/unit/creatureGrid.test.ts tests/unit/creatureGridPopIn.test.ts
git commit -m "test: update fake-eye mocks for the iris/pupil split

These CreatureGrid-level tests hand-construct a minimal eye object
but spread in the real (renamed) updateEyePupil/updateEyeBlink via
...actual — each stub now provides both an iris and a pupil circle
so those real functions don't crash reading eye.iris/eye.pupil."
```
