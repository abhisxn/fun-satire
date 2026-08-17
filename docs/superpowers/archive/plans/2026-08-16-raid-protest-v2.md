# Raid/Protest v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the ten fixes in `docs/superpowers/specs/2026-08-16-raid-protest-v2-design.md` — z-index parity, security escort behavior, shake detection fix, a Figma-matched power meter with gated despawn, a despawn-source rework (repel-only + time attrition), real perf fixes, a crowd-clustering fix, new placard artwork, a pupil-color fix for dark irises, and a placard/stick proportion rework.

**Architecture:** All ten items build on the existing `RaidController`/`SecurityCreature`/`CreatureGrid` state-machine architecture from the shipped `security-raid-protest-fixes` plan — no new subsystems, only targeted edits to that trio plus one new `PowerMeter` HUD component following the existing `FilterPanel`/`GalleryPanel` class pattern.

**Tech Stack:** TypeScript, Vite, vitest + happy-dom, anime.js (mocked in tests).

**This plan is split across 7 files to stay under the project's 500-line-per-doc limit — work through them in order:**
1. This file — Tasks 1-4 (placard dims, placard/stick ratio, eye pupil fix, shake detection fix)
2. [tasks-5-6.md](2026-08-16-raid-protest-v2-tasks-5-6.md) — Task 5 (despawn rework), Task 6 (charge-throttle)
3. [task-7.md](2026-08-16-raid-protest-v2-task-7.md) — Task 7 (z-index parity)
4. [task-8.md](2026-08-16-raid-protest-v2-task-8.md) + [task-8b.md](2026-08-16-raid-protest-v2-task-8b.md) — Task 8 (security escort: natural wobble + collision avoidance)
5. [task-9.md](2026-08-16-raid-protest-v2-task-9.md) — Task 9 (power meter)
6. [tasks-10-11.md](2026-08-16-raid-protest-v2-tasks-10-11.md) — Task 10 (perf), Task 11 (final verification)

---

## Task 1: New placard artwork dimensions

**Files:**
- Modify: `src/creatures/PlacardCreature.ts:16-35`
- Test: `tests/unit/placardCreature.test.ts`

- [ ] **Step 1: Replace `PLACARD_POOL` with the new artwork's measured dimensions**

In `src/creatures/PlacardCreature.ts`, replace lines 16-35 (the `PLACARD_POOL` array) with:

```ts
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
```

- [ ] **Step 2: Run the existing placard tests to confirm nothing broke**

Run: `npm test -- placardCreature`
Expected: All existing tests still PASS. `pickRandomPlacard()`'s "always returns an entry from PLACARD_POOL" test now exercises 19 entries instead of 18 — no assertion changes needed, it already iterates the pool generically.

- [ ] **Step 3: Commit**

```bash
git add src/creatures/PlacardCreature.ts
git commit -m "feat: swap in new placard artwork with measured dimensions"
```

---

## Task 2: Placard/stick proportion rework

**Files:**
- Modify: `src/creatures/PlacardCreature.ts:45-48,74`
- Test: `tests/unit/placardCreature.test.ts:68-100`

- [ ] **Step 1: Update the failing test first — proportions must now scale with the creature's own `scale`**

In `tests/unit/placardCreature.test.ts`, replace the `'placard layer is centered on the stick anchor point'` test (lines 68-100) with:

```ts
    it('placard layer is centered on the stick anchor point, sized as a scale-relative ratio', () => {
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

      // Sign width is now PLACARD_BASE_W * creature scale * a randomized
      // ratio in [0.5, 1.4] — tied to the creature's own depth-scale instead
      // of being a fully independent absolute size, so bounds-check the
      // ratio range rather than asserting an exact value.
      const actualW = parseFloat(placardImg.style.width);
      expect(actualW).toBeGreaterThanOrEqual(PLACARD_BASE_W * scale * 0.5 - 1e-6);
      expect(actualW).toBeLessThanOrEqual(PLACARD_BASE_W * scale * 1.4 + 1e-6);

      const expectedH = actualW * (asset.h / asset.w);
      const expectedLeft = anchorPx.x - actualW / 2;
      const expectedTop = anchorPx.y - expectedH / 2;

      // happy-dom's CSSOM serializes style values with limited decimal
      // precision, so compare parsed floats rather than exact strings.
      expect(parseFloat(placardImg.style.height)).toBeCloseTo(expectedH, 5);
      expect(parseFloat(placardImg.style.left)).toBeCloseTo(expectedLeft, 5);
      expect(parseFloat(placardImg.style.top)).toBeCloseTo(expectedTop, 5);
      expect(placardImg.style.position).toBe('absolute');
    });

    it('a small/distant creature (low scale) always gets a proportionally small placard', () => {
      const scale = 0.2;
      const placard = createPlacardCreature(0, 0, scale);

      const imgs = placard.el.querySelectorAll('img');
      const placardImg = imgs[1] as HTMLImageElement;
      const actualW = parseFloat(placardImg.style.width);

      // At the old, scale-independent sizing this could have been as large
      // as PLACARD_BASE_W * 0.8 (120px) even at a tiny creature scale. Now
      // it must stay proportional to scale.
      expect(actualW).toBeLessThanOrEqual(PLACARD_BASE_W * scale * 1.4 + 1e-6);
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- placardCreature`
Expected: FAIL — `actualW` still computed independently of `scale` (bounds check fails since the current implementation can produce widths far outside `PLACARD_BASE_W * scale * [0.5, 1.4]` at `scale = 2` or `scale = 0.2`).

