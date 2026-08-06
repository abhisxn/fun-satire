# Gradual Creature Pop-In

Date: 2026-08-07
Status: approved, ready for implementation plan

## Problem

Every creature mode (`eyes`, `pointedFinger`, `cockroach`, `placard`) currently populates the
whole crowd — up to the default 300, or whatever the quantity slider is set to — in a single
synchronous loop inside `CreatureGrid.spawn()`. All creatures appear on screen in the same
frame. The ask is for creatures to pop in one by one until the target count is reached, in any
creature mode.

## Scope

Applies to every path that adds creatures to the grid:

- Initial page load (`CreatureGrid.init()` → `spawn()`)
- Mode switch (`switchMode()` → `spawn()`)
- Respawn (`respawn()` → `spawn()`)
- Quantity slider increases (`setQuantity()`, the "add new creatures" branch)

Quantity slider *decreases* are unaffected — removal stays instant, as today.

## Design

### Data model

Add two fields to `Creature` (`src/creatures/creatureTypes.ts`):

```ts
spawnPopAtMs: number;  // absolute Date.now() timestamp this creature starts popping in
spawnDone: boolean;    // true once its pop animation has finished (perf shortcut)
```

Each of the four creature factories (`EyeCreature.ts`, `FingerCreature.ts`,
`CockroachCreature.ts`, `PlacardCreature.ts`) initializes these to `0` / `false` in its returned
object. `CreatureGrid` is the only place that assigns real values.

### Scheduling

In `CreatureGrid.ts`, add two constants:

```ts
const SPAWN_WAVE_MS = 1800; // whole batch finishes appearing within this window
const SPAWN_POP_MS = 380;   // duration of one creature's own pop animation
```

In `spawn()`, and in the "append new creatures" branch of `setQuantity()`, capture one
`batchStartMs = Date.now()` before the creation loop. Each creature created in that batch gets:

```ts
creature.spawnPopAtMs = batchStartMs + Math.random() * (SPAWN_WAVE_MS - SPAWN_POP_MS);
```

A uniformly random per-creature delay gives randomized reveal order for free — no explicit
shuffle step needed. Creatures created in `setQuantity()`'s reposition branch (existing indices
that are just moving to a new grid cell) are untouched and stay fully visible.

### Animation (per frame, in `update()`)

For each creature, compute:

```
t = now - creature.spawnPopAtMs
```

- `t <= 0`: creature has not reached its pop time yet — scale `0`, opacity `0`.
- `0 < t < SPAWN_POP_MS`: `progress = t / SPAWN_POP_MS`. Scale follows an `easeOutBack` curve
  (small overshoot past 1.0, settling back to 1.0 — the "pop" feel). Opacity ramps to 1 slightly
  faster than scale settles (e.g. `min(1, progress / 0.6)`) so the creature doesn't look ghostly
  during the overshoot.
- `t >= SPAWN_POP_MS`: scale `1`, opacity `1`; set `spawnDone = true` so subsequent frames skip
  recomputation for this creature (transform composition still runs, just without the
  progress/easing math).

The extra scale factor is composed into the transform string `update()` already builds each
frame: `translate(...) rotate(...) scale(popScale)` for non-eye modes, and combined with the
eyes' existing blink `scaleY(...)` (e.g. `scale(popScale) scaleY(blinkScale)`). Opacity is set
separately via `el.style.opacity`.

`easeOutBack` is a small local helper function in `CreatureGrid.ts` — no existing shared easing
utility exists in the codebase to reuse (checked: only `poofEffect.ts` and `BugSwarm.ts` have
their own inline easing, both via `element.animate()`, which doesn't fit here since `update()`
already manually recomputes transforms every frame).

### Physics during pop-in

Creatures still run normal repel/spring physics (`updateCreature()`) while invisible
(`t <= 0`) — cheap, avoids extra branching, and means they're already near their home position
(`hx`, `hy`) by the time they become visible.

### Interrupt behavior

No new cancellation logic needed. `spawn()` already calls `this.clear()` first, which removes
every existing creature (including any mid pop-in) before building the new batch with a fresh
`batchStartMs`. Switching mode or triggering respawn while a wave is in progress naturally
cancels it and starts a new one.

## Out of scope

- Despawn/removal animation (quantity decreases stay instant, as today).
- Reduced-motion handling — not requested, no existing pattern for it in this codebase.
- Per-mode tuning of wave/pop duration — one shared timing for all four modes, consistent with
  how `SPAWN_WAVE_MS`/`SPAWN_POP_MS` are the only new constants.
- Spatial reveal ordering (e.g. rippling from cursor) — explicitly deferred in favor of simple
  randomized order.

## Testing

- Unit test: given a batch of creatures with known `spawnPopAtMs` values, verify scale/opacity
  at `t < 0`, mid-animation, and `t >= SPAWN_POP_MS` match expected easing output.
- Manual (per CLAUDE.md — this touches nothing under `physics/`, `render/`, `effects/`, or
  `hud/` per the *new* v2 layout, but does touch the *actual* `src/creatures/` rendering path on
  `main`, so the same human-testing expectation applies): run `npm run dev`, switch between all
  four creature modes, bump the quantity slider up, and confirm creatures visibly pop in one by
  one rather than appearing all at once.
