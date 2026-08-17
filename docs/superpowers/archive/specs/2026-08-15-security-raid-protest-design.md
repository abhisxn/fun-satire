# Security Raid & Protest Recovery — Design

**Status:** draft, pending user review
**Branch:** `worktree-security-raid-protest` (isolated worktree, not touching `main` until this feature is ready)

## Summary

Shaking (rapid, reversing drag) the active avatar sticker/text overlay triggers a "raid": security sprites (police or RAF) spawn near the avatar in small waves, wander the scene, repel the crowd, and permanently thin it out by catching stragglers. A new "Protest" HUD button ends the raid: security poofs away one-by-one while the crowd count climbs back toward its maximum.

## Goals

- Reuse the existing drag/physics/spawn machinery wherever possible instead of building parallel systems.
- Keep `CreatureGrid`/`creaturePhysics.ts` changes additive (per project convention: these are shared, load-bearing modules).
- Raid and recovery should read as *waves*, not instant win/loss states.

## Components

### `src/creatures/SecurityCreature.ts` (new)
A single wandering security unit. Modeled on `BugSwarm.ts`'s waypoint-wander pattern, but a plain `<img>` (no leg rig):
- Renders `police.png` or `raf.png`, chosen randomly per spawn.
- Fixed size: **55px wide**, height scaled proportionally from each source image's aspect ratio (police.png 298×245 → ~45px tall; raf.png 260×232 → ~49px tall). This is deliberately much smaller than the avatar sticker's 160px default (and stays smaller than even a resized-down avatar, since it's a fixed size, not a fraction of the avatar's current size).
- Wanders continuously via anime.js waypoint animation (same `nextWaypoint`/`startWander` shape as `BugSwarm`), starting near its spawn point.
- Exposes `{ x, y }` position and a `poof(): void` / removal hook for the recovery sequence.

### `src/creatures/RaidController.ts` (new)
Owns raid state (`idle | raiding | recovering`) and orchestrates everything else:
- **Shake detection:** fed by the avatar's existing `onOverlayDragMove(x, y)` callback (already wired in `main.ts` for the drag-scratch sound). Keeps a short rolling buffer (~900ms) of move deltas; counts fast direction reversals (reusing a `FAST_DRAG_SPEED_PX_MS`-style threshold, consistent with `CreatureGrid`'s existing burst detector). ≥4 reversals in the window fires a "shake pulse," cooldown-gated to ~500ms between pulses.
- **Spawning:** each shake pulse spawns 2-3 `SecurityCreature`s near the avatar's current position, capped at **24 simultaneous units** total. No-op once the cap is hit (shaking harder doesn't escalate further).
- **Raid floor:** when a raid starts, remembers the crowd's target count at that moment; catches are refused once the grid's target count would drop below **25% of that starting count**, so a raid can thin the crowd hard but never empties the scene.
- **Recovery (Protest click):** transitions to `recovering`, stops accepting new shake pulses, poofs one security unit every ~350ms until the roster is empty, and calls `grid.setQuantity(QTY_MAX)` once immediately — the grid's existing staggered pop-in (`spawnPopAtMs` spread over `SPAWN_WAVE_MS`) already makes the crowd rise gradually, so no new ramp logic is needed. Once the last unit poofs, state returns to `idle`.

### `CreatureGrid` / `creaturePhysics.ts` extensions (additive)
- `applyRepulsion`/`updateCreature` change from a single optional `repulsor` to a `repulsors: Repulsor[]` array. The existing onboarding-card repulsor becomes a 1-element array; call sites updated accordingly. No behavior change for existing callers.
- `CreatureGrid.update(avatarX, avatarY, securityUnits?: SecurityRepulsor[])`: each security unit acts as a repulsor (radius ~160px, same strength model as the avatar) AND runs a throttled catch check (every ~400ms, max 3 catches per unit per tick) — any creature within the unit's tight catch radius (~50px) is spliced out of `this.creatures` and `targetCount` is decremented by 1, respecting the raid floor passed in from `RaidController`.
- New optional `onCreatureTerminated?: (x: number, y: number, w: number, h: number) => void` callback on `CreatureGridConfig`, invoked per catch so `main.ts` can trigger `spawnPoof` there — keeps `CreatureGrid` free of poof/DOM-effect orchestration, matching how `main.ts` already choreographs poofs for sticker swaps.

### `Hud.ts`
One new utility button ("Protest"), built the same way as the existing settings/gallery buttons (`buildUtilityBtn`), placed after the divider. `main.ts` wires its click to `raidController.startRecovery()`.

## Data Flow

```
avatar drag move (existing onOverlayDragMove)
        │
        ▼
RaidController.onAvatarMove(x,y) → shake pulse? → spawn SecurityCreature(s)
        │
        ▼ (every engine tick)
main.ts: grid.update(avatarX, avatarY, raidController.getSecurityUnits())
        │
        ├─ repulsion: crowd flees avatar + all security units
        └─ catch check: stragglers near security spliced out, targetCount--
                │
                ▼
        onCreatureTerminated(x,y,w,h) → main.ts → spawnPoof(...)

Protest button click
        │
        ▼
RaidController.startRecovery()
        ├─ stagger-poof each SecurityCreature (~350ms apart)
        └─ grid.setQuantity(QTY_MAX)  (existing staggered pop-in handles the "gradual rise")
```

## Error Handling / Edge Cases

- Shake pulses while `recovering` or once the 24-unit cap is hit: no-op, no error.
- Catching creatures at/below the raid floor: no-op (repulsion still applies, just no further removal).
- If the avatar overlay is swapped or removed mid-raid (user picks a new sticker), `RaidController` keeps running against the new attractor's move events — the raid isn't tied to a specific sticker instance.
- Resize during a raid: existing `grid.respawn()` resize handler already re-lays-out the grid; security units are unaffected (they wander freely, not grid-anchored).

## Testing

- Pure-function unit tests (mirroring `CreatureGrid.ts`'s existing style, e.g. `computeSpawnProgress`/`idleVisibleFraction`):
  - shake reversal-counting logic (given a sequence of deltas, does it cross the pulse threshold at the right point, and does cooldown correctly gate repeats)
  - catch-radius selection / raid-floor clamping (given creature positions + security units + a floor, which creatures are removed and does it stop at the floor)
- Manual browser verification per project convention (this touches `physics/`, `creatures/`, `hud/`): shake the avatar, confirm security spawns/wanders/repels/catches, click Protest, confirm security poofs out and crowd rises to max.

## Out of Scope

- Device-motion-based shake (mobile accelerometer) — this spec covers pointer-drag shake only.
- Any change to the existing `eyes`/`pointedFinger`/`cockroach`/`placard` mode system — security is an orthogonal overlay layer, not a new `CreatureMode`.