- [ ] **Step 3: Rework `pickSignScale` and its call site**

In `src/creatures/PlacardCreature.ts`, replace the `pickSignScale` function (lines 45-48):

```ts
/** Sign size randomized independently from the stick's scale, kept legible. */
function pickSignScale(): number {
  return 0.3 + Math.pow(Math.random(), 1.5) * 0.5;
}
```

with:

```ts
/** Sign-to-stick size ratio, applied on top of the creature's own depth-scale (not an
 * absolute multiplier) — so a small/distant creature always carries a proportionally
 * small sign, and a close/big creature a proportionally big one. The 0.5 floor is below
 * 1.0 so a sign can end up visibly smaller than its own stick, not just larger. */
function pickSignScale(): number {
  return 0.5 + Math.random() * 0.9;
}
```

Then update the one call site (around line 74):

```ts
  const asset = pickRandomPlacard();
  const signScale = pickSignScale();
  const placardW = PLACARD_BASE_W * signScale;
```

to:

```ts
  const asset = pickRandomPlacard();
  const signScale = pickSignScale();
  const placardW = PLACARD_BASE_W * scale * signScale;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- placardCreature`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/creatures/PlacardCreature.ts tests/unit/placardCreature.test.ts
git commit -m "feat: tie placard size to creature scale so signs can be smaller than their stick"
```

---

## Task 3: Pupil color fix for dark irises

**Files:**
- Modify: `src/creatures/EyeCreature.ts:30-39,80`
- Test: `tests/unit/eyeCreature.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/unit/eyeCreature.test.ts`, add `lightenHexColor` and `derivePupilColor` to the import from `'../../src/creatures/EyeCreature'` (alongside the existing `darkenHexColor`):

```ts
import {
  createEyeCreature,
  updateEyePupil,
  updateEyeBlink,
  darkenHexColor,
  lightenHexColor,
  derivePupilColor,
  EYE_NAT_W,
  EYE_NAT_H,
} from '../../src/creatures/EyeCreature';
```

Replace the existing `'is a darkened shade of the iris\'s own color'` test (lines 104-112) with:

```ts
    it('is a derived shade of the iris\'s own color, distinct from the iris', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'pupilcreate2');

      const irisFill = eye.iris.getAttribute('fill')!;
      const pupilFill = eye.pupil.getAttribute('fill')!;

      expect(pupilFill).toBe(derivePupilColor(irisFill, 0.2));
      expect(pupilFill).not.toBe(irisFill);
    });
