# Sticker inflate/deflate: continuous crowd-pressure model

## Problem

The protest sticker's inflate/deflate visual (`StickerOverlay.baseScale`) currently only
updates at two discrete moments:

- `onProtestBackfireSettled` — fired once a MEDIUM/LOW backfire's spawn/respawn burst has
  fully appeared on screen, calling `setScaleForRaidSize(count, max)`.
- `onProtestWin` — fired once a full-power win's despawn sweep has fully finished, calling
  `lockSqueeze()` (fixed 0.55 floor).

Between those events — most notably during a raid's ongoing attrition drain (crowd shrinks
every `RAID_ATTRITION_INTERVAL_MS`) and during a win's despawn sweep itself (units clear out
one by one over several seconds) — the sticker's scale is frozen. It doesn't visually track
what's actually happening to the crowd in the moment.

This also means the same piece of logic (mapping crowd size → sticker scale) has two call
sites in `main.ts`, each wired to a different narrow event, rather than one source of truth.

## Goals

- The sticker's scale should track the live security-unit count continuously, not just at
  settle events — so it visibly deflates as a raid clears and inflates as one escalates,
  in near lockstep with the crowd itself.
- A full-power win still pops the sticker to a fixed, absolute floor scale (`SQUEEZE_MIN_SCALE
  = 0.55`) — not relative to whatever scale it was at before winning.
- Once locked by a win, the sticker stays at the floor scale until the next raid actually
  starts (not merely until the next backfire settles) — mirroring the existing "not a
  permanent lock, but not reactive either" behavior, just with the unlock trigger corrected
  to the right moment.
- Collapse the two scale call sites into one, so there's a single place that decides "what
  should the sticker's resting scale be right now."

## Non-goals

- No change to the power-band thresholds, boost formulas, or backfire escalation math in
  `RaidController` — this is purely about how the sticker visualizes crowd size.
- No change to the linear `[1, MAX_SCALE]` mapping shape, or to `SQUEEZE_MIN_SCALE`,
  `MAX_SCALE`, or the CSS transition timing/easing.
- No change to charging-state behavior — the sticker must still never visibly react while a
  charge is being held (see existing `StickerOverlay` doc comment on why a live preview
  during hold was a bug). This falls out for free: no units spawn/despawn while
  `state === 'charging'`, so the crowd-size-changed signal is naturally silent during a hold.

## Design

### RaidController: crowd-size-changed as a single audit point

Add a private `lastNotifiedCrowdCount` field. At the end of `tick()`, after all spawn/despawn/
attrition/respawn bookkeeping for that frame has run, compare `this.units.length` against it;
if different, fire a new callback and update the stored value:

```ts
onCrowdSizeChanged?: (securityUnitCount: number) => void;
```

This single check at the end of `tick()` covers every way the crowd's unit count can change
after the fact: attrition draining it down, staggered backfire respawns trickling in, and the
staggered despawn sweep (win or `startRecovery()`) removing units one at a time.

It does **not** cover the initial burst from `spawnPulse()`, since that happens synchronously
outside `tick()` and can leave `units.length` already different from
`lastNotifiedCrowdCount` before the next `tick()` call — so `spawnPulse()` also fires the
callback (and updates `lastNotifiedCrowdCount`) directly after its burst completes.

Add a second callback, `onRaidStart?: () => void`, fired at the existing idle→raiding
transition inside `spawnPulse()` (the `if (this.state === "idle") { ... }` branch). This is
the correct "the next raid has actually started" signal for un-clocking the sticker — not
"a backfire settled," which is what the current code implicitly (and wrongly) treats as the
unlock trigger via `setScaleForRaidSize` simply overwriting `baseScale` regardless of lock
state.

### StickerOverlay: an explicit, self-guarding lock

Add a `private locked = false` field.

- `lockSqueeze()` sets `locked = true` in addition to its existing behavior (unchanged
  otherwise: fixed floor scale, face swap).
- New `unlock(): void` sets `locked = false`. Does not itself touch scale — the next
  `setScaleForRaidSize()` call (which will follow immediately from the live crowd count once
  `onRaidStart` fires) supplies the new value.
- `setScaleForRaidSize()` becomes a no-op (early return) when `locked` is true. This moves
  the "don't overwrite a locked win-state" invariant into the overlay itself, so `main.ts`
  doesn't need to track lock state to decide whether it's safe to call.

### main.ts: rewire to the continuous signal

- `onCrowdSizeChanged: (count) => { if (activeOverlay instanceof StickerOverlay) activeOverlay.setScaleForRaidSize(count, SECURITY_MAX_UNITS); }`
- `onRaidStart: () => { if (activeOverlay instanceof StickerOverlay) activeOverlay.unlock(); }`
- Remove the `onProtestBackfireSettled` wiring and the callback from `RaidControllerConfig`/
  `RaidController` entirely — its only consumer was the scale call now superseded by
  `onCrowdSizeChanged`. (Confirmed via grep: no other call site references it.)
- `onProtestWin` is unchanged: still calls `lockSqueeze()` and recomputes the post-win repel
  radius from the sticker's live post-shrink width.

### Why this doesn't need extra smoothing logic

`StickerOverlay.el` already carries a 1s `cubic-bezier(0.4,0,0.2,1)` transition on `transform`
(`SQUEEZE_TRANSITION`). Retargeting a CSS transition mid-flight — which is what happens when
`setScaleForRaidSize()` fires again before the previous transition has finished — causes the
browser to smoothly re-ease toward the new target from the current interpolated value, rather
than snapping. So firing the callback once per actual unit-count change (already throttled by
the `lastNotifiedCrowdCount` comparison, not per-frame) is sufficient to produce a continuous
"chase" visual with no additional interpolation code needed.

## Data flow (updated)

```
RaidController.tick()
  → units.length changes (attrition / respawn trickle / despawn sweep)
  → onCrowdSizeChanged(count)
  → main.ts → StickerOverlay.setScaleForRaidSize(count, max)   [no-op if locked]

RaidController.spawnPulse()  (idle → raiding)
  → onRaidStart()
  → main.ts → StickerOverlay.unlock()

RaidController.releaseCharge()  (FULL power, sweep finishes)
  → onProtestWin()  [unchanged]
  → main.ts → StickerOverlay.lockSqueeze()  [sets locked = true]
```

## Testing

- `RaidController` unit tests: `onCrowdSizeChanged` fires exactly once per actual count
  change (not once per `tick()` call when the count is unchanged), covering attrition,
  staggered respawn trickle-in, and staggered despawn sweep. `onRaidStart` fires exactly at
  the idle→raiding transition, not on subsequent pulses within the same raid.
- `StickerOverlay` unit tests: `setScaleForRaidSize()` is a no-op while `locked`;
  `unlock()` restores normal behavior; `lockSqueeze()` sets `locked`.
- Manual verification in-browser (required — this touches `creatures/`, per project human-
  testing rule): trigger a raid, let attrition drain it and confirm the sticker visibly
  shrinks along the way; trigger a MEDIUM/LOW backfire during an active raid and confirm the
  sticker visibly swells as respawns trickle in; land a FULL-power win and confirm the
  sticker deflates in step with the despawn sweep, then pops to the locked floor scale once
  the sweep finishes; confirm holding a charge never visibly changes the sticker regardless
  of which power band it's about to land in.
