# Placard/Stick Compositing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flattened `placard_stick.png` with a layered DOM composite — a random placard PNG (from a pool of 18) positioned and centered on the `+` anchor mark of the standalone stick SVG artwork, rendered as a raster `<img>`.

**Architecture:** `PlacardCreature.ts` builds two `<img>` elements inside the existing `.wrap` div (stick underneath, placard on top, absolutely positioned). Anchor and sizing are computed with plain arithmetic from constants derived once from the stick SVG's viewBox — no runtime SVG parsing, no canvas.

**Tech Stack:** TypeScript, Vite, vitest + happy-dom (existing project stack, no new dependencies).

---

## Reference: full spec

See [docs/superpowers/specs/2026-08-06-placard-stick-compositing-design.md](../specs/2026-08-06-placard-stick-compositing-design.md) for the full design rationale (why DOM overlay, why the SVG anchor was extracted by hand, why placard sizing is normalized to stick width instead of native pixels).

## File Structure

- **Modify:** `src/creatures/PlacardCreature.ts` — replace `PLACARD_NAT_W`/`PLACARD_NAT_H` with `STICK_NAT_W`/`STICK_NAT_H` + `STICK_ANCHOR_PCT`; add `PLACARD_POOL`, `PLACARD_WIDTH_RATIO`, `pickRandomPlacard()`; rewrite `createPlacardCreature()` to build the two-layer DOM and position the placard layer.
- **Modify:** `tests/unit/placardCreature.test.ts` — update existing assertions for the renamed constants and new stick image src; add new tests for placard positioning math and random pool selection.
- No changes needed to `CreatureGrid.ts`, `creatureTypes.ts`, or `creaturePhysics.ts` — `Creature.w`/`Creature.h` continue to mean "the wrap element's own rendered size," which will now be the stick's scaled size instead of the old flattened image's.

**Note:** the 18 placard PNGs already live at `public/creatures/placards/placard_01.png` … `placard_18.png` (underscore naming, already renamed from the original Figma export names — no rename task needed), and `public/creatures/placard_stick.svg` is already present as the anchor-derivation reference. Both are committed on this branch already.

---

### Task 1: Replace flattened-image constants with stick constants and anchor percent

**Files:**
- Modify: `src/creatures/PlacardCreature.ts:1-4`
- Test: `tests/unit/placardCreature.test.ts`

- [ ] **Step 1: Update the failing test expectations for the renamed constants**

Replace the top of `tests/unit/placardCreature.test.ts` (imports) and the two dimension tests:

```typescript
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createPlacardCreature,
  getPlacardRotation,
  STICK_NAT_W,
  STICK_NAT_H,
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

    it('has correct dimensions based on scale', () => {
      const scale = 1.5;
      const placard = createPlacardCreature(0, 0, scale);

      expect(placard.w).toBe(STICK_NAT_W * scale);
      expect(placard.h).toBe(STICK_NAT_H * scale);
    });

    it('has correct dimensions at scale 1', () => {
      const placard = createPlacardCreature(0, 0, 1);

      expect(placard.w).toBe(STICK_NAT_W);
      expect(placard.h).toBe(STICK_NAT_H);
    });
```

Leave the rest of the file (`img is not draggable`, `getPlacardRotation` describe block) untouched for now — later tasks will update the remaining `img` assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- placardCreature`
Expected: FAIL — `STICK_NAT_W`/`STICK_NAT_H` are not exported from `PlacardCreature.ts` yet, and `placard.w`/`placard.h` still equal the old `405`/`171`-based values.

- [ ] **Step 3: Replace the natural-dimension constants in the source file**

In `src/creatures/PlacardCreature.ts`, replace lines 1-4:

```typescript
import type { Creature } from "./creatureTypes.js";

export const STICK_NAT_W = 36;
export const STICK_NAT_H = 444;

/** Position of the `+` anchor mark on the stick artwork, as a fraction of STICK_NAT_W/H. */
export const STICK_ANCHOR_PCT = { x: 0.5, y: 135 / 444 } as const;
```

Then, further down in `createPlacardCreature`, change the two lines that compute `w`/`h` from the old constants:

```typescript
  const w = STICK_NAT_W * scale;
  const h = STICK_NAT_H * scale;