```

Add two new `describe` blocks after the existing `describe('darkenHexColor', ...)` block:

```ts
  describe('lightenHexColor', () => {
    it('scales each channel up toward white by the given amount', () => {
      expect(lightenHexColor('#000000', 0.2)).toBe('#333333');
    });

    it('leaves white unchanged', () => {
      expect(lightenHexColor('#ffffff', 0.5)).toBe('#ffffff');
    });

    it('rounds and clamps correctly for an arbitrary dark color', () => {
      expect(lightenHexColor('#3d3229', 0.2)).toBe('#645b54');
    });
  });

  describe('derivePupilColor', () => {
    it('lightens a dark iris color (most of IRIS_COLORS is dark browns/greens)', () => {
      expect(derivePupilColor('#3d3229', 0.2)).toBe(lightenHexColor('#3d3229', 0.2));
      expect(derivePupilColor('#3d3229', 0.2)).not.toBe(darkenHexColor('#3d3229', 0.2));
    });

    it('darkens a light iris color', () => {
      expect(derivePupilColor('#cccccc', 0.2)).toBe(darkenHexColor('#cccccc', 0.2));
      expect(derivePupilColor('#cccccc', 0.2)).not.toBe(lightenHexColor('#cccccc', 0.2));
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- eyeCreature`
Expected: FAIL with `lightenHexColor`/`derivePupilColor` not exported from `EyeCreature.ts`.

- [ ] **Step 3: Implement `lightenHexColor` and `derivePupilColor`**

In `src/creatures/EyeCreature.ts`, after the existing `darkenHexColor` function (after line 39), add:

```ts
/** Pure: lightens a "#rrggbb" hex color by `amount` (0-1), channel-wise, mixing toward white. */
export function lightenHexColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const toHex = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r + (255 - r) * amount)}${toHex(g + (255 - g) * amount)}${toHex(b + (255 - b) * amount)}`;
}

/** Pure: derives a subtle pupil shade from the iris's own color. Most of IRIS_COLORS is
 * dark browns/greens, and darkening those further toward black leaves a pupil that's
 * nearly invisible against its own iris — so a dark iris (luminance below mid-gray)
 * lightens instead, while a lighter iris still darkens as before. Either way the pupil
 * stays visibly distinct from its iris. */
export function derivePupilColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 128 ? lightenHexColor(hex, amount) : darkenHexColor(hex, amount);
}
```

Then change the pupil's fill assignment (around line 80) from:

```ts
  pupil.setAttribute('fill', darkenHexColor(irisColor, PUPIL_DARKEN_AMOUNT));
```

to:

```ts
  pupil.setAttribute('fill', derivePupilColor(irisColor, PUPIL_DARKEN_AMOUNT));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- eyeCreature`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/creatures/EyeCreature.ts tests/unit/eyeCreature.test.ts
git commit -m "fix: lighten pupil instead of darkening it further on dark iris colors"
```

---

## Task 4: Shake detection fix

**Files:**
- Modify: `src/creatures/RaidController.ts:20-25,56-70`
- Test: `tests/unit/raidController.test.ts:25-107`

- [ ] **Step 1: Write the failing test**

In `tests/unit/raidController.test.ts`, add this test inside the existing `describe('detectShake', ...)` block (after the `'returns true for reversals on one axis...'` test, before its closing `});` at line 107):

```ts
  it('counts a reversal that lands on a natural deceleration dip (real hand-shake physics)', () => {
    // A real shake decelerates toward zero speed right at each turnaround —
    // the old implementation reset the pending direction on any slow
    // sample, discarding exactly the direction needed to detect the
    // reversal that follows it.
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(61, 0, 220),
      sample(0, 0, 240),
      sample(1, 0, 440),
      sample(60, 0, 460),
      sample(59, 0, 660),
      sample(0, 0, 680),
    ];
    expect(detectShake(samples)).toBe(true);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- raidController -t detectShake`
Expected: FAIL — `detectShake` returns `false` (the slow samples at t=220, 440, 660 each reset `havePrev`, so none of the three real reversals get counted).

- [ ] **Step 3: Fix `detectShake` and widen the window**

In `src/creatures/RaidController.ts`, change:

```ts
/** Sliding window over which reversals are counted (ms). */
export const SHAKE_WINDOW_MS = 600;
```

to:

```ts
/** Sliding window over which reversals are counted (ms). */
export const SHAKE_WINDOW_MS = 1100;
```

Then in `detectShake`, change:

```ts
    if (speed < SHAKE_MIN_SPEED_PX_MS) {
      havePrev = false;
      continue;
    }
```

to:

```ts
    if (speed < SHAKE_MIN_SPEED_PX_MS) {
      // Skip this sample without discarding the pending direction: a real
      // shake naturally decelerates toward zero speed at the exact moment
      // it reverses, so the sample right at a reversal is the one most
      // likely to dip below the speed floor. Resetting havePrev here would
      // throw away the direction from just before the deceleration,
      // undercounting exactly the reversals we're trying to detect.
      continue;
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- raidController -t detectShake`
Expected: PASS — all `detectShake` tests, including the new one.

- [ ] **Step 5: Run the full RaidController suite to confirm no regressions**

Run: `npm test -- raidController`
Expected: All tests PASS (the `SHAKE_WINDOW_MS` increase doesn't affect the other tests — they all use tightly-spaced samples well inside 1100ms).

- [ ] **Step 6: Commit**

```bash
git add src/creatures/RaidController.ts tests/unit/raidController.test.ts
git commit -m "fix: don't discard shake direction on natural deceleration dips; widen shake window"
```

---


---

Continued in [2026-08-16-raid-protest-v2-tasks-5-6.md](2026-08-16-raid-protest-v2-tasks-5-6.md).
