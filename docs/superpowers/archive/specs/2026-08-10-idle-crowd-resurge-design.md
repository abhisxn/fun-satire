# Idle Crowd Decay & Quick-Drag Resurge

Date: 2026-08-10
Status: approved, ready for implementation plan

## Problem

Post-onboarding, the sticker (`StickerOverlay`/`TextOverlay`, whichever is `currentAttractor`)
is the *only* thing that moves the crowd's attractor — `main.ts` removes its `pointermove`
listener the moment the sticker is created, so plain mouse movement does nothing at all.
`CreatureGrid.update(avatarX, avatarY)` receives the sticker's position every frame regardless.

Today, two independent fixed-rate pickers run unconditionally in `update()`:

- **Fade-out**: up to `FADE_PICK_COUNT` (4) settled creatures start fading every
  `FADE_PICK_INTERVAL_MS` (1500ms) — ≈2.7/s.
- **Re-pop**: up to `REPOP_COUNT` (3) waiting (invisible) creatures pop back in every
  `REPOP_INTERVAL_MS` (2000ms) — ≈1.5/s.

Fade always outpaces re-pop, so the visible crowd drains toward a low, unplanned equilibrium
continuously — whether or not anyone is interacting. This reads as "idle decay" (and the user
likes that read) but isn't actually gated on activity, isn't tunable, and has no relationship to
dragging the sticker.

## Scope

- Make the drain genuinely idle-gated: full population while the sticker is being moved, decaying
  toward a low floor only after a period of no movement.
- Add a "resurge": a fast drag of the sticker floods the crowd back toward full population via a
  temporary burst in re-pop rate, using the existing pop-in animation.
- Raise the quantity slider's ceiling from 500 to 900.

Out of scope items are listed at the end.

## Design

### Activity tracking (new `CreatureGrid` state)

`update(avatarX, avatarY)` already runs every frame with the sticker's current position. Add:

```ts
private lastAvatarX: number | null = null;
private lastAvatarY: number | null = null;
private lastFrameMs: number = 0;
private lastActivityMs: number = Date.now();
private burstUntilMs: number = 0;
```

At the top of `update()`, before the existing physics loop:

```ts
if (this.lastAvatarX !== null) {
  const dx = avatarX - this.lastAvatarX;
  const dy = avatarY - this.lastAvatarY!;
  const dist = Math.hypot(dx, dy);
  if (dist > MOVEMENT_NOISE_PX) {
    this.lastActivityMs = now;
    const dt = Math.max(1, now - this.lastFrameMs);
    if (dragSpeedPxPerMs(dist, dt) > FAST_DRAG_SPEED_PX_MS) {
      this.burstUntilMs = now + BURST_DURATION_MS;
    }
  }
}
this.lastAvatarX = avatarX;
this.lastAvatarY = avatarY;
this.lastFrameMs = now;
```

`dragSpeedPxPerMs(dist, dtMs) => dist / dtMs` — a one-line pure helper, exported for unit testing.
`MOVEMENT_NOISE_PX = 1.5` filters out sub-pixel jitter so idle time doesn't reset on nothing.

`spawn()` resets `lastActivityMs = Date.now()` and `burstUntilMs = 0`, so a fresh spawn (initial
load, mode switch, respawn) always starts fully active, not mid-decay.

### Idle decay curve

A new pure, exported function in `CreatureGrid.ts`:

```ts
export function idleVisibleFraction(idleMs: number): number {
  if (idleMs <= IDLE_GRACE_MS) return 1;
  const t = Math.min(1, (idleMs - IDLE_GRACE_MS) / IDLE_DECAY_MS);
  return 1 - t * (1 - IDLE_FLOOR_FRACTION);
}
```