```

(Leave the rest of the function body as-is for this task — the DOM structure itself is rewritten in Task 4.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- placardCreature`
Expected: PASS for the three updated tests. (Other tests in the file may still reference old behavior — that's expected; they get fixed in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add src/creatures/PlacardCreature.ts tests/unit/placardCreature.test.ts
git commit -m "refactor: replace flattened placard dimensions with stick-only constants"
```

---

### Task 2: Add the placard pool and random-selection helper

**Files:**
- Modify: `src/creatures/PlacardCreature.ts`
- Test: `tests/unit/placardCreature.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new `describe` block at the bottom of `tests/unit/placardCreature.test.ts` (before the final closing of the outer `describe`):

```typescript
  describe('pickRandomPlacard', () => {
    it('always returns an entry from PLACARD_POOL', () => {
      for (let i = 0; i < 20; i++) {
        const picked = pickRandomPlacard();
        expect(PLACARD_POOL).toContain(picked);
      }
    });
  });
```

Update the import at the top of the file to include the new exports:

```typescript
import {
  createPlacardCreature,
  getPlacardRotation,
  pickRandomPlacard,
  PLACARD_POOL,
  STICK_NAT_W,
  STICK_NAT_H,
} from '../../src/creatures/PlacardCreature';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- placardCreature`
Expected: FAIL — `pickRandomPlacard` and `PLACARD_POOL` are not exported yet.

- [ ] **Step 3: Add the pool constant, width ratio, and picker function**

Append to `src/creatures/PlacardCreature.ts`, after the `STICK_ANCHOR_PCT` constant added in Task 2:

```typescript
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

/** Placard display width, as a multiple of the stick's rendered width. Tune by eye. */
export const PLACARD_WIDTH_RATIO = 5.5;

export function pickRandomPlacard(): PlacardAsset {
  const index = Math.floor(Math.random() * PLACARD_POOL.length);
  return PLACARD_POOL[index];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- placardCreature`
Expected: PASS for `pickRandomPlacard` test. (DOM-structure tests further down may still be failing until Task 4 — that's expected.)

- [ ] **Step 5: Commit**

```bash
git add src/creatures/PlacardCreature.ts tests/unit/placardCreature.test.ts
git commit -m "feat: add placard asset pool and random selection"
```

---

### Task 3: Rewrite createPlacardCreature to layer and position the placard on the stick

**Files:**
- Modify: `src/creatures/PlacardCreature.ts`
- Test: `tests/unit/placardCreature.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the `it('element contains an img tag with correct src', ...)` and `it('img is not draggable', ...)` tests in `tests/unit/placardCreature.test.ts` with:

```typescript
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

    it('placard layer is centered on the stick anchor point', () => {
      const scale = 2;
      const placard = createPlacardCreature(0, 0, scale);

      const imgs = placard.el.querySelectorAll('img');
      const placardImg = imgs[1] as HTMLImageElement;
      const placardSrc = placardImg.src;
      const asset = PLACARD_POOL.find((entry) => placardSrc.endsWith(entry.src))!;

      const stickW = STICK_NAT_W * scale;
      const stickH = STICK_NAT_H * scale;
      const anchorPx = {
        x: STICK_ANCHOR_PCT.x * stickW,
        y: STICK_ANCHOR_PCT.y * stickH,
      };
      const expectedW = PLACARD_WIDTH_RATIO * stickW;
      const expectedH = expectedW * (asset.h / asset.w);
      const expectedLeft = anchorPx.x - expectedW / 2;
      const expectedTop = anchorPx.y - expectedH / 2;

      expect(placardImg.style.width).toBe(`${expectedW}px`);
      expect(placardImg.style.height).toBe(`${expectedH}px`);
      expect(placardImg.style.left).toBe(`${expectedLeft}px`);
      expect(placardImg.style.top).toBe(`${expectedTop}px`);
      expect(placardImg.style.position).toBe('absolute');
    });
```

Update the test file's import line to also pull in `STICK_ANCHOR_PCT` and `PLACARD_WIDTH_RATIO`:

```typescript
import {
  createPlacardCreature,
  getPlacardRotation,
  pickRandomPlacard,
  PLACARD_POOL,
  PLACARD_WIDTH_RATIO,
  STICK_NAT_W,
  STICK_NAT_H,
  STICK_ANCHOR_PCT,
} from '../../src/creatures/PlacardCreature';
```

Also update the `creates element with correct styles` test, which still references the old constant names, to use `STICK_NAT_W`/`STICK_NAT_H`:

```typescript
    it('creates element with correct styles', () => {
      const scale = 2;
      const placard = createPlacardCreature(0, 0, scale);

      expect(placard.el.className).toBe('wrap');
      expect(placard.el.style.position).toBe('absolute');
      expect(placard.el.style.pointerEvents).toBe('none');
      expect(placard.el.style.willChange).toBe('transform');
      expect(placard.el.style.width).toBe(`${STICK_NAT_W * scale}px`);
      expect(placard.el.style.height).toBe(`${STICK_NAT_H * scale}px`);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- placardCreature`
Expected: FAIL — `createPlacardCreature` still builds a single flattened `<img>`, so `querySelectorAll('img')` only returns one element and the new assertions fail.

- [ ] **Step 3: Rewrite createPlacardCreature**

Replace the full `createPlacardCreature` function body in `src/creatures/PlacardCreature.ts` with:

```typescript
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
  el.style.position = 'absolute';
  el.style.pointerEvents = 'none';
  el.style.willChange = 'transform';

  const stickImg = document.createElement('img');
  stickImg.src = '/creatures/placard_stick.png';
  stickImg.style.width = '100%';
  stickImg.style.height = '100%';
  stickImg.style.objectFit = 'contain';
  stickImg.style.display = 'block';
  stickImg.draggable = false;
  el.appendChild(stickImg);

  const asset = pickRandomPlacard();
  const placardW = PLACARD_WIDTH_RATIO * w;
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
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- placardCreature`
Expected: PASS for all tests in the file.

- [ ] **Step 5: Run the full unit suite to check for regressions elsewhere**

Run: `npm test`
Expected: PASS — no other test files import `PLACARD_NAT_W`/`PLACARD_NAT_H` (only `placardCreature.test.ts` did, and it's now updated).

- [ ] **Step 6: Commit**

```bash
git add src/creatures/PlacardCreature.ts tests/unit/placardCreature.test.ts
git commit -m "feat: layer random placard onto stick anchor point"
```

---

### Task 4: Typecheck, build, and verify visually in the browser

**Files:** none (verification only)

- [ ] **Step 1: Typecheck and build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors (in particular, no remaining references to the removed `PLACARD_NAT_W`/`PLACARD_NAT_H` exports anywhere in `src/`).

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: server starts; open the printed local URL in a browser.

- [ ] **Step 3: Switch to placard mode and inspect visually**

In the running app, switch the HUD to placard mode (however mode switching is triggered in the current UI — check `Hud.ts` if unclear). Confirm:
- Each placard creature shows a thin stick with a sign layered on top, roughly centered where the `+` mark would be (near the top of the stick, not the middle).
- Different creatures show visibly different placard designs (pool of 18 is being sampled).
- No placard renders absurdly oversized or tiny relative to its stick.

- [ ] **Step 4: Tune PLACARD_WIDTH_RATIO if needed**

If placards look too large or too small relative to the stick, edit `PLACARD_WIDTH_RATIO` in `src/creatures/PlacardCreature.ts` (increase to make placards bigger, decrease to make them smaller) and refresh the browser to re-check. Repeat until it looks right.

- [ ] **Step 5: If PLACARD_WIDTH_RATIO was changed, run tests and commit**

Run: `npm test -- placardCreature`
Expected: PASS (the positioning test derives its expected values from the same `PLACARD_WIDTH_RATIO` constant, so it stays correct regardless of the tuned value).

```bash
git add src/creatures/PlacardCreature.ts
git commit -m "tune: adjust placard width ratio after visual check"
```

(Skip this step if no tuning was needed.)

---

## Summary of exports changed on `PlacardCreature.ts`

| Before | After |
|---|---|
| `PLACARD_NAT_W`, `PLACARD_NAT_H` | `STICK_NAT_W`, `STICK_NAT_H` |
| *(none)* | `STICK_ANCHOR_PCT` |
| *(none)* | `PLACARD_POOL`, `PlacardAsset` |
| *(none)* | `PLACARD_WIDTH_RATIO` |
| *(none)* | `pickRandomPlacard()` |
| `createPlacardCreature()` (unchanged signature) | same signature, now builds two `<img>` layers instead of one |
| `getPlacardRotation()` | unchanged |
