# Placard Sizing & Stick Ratio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance placard and stick scaling math so placard sign boards are prominently larger than sticks with crisp text readability across all aspect ratios.

**Architecture:** Introduce `STICK_SCALE_FACTOR = 0.65` and `PLACARD_BASE_W = 460` with aspect-compensated scaling ($\sqrt{\text{aspect} / 2.0}$) and tight randomization range $[0.88, 1.16]$ in `src/creatures/PlacardCreature.ts` and update `scaleFn` in `src/creatures/CreatureGrid.ts`.

**Tech Stack:** TypeScript 5.x, Vitest, Happy-DOM.

---

### Task 1: Update PlacardCreature constants, aspect-compensated scaling, and unit tests

**Files:**
- Modify: `src/creatures/PlacardCreature.ts:4-95`
- Test: `tests/unit/placardCreature.test.ts:1-173`

- [ ] **Step 1: Write updated failing unit tests**

Edit `tests/unit/placardCreature.test.ts` to assert the new `STICK_SCALE_FACTOR`, `PLACARD_BASE_W`, aspect ratio compensation, and bounds:

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createPlacardCreature,
  getPlacardRotation,
  pickRandomPlacard,
  PLACARD_POOL,
  PLACARD_BASE_W,
  STICK_NAT_W,
  STICK_NAT_H,
  STICK_ANCHOR_PCT,
  STICK_SCALE_FACTOR,
  REF_ASPECT,
} from '../../src/creatures/PlacardCreature';