- `IDLE_GRACE_MS = 20_000` — 20s of stillness before any decay starts (a pause to read a placard
  shouldn't drain the crowd).
- `IDLE_DECAY_MS = 300_000` — linear ramp from grace-end to floor takes 5 minutes, matching what's
  already been observed.
- `IDLE_FLOOR_FRACTION = 0.02` — floor is 2% of the current target quantity, so it scales with the
  slider instead of always bottoming out at the same absolute number.

Each re-pop tick computes:

```ts
const idleMs = now - this.lastActivityMs;
const desiredVisibleCount = Math.max(
  IDLE_FLOOR_MIN_COUNT,
  Math.round(this.targetCount * idleVisibleFraction(idleMs)),
);
```

`IDLE_FLOOR_MIN_COUNT = 3` is an absolute safety net so a very small slider setting (down to
`QTY_MIN = 10`) never rounds the floor to 0 or 1.

### Re-pop becomes demand-driven

Replace the current unconditional re-pop block with one that closes the gap toward
`desiredVisibleCount`, capped per tick:

```ts
if (now - this.lastRepopPickMs >= REPOP_INTERVAL_MS) {
  this.lastRepopPickMs = now;
  const visibleCount = this.creatures.filter((c) => !c.waitingRespawn).length;
  const deficit = desiredVisibleCount - visibleCount;
  if (deficit > 0) {
    const burstCap = Math.max(REPOP_COUNT_BURST_MIN, Math.round(this.targetCount * REPOP_COUNT_BURST_FRACTION));
    const cap = now < this.burstUntilMs ? burstCap : REPOP_COUNT;
    const waiting = this.creatures.filter((c) => c.waitingRespawn);
    const count = Math.min(cap, deficit, waiting.length);
    // ...existing splice-and-pop-in loop, unchanged
  }
}
```

The burst cap scales with `targetCount` (15% per tick, floor 40) rather than being a flat number,
so a full floor-to-target recovery takes roughly the same wall-clock time — about 8-10s of
continued fast dragging — whether the slider is set to 300 or 900. A flat cap would have made the
900 case take 3-4x longer than the 300 case for the same "flick" gesture.

The fade-out tick is **untouched** — it keeps running as today's constant ambient churn
(`FADE_PICK_COUNT`/`FADE_PICK_INTERVAL_MS`), which is what gives the crowd its "alive" feel even
at full population, and also what continuously rotates *which* creatures make up the idle floor
(rather than freezing on the same 3-4 forever).

Updated/new constants (starting defaults — exact feel needs a playtest pass per the human-testing
gate below):

```ts
export const REPOP_INTERVAL_MS = 1500;   // was 2000 — aligned to FADE_PICK_INTERVAL_MS
export const REPOP_COUNT = 5;            // was 3 — small margin over FADE_PICK_COUNT (4) so
                                          // active state can always fully sustain target
export const REPOP_COUNT_BURST_FRACTION = 0.15; // per-tick burst cap as a fraction of targetCount
export const REPOP_COUNT_BURST_MIN = 40;        // floor for the burst cap at small targetCount
export const MOVEMENT_NOISE_PX = 1.5;
export const IDLE_GRACE_MS = 20_000;
export const IDLE_DECAY_MS = 300_000;
export const IDLE_FLOOR_FRACTION = 0.02;
export const IDLE_FLOOR_MIN_COUNT = 3;
export const FAST_DRAG_SPEED_PX_MS = 1.2;  // ≈1200px/s
export const BURST_DURATION_MS = 3_000;
```

No new fields on `Creature` — all new state lives on `CreatureGrid` itself, not per-creature, so
`creatureTypes.ts` and the four per-mode factories are untouched.

### Fast-drag resurge behavior

- Any sticker movement above the noise threshold resets `lastActivityMs`, which immediately
  recomputes `desiredVisibleCount` back toward full and lets the demand-driven re-pop tick close
  the gap at the *normal* rate (`REPOP_COUNT`). This alone stops further decay and starts a gentle
  recovery — "slow/gentle dragging pauses decay" per the approved design.
- Everything above is contained entirely within `CreatureGrid.ts` (`src/creatures/`). It reads
  `avatarX`/`avatarY`, which `update()` already receives every frame, and does not touch
  `ForceField.ts` or `Engine.ts` — the two files CLAUDE.md calls out as shared/load-bearing and
  not to be touched routinely.
- Crossing `FAST_DRAG_SPEED_PX_MS` additionally opens the burst window, multiplying the re-pop cap
  to the scaled burst cap (see below) for `BURST_DURATION_MS`. Continued fast dragging keeps
  re-extending the window; it decays back to normal 3s after the last fast movement.
- A full recovery from the floor back to target takes a handful of seconds of continued fast
  dragging (see the throughput note below) — the crowd starts visibly flooding back within one
  re-pop tick (≤1.5s), not instantly in a single frame.

### Quantity slider → 900

One-line change in `src/config/tokens.ts`: `QTY_MAX` from `500` to `900`.
`DEFAULT_CREATURE_QUANTITY` (300) is unchanged. `QTY_MIN`, `QTY_STEP` (10, in `FilterPanel.ts`),
and the slider's fill-percentage math already derive from `QTY_MAX`, so no other source changes.

## Out of scope

- No new audio/visual cue specifically marking "resurge started" beyond the existing pop-in
  animation creatures already have.
- No HUD control to tune decay timing or floor — constants only, consistent with how
  `SPAWN_WAVE_MS`/`SPAWN_POP_MS` are handled today.
- Idle decay applies uniformly across all four creature modes — it reuses the existing
  mode-agnostic fade/re-pop loop, no per-mode tuning.
- No change to fade-out behavior/rate.

## Testing

- Unit tests (new, alongside the existing `computeSpawnProgress` tests in this file's test
  suite):
  - `idleVisibleFraction`: at `idleMs = 0` → `1`; within grace → `1`; mid-ramp → linear value;
    at/past `IDLE_GRACE_MS + IDLE_DECAY_MS` → `IDLE_FLOOR_FRACTION`.
  - `desiredVisibleCount` scaling: confirm the floor scales with `targetCount` (e.g. 300 → ~6,
    900 → ~18) and clamps to `IDLE_FLOOR_MIN_COUNT` at small `targetCount`.
  - `dragSpeedPxPerMs`: basic distance/time math.
- Manual (required — this touches `src/creatures/CreatureGrid.ts`, per CLAUDE.md's human-testing
  gate): `npm run dev`, let the crowd sit idle post-onboarding and confirm it settles near the
  ~2% floor by ~5 minutes; flick-drag the sticker and confirm the crowd starts visibly flooding
  back within a couple seconds and reaches full population within ~10s of continued flicking;
  slow-drag and confirm decay pauses without a dramatic burst; bump the quantity slider to 900 and
  eyeball performance.