describe('PlacardCreature', () => {
  describe('createPlacardCreature', () => {
    it('creates a creature with correct properties', () => {
      const scale = 2;
      const placard = createPlacardCreature(100, 200, scale);

      expect(placard.x).toBe(100);
      expect(placard.y).toBe(200);
      expect(placard.hx).toBe(100);
      expect(placard.hy).toBe(200);
      expect(placard.vx).toBe(0);
      expect(placard.vy).toBe(0);
      expect(placard.scale).toBe(scale);
    });

    it('has correct stick dimensions based on scale and STICK_SCALE_FACTOR', () => {
      const scale = 1.5;
      const placard = createPlacardCreature(0, 0, scale);

      expect(placard.w).toBe(STICK_NAT_W * scale * STICK_SCALE_FACTOR);
      expect(placard.h).toBe(STICK_NAT_H * scale * STICK_SCALE_FACTOR);
    });

    it('has correct stick dimensions at scale 1', () => {
      const placard = createPlacardCreature(0, 0, 1);

      expect(placard.w).toBe(STICK_NAT_W * STICK_SCALE_FACTOR);
      expect(placard.h).toBe(STICK_NAT_H * STICK_SCALE_FACTOR);
    });

    it('stick img has correct src', () => {
      const placard = createPlacardCreature(0, 0, 1);

      const imgs = placard.el.querySelectorAll('img');
      expect(imgs[0].src).toContain('/creatures/placard_stick.png');
    });

    it('placard img src is one of the pool entries', () => {
      const placard = createPlacardCreature(0, 0, 1);

      const imgs = placard.el.querySelectorAll('img');
      const placardSrc = imgs[1].src;
      const matches = PLACARD_POOL.some((entry) => placardSrc.endsWith(entry.src));
      expect(matches).toBe(true);
    });

    it('neither img is draggable', () => {
      const placard = createPlacardCreature(0, 0, 1);

      const imgs = placard.el.querySelectorAll('img');
      expect(imgs[0].draggable).toBe(false);
      expect(imgs[1].draggable).toBe(false);
    });

    it('placard layer is centered on stick anchor point with aspect-compensated sizing', () => {
      const scale = 1.0;
      const placard = createPlacardCreature(0, 0, scale);

      const imgs = placard.el.querySelectorAll('img');
      const placardImg = imgs[1] as HTMLImageElement;
      const placardSrc = placardImg.src;
      const asset = PLACARD_POOL.find((entry) => placardSrc.endsWith(entry.src))!;

      const stickW = STICK_NAT_W * scale * STICK_SCALE_FACTOR;
      const stickH = STICK_NAT_H * scale * STICK_SCALE_FACTOR;
      const anchorPx = {
        x: STICK_ANCHOR_PCT.x * stickW,
        y: STICK_ANCHOR_PCT.y * stickH,
      };

      const aspect = asset.w / asset.h;
      const aspectFactor = Math.sqrt(aspect / REF_ASPECT);
      const minExpectedW = PLACARD_BASE_W * scale * 0.88 * aspectFactor;
      const maxExpectedW = PLACARD_BASE_W * scale * 1.16 * aspectFactor;

      const actualW = parseFloat(placardImg.style.width);
      expect(actualW).toBeGreaterThanOrEqual(minExpectedW - 1e-4);
      expect(actualW).toBeLessThanOrEqual(maxExpectedW + 1e-4);

      const expectedH = actualW * (asset.h / asset.w);
      const expectedLeft = anchorPx.x - actualW / 2;
      const expectedTop = anchorPx.y - expectedH / 2;

      expect(parseFloat(placardImg.style.height)).toBeCloseTo(expectedH, 4);
      expect(parseFloat(placardImg.style.left)).toBeCloseTo(expectedLeft, 4);
      expect(parseFloat(placardImg.style.top)).toBeCloseTo(expectedTop, 4);
      expect(placardImg.style.position).toBe('absolute');
    });

    it('a distant creature at scale 0.20 still gets a readable placard width >= 60px', () => {
      const scale = 0.20;
      const placard = createPlacardCreature(0, 0, scale);

      const imgs = placard.el.querySelectorAll('img');
      const placardImg = imgs[1] as HTMLImageElement;
      const actualW = parseFloat(placardImg.style.width);

      expect(actualW).toBeGreaterThanOrEqual(60);
    });

    it('creates element with correct styles', () => {
      const scale = 2;
      const placard = createPlacardCreature(0, 0, scale);

      expect(placard.el.className).toBe('wrap');
      expect(placard.el.style.position).toBe('');
      expect(placard.el.style.pointerEvents).toBe('');
      expect(placard.el.style.willChange).toBe('');
      expect(placard.el.style.width).toBe(`${STICK_NAT_W * scale * STICK_SCALE_FACTOR}px`);
      expect(placard.el.style.height).toBe(`${STICK_NAT_H * scale * STICK_SCALE_FACTOR}px`);
    });
  });

  describe('getPlacardRotation', () => {
    it('points placard top at avatar (atan2 + 90)', () => {
      const placard = createPlacardCreature(0, 0, 1);
      const rotation = getPlacardRotation(placard, 100, 0);
      expect(rotation).toBe(90);
    });

    it('points placard at avatar when avatar is above', () => {
      const placard = createPlacardCreature(100, 100, 1);
      const rotation = getPlacardRotation(placard, 100, 0);
      expect(rotation).toBe(0);
    });

    it('points placard at avatar when avatar is below', () => {
      const placard = createPlacardCreature(100, 100, 1);
      const rotation = getPlacardRotation(placard, 100, 200);
      expect(rotation).toBe(180);
    });

    it('points placard at avatar when avatar is to the left', () => {
      const placard = createPlacardCreature(100, 100, 1);
      const rotation = getPlacardRotation(placard, 0, 100);
      expect(rotation).toBe(270);
    });
  });

  describe('pickRandomPlacard', () => {
    it('always returns an entry from PLACARD_POOL', () => {
      for (let i = 0; i < 20; i++) {
        const picked = pickRandomPlacard();
        expect(PLACARD_POOL).toContain(picked);
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/placardCreature.test.ts`
Expected: FAIL due to missing `STICK_SCALE_FACTOR`, `REF_ASPECT`, and old scaling logic.

- [ ] **Step 3: Update `src/creatures/PlacardCreature.ts` implementation**

Update `src/creatures/PlacardCreature.ts` with the new constants, ratio math, and aspect-aware sizing:

```ts
import type { Creature } from "./creatureTypes.js";
import { playHoverTone } from "../audio/hoverTones";

export const STICK_NAT_W = 36;
export const STICK_NAT_H = 444;

/** Scale factor applied to stick dimensions so stick serves as a proportionate handle. */
export const STICK_SCALE_FACTOR = 0.65;

/** Position of the `+` anchor mark on the stick artwork, as a fraction of STICK_NAT_W/H. */
export const STICK_ANCHOR_PCT = { x: 0.5, y: 135 / 444 } as const;

export interface PlacardAsset {
  src: string;
  w: number;
  h: number;
}

export const PLACARD_POOL: PlacardAsset[] = [
  { src: '/creatures/placards/placard_01.png', w: 560, h: 432 },
  { src: '/creatures/placards/placard_02.png', w: 868, h: 432 },
  { src: '/creatures/placards/placard_03.png', w: 808, h: 432 },
  { src: '/creatures/placards/placard_04.png', w: 808, h: 432 },
  { src: '/creatures/placards/placard_05.png', w: 946, h: 432 },
  { src: '/creatures/placards/placard_06.png', w: 1242, h: 548 },
  { src: '/creatures/placards/placard_07.png', w: 726, h: 432 },
  { src: '/creatures/placards/placard_08.png', w: 1142, h: 548 },
  { src: '/creatures/placards/placard_09.png', w: 902, h: 432 },
  { src: '/creatures/placards/placard_10.png', w: 740, h: 432 },
  { src: '/creatures/placards/placard_11.png', w: 1080, h: 432 },
  { src: '/creatures/placards/placard_12.png', w: 1124, h: 548 },
  { src: '/creatures/placards/placard_13.png', w: 1198, h: 432 },
  { src: '/creatures/placards/placard_14.png', w: 1210, h: 432 },
  { src: '/creatures/placards/placard_15.png', w: 546, h: 432 },
  { src: '/creatures/placards/placard_16.png', w: 714, h: 432 },
  { src: '/creatures/placards/placard_17.png', w: 714, h: 432 },
  { src: '/creatures/placards/placard_18.png', w: 1330, h: 432 },
  { src: '/creatures/placards/placard_19.png', w: 824, h: 432 },
];

/** Placard display width reference, in px, at scale = 1, signScale = 1. */
export const PLACARD_BASE_W = 460;

/** Standard reference aspect ratio (w/h) for aspect compensation. */
export const REF_ASPECT = 2.0;

export function pickRandomPlacard(): PlacardAsset {
  const index = Math.floor(Math.random() * PLACARD_POOL.length);
  return PLACARD_POOL[index]!;
}

/** Tight sign-to-stick variation [0.88, 1.16] ensuring organic variety without micro-sized signs. */
function pickSignScale(): number {
  return 0.88 + Math.random() * 0.28;
}

export function createPlacardCreature(
  hx: number,
  hy: number,
  scale: number,
): Creature {
  const w = STICK_NAT_W * scale * STICK_SCALE_FACTOR;
  const h = STICK_NAT_H * scale * STICK_SCALE_FACTOR;

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
  const aspect = asset.w / asset.h;
  const aspectFactor = Math.sqrt(aspect / REF_ASPECT);
  const placardW = PLACARD_BASE_W * scale * signScale * aspectFactor;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/placardCreature.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/creatures/PlacardCreature.ts tests/unit/placardCreature.test.ts
git commit -m "feat(placard): increase placard board scale and aspect-aware sizing"
```

---

### Task 2: Update CreatureGrid scaleFn for placard mode

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:199-207`

- [ ] **Step 1: Update `scaleFn` in `CreatureGrid.ts`**

Update `MODE_CONFIGS.placard` in `src/creatures/CreatureGrid.ts`:

```ts
  placard: {
    cols: 20,
    rows: 12,
    // Floor is 0.20 to ensure background placards stay clearly legible.
    // Range [0.20, 0.40] with power of 1.4 for natural depth perspective.
    scaleFn: () => 0.20 + Math.pow(Math.random(), 1.4) * 0.20,
  },
```

- [ ] **Step 2: Run unit tests**

Run: `npx vitest run tests/unit/creatureGrid.test.ts tests/unit/placardCreature.test.ts`
Expected: PASS

- [ ] **Step 3: Run build typecheck**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/creatures/CreatureGrid.ts
git commit -m "feat(placard): refine grid scale distribution for placard mode"
```
