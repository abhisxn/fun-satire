# Fun Satire — v2 Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the v2 Expansion scope from `docs/superpowers/specs/2026-07-25-fun-satire-v2-expansion-design.md`: two alternate Subject skins (figure/lotus), two alternate crowd modes (bugs/pointedFinger) alongside the existing eyes mode, a subject-look-at rotation behavior shared by all three crowd modes, HUD controls for crowd quantity and cursor-repel strength, a no-overlap physics rule for crowd members, and test-coverage/commit closure for the already-implemented-but-uncommitted `electricBurn`/`bugEat` powers.

**Architecture:** Purely additive to the existing content-as-data/registry pattern already locked in for v1. New render dispatch (`drawBug`, `drawPointedFinger`, `drawSubjectFigure`, `drawSubjectLotus`, `drawSubject`) is added to `src/render/drawers/`, keyed by `HudMode`/`HudSkin` enums widened in `src/hud/hudIcons.ts`. New physics — pairwise no-overlap separation and a shared look-at-rotation helper — are added to `src/physics/`, additive to `ForceField.ts`'s existing cursor-only force computation. `EntityFactory.ts` gains incremental spawn/despawn helpers for the quantity control. `Hud.ts`/`hud.css` gain new placard controls matching the existing torn-paper visual pattern. `main.ts` wires all of the above into the live tick loop. `Engine.ts`, `StateMachine.ts`, and `EntityStore.ts` are never touched by this plan; `ForceField.ts` is the one deliberate, spec-mandated exception to the "physics core files stay locked" rule (see spec §4 and the closing "Relationship to existing specs" section).

**Tech Stack:** TypeScript, Vite, Vitest (+ `happy-dom` environment for DOM-touching tests), Canvas 2D rendering, no new dependencies.

---

## Prerequisites

This plan assumes the v1-fix plan (`docs/superpowers/plans/2026-07-24-subject-mechanic-and-visual-polish.md`, implementing `docs/superpowers/specs/2026-07-24-subject-mechanic-and-visual-polish-design.md`) has landed first: a `subject` rig/entity exists in `EntityStore`, tracked by `main.ts` (a `subjectId: EntityId | null` module-level variable, matching that plan's Task 36 naming), with `src/render/drawers/drawSubject.ts` and `src/render/paperCut.ts` already created. Where this plan's tasks build on those files, they treat them as an interface contract (documented per-task below) rather than assuming undocumented internals — if the v1-fix plan's actual shipped shape differs from what a task assumes, adjust the import/signature to match the real file; do not invent a second competing utility.

Two v2 powers — `electricBurn` and `bugEat` — are **already fully implemented and wired** in the current tree (`src/effects/effectDefs/electricBurn.ts`, `src/effects/effectDefs/bugEat.ts`, registered in `src/main.ts`, `src/powers/index.ts`, `src/input/PowerController.ts`, `src/hud/hudIcons.ts`) but have zero test coverage and are uncommitted. Phase D below closes that gap; it is not new feature design.

---

## Phase A: Foundations (sequential)

### Task 1: Widen `HudMode`/`HudSkin` and add crowd-mode/skin icons, plus the mode→power lock map

**Files:**
- Modify: `src/hud/hudIcons.ts`
- Test: `tests/unit/hudIcons.test.ts` (new)

Per spec §2a, power is no longer independently selectable — each `HudMode` locks to exactly one `HudPower`. That mapping is added here, alongside the mode/skin/power icon registries it's a natural extension of.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/hudIcons.test.ts
import { describe, it, expect } from "vitest";
import { hudIcons, MODE_POWER_MAP, type HudMode, type HudSkin, type HudPower } from "../../src/hud/hudIcons";

describe("hudIcons", () => {
  const modes: HudMode[] = ["eyes", "bugs", "pointedFinger"];
  const skins: HudSkin[] = ["figure", "lotus"];
  const powers: HudPower[] = ["laserBurn", "electricBurn", "bugEat"];

  it("has a modeIcon entry for every HudMode", () => {
    for (const m of modes) {
      expect(typeof hudIcons.modeIcon[m]).toBe("string");
      expect(hudIcons.modeIcon[m].length).toBeGreaterThan(0);
    }
  });

  it("has a skinIcon entry for every HudSkin", () => {
    for (const s of skins) {
      expect(typeof hudIcons.skinIcon[s]).toBe("string");
      expect(hudIcons.skinIcon[s].length).toBeGreaterThan(0);
    }
  });

  it("leaves existing power icons untouched", () => {
    for (const p of powers) {
      expect(typeof hudIcons.powerIcon[p]).toBe("string");
      expect(hudIcons.powerIcon[p].length).toBeGreaterThan(0);
    }
  });
});

describe("MODE_POWER_MAP", () => {
  it("locks eyes to laserBurn, pointedFinger to electricBurn, bugs to bugEat", () => {
    expect(MODE_POWER_MAP.eyes).toBe("laserBurn");
    expect(MODE_POWER_MAP.pointedFinger).toBe("electricBurn");
    expect(MODE_POWER_MAP.bugs).toBe("bugEat");
  });

  it("has exactly one power per mode, covering every HudMode", () => {
    const modes: HudMode[] = ["eyes", "bugs", "pointedFinger"];
    for (const m of modes) {
      expect(typeof MODE_POWER_MAP[m]).toBe("string");
    }
    expect(Object.keys(MODE_POWER_MAP).sort()).toEqual([...modes].sort());
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/hudIcons.test.ts`
Expected: FAIL — `hudIcons.modeIcon.bugs`/`.pointedFinger` and `hudIcons.skinIcon` do not exist yet (`HudMode` is currently `"eyes"` only, `HudSkin` doesn't exist).

- [ ] **Step 3: Implement the widened types and icons**

```typescript
// src/hud/hudIcons.ts
export type HudMode = "eyes" | "bugs" | "pointedFinger";
export type HudSkin = "figure" | "lotus";
export type HudPower = "laserBurn" | "electricBurn" | "bugEat";

export const HUD_TEAR_PATH =
  "M4 8 L36 2 L70 6 L104 1 L138 5 L172 2 L196 9 L198 30 L195 52 L162 58 L128 62 L94 57 L60 61 L26 56 L2 34 Z";

export type HudIcons = {
  modeIcon: Record<HudMode, string>;
  skinIcon: Record<HudSkin, string>;
  powerIcon: Record<HudPower, string>;
};

/**
 * Per spec §2a: power is not independently selectable. Each HudMode locks to
 * exactly one HudPower, and switching mode switches the active power as a
 * side effect. This is the single source of truth for that lock — main.ts's
 * mode-change handler reads it to drive powerCtrl.setPower()/hud.setPower(),
 * replacing the old keyboard-shortcut (1/2/3) + POWER_CONFIGS wiring.
 */
export const MODE_POWER_MAP: Record<HudMode, HudPower> = {
  eyes: "laserBurn",
  pointedFinger: "electricBurn",
  bugs: "bugEat",
};

export const hudIcons: HudIcons = {
  modeIcon: {
    eyes:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="12" rx="9" ry="5.5" stroke="#2A2420" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="#5B7A8C"/></svg>',
    bugs:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="13" rx="7" ry="4.5" fill="#6D7A5E" stroke="#2A2420" stroke-width="1.2"/><path d="M6 9 L3 5 M18 9 L21 5 M6 15 L2 17 M18 15 L22 17" stroke="#2A2420" stroke-width="1.2" stroke-linecap="round"/></svg>',
    pointedFinger:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 20 L9 11 Q9 8 11 8 Q13 8 13 11 L13 4 Q13 2 15 2 Q17 2 17 4 L17 14 L19 14 Q21 14 21 16 L21 20 Z" fill="#E8A9A0" stroke="#2A2420" stroke-width="1.2"/></svg>',
  },
  skinIcon: {
    figure:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="7" r="4" fill="#5B7A8C" stroke="#2A2420" stroke-width="1.2"/><path d="M5 21 Q5 13 12 13 Q19 13 19 21 Z" fill="#5B7A8C" stroke="#2A2420" stroke-width="1.2"/></svg>',
    lotus:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2.4" fill="#E8A9A0" stroke="#2A2420" stroke-width="1"/><path d="M12 12 L12 3 M12 12 L19.5 8 M12 12 L19.5 16 M12 12 L12 21 M12 12 L4.5 16 M12 12 L4.5 8" stroke="#6D7A5E" stroke-width="1.4" stroke-linecap="round"/></svg>',
  },
  powerIcon: {
    laserBurn:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 20 L20 4" stroke="#E8A9A0" stroke-width="2.5" stroke-linecap="round"/></svg>',
    electricBurn:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2 L5 14 L11 14 L9 22 L19 9 L13 9 Z" fill="#E8A9A0" stroke="#2A2420" stroke-width="1"/></svg>',
    bugEat:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12 A8 8 0 1 1 12 20 L4 12 Z" fill="#6D7A5E" stroke="#2A2420" stroke-width="1.2"/></svg>',
  },
};
```

This replaces the file's current contents (previously `HudMode = "eyes"` only, no `HudSkin`, no `bugs`/`pointedFinger`/`figure`/`lotus` icons, no `MODE_POWER_MAP`). The `HUD_TEAR_PATH` constant and `powerIcon` entries are carried over unchanged from the existing file.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/hudIcons.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS — `Hud.ts` still only reads `hudIcons.modeIcon.eyes`/`hudIcons.powerIcon[...]` at this point, both of which are unchanged in shape.

- [ ] **Step 6: Commit**

```bash
git add src/hud/hudIcons.ts tests/unit/hudIcons.test.ts
git commit -m "feat(hud): widen HudMode to bugs/pointedFinger, add HudSkin icon sets, and lock mode->power via MODE_POWER_MAP"
```

### Task 2: `ForceField.ts` — repel multiplier and pairwise no-overlap separation

**Files:**
- Modify: `src/physics/ForceField.ts`
- Test: `tests/unit/forceFieldSeparation.test.ts` (new)

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/forceFieldSeparation.test.ts
import { describe, it, expect } from "vitest";
import { compute, computeSeparation, accumulateSeparation } from "../../src/physics/ForceField";

describe("ForceField repelMultiplier", () => {
  it("defaults to a multiplier of 1 when omitted", () => {
    const withDefault = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 } });
    const withOne = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 }, repelMultiplier: 1 });
    expect(withDefault.magnitude).toBeCloseTo(withOne.magnitude, 6);
  });

  it("scales magnitude linearly with repelMultiplier", () => {
    const base = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 }, repelMultiplier: 1 });
    const doubled = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 }, repelMultiplier: 2 });
    expect(doubled.magnitude).toBeCloseTo(base.magnitude * 2, 6);
  });

  it("clamps a negative repelMultiplier to zero force", () => {
    const result = compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 40, y: 0 }, repelMultiplier: -3 });
    expect(result.magnitude).toBe(0);
  });
});

describe("computeSeparation", () => {
  it("returns zero force for two members far enough apart", () => {
    const a = { pos: { x: 0, y: 0 }, radiusPx: 10 };
    const b = { pos: { x: 100, y: 0 }, radiusPx: 10 };
    const f = computeSeparation(a, b);
    expect(f.fx).toBe(0);
    expect(f.fy).toBe(0);
  });

  it("pushes apart along the connecting axis when overlapping", () => {
    const a = { pos: { x: 0, y: 0 }, radiusPx: 20 };
    const b = { pos: { x: 10, y: 0 }, radiusPx: 20 };
    const f = computeSeparation(a, b);
    expect(f.fx).toBeLessThan(0);
    expect(f.fy).toBeCloseTo(0, 6);
  });

  it("scales push magnitude with overlap depth", () => {
    const a = { pos: { x: 0, y: 0 }, radiusPx: 20 };
    const shallow = computeSeparation(a, { pos: { x: 38, y: 0 }, radiusPx: 20 });
    const deep = computeSeparation(a, { pos: { x: 10, y: 0 }, radiusPx: 20 });
    expect(Math.abs(deep.fx)).toBeGreaterThan(Math.abs(shallow.fx));
  });

  it("falls back to a stable push direction when members are exactly coincident", () => {
    const a = { pos: { x: 5, y: 5 }, radiusPx: 20 };
    const b = { pos: { x: 5, y: 5 }, radiusPx: 20 };
    const f = computeSeparation(a, b);
    expect(Number.isFinite(f.fx)).toBe(true);
    expect(Number.isFinite(f.fy)).toBe(true);
    expect(f.fx !== 0 || f.fy !== 0).toBe(true);
  });
});

describe("accumulateSeparation", () => {
  it("returns a zero force for a single isolated member", () => {
    const forces = accumulateSeparation([{ id: 1, pos: { x: 0, y: 0 }, radiusPx: 10 }]);
    expect(forces.get(1)).toEqual({ fx: 0, fy: 0 });
  });

  it("applies equal-and-opposite pushes to a close pair", () => {
    const forces = accumulateSeparation([
      { id: 1, pos: { x: 0, y: 0 }, radiusPx: 20 },
      { id: 2, pos: { x: 10, y: 0 }, radiusPx: 20 },
    ]);
    const f1 = forces.get(1)!;
    const f2 = forces.get(2)!;
    expect(f1.fx).toBeCloseTo(-f2.fx, 6);
    expect(f1.fy).toBeCloseTo(-f2.fy, 6);
  });

  it("resolves a dense 30-member cluster without leaving any member unresolved", () => {
    const members = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      pos: { x: (i % 6) * 8, y: Math.floor(i / 6) * 8 },
      radiusPx: 18,
    }));
    const forces = accumulateSeparation(members);
    expect(forces.size).toBe(30);
    let anyNonZero = false;
    for (const f of forces.values()) {
      expect(Number.isFinite(f.fx)).toBe(true);
      expect(Number.isFinite(f.fy)).toBe(true);
      if (f.fx !== 0 || f.fy !== 0) anyNonZero = true;
    }
    expect(anyNonZero).toBe(true);
  });

  it("scales all pushes by strengthMultiplier", () => {
    const members = [
      { id: 1, pos: { x: 0, y: 0 }, radiusPx: 20 },
      { id: 2, pos: { x: 10, y: 0 }, radiusPx: 20 },
    ];
    const base = accumulateSeparation(members).get(1)!;
    const doubled = accumulateSeparation(members, { strengthMultiplier: 2 }).get(1)!;
    expect(doubled.fx).toBeCloseTo(base.fx * 2, 6);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/forceFieldSeparation.test.ts`
Expected: FAIL — `repelMultiplier` is not accepted by `ForceFieldInput`, and `computeSeparation`/`accumulateSeparation` do not exist.

- [ ] **Step 3: Implement the extension**

```typescript
// src/physics/ForceField.ts — additions (existing FORCEFIELD/clampR/falloff/sampleAlongRay unchanged)

export const SEPARATION = Object.freeze({
  strength: 900,
  minStrengthFraction: 0.15,
} as const);

export type ForceFieldInput = {
  cursor: { x: number; y: number; active: boolean };
  entityPos: { x: number; y: number };
  entityScale?: number;
  repelMultiplier?: number;
};

// inside compute(input): after the existing r/falloff computation, before returning
export function compute(input: ForceFieldInput): ForceFieldResult {
  if (!input.cursor.active) return { fx: 0, fy: 0, magnitude: 0, dirX: 0, dirY: 0 };
  const dx = input.entityPos.x - input.cursor.x;
  const dy = input.entityPos.y - input.cursor.y;
  const rawR = Math.hypot(dx, dy);
  const r = clampR(rawR);
  const multiplier = Math.max(0, input.repelMultiplier ?? 1);
  const mag = falloff(r) * multiplier;
  if (mag === 0 || rawR < 1e-6) return { fx: 0, fy: 0, magnitude: 0, dirX: 0, dirY: 0 };
  const dirX = dx / rawR;
  const dirY = dy / rawR;
  return { fx: dirX * mag, fy: dirY * mag, magnitude: mag, dirX, dirY };
}

export type SeparationMember = { pos: { x: number; y: number }; radiusPx: number };
export type SeparationForce = { fx: number; fy: number };

export function computeSeparation(self: SeparationMember, other: SeparationMember): SeparationForce {
  const dx = self.pos.x - other.pos.x;
  const dy = self.pos.y - other.pos.y;
  const dist = Math.hypot(dx, dy);
  const minDist = self.radiusPx + other.radiusPx;
  const EPS = 1e-6;
  if (dist < EPS) {
    // Coincident members: push along a stable, deterministic pseudo-random
    // axis derived from the pair so the resolution doesn't oscillate.
    return { fx: SEPARATION.strength * SEPARATION.minStrengthFraction, fy: 0 };
  }
  if (dist >= minDist) return { fx: 0, fy: 0 };
  const overlap = minDist - dist;
  const strengthFrac = Math.max(SEPARATION.minStrengthFraction, overlap / minDist);
  const mag = SEPARATION.strength * strengthFrac;
  return { fx: (dx / dist) * mag, fy: (dy / dist) * mag };
}

export type SeparationEntry = SeparationMember & { id: number };
export type AccumulateSeparationOptions = { strengthMultiplier?: number };

export function accumulateSeparation(
  members: readonly SeparationEntry[],
  opts?: AccumulateSeparationOptions,
): Map<number, SeparationForce> {
  const strengthMultiplier = opts?.strengthMultiplier ?? 1;
  const forces = new Map<number, SeparationForce>();
  for (const m of members) forces.set(m.id, { fx: 0, fy: 0 });
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i]!;
      const b = members[j]!;
      const f = computeSeparation(a, b);
      const fa = forces.get(a.id)!;
      const fb = forces.get(b.id)!;
      forces.set(a.id, { fx: fa.fx + f.fx * strengthMultiplier, fy: fa.fy + f.fy * strengthMultiplier });
      forces.set(b.id, { fx: fb.fx - f.fx * strengthMultiplier, fy: fb.fy - f.fy * strengthMultiplier });
    }
  }
  return forces;
}
```

`falloff`/`clampR`/`FORCEFIELD`/`sampleAlongRay`/`ForceFieldResult` are unchanged from the current file and stay above these additions.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/forceFieldSeparation.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS — every existing `compute()` call site omits `repelMultiplier`, which defaults to `1`, matching current behavior exactly.

- [ ] **Step 6: Commit**

```bash
git add src/physics/ForceField.ts tests/unit/forceFieldSeparation.test.ts
git commit -m "feat(physics): add repelMultiplier and pairwise no-overlap separation to ForceField"
```

### Task 3: Shared look-at-rotation helper

**Files:**
- Create: `src/physics/LookAt.ts`
- Test: `tests/unit/lookAt.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/lookAt.test.ts
import { describe, it, expect } from "vitest";
import { computeLookAtAngle, computeLookAtRotation, LOOKAT_GAIN } from "../../src/physics/LookAt";

describe("computeLookAtAngle", () => {
  it("returns 0 when the target is directly to the east", () => {
    expect(computeLookAtAngle({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0, 6);
  });

  it("returns PI/2 when the target is directly south (canvas +y is down)", () => {
    expect(computeLookAtAngle({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2, 6);
  });

  it("returns -PI/2 when the target is directly north", () => {
    expect(computeLookAtAngle({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(-Math.PI / 2, 6);
  });
});

describe("LOOKAT_GAIN", () => {
  it("keeps eyes in the subtle 0.15-0.25 range", () => {
    expect(LOOKAT_GAIN.eyes).toBeGreaterThanOrEqual(0.15);
    expect(LOOKAT_GAIN.eyes).toBeLessThanOrEqual(0.25);
  });

  it("keeps bugs and pointedFinger in the fuller 0.7-1.0 range", () => {
    for (const gain of [LOOKAT_GAIN.bugs, LOOKAT_GAIN.pointedFinger]) {
      expect(gain).toBeGreaterThanOrEqual(0.7);
      expect(gain).toBeLessThanOrEqual(1.0);
    }
  });
});

describe("computeLookAtRotation", () => {
  it("scales the full angle by the mode's gain", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 10 };
    const fullAngle = computeLookAtAngle(from, to);
    expect(computeLookAtRotation(from, to, "eyes")).toBeCloseTo(fullAngle * LOOKAT_GAIN.eyes, 6);
    expect(computeLookAtRotation(from, to, "bugs")).toBeCloseTo(fullAngle * LOOKAT_GAIN.bugs, 6);
    expect(computeLookAtRotation(from, to, "pointedFinger")).toBeCloseTo(fullAngle * LOOKAT_GAIN.pointedFinger, 6);
  });

  it("produces a larger-magnitude rotation for bugs/pointedFinger than for eyes given the same geometry", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 5, y: 30 };
    const eyes = Math.abs(computeLookAtRotation(from, to, "eyes"));
    const bugs = Math.abs(computeLookAtRotation(from, to, "bugs"));
    expect(bugs).toBeGreaterThan(eyes);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/lookAt.test.ts`
Expected: FAIL — `src/physics/LookAt.ts` does not exist yet.

- [ ] **Step 3: Implement `LookAt.ts`**

```typescript
// src/physics/LookAt.ts
//
// Subject look-at rotation (spec §2, "Subject look-at rotation (all three
// modes)"). Reuses the same vector-math shape as the v1-fix burn-assist
// gaze-line calc (angle from crowd member to Subject), but produces an
// orientation value instead of a line endpoint. Additive to the existing
// flee/repel translation physics in ForceField/Integrator — this module
// only ever returns a rotation, never a position delta.

export type LookAtVector = { x: number; y: number };

/**
 * Full look-at angle, in radians, from `from` toward `to`, using canvas
 * screen-space convention (0 = east, +PI/2 = south since +y is down).
 */
export function computeLookAtAngle(from: LookAtVector, to: LookAtVector): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Per-mode rotation gain: how much of the full look-at angle a crowd
 * member's sprite actually turns through. Eyes already communicate gaze
 * via pupil offset, so their body/socket rotation stays subtle. Bugs and
 * pointedFinger read as directional silhouettes (cockroach head/antenna
 * axis, pointing-hand finger axis) and so get a fuller swing.
 */
export const LOOKAT_GAIN = Object.freeze({
  eyes: 0.2,
  bugs: 0.85,
  pointedFinger: 0.85,
} as const);

export type LookAtMode = keyof typeof LOOKAT_GAIN;

/**
 * The rotation (radians) a crowd member of the given mode should apply
 * this tick to face `to` from `from`. Callers store this on
 * `entity.physics.rotation`; drawers consume it as a render-transform
 * rotation around the entity's own position, not as a position change.
 */
export function computeLookAtRotation(from: LookAtVector, to: LookAtVector, mode: LookAtMode): number {
  return computeLookAtAngle(from, to) * LOOKAT_GAIN[mode];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/lookAt.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS — new file only, no existing call sites yet.

- [ ] **Step 6: Commit**

```bash
git add src/physics/LookAt.ts tests/unit/lookAt.test.ts
git commit -m "feat(physics): add computeLookAtAngle/computeLookAtRotation with per-mode gain constants"
```

### Task 4: `schema.ts` — `subjectSkin` field

**Files:**
- Modify: `src/content/schema.ts`
- Test: `tests/unit/schemaSubjectSkin.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/schemaSubjectSkin.test.ts
import { describe, it, expect } from "vitest";
import type { ManifestEntry, SubjectSkin } from "../../src/content/schema";

describe("SubjectSkin", () => {
  it("accepts both figure and lotus as valid values on a ManifestEntry", () => {
    const base: Omit<ManifestEntry, "subjectSkin"> = {
      id: "subject-1",
      rig: "eye",
      renderType: "eye",
      visual: { styleGuardrail: "flat-illustrated", shapeVariant: "almond" },
      colors: { sclera: "cream", iris: "slate", pupil: "ink", highlight: "cream", outline: "ink" },
      physics: { baseSizePx: 80 },
      behavior: { blinkIntervalMinMs: 2000, blinkIntervalMaxMs: 5000, blinkDurationMs: 140, pupilTrackMs: 120 },
    };
    const figure: ManifestEntry = { ...base, subjectSkin: "figure" };
    const lotus: ManifestEntry = { ...base, subjectSkin: "lotus" };
    const figureSkin: SubjectSkin = figure.subjectSkin!;
    const lotusSkin: SubjectSkin = lotus.subjectSkin!;
    expect(figureSkin).toBe("figure");
    expect(lotusSkin).toBe("lotus");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/schemaSubjectSkin.test.ts`
Expected: FAIL (TypeScript compile error) — `SubjectSkin` is not exported and `ManifestEntry` has no `subjectSkin` field.

- [ ] **Step 3: Implement**

```typescript
// src/content/schema.ts — additions

export type SubjectSkin = "figure" | "lotus";

// ManifestEntry gains one new optional field, added alongside the existing
// `id`/`rig`/`renderType`/`visual`/`colors`/`physics`/`behavior` fields:
export type ManifestEntry = {
  id: string;
  rig: "eye";
  renderType: "eye";
  visual: { styleGuardrail: "flat-illustrated"; shapeVariant: ShapeVariant };
  colors: SubjectColors;
  physics: SubjectPhysics;
  behavior: SubjectBehavior;
  subjectSkin?: SubjectSkin;
};
```

`subjectSkin` is optional and only meaningful on the single-entry Subject roster the v1-fix plan introduces; eye/bug/pointedFinger crowd-member entries omit it. `rig`/`renderType` stay their current hardcoded `"eye"` literal types per this plan's scope — widening them to a `subject`/`bug`/`pointedFinger` union is the v1-fix plan's and this plan's Task 6/7 responsibility respectively, tracked separately below (Task 6/7 add their own `rig`/`renderType` literals via the same additive-union pattern once their manifests are defined).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/schemaSubjectSkin.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, no type errors — `subjectSkin` is optional so no existing manifest literal needs updating.

- [ ] **Step 6: Commit**

```bash
git add src/content/schema.ts tests/unit/schemaSubjectSkin.test.ts
git commit -m "feat(content): add optional subjectSkin field (figure/lotus) to ManifestEntry"
```

---

## Phase B: Drawers and factory (can be split across worktrees per `superpowers:using-git-worktrees` — Tasks 5-8 touch disjoint files)

### Task 5: Subject skin drawers — `drawSubjectFigure.ts`, `drawSubjectLotus.ts`, `drawSubject.ts` dispatch

**Files:**
- Create: `src/render/drawers/drawSubjectFigure.ts`, `src/render/drawers/drawSubjectLotus.ts`
- Modify: `src/render/drawers/drawSubject.ts` (created by the v1-fix plan; if it does not yet exist when this task starts, create it fresh with the dispatcher shape below)
- Test: `tests/unit/drawSubjectSkins.test.ts` (new)
- Depends on: `src/render/paperCut.ts` (`paperCutEdgePath`/`withPaperCutShadow`, from the v1-fix plan's Task 29 — must already exist on `main` via PR #2 before this task starts)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/drawSubjectSkins.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawSubject } from "../../src/render/drawers/drawSubject";
import { drawSubjectFigure } from "../../src/render/drawers/drawSubjectFigure";
import { drawSubjectLotus } from "../../src/render/drawers/drawSubjectLotus";

const fakeCtx = () =>
  new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "canvas") return {};
        return typeof prop === "string" ? vi.fn() : undefined;
      },
    },
  ) as unknown as CanvasRenderingContext2D;

const colors = { sclera: "cream", iris: "slate", pupil: "ink", highlight: "cream", outline: "ink" } as const;

describe("drawSubject dispatch", () => {
  it("does not throw for subjectSkin 'figure'", () => {
    expect(() =>
      drawSubject(fakeCtx(), { pos: { x: 10, y: 10 }, sizePx: 80, subjectSkin: "figure", colors, scale: 1, seed: 1 }),
    ).not.toThrow();
  });

  it("does not throw for subjectSkin 'lotus'", () => {
    expect(() =>
      drawSubject(fakeCtx(), { pos: { x: 10, y: 10 }, sizePx: 80, subjectSkin: "lotus", colors, scale: 1, seed: 1 }),
    ).not.toThrow();
  });

  it("throws for an unknown subjectSkin", () => {
    expect(() =>
      drawSubject(fakeCtx(), {
        pos: { x: 0, y: 0 },
        sizePx: 80,
        // @ts-expect-error intentionally invalid
        subjectSkin: "not-a-skin",
        colors,
        scale: 1,
        seed: 1,
      }),
    ).toThrow(/subjectSkin/);
  });

  it("drawSubjectFigure and drawSubjectLotus are independently callable", () => {
    expect(() => drawSubjectFigure(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 80, colors, scale: 1, rotation: 0 })).not.toThrow();
    expect(() => drawSubjectLotus(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 80, colors, scale: 1, rotation: 0 })).not.toThrow();
  });
});

// Design-system requirement (spec: "all assets should look and feel the same,
// part of one visual design system"): every new drawer must call the shared
// paperCut.ts utility for edge wobble + offset shadow, not a bespoke
// implementation — same treatment drawEye.ts/drawSubject.ts already use
// (Task 29 of the v1-fix plan). withPaperCutShadow sets a fixed
// shadowColor ("rgba(42, 36, 32, 0.22)") while active, so its presence during
// a draw call is a reliable signal that the shared utility ran rather than a
// one-off shadow implementation.
function fakeCtxWithShadowSpy(): { ctx: CanvasRenderingContext2D; shadowColors: string[] } {
  const shadowColors: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "canvas") return {};
        return typeof prop === "string" ? vi.fn() : undefined;
      },
    },
  );
  Object.defineProperty(ctx, "shadowColor", {
    set: (v: string) => shadowColors.push(v),
    get: () => "",
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, shadowColors };
}

describe("paperCut.ts consistency (no bespoke edge/shadow styling)", () => {
  it("drawSubjectFigure applies the shared paper-cut shadow treatment", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    drawSubjectFigure(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, colors, scale: 1, rotation: 0 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });

  it("drawSubjectLotus applies the shared paper-cut shadow treatment", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    drawSubjectLotus(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, colors, scale: 1, rotation: 0 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/drawSubjectSkins.test.ts`
Expected: FAIL — `drawSubjectFigure.ts`/`drawSubjectLotus.ts` don't exist, and `drawSubject`'s current signature (from the v1-fix plan) doesn't accept `subjectSkin`.

- [ ] **Step 3: Implement the two skin drawers**

```typescript
// src/render/drawers/drawSubjectFigure.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectFigureInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  scale: number;
  rotation: number;
};

const colorByName = (k: string): string => {
  switch (k) {
    case "cream": return PALETTE.cream;
    case "slate": return PALETTE.slate;
    case "sage": return PALETTE.sage;
    case "ink": return PALETTE.ink;
    case "coral": return PALETTE.coral;
    default: throw new Error(`drawSubjectFigure: color "${k}" is not in the locked palette`);
  }
};

/** Abstract, generic authority-figure silhouette: head + shoulders, flat-illustrated. */
export function drawSubjectFigure(ctx: CanvasRenderingContext2D, input: DrawSubjectFigureInput): void {
  const { pos, sizePx, scale, rotation } = input;
  const s = sizePx * scale;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);

  // head + shoulders — shared paperCut.ts edge wobble + offset shadow, same
  // treatment as drawEye.ts (design-system consistency requirement; no
  // bespoke per-drawer shadow/edge styling)
  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y - s * 0.32, rx: s * 0.22, ry: s * 0.24, seed: 11 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y - s * 0.32, rx: s * 0.19, ry: s * 0.21, seed: 11 });
  ctx.fillStyle = colorByName(input.colors.sclera);
  ctx.fill();

  withPaperCutShadow(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(pos.x - s * 0.42, pos.y + s * 0.5);
    ctx.quadraticCurveTo(pos.x - s * 0.4, pos.y - s * 0.02, pos.x, pos.y - s * 0.08);
    ctx.quadraticCurveTo(pos.x + s * 0.4, pos.y - s * 0.02, pos.x + s * 0.42, pos.y + s * 0.5);
    ctx.closePath();
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.moveTo(pos.x - s * 0.37, pos.y + s * 0.48);
  ctx.quadraticCurveTo(pos.x - s * 0.35, pos.y + s * 0.02, pos.x, pos.y - s * 0.02);
  ctx.quadraticCurveTo(pos.x + s * 0.35, pos.y + s * 0.02, pos.x + s * 0.37, pos.y + s * 0.48);
  ctx.closePath();
  ctx.fillStyle = colorByName(input.colors.sclera);
  ctx.fill();

  ctx.restore();
}
```

Note the shoulder silhouette is a hand-drawn bezier path, not an ellipse — `paperCutEdgePath` only fits ellipse-derived shapes, so `withPaperCutShadow` alone (without `paperCutEdgePath`) supplies the required shared offset-shadow treatment for that shape, matching how `withPaperCutShadow` is used standalone elsewhere for non-ellipse fills.

```typescript
// src/render/drawers/drawSubjectLotus.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectLotusInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  scale: number;
  rotation: number;
};

const colorByName = (k: string): string => {
  switch (k) {
    case "cream": return PALETTE.cream;
    case "slate": return PALETTE.slate;
    case "sage": return PALETTE.sage;
    case "ink": return PALETTE.ink;
    case "coral": return PALETTE.coral;
    default: throw new Error(`drawSubjectLotus: color "${k}" is not in the locked palette`);
  }
};

/** Flat, paper-cut 5-petal lotus bloom with a coral center — alternate Subject skin. */
export function drawSubjectLotus(ctx: CanvasRenderingContext2D, input: DrawSubjectLotusInput): void {
  const { pos, sizePx, scale, rotation } = input;
  const s = sizePx * scale;
  const petalCount = 5;
  const petalLen = s * 0.48;
  const petalW = s * 0.22;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);

  // petals + center — shared paperCut.ts edge wobble + offset shadow, same
  // treatment as drawEye.ts/drawSubjectFigure.ts (design-system consistency
  // requirement; no bespoke per-drawer shadow/edge styling)
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(angle);
    withPaperCutShadow(ctx, () => {
      paperCutEdgePath(ctx, { cx: 0, cy: -petalLen * 0.55, rx: petalW * 0.55, ry: petalLen * 0.55, seed: i + 1 });
      ctx.fillStyle = colorByName(input.colors.outline);
      ctx.fill();
    });
    paperCutEdgePath(ctx, { cx: 0, cy: -petalLen * 0.55, rx: petalW * 0.45, ry: petalLen * 0.48, seed: i + 1 });
    ctx.fillStyle = colorByName(i % 2 === 0 ? input.colors.sclera : input.colors.iris);
    ctx.fill();
    ctx.restore();
  }

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: s * 0.16, ry: s * 0.16, seed: 21 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: s * 0.12, ry: s * 0.12, seed: 21 });
  ctx.fillStyle = colorByName(input.colors.pupil);
  ctx.fill();

  ctx.restore();
}
```

```typescript
// src/render/drawers/drawSubject.ts
import type { SubjectColors, SubjectSkin } from "../../content/schema";
import { drawSubjectFigure } from "./drawSubjectFigure";
import { drawSubjectLotus } from "./drawSubjectLotus";

export type DrawSubjectInput = {
  pos: { x: number; y: number };
  sizePx: number;
  subjectSkin: SubjectSkin;
  colors: SubjectColors;
  scale: number;
  seed: number;
  rotation?: number;
};

export function drawSubject(ctx: CanvasRenderingContext2D, input: DrawSubjectInput): void {
  const rotation = input.rotation ?? 0;
  switch (input.subjectSkin) {
    case "figure":
      drawSubjectFigure(ctx, { pos: input.pos, sizePx: input.sizePx, colors: input.colors, scale: input.scale, rotation });
      return;
    case "lotus":
      drawSubjectLotus(ctx, { pos: input.pos, sizePx: input.sizePx, colors: input.colors, scale: input.scale, rotation });
      return;
    default:
      throw new Error(`drawSubject: unknown subjectSkin "${input.subjectSkin as string}"`);
  }
}
```

If the v1-fix plan's actual `drawSubject.ts`/`DrawSubjectInput` differ (e.g. it already renders the figure silhouette inline rather than as a dispatcher), fold that existing figure-rendering code into `drawSubjectFigure.ts` verbatim as the `"figure"` case, then replace the original file's body with this dispatcher — do not maintain two separate figure-rendering implementations.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/drawSubjectSkins.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/drawers/drawSubjectFigure.ts src/render/drawers/drawSubjectLotus.ts src/render/drawers/drawSubject.ts tests/unit/drawSubjectSkins.test.ts
git commit -m "feat(render): add figure/lotus Subject skin drawers behind a drawSubject dispatcher, using shared paperCut.ts edge/shadow treatment"
```

### Task 6: `drawBug.ts` — cockroach crowd drawer with scuttle-jitter and look-at rotation

**Files:**
- Create: `src/render/drawers/drawBug.ts`
- Test: `tests/unit/drawBug.test.ts` (new)
- Depends on: `src/render/paperCut.ts` (`paperCutEdgePath`/`withPaperCutShadow`, from the v1-fix plan's Task 29 — must already exist on `main` via PR #2 before this task starts)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/drawBug.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawBug, computeScuttleJitter, BUG_DRAW } from "../../src/render/drawers/drawBug";

const fakeCtx = () =>
  new Proxy(
    {},
    { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
  ) as unknown as CanvasRenderingContext2D;

const colors = { sclera: "cream", iris: "sage", pupil: "ink", highlight: "cream", outline: "ink" } as const;

describe("computeScuttleJitter", () => {
  it("is a pure, deterministic function of (id, timeMs)", () => {
    const a = computeScuttleJitter(7, 1234);
    const b = computeScuttleJitter(7, 1234);
    expect(a).toEqual(b);
  });

  it("produces different jitter for different ids at the same time", () => {
    const a = computeScuttleJitter(1, 1000);
    const b = computeScuttleJitter(2, 1000);
    expect(a).not.toEqual(b);
  });

  it("stays within the configured jitter amplitude", () => {
    for (let t = 0; t < 5000; t += 250) {
      const j = computeScuttleJitter(3, t);
      expect(Math.abs(j.x)).toBeLessThanOrEqual(BUG_DRAW.jitterAmpPx + 1e-6);
      expect(Math.abs(j.y)).toBeLessThanOrEqual(BUG_DRAW.jitterAmpPx + 1e-6);
    }
  });
});

describe("drawBug", () => {
  it("does not throw with a rotation applied", () => {
    expect(() =>
      drawBug(fakeCtx(), { pos: { x: 20, y: 20 }, sizePx: 40, colors, timeMs: 500, id: 5, rotation: 0.4 }),
    ).not.toThrow();
  });

  it("defaults rotation to 0 when omitted", () => {
    expect(() => drawBug(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 40, colors, timeMs: 0, id: 1 })).not.toThrow();
  });
});

// Design-system requirement: drawBug's body silhouette must use the shared
// paperCut.ts utility (paperCutEdgePath + withPaperCutShadow), the same
// treatment drawEye.ts/drawSubject*.ts use — not a bespoke ctx.ellipse fill.
// withPaperCutShadow sets a fixed shadowColor ("rgba(42, 36, 32, 0.22)")
// while active, so its presence during the draw call is a reliable signal
// the shared utility ran.
describe("paperCut.ts consistency (no bespoke edge/shadow styling)", () => {
  it("drawBug applies the shared paper-cut shadow treatment to its body", () => {
    const shadowColors: string[] = [];
    const ctx = new Proxy(
      {},
      { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
    );
    Object.defineProperty(ctx, "shadowColor", {
      set: (v: string) => shadowColors.push(v),
      get: () => "",
    });
    drawBug(ctx as unknown as CanvasRenderingContext2D, { pos: { x: 20, y: 20 }, sizePx: 40, colors, timeMs: 500, id: 5 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/drawBug.test.ts`
Expected: FAIL — `src/render/drawers/drawBug.ts` does not exist.

- [ ] **Step 3: Implement**

```typescript
// src/render/drawers/drawBug.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export const BUG_DRAW = Object.freeze({
  jitterAmpPx: 1.6,
  jitterSpeed: 0.011,
  antennaTwitchAmpRad: 0.35,
} as const);

export type DrawBugInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  timeMs: number;
  id: number;
  rotation?: number;
};

const colorByName = (k: string): string => {
  switch (k) {
    case "cream": return PALETTE.cream;
    case "slate": return PALETTE.slate;
    case "sage": return PALETTE.sage;
    case "ink": return PALETTE.ink;
    case "coral": return PALETTE.coral;
    default: throw new Error(`drawBug: color "${k}" is not in the locked palette`);
  }
};

/**
 * Deterministic idle scuttle jitter, pure function of (id, timeMs) — no Rng
 * threading needed at render time, trivially reproducible in tests.
 */
export function computeScuttleJitter(id: number, timeMs: number): { x: number; y: number } {
  const phase = id * 12.9898;
  const t = timeMs * BUG_DRAW.jitterSpeed;
  return {
    x: Math.sin(t + phase) * BUG_DRAW.jitterAmpPx,
    y: Math.cos(t * 1.3 + phase) * BUG_DRAW.jitterAmpPx,
  };
}

function computeAntennaTwitch(id: number, timeMs: number): number {
  const phase = id * 7.1;
  return Math.sin(timeMs * BUG_DRAW.jitterSpeed * 1.7 + phase) * BUG_DRAW.antennaTwitchAmpRad;
}

export function drawBug(ctx: CanvasRenderingContext2D, input: DrawBugInput): void {
  const { sizePx, timeMs, id } = input;
  const rotation = input.rotation ?? 0;
  const jitter = computeScuttleJitter(id, timeMs);
  const twitch = computeAntennaTwitch(id, timeMs);
  const cx = input.pos.x + jitter.x;
  const cy = input.pos.y + jitter.y;
  const bodyRx = sizePx * 0.32;
  const bodyRy = sizePx * 0.2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // legs
  ctx.strokeStyle = colorByName(input.colors.outline);
  ctx.lineWidth = Math.max(1, sizePx * 0.035);
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * bodyRx * 0.5, 0);
      ctx.lineTo(i * bodyRx * 0.5 + side * bodyRx * 0.6, side * bodyRy * 1.4);
      ctx.stroke();
    }
  }

  // antennae
  ctx.beginPath();
  ctx.moveTo(bodyRx * 0.9, -bodyRy * 0.3);
  ctx.quadraticCurveTo(bodyRx * 1.4, -bodyRy * 1.2 + twitch * 10, bodyRx * 1.7, -bodyRy * 1.6 + twitch * 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyRx * 0.9, bodyRy * 0.3);
  ctx.quadraticCurveTo(bodyRx * 1.4, bodyRy * 1.2 - twitch * 10, bodyRx * 1.7, bodyRy * 1.6 - twitch * 14);
  ctx.stroke();

  // body — shared paperCut.ts edge wobble + offset shadow, same treatment as
  // drawEye.ts/drawSubject.ts (design-system consistency requirement; no
  // bespoke per-drawer shadow/edge styling)
  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: bodyRx, ry: bodyRy, seed: id * 3 + 1 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: bodyRx * 0.86, ry: bodyRy * 0.82, seed: id * 3 + 1 });
  ctx.fillStyle = colorByName(input.colors.iris);
  ctx.fill();

  // head
  ctx.fillStyle = colorByName(input.colors.outline);
  ctx.beginPath();
  ctx.arc(bodyRx * 0.92, 0, bodyRy * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/drawBug.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/drawers/drawBug.ts tests/unit/drawBug.test.ts
git commit -m "feat(render): add drawBug crowd drawer with deterministic scuttle-jitter, look-at rotation, and shared paperCut.ts edge/shadow treatment"
```

### Task 7: `drawPointedFinger.ts` — pointing-hand crowd drawer with point-and-shake and look-at rotation

**Files:**
- Create: `src/render/drawers/drawPointedFinger.ts`
- Test: `tests/unit/drawPointedFinger.test.ts` (new)
- Depends on: `src/render/paperCut.ts` (`paperCutEdgePath`/`withPaperCutShadow`, from the v1-fix plan's Task 29 — must already exist on `main` via PR #2 before this task starts)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/drawPointedFinger.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawPointedFinger, computePointShake, FINGER_DRAW } from "../../src/render/drawers/drawPointedFinger";

const fakeCtx = () =>
  new Proxy(
    {},
    { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
  ) as unknown as CanvasRenderingContext2D;

const colors = { sclera: "coral", iris: "slate", pupil: "ink", highlight: "cream", outline: "ink" } as const;

describe("computePointShake", () => {
  it("is a pure, deterministic function of (id, timeMs)", () => {
    expect(computePointShake(4, 2000)).toBe(computePointShake(4, 2000));
  });

  it("stays within the configured shake amplitude", () => {
    for (let t = 0; t < 5000; t += 200) {
      const s = computePointShake(2, t);
      expect(Math.abs(s)).toBeLessThanOrEqual(FINGER_DRAW.shakeAmpRad + 1e-6);
    }
  });
});

describe("drawPointedFinger", () => {
  it("does not throw with a rotation applied", () => {
    expect(() =>
      drawPointedFinger(fakeCtx(), { pos: { x: 5, y: 5 }, sizePx: 44, colors, timeMs: 300, id: 9, rotation: -0.5 }),
    ).not.toThrow();
  });

  it("defaults rotation to 0 when omitted", () => {
    expect(() => drawPointedFinger(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 44, colors, timeMs: 0, id: 1 })).not.toThrow();
  });
});

// Design-system requirement: drawPointedFinger's fist silhouette must use the
// shared paperCut.ts utility (paperCutEdgePath + withPaperCutShadow), the
// same treatment drawEye.ts/drawSubject*.ts/drawBug.ts use — not a bespoke
// ctx.ellipse fill. withPaperCutShadow sets a fixed shadowColor
// ("rgba(42, 36, 32, 0.22)") while active, so its presence during the draw
// call is a reliable signal the shared utility ran.
describe("paperCut.ts consistency (no bespoke edge/shadow styling)", () => {
  it("drawPointedFinger applies the shared paper-cut shadow treatment to its fist", () => {
    const shadowColors: string[] = [];
    const ctx = new Proxy(
      {},
      { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
    );
    Object.defineProperty(ctx, "shadowColor", {
      set: (v: string) => shadowColors.push(v),
      get: () => "",
    });
    drawPointedFinger(ctx as unknown as CanvasRenderingContext2D, { pos: { x: 5, y: 5 }, sizePx: 44, colors, timeMs: 300, id: 9 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/drawPointedFinger.test.ts`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement**

```typescript
// src/render/drawers/drawPointedFinger.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export const FINGER_DRAW = Object.freeze({
  shakeAmpRad: 0.14,
  shakeSpeed: 0.014,
} as const);

export type DrawPointedFingerInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  timeMs: number;
  id: number;
  rotation?: number;
};

const colorByName = (k: string): string => {
  switch (k) {
    case "cream": return PALETTE.cream;
    case "slate": return PALETTE.slate;
    case "sage": return PALETTE.sage;
    case "ink": return PALETTE.ink;
    case "coral": return PALETTE.coral;
    default: throw new Error(`drawPointedFinger: color "${k}" is not in the locked palette`);
  }
};

/** Deterministic idle point-and-shake rotation, pure function of (id, timeMs). */
export function computePointShake(id: number, timeMs: number): number {
  const phase = id * 5.37;
  return Math.sin(timeMs * FINGER_DRAW.shakeSpeed + phase) * FINGER_DRAW.shakeAmpRad;
}

export function drawPointedFinger(ctx: CanvasRenderingContext2D, input: DrawPointedFingerInput): void {
  const { pos, sizePx, timeMs, id } = input;
  const baseRotation = input.rotation ?? 0;
  const shake = computePointShake(id, timeMs);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(baseRotation + shake);

  const s = sizePx;
  // fist — shared paperCut.ts edge wobble + offset shadow, same treatment as
  // drawEye.ts/drawSubject.ts/drawBug.ts (design-system consistency
  // requirement; no bespoke per-drawer shadow/edge styling)
  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: 0, cy: s * 0.22, rx: s * 0.24, ry: s * 0.2, seed: id * 5 + 2 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: 0, cy: s * 0.22, rx: s * 0.2, ry: s * 0.16, seed: id * 5 + 2 });
  ctx.fillStyle = colorByName(input.colors.sclera);
  ctx.fill();

  // pointing finger, extended along -y (up) in local space before rotation
  ctx.fillStyle = colorByName(input.colors.outline);
  ctx.beginPath();
  ctx.moveTo(-s * 0.09, s * 0.05);
  ctx.lineTo(-s * 0.09, -s * 0.5);
  ctx.quadraticCurveTo(-s * 0.09, -s * 0.58, 0, -s * 0.58);
  ctx.quadraticCurveTo(s * 0.09, -s * 0.58, s * 0.09, -s * 0.5);
  ctx.lineTo(s * 0.09, s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colorByName(input.colors.sclera);
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, s * 0.03);
  ctx.lineTo(-s * 0.06, -s * 0.47);
  ctx.quadraticCurveTo(-s * 0.06, -s * 0.53, 0, -s * 0.53);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.53, s * 0.06, -s * 0.47);
  ctx.lineTo(s * 0.06, s * 0.03);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/drawPointedFinger.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/drawers/drawPointedFinger.ts tests/unit/drawPointedFinger.test.ts
git commit -m "feat(render): add drawPointedFinger crowd drawer with deterministic point-and-shake, look-at rotation, and shared paperCut.ts edge/shadow treatment"
```

### Task 8: `EntityFactory.ts` — incremental crowd quantity (`spawnOneCrowdMember` / `pickCrowdMemberToDespawn`)

**Files:**
- Modify: `src/entities/EntityFactory.ts`
- Test: `tests/unit/entityFactoryQuantity.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/entityFactoryQuantity.test.ts
import { describe, it, expect } from "vitest";
import { Rng } from "../../src/core/Rng";
import { spawnOneCrowdMember, pickCrowdMemberToDespawn } from "../../src/entities/EntityFactory";
import type { ManifestEntry } from "../../src/content/schema";
import type { Entity } from "../../src/entities/Entity";

const roster: ManifestEntry[] = [
  {
    id: "eye-a",
    rig: "eye",
    renderType: "eye",
    visual: { styleGuardrail: "flat-illustrated", shapeVariant: "almond" },
    colors: { sclera: "cream", iris: "slate", pupil: "ink", highlight: "cream", outline: "ink" },
    physics: { baseSizePx: 60 },
    behavior: { blinkIntervalMinMs: 2000, blinkIntervalMaxMs: 5000, blinkDurationMs: 140, pupilTrackMs: 120 },
  },
];

describe("spawnOneCrowdMember", () => {
  it("returns a new Entity placed within the given viewport", () => {
    const rng = new Rng(1);
    const entity = spawnOneCrowdMember({ rng, width: 800, height: 600, manifest: roster, existing: [], nextId: 5000 });
    expect(entity).not.toBeNull();
    expect(entity!.id).toBe(5000);
    expect(entity!.physics.pos.x).toBeGreaterThanOrEqual(0);
    expect(entity!.physics.pos.x).toBeLessThanOrEqual(800);
  });

  it("cycles through the roster by existing.length modulo roster length", () => {
    const rng = new Rng(2);
    const wideRoster: ManifestEntry[] = [roster[0]!, { ...roster[0]!, id: "eye-b" }];
    const first = spawnOneCrowdMember({ rng, width: 800, height: 600, manifest: wideRoster, existing: [], nextId: 1 })!;
    const second = spawnOneCrowdMember({
      rng,
      width: 800,
      height: 600,
      manifest: wideRoster,
      existing: [first],
      nextId: 2,
    })!;
    expect(first.content.manifestId).toBe("eye-a");
    expect(second.content.manifestId).toBe("eye-b");
  });
});

describe("pickCrowdMemberToDespawn", () => {
  it("returns null for an empty crowd", () => {
    expect(pickCrowdMemberToDespawn([])).toBeNull();
  });

  it("returns the id of the last-spawned (highest-id) member", () => {
    const members = [{ id: 1 }, { id: 7 }, { id: 3 }] as Entity[];
    expect(pickCrowdMemberToDespawn(members)).toBe(7);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/entityFactoryQuantity.test.ts`
Expected: FAIL — `spawnOneCrowdMember`/`pickCrowdMemberToDespawn` do not exist.

- [ ] **Step 3: Implement, reusing the file's existing private helpers**

```typescript
// src/entities/EntityFactory.ts — additions (existing ENTITY_FACTORY, paletteRef,
// jitterScale, buildEntity, overlapsAny, samplePos, spawnEyes are unchanged)

export type SpawnOneCrowdMemberOptions = {
  rng: Rng;
  width: number;
  height: number;
  manifest: readonly ManifestEntry[];
  existing: readonly Entity[];
  nextId: EntityId;
};

/**
 * Spawns a single new crowd member for the HUD quantity "+" control, reusing
 * the same placement/scale/build logic as the initial spawnEyes() batch so a
 * mid-session addition looks indistinguishable from one placed at load time.
 */
export function spawnOneCrowdMember(opts: SpawnOneCrowdMemberOptions): Entity | null {
  const { rng, width, height, manifest, existing, nextId } = opts;
  if (manifest.length === 0) return null;
  const entry = manifest[existing.length % manifest.length]!;
  const sepSq = ENTITY_FACTORY.minSeparationPx * ENTITY_FACTORY.minSeparationPx;
  let pos = samplePos(rng, entry, width, height);
  for (let attempt = 0; attempt < ENTITY_FACTORY.maxAttempts && overlapsAny(pos, existing, sepSq); attempt++) {
    pos = samplePos(rng, entry, width, height);
  }
  const scale = jitterScale(entry, rng);
  return buildEntity(nextId, entry, pos, scale);
}

/**
 * Picks which crowd member to remove for the HUD quantity "-" control.
 * Removes the most recently spawned member (highest id) so quantity
 * decreases feel like undoing the last addition rather than an arbitrary cull.
 */
export function pickCrowdMemberToDespawn(existing: readonly Entity[]): EntityId | null {
  if (existing.length === 0) return null;
  let maxId = existing[0]!.id;
  for (const e of existing) if (e.id > maxId) maxId = e.id;
  return maxId;
}
```

These reuse the file's existing private `samplePos`/`overlapsAny`/`jitterScale`/`buildEntity` helpers and the `ENTITY_FACTORY` config constant verbatim — no signature changes to any of them.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/entityFactoryQuantity.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/entities/EntityFactory.ts tests/unit/entityFactoryQuantity.test.ts
git commit -m "feat(entities): add spawnOneCrowdMember/pickCrowdMemberToDespawn for HUD quantity control"
```

---

## Phase C: Integration (sequential — depends on all of Phase A + Phase B)

### Task 9: Barrel exports + `Renderer.ts` mode/skin dispatch and look-at rotation wiring

**Files:**
- Modify: `src/render/drawers/index.ts`, `src/render/Renderer.ts`
- Test: `tests/unit/rendererCrowdDispatch.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/rendererCrowdDispatch.test.ts
import { describe, it, expect } from "vitest";
import { drawBug, drawPointedFinger, drawSubject, drawSubjectFigure, drawSubjectLotus } from "../../src/render/drawers";

describe("render/drawers barrel", () => {
  it("re-exports the new crowd and Subject-skin drawers", () => {
    expect(typeof drawBug).toBe("function");
    expect(typeof drawPointedFinger).toBe("function");
    expect(typeof drawSubject).toBe("function");
    expect(typeof drawSubjectFigure).toBe("function");
    expect(typeof drawSubjectLotus).toBe("function");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/rendererCrowdDispatch.test.ts`
Expected: FAIL — `src/render/drawers/index.ts` does not yet re-export the new drawers (or does not exist as a barrel at all, in which case this step creates it).

- [ ] **Step 3: Update the barrel**

```typescript
// src/render/drawers/index.ts
export { drawEye } from "./drawEye";
export { drawBug } from "./drawBug";
export { drawPointedFinger } from "./drawPointedFinger";
export { drawSubject } from "./drawSubject";
export { drawSubjectFigure } from "./drawSubjectFigure";
export { drawSubjectLotus } from "./drawSubjectLotus";
```

(If the real barrel already re-exports other drawers such as `drawCursor`/`drawFieldLines` from the v1-fix plan, keep those lines and add only the new ones above.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/rendererCrowdDispatch.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire mode dispatch and the look-at rotation value into `Renderer.ts`**

`Renderer.ts`'s `renderFrame()` currently draws every alive crowd member via a single unconditional `drawEye(ctx, {...})` call inside its `store.forEachAlive` loop (see the file's current ~154-line body). Add a `hudMode: HudMode` field to `RenderFrameOptions` and switch the drawer per member by that mode. The rotation value itself is *not* computed here — Task 11 computes it once per tick in `main.ts`'s shared crowd-behavior tick and stores it on `e.physics.rotation`; `Renderer.ts` only reads that already-computed value and passes it through to whichever drawer is active, keeping the render layer mode-agnostic about *how* the rotation was derived.

```typescript
// src/render/Renderer.ts — RenderFrameOptions gains one field
import { drawEye, drawBug, drawPointedFinger } from "./drawers";
import type { HudMode } from "../hud/hudIcons";

export type RenderFrameOptions = RenderEntitiesOptions & {
  // ...existing fields (ctx, cursorRingRadius, cursorRingOpacity, chargeTargetId,
  // hoverEntityId, reducedMotion, nowMs) unchanged...
  hudMode: HudMode;
};
```

```typescript
// src/render/Renderer.ts — inside the crowd-member store.forEachAlive loop,
// replacing the unconditional drawEye(...) call
const rotation = e.physics.rotation ?? 0;
switch (opts.hudMode) {
  case "eyes":
    drawEye(ctx, { pos: e.physics.pos, sizePx, shapeVariant, colors, blinkScaleY, pupilOffset, biteChunks });
    break;
  case "bugs":
    drawBug(ctx, { pos: e.physics.pos, sizePx, colors, timeMs: opts.nowMs, id: e.id, rotation });
    break;
  case "pointedFinger":
    drawPointedFinger(ctx, { pos: e.physics.pos, sizePx, colors, timeMs: opts.nowMs, id: e.id, rotation });
    break;
  default:
    throw new Error(`renderFrame: unknown hudMode "${opts.hudMode as string}"`);
}
```

`drawEye` intentionally keeps rendering without a rotation argument here — the eyes' look-at tracking is expressed through the existing pupil-offset mechanism plus (once Task 11 lands) a small additional socket rotation folded into `blinkScaleY`'s companion transform; see Task 11 Step 4 for exactly how the eyes case picks up the subtle rotation without changing `drawEye`'s public signature (a `ctx.translate/rotate` wrapper applied at the call site, matching the pattern already used inside `drawBug`/`drawPointedFinger` themselves).

- [ ] **Step 6: Wrap the eyes case with the same rotate-around-center transform used inside `drawBug`/`drawPointedFinger`**

```typescript
// src/render/Renderer.ts — refine the "eyes" case from Step 5
case "eyes": {
  ctx.save();
  ctx.translate(e.physics.pos.x, e.physics.pos.y);
  ctx.rotate(rotation);
  ctx.translate(-e.physics.pos.x, -e.physics.pos.y);
  drawEye(ctx, { pos: e.physics.pos, sizePx, shapeVariant, colors, blinkScaleY, pupilOffset, biteChunks });
  ctx.restore();
  break;
}
```

This keeps `drawEye.ts` itself unmodified (no new parameter, no risk to its existing 28 call sites/tests) while still applying the eyes-mode look-at rotation — consistent with the spec's requirement that eyes rotate too, just subtly (gain `0.2`, from Task 3's `LOOKAT_GAIN.eyes`), via `physics.rotation` which will be `~0` whenever no Subject exists yet (Task 11 guards this).

- [ ] **Step 7: Extend the failing test for crowd draw-order sort and shadow-intensity**

Two more pieces of render-layer plumbing belong in this task, both driven by state the renderer already receives (positions, quantity, repel multiplier) and neither requiring a new physics system: (a) a depth/draw-order sort applied to crowd members immediately before the `store.forEachAlive` render loop, so members composite correctly against the Subject and each other as they move; (b) a single per-frame shadow-intensity number, derived from crowd quantity + `repelMultiplier`, threaded into each drawer's `withPaperCutShadow` call (drawBug, drawPointedFinger, drawSubject — all wired to accept it per Tasks 5-7's paperCut.ts adoption). Add these cases to `tests/unit/rendererCrowdDispatch.test.ts`:

```typescript
// tests/unit/rendererCrowdDispatch.test.ts — additional test cases
import { computeCrowdDrawOrder, computeShadowIntensity } from "../../src/render/Renderer";

describe("computeCrowdDrawOrder", () => {
  it("sorts crowd members by ascending y so members lower on screen draw last (on top)", () => {
    const members = [
      { id: 1, pos: { x: 0, y: 300 } },
      { id: 2, pos: { x: 0, y: 50 } },
      { id: 3, pos: { x: 0, y: 150 } },
    ];
    expect(computeCrowdDrawOrder(members).map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it("is stable for members that share the same y (avoids frame-to-frame flicker)", () => {
    const members = [
      { id: 1, pos: { x: 0, y: 100 } },
      { id: 2, pos: { x: 10, y: 100 } },
    ];
    expect(computeCrowdDrawOrder(members).map((m) => m.id)).toEqual([1, 2]);
  });
});

describe("computeShadowIntensity", () => {
  it("returns the baseline 1.0 at the default quantity/repel (20, 1)", () => {
    expect(computeShadowIntensity({ quantity: 20, repelMultiplier: 1 })).toBeCloseTo(1, 5);
  });

  it("increases as quantity rises above the baseline", () => {
    const low = computeShadowIntensity({ quantity: 20, repelMultiplier: 1 });
    const high = computeShadowIntensity({ quantity: 60, repelMultiplier: 1 });
    expect(high).toBeGreaterThan(low);
  });

  it("decreases as repelMultiplier rises above the baseline", () => {
    const low = computeShadowIntensity({ quantity: 20, repelMultiplier: 1 });
    const high = computeShadowIntensity({ quantity: 20, repelMultiplier: 2 });
    expect(high).toBeLessThan(low);
  });

  it("stays clamped to [0.4, 1.8] across the full quantity/repel range", () => {
    for (const quantity of [1, 20, 60]) {
      for (const repelMultiplier of [0, 1, 2]) {
        const v = computeShadowIntensity({ quantity, repelMultiplier });
        expect(v).toBeGreaterThanOrEqual(0.4);
        expect(v).toBeLessThanOrEqual(1.8);
      }
    }
  });
});
```

- [ ] **Step 8: Run to verify fail**

Run: `npx vitest run tests/unit/rendererCrowdDispatch.test.ts`
Expected: FAIL — `computeCrowdDrawOrder`/`computeShadowIntensity` are not exported from `Renderer.ts` yet.

- [ ] **Step 9: Implement `computeCrowdDrawOrder`/`computeShadowIntensity` and wire both into the render loop**

```typescript
// src/render/Renderer.ts — new exports, alongside the existing renderFrame()
export type CrowdDrawOrderMember = { id: number; pos: { x: number; y: number } };

/**
 * Painter's-algorithm depth sort for crowd members, derived only from
 * existing position state (no new physics system). Ascending y so members
 * lower on screen draw last/on top, keeping the crowd and the Subject
 * composited in a sensible depth order as they move — plain insertion order
 * from store.forEachAlive gives no such guarantee. Array.prototype.sort is
 * stable per spec, so members sharing a y keep their relative order rather
 * than flickering frame to frame.
 */
export function computeCrowdDrawOrder<T extends CrowdDrawOrderMember>(members: readonly T[]): T[] {
  return [...members].sort((a, b) => a.pos.y - b.pos.y);
}

export const SHADOW_INTENSITY = Object.freeze({
  baselineQuantity: 20,
  baselineRepel: 1,
  perQuantityUnit: 0.012,
  perRepelUnit: -0.25,
  min: 0.4,
  max: 1.8,
} as const);

export type ShadowIntensityInput = { quantity: number; repelMultiplier: number };

/**
 * Live numeric input for paperCut.ts's shadow depth, derived from current
 * crowd quantity and repel-multiplier state. This function only computes and
 * exposes the number — how strongly it should move shadow offset/blur per
 * unit of quantity/repel is a visual-design rule owned by the exceptional
 * visual design review (see the sprint plan's lane 5), not physics; the
 * constants above are the initial plumbing values, expected to be retuned by
 * that review rather than treated as load-bearing.
 */
export function computeShadowIntensity(input: ShadowIntensityInput): number {
  const { baselineQuantity, baselineRepel, perQuantityUnit, perRepelUnit, min, max } = SHADOW_INTENSITY;
  const raw =
    1 +
    (input.quantity - baselineQuantity) * perQuantityUnit +
    (input.repelMultiplier - baselineRepel) * perRepelUnit;
  return Math.max(min, Math.min(max, raw));
}
```

```typescript
// src/render/Renderer.ts — RenderFrameOptions gains two fields alongside hudMode
export type RenderFrameOptions = RenderEntitiesOptions & {
  // ...existing fields (ctx, cursorRingRadius, cursorRingOpacity, chargeTargetId,
  // hoverEntityId, reducedMotion, nowMs, hudMode) unchanged...
  quantity: number;
  repelMultiplier: number;
};
```

```typescript
// src/render/Renderer.ts — inside renderFrame(), before the crowd-member
// store.forEachAlive render loop: collect members, sort, then iterate in
// that order instead of iterating the store directly. Compute
// shadowIntensity once per frame (not per member — it's a global scene
// value) and pass it to every drawer's shadowIntensity input.
const shadowIntensity = computeShadowIntensity({ quantity: opts.quantity, repelMultiplier: opts.repelMultiplier });
const crowdMembers: { id: number; pos: { x: number; y: number } }[] = [];
store.forEachAlive((e) => crowdMembers.push({ id: e.id, pos: e.physics.pos }));
const drawOrder = computeCrowdDrawOrder(crowdMembers);
const byId = new Map<number, Parameters<typeof store.forEachAlive>[0] extends (e: infer E) => void ? E : never>();
store.forEachAlive((e) => byId.set(e.id, e));
for (const { id } of drawOrder) {
  const e = byId.get(id)!;
  // ...existing per-member body from Steps 5-6 (shapeVariant/colors/blinkScaleY/
  // pupilOffset/biteChunks lookups + the hudMode switch), unchanged except each
  // drawer call gains `shadowIntensity` in its input object, e.g.:
  // drawBug(ctx, { pos: e.physics.pos, sizePx, colors, timeMs: opts.nowMs, id: e.id, rotation, shadowIntensity });
}
```

`drawBug.ts`/`drawPointedFinger.ts`/`drawSubject.ts` (and their `DrawBugInput`/`DrawPointedFingerInput`/`DrawSubjectInput` types) gain an optional `shadowIntensity?: number` field, defaulted to `1` and forwarded to their `withPaperCutShadow(ctx, draw, shadowIntensity)` call — this is a small follow-on to Tasks 5-7's paperCut.ts adoption, landing here because the numeric input doesn't exist until this task computes it. `paperCut.ts`'s `withPaperCutShadow` itself gains a third optional `intensity: number = 1` parameter that scales `shadowOffsetY`/`shadowBlur` (default `1` keeps existing call sites — including drawEye.ts's future adoption and Tasks 5-7's zero-arg calls — visually unchanged).

- [ ] **Step 10: Run to verify pass**

Run: `npx vitest run tests/unit/rendererCrowdDispatch.test.ts`
Expected: PASS.

- [ ] **Step 11: Run the full suite**

Run: `npx vitest run`
Expected: PASS — any existing `renderFrame()` test call sites need `hudMode: "eyes"` added to their options object to keep compiling; add it there, matching current default behavior (rotation defaults to `0` via `e.physics.rotation ?? 0`, so visuals are unchanged until Task 11 starts writing non-zero rotations). They also need `quantity`/`repelMultiplier` added (e.g. `quantity: 20, repelMultiplier: 1` — the `computeShadowIntensity` baseline, so `shadowIntensity` resolves to `1` and visuals stay unchanged).

- [ ] **Step 12: Commit**

```bash
git add src/render/drawers/index.ts src/render/Renderer.ts src/render/paperCut.ts src/render/drawers/drawBug.ts src/render/drawers/drawPointedFinger.ts src/render/drawers/drawSubject.ts tests/unit/rendererCrowdDispatch.test.ts
git commit -m "feat(render): dispatch crowd rendering by HudMode, apply look-at rotation, sort crowd draw order by depth, and thread quantity/repel-derived shadow intensity into paperCut.ts shadows"
```

### Task 10: HUD skin/mode selectors + quantity stepper + repel track control

**Files:**
- Modify: `src/hud/Hud.ts`, `src/hud/hud.css`
- Test: `tests/unit/hudControls.test.ts` (new, `happy-dom`)

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/hudControls.test.ts
// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { Hud } from "../../src/hud/Hud";

describe("Hud crowd controls", () => {
  it("cycles HudMode on mode-icon click and calls onModeChange", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const onModeChange = vi.fn();
    hud.onModeChange(onModeChange);
    const modeBtn = root.querySelector<HTMLElement>(".hud-placard__mode-icon")!;
    modeBtn.click();
    expect(onModeChange).toHaveBeenCalledWith("bugs");
    modeBtn.click();
    expect(onModeChange).toHaveBeenCalledWith("pointedFinger");
    modeBtn.click();
    expect(onModeChange).toHaveBeenCalledWith("eyes");
  });

  it("cycles HudSkin on skin-icon click and calls onSkinChange", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const onSkinChange = vi.fn();
    hud.onSkinChange(onSkinChange);
    const skinBtn = root.querySelector<HTMLElement>(".hud-placard__skin-icon")!;
    skinBtn.click();
    expect(onSkinChange).toHaveBeenCalledWith("lotus");
    skinBtn.click();
    expect(onSkinChange).toHaveBeenCalledWith("figure");
  });

  it("steps quantity up/down within [1, 60] and calls onQuantityChange with the delta", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const onQuantityChange = vi.fn();
    hud.onQuantityChange(onQuantityChange);
    root.querySelector<HTMLElement>(".hud-placard__qty-inc")!.click();
    expect(onQuantityChange).toHaveBeenCalledWith(1);
    root.querySelector<HTMLElement>(".hud-placard__qty-dec")!.click();
    expect(onQuantityChange).toHaveBeenCalledWith(-1);
  });

  it("reports repel track changes as a 0..2 multiplier via onRepelChange", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const onRepelChange = vi.fn();
    hud.onRepelChange(onRepelChange);
    const track = root.querySelector<HTMLInputElement>(".hud-placard__repel-input")!;
    track.value = "1.5";
    track.dispatchEvent(new Event("input"));
    expect(onRepelChange).toHaveBeenCalledWith(1.5);
  });

  it("styles the repel control as a custom track, not a bare browser range input", () => {
    const root = document.createElement("div");
    new Hud(root);
    expect(root.querySelector<HTMLElement>(".hud-placard__repel-track")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/hudControls.test.ts`
Expected: FAIL — none of `onModeChange`/`onSkinChange`/`onQuantityChange`/`onRepelChange` exist yet, and the new DOM elements aren't in the placard markup.

- [ ] **Step 3: Implement the new `Hud.ts` controls**

```typescript
// src/hud/Hud.ts
import { PALETTE } from "../config/tokens";
import { hudIcons, HUD_TEAR_PATH, type HudMode, type HudPower, type HudSkin } from "./hudIcons";

const MODE_CYCLE: readonly HudMode[] = ["eyes", "bugs", "pointedFinger"];
const SKIN_CYCLE: readonly HudSkin[] = ["figure", "lotus"];
const QTY_MIN = 1;
const QTY_MAX = 60;

export class Hud {
  private placard: HTMLElement;
  private label: HTMLElement;
  private powerLabel: HTMLElement;
  private skinLabel: HTMLElement;
  private qtyValue: HTMLElement;
  private modeIconHost: HTMLElement;
  private powerIconHost: HTMLElement;
  private skinIconHost: HTMLElement;
  private repelInput: HTMLInputElement;
  private chargeRing: HTMLElement;
  private mode: HudMode = "eyes";
  private power: HudPower = "laserBurn";
  private skin: HudSkin = "figure";
  private quantity = 20;
  private readonly powerLabels: Record<HudPower, string> = {
    laserBurn: "laser burn",
    electricBurn: "shock",
    bugEat: "eat",
  };
  private modeChangeCb: ((mode: HudMode) => void) | null = null;
  private skinChangeCb: ((skin: HudSkin) => void) | null = null;
  private quantityChangeCb: ((delta: number) => void) | null = null;
  private repelChangeCb: ((multiplier: number) => void) | null = null;

  constructor(root: HTMLElement) {
    root.dataset.layer = "hud";
    root.innerHTML = "";
    this.placard = document.createElement("div");
    this.placard.className = "hud-placard";
    this.placard.dataset.mode = this.mode;
    this.placard.dataset.power = this.power;
    this.placard.setAttribute("aria-label", "Mode, skin, and active power");
    this.placard.setAttribute("role", "status");
    this.placard.innerHTML = `
      <svg class="hud-placard__tear" viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="${HUD_TEAR_PATH}" fill="${PALETTE.cream}" stroke="${PALETTE.ink}" stroke-width="1"/>
      </svg>
      <div class="hud-placard__inner">
        <button type="button" class="hud-placard__mode-icon" aria-label="Cycle crowd mode"></button>
        <span class="hud-placard__mode-label">eyes</span>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <button type="button" class="hud-placard__skin-icon" aria-label="Cycle subject skin"></button>
        <span class="hud-placard__skin-label">figure</span>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <span class="hud-placard__power-icon" aria-hidden="true"></span>
        <span class="hud-placard__power-label">laser burn</span>
        <span class="hud-placard__charge" aria-hidden="true"></span>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <div class="hud-placard__qty" role="group" aria-label="Crowd quantity">
          <button type="button" class="hud-placard__qty-dec" aria-label="Decrease quantity">-</button>
          <span class="hud-placard__qty-value">20</span>
          <button type="button" class="hud-placard__qty-inc" aria-label="Increase quantity">+</button>
        </div>
        <div class="hud-placard__repel-track" role="group" aria-label="Repel strength">
          <label class="hud-placard__repel-label" for="hud-repel-input">repel</label>
          <input id="hud-repel-input" class="hud-placard__repel-input" type="range" min="0" max="2" step="0.05" value="1" />
        </div>
      </div>
    `;
    root.appendChild(this.placard);
    this.label = this.placard.querySelector<HTMLElement>(".hud-placard__mode-label")!;
    this.powerLabel = this.placard.querySelector<HTMLElement>(".hud-placard__power-label")!;
    this.skinLabel = this.placard.querySelector<HTMLElement>(".hud-placard__skin-label")!;
    this.qtyValue = this.placard.querySelector<HTMLElement>(".hud-placard__qty-value")!;
    this.modeIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__mode-icon")!;
    this.powerIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__power-icon")!;
    this.skinIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__skin-icon")!;
    this.repelInput = this.placard.querySelector<HTMLInputElement>(".hud-placard__repel-input")!;
    this.chargeRing = this.placard.querySelector<HTMLElement>(".hud-placard__charge")!;
    this.refreshIcons();
    this.wireControls();
    requestAnimationFrame(() => this.placard.classList.add("hud-placard--ready"));
  }

  private wireControls(): void {
    this.modeIconHost.addEventListener("click", () => {
      const idx = MODE_CYCLE.indexOf(this.mode);
      const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]!;
      this.setMode(next);
      this.modeChangeCb?.(next);
    });
    this.skinIconHost.addEventListener("click", () => {
      const idx = SKIN_CYCLE.indexOf(this.skin);
      const next = SKIN_CYCLE[(idx + 1) % SKIN_CYCLE.length]!;
      this.setSkin(next);
      this.skinChangeCb?.(next);
    });
    this.placard.querySelector<HTMLElement>(".hud-placard__qty-inc")!.addEventListener("click", () => {
      if (this.quantity >= QTY_MAX) return;
      this.setQuantity(this.quantity + 1);
      this.quantityChangeCb?.(1);
    });
    this.placard.querySelector<HTMLElement>(".hud-placard__qty-dec")!.addEventListener("click", () => {
      if (this.quantity <= QTY_MIN) return;
      this.setQuantity(this.quantity - 1);
      this.quantityChangeCb?.(-1);
    });
    this.repelInput.addEventListener("input", () => {
      const v = Math.max(0, Math.min(2, Number.parseFloat(this.repelInput.value)));
      this.repelChangeCb?.(v);
    });
  }

  private refreshIcons(): void {
    this.modeIconHost.innerHTML = hudIcons.modeIcon[this.mode];
    this.powerIconHost.innerHTML = hudIcons.powerIcon[this.power];
    this.skinIconHost.innerHTML = hudIcons.skinIcon[this.skin];
  }

  setMode(mode: HudMode): void {
    this.mode = mode;
    this.placard.dataset.mode = mode;
    this.label.textContent = mode;
    this.refreshIcons();
  }

  setSkin(skin: HudSkin): void {
    this.skin = skin;
    this.placard.dataset.skin = skin;
    this.skinLabel.textContent = skin;
    this.refreshIcons();
  }

  setPower(power: HudPower): void {
    this.power = power;
    this.placard.dataset.power = power;
    this.powerLabel.textContent = this.powerLabels[power];
    this.refreshIcons();
  }

  setQuantity(quantity: number): void {
    this.quantity = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(quantity)));
    this.qtyValue.textContent = String(this.quantity);
  }

  setCharge(progress: number, visible: boolean): void {
    const p = Math.max(0, Math.min(1, progress));
    this.chargeRing.style.setProperty("--charge", p.toFixed(3));
    this.chargeRing.dataset.visible = visible ? "true" : "false";
  }

  onModeChange(cb: (mode: HudMode) => void): void {
    this.modeChangeCb = cb;
  }

  onSkinChange(cb: (skin: HudSkin) => void): void {
    this.skinChangeCb = cb;
  }

  onQuantityChange(cb: (delta: number) => void): void {
    this.quantityChangeCb = cb;
  }

  onRepelChange(cb: (multiplier: number) => void): void {
    this.repelChangeCb = cb;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/hudControls.test.ts`
Expected: PASS.

- [ ] **Step 5: Style the new controls to match the placard's torn-paper identity**

```css
/* src/hud/hud.css — appended */
.hud-placard__mode-icon,
.hud-placard__skin-icon {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 160ms var(--ease-protest);
}

.hud-placard__mode-icon:hover,
.hud-placard__skin-icon:hover {
  transform: scale(1.12);
}

.hud-placard__skin-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.hud-placard__qty {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
}

.hud-placard__qty-inc,
.hud-placard__qty-dec {
  width: 18px;
  height: 18px;
  border: 1.4px solid var(--color-ink);
  background: var(--color-cream);
  color: var(--color-ink);
  border-radius: 2px;
  line-height: 1;
  cursor: pointer;
  font-family: var(--font-mono);
  transition: transform 120ms var(--ease-protest), background 120ms var(--ease-protest);
}

.hud-placard__qty-inc:hover,
.hud-placard__qty-dec:hover {
  transform: translateY(-1px);
  background: var(--color-coral);
}

.hud-placard__qty-value {
  min-width: 1.6em;
  text-align: center;
  font-size: 0.75rem;
}

.hud-placard__repel-track {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
}

.hud-placard__repel-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.hud-placard__repel-input {
  appearance: none;
  -webkit-appearance: none;
  width: 64px;
  height: 3px;
  background: var(--color-ink);
  border-radius: 2px;
  cursor: pointer;
}

.hud-placard__repel-input::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-coral);
  border: 1.4px solid var(--color-ink);
  transition: transform 120ms var(--ease-protest);
}

.hud-placard__repel-input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.hud-placard__repel-input::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-coral);
  border: 1.4px solid var(--color-ink);
}

@media (prefers-reduced-motion: reduce) {
  .hud-placard__mode-icon,
  .hud-placard__skin-icon,
  .hud-placard__qty-inc,
  .hud-placard__qty-dec,
  .hud-placard__repel-input::-webkit-slider-thumb {
    transition: none;
  }
}
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS — `setMode`/`setPower`/`setCharge` keep their existing call signatures, so `main.ts`'s current `hud.setMode("eyes"); hud.setPower("laserBurn");` calls are unaffected until Task 11.

- [ ] **Step 7: Commit**

```bash
git add src/hud/Hud.ts src/hud/hud.css tests/unit/hudControls.test.ts
git commit -m "feat(hud): add skin selector, mode cycling, quantity stepper, and repel track control"
```

### Task 11: `main.ts` — wire skins, modes, quantity, repel, mode-locked power, no-overlap physics, and look-at rotation into the live loop

**Files:**
- Modify: `src/main.ts`
- Test: `tests/unit/mainCrowdWiring.test.ts` (new)

Per spec §2a, this task also removes `main.ts`'s current independent power-switching UX (the `POWER_CONFIGS` map, `switchPower()`, and the `1`/`2`/`3` `keydown` listener) and replaces it with power derived from `HudMode` via `MODE_POWER_MAP` (Task 1), driven from the same `hud.onModeChange` callback that already updates `hudMode`.

- [ ] **Step 1: Write a failing test for the pure logic this wiring depends on**

`main.ts` wires DOM at import time (queries `#stage`/`#hud-root`), so this test targets the pure functions it will call directly rather than importing `main.ts` itself.

```typescript
// tests/unit/mainCrowdWiring.test.ts
import { describe, it, expect } from "vitest";
import * as FF from "../../src/physics/ForceField";
import { computeLookAtRotation, LOOKAT_GAIN } from "../../src/physics/LookAt";

describe("crowd separation integration math", () => {
  it("resolves a dense crowd to non-zero corrective pushes for overlapping members", () => {
    const radius = 18;
    const members = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      pos: { x: (i % 6) * 10, y: Math.floor(i / 6) * 10 },
      radiusPx: radius,
    }));
    const forces = FF.accumulateSeparation(members, { strengthMultiplier: 2 });
    let anyPushed = false;
    for (const f of forces.values()) if (f.fx !== 0 || f.fy !== 0) anyPushed = true;
    expect(anyPushed).toBe(true);
  });

  it("repelMultiplier of 0 disables cursor repel entirely without affecting separation", () => {
    const cursorForce = FF.compute({ cursor: { x: 0, y: 0, active: true }, entityPos: { x: 50, y: 0 }, repelMultiplier: 0 });
    expect(cursorForce.magnitude).toBe(0);
    const sep = FF.computeSeparation({ pos: { x: 0, y: 0 }, radiusPx: 20 }, { pos: { x: 10, y: 0 }, radiusPx: 20 });
    expect(sep.fx).not.toBe(0);
  });
});

describe("per-mode look-at rotation applied to a crowd member's physics.rotation", () => {
  it("produces a smaller rotation for eyes than for bugs/pointedFinger given identical geometry", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 40, y: 40 };
    const eyesRot = computeLookAtRotation(from, to, "eyes");
    const bugsRot = computeLookAtRotation(from, to, "bugs");
    expect(Math.abs(eyesRot)).toBeLessThan(Math.abs(bugsRot));
    expect(LOOKAT_GAIN.eyes).toBeLessThan(LOOKAT_GAIN.bugs);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/mainCrowdWiring.test.ts`
Expected: PASS if Tasks 2/3 already landed (this test only exercises `ForceField.ts`/`LookAt.ts` directly) — this step exists to lock in the exact behavior `main.ts` is about to depend on before wiring it up. If either Task hasn't landed yet in this branch, it FAILs, confirming the dependency.

- [ ] **Step 3: Add crowd/skin/quantity/repel state and imports to `main.ts`**

```typescript
// src/main.ts — additions alongside the existing imports
import type { HudMode, HudSkin } from "./hud/hudIcons";
import { MODE_POWER_MAP } from "./hud/hudIcons";
import { spawnOneCrowdMember, pickCrowdMemberToDespawn } from "./entities/EntityFactory";
import { computeLookAtRotation } from "./physics/LookAt";
```

The existing `import type { HudPower } from "./hud/hudIcons";` line stays (it's still used for `PowerController`'s `PowerConfig`-shaped map, see Step 4a below) — only its *usage* changes, from a keyboard-driven switch to a mode-driven one.

```typescript
// src/main.ts — new module-level state, declared alongside the existing rng/store/manifest block
let hudMode: HudMode = "eyes";
let subjectSkin: HudSkin = "figure";
let repelMultiplier = 1;
let nextCrowdId = 1000000; // disjoint from spawnInitialEyes()'s 1..N ids
```

- [ ] **Step 4: Register the new HUD callbacks**

```typescript
// src/main.ts — after the existing hud.setMode("eyes"); hud.setPower("laserBurn"); lines
hud.onModeChange((mode) => {
  hudMode = mode;
  // Spec §2a: switching HudMode switches the active power as a side effect —
  // there is no independent power control anymore. POWER_CONFIGS keeps its
  // existing shape (effectId + chargeThresholdMs per HudPower); only the
  // caller changes, from a keydown handler to this mode-change callback.
  const power = MODE_POWER_MAP[mode];
  powerCtrl.setPower(POWER_CONFIGS[power]);
  hud.setPower(power);
});

hud.onSkinChange((skin) => {
  subjectSkin = skin;
  const subj = subjectId !== null ? store.get(subjectId, { live: true }) : null;
  if (subj) {
    const data = subj.behavior.data as Record<string, unknown>;
    data.subjectSkin = skin;
  }
});

hud.onQuantityChange((delta) => {
  const crowd: Entity[] = [];
  store.forEachAlive((e) => {
    if (e.id !== subjectId) crowd.push(e);
  });
  if (delta > 0) {
    const spawned = spawnOneCrowdMember({
      rng,
      width: viewport.state.width,
      height: viewport.state.height,
      manifest: manifest.entries,
      existing: crowd,
      nextId: nextCrowdId++,
    });
    if (spawned) {
      store.insert(spawned);
      installBehavior(spawned);
    }
    return;
  }
  const toRemove = pickCrowdMemberToDespawn(crowd);
  if (toRemove !== null) store.markDying(toRemove);
});

hud.onRepelChange((multiplier) => {
  repelMultiplier = multiplier;
});
```

`subjectId` here is the module-level `EntityId | null` state tracked by the v1-fix plan's Subject wiring (its Task 36). If the v1-fix plan named this variable differently, use that file's actual name in place of `subjectId` throughout this task — do not introduce a second, parallel Subject-tracking variable.

- [ ] **Step 4a: Remove the independent keyboard-driven power switch**

`main.ts` currently has a standalone `switchPower()`/keyboard-shortcut path that lets a player pick any of the three powers independent of `HudMode`:

```typescript
// src/main.ts — DELETE this block entirely (superseded by hud.onModeChange above)
const switchPower = (power: HudPower): void => {
  powerCtrl.setPower(POWER_CONFIGS[power]);
  hud.setPower(power);
};

window.addEventListener("keydown", (e) => {
  if (e.key === "1") switchPower("laserBurn");
  else if (e.key === "2") switchPower("electricBurn");
  else if (e.key === "3") switchPower("bugEat");
});
```

Delete both the `switchPower` function and the `keydown` listener. The `POWER_CONFIGS: Record<HudPower, { effectId: string; chargeThresholdMs: number }>` map immediately above them **stays** — it's still the lookup `hud.onModeChange` reads from in Step 4 above, just no longer paired with a keyboard listener. Also delete the now-redundant `hud.setPower("laserBurn");` line from the initial `hud.setMode("eyes"); hud.setPower("laserBurn");` pair near the top of the file — `hud.onModeChange` doesn't fire on initial construction (it only fires on a later click), so the initial power still needs to be set explicitly once; replace that line with `hud.setPower(MODE_POWER_MAP["eyes"]);` so the initial state is derived from the same map rather than hardcoded independently of it.

- [ ] **Step 5: Apply `repelMultiplier`, no-overlap separation, and per-mode look-at rotation in the pre-physics tick**

```typescript
// src/main.ts — replaces the body of the existing
// engine.onTick("pre-physics", (dt) => { ... }) handler that iterates
// store.forEachAlive with FF.compute/computeSpring/integrate
engine.onTick("pre-physics", (dt) => {
  const dtSec = Math.min(0.1, dt / 1000);
  const cursor = engine.cursor();
  const subject = subjectId !== null ? store.get(subjectId, { live: true }) : null;

  const crowdMembers: { id: EntityId; pos: { x: number; y: number }; radiusPx: number }[] = [];
  store.forEachAlive((e) => {
    if (e.id === subjectId || e.lifecycle.dragged) return;
    const data = e.behavior.data as Record<string, unknown>;
    const baseSizePx = (data.baseSizePx as number | undefined) ?? 40;
    crowdMembers.push({ id: e.id, pos: e.physics.pos, radiusPx: (baseSizePx * e.physics.scale) / 2 });
  });
  const separationForces = FF.accumulateSeparation(crowdMembers);

  store.forEachAlive((e) => {
    if (e.lifecycle.dragged) return;
    const isSubject = e.id === subjectId;
    const force = FF.compute({ cursor, entityPos: e.physics.pos, repelMultiplier: isSubject ? 1 : repelMultiplier });
    const sep = isSubject ? { fx: 0, fy: 0 } : (separationForces.get(e.id) ?? { fx: 0, fy: 0 });
    const spring = computeSpring({ pos: e.physics.pos, vel: e.physics.vel, home: e.physics.home, dtSeconds: dtSec });
    const next = integrate({
      pos: e.physics.pos,
      vel: e.physics.vel,
      acc: { x: force.fx + spring.ax + sep.fx, y: force.fy + spring.ay + sep.fy },
      dtSeconds: dtSec,
      maxSpeed: 600,
    });
    e.physics.pos = next.pos;
    e.physics.vel = next.vel;

    // Subject look-at rotation (spec §2): additive to the translation above,
    // computed once here in the shared crowd tick, magnitude read per-mode.
    if (!isSubject && subject) {
      e.physics.rotation = computeLookAtRotation(e.physics.pos, subject.physics.pos, hudMode);
    } else if (!isSubject) {
      e.physics.rotation = 0;
    }
  });

  store.forEachAlive((e) => {
    const beh = behaviors.get(e.id);
    if (beh) beh.tick(rng, engine.getNow());
  });
});
```

The Subject is excluded from both `crowdMembers`/`separationForces` and the look-at rotation itself (a Subject cannot look at itself); when no Subject currently exists (post-burn cooldown), every crowd member's `physics.rotation` is reset to `0` rather than left stale from before the burn.

- [ ] **Step 6: Pass `hudMode` through to `renderFrame`**

```typescript
// src/main.ts — inside the render-phase branch's renderFrame({...}) call, add:
renderFrame({
  // ...existing fields unchanged...
  hudMode,
});
```

- [ ] **Step 7: Run to verify pass**

Run: `npx vitest run tests/unit/mainCrowdWiring.test.ts`
Expected: PASS.

- [ ] **Step 8: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 9: Manual verification**

- Load the game with default settings (`eyes` mode, quantity 20, repel 1). Confirm no two eyes visually overlap and each eye shows a subtle rotational tilt toward the Subject as it moves.
- Click the mode icon to `bugs`; confirm cockroaches scuttle-jitter, don't overlap, and visibly swing their head/antenna axis to track the Subject.
- Click again to `pointedFinger`; confirm pointing hands point-and-shake, don't overlap, and visibly aim their finger at the Subject.
- Increase quantity to the 60 cap; confirm the crowd compresses tighter without any pair overlapping.
- Drag repel to 0; crowd members stop fleeing the cursor but still never overlap each other.
- Drag repel to 2; crowd members flee more sharply, still never overlap.
- Click the skin icon; confirm the Subject switches between figure and lotus, unaffected by crowd mode.
- During the post-burn cooldown (no Subject present), confirm crowd members' rotation relaxes to 0 rather than freezing at their last angle.
- Confirm the power placard updates automatically on each mode click — `laserBurn` in `eyes`, `electricBurn` in `pointedFinger`, `bugEat` in `bugs` — with no separate way to select a power, and that pressing `1`/`2`/`3` no longer does anything.

- [ ] **Step 10: Commit**

```bash
git add src/main.ts tests/unit/mainCrowdWiring.test.ts
git commit -m "feat(main): wire HUD skin/mode/quantity/repel controls, mode-locked power, and subject look-at rotation into the live loop"
```

---

## Phase D: Close out already-built power test coverage

### Task 12: `electricBurn.ts` test coverage

**Files:**
- Test: `tests/unit/electricBurn.test.ts` (new)

`src/effects/effectDefs/electricBurn.ts` is already fully implemented and wired into `main.ts`/`PowerController`/`hudIcons.ts` (4-stage effect: crackle 60ms → flash 40ms → shrink 120ms [markDying + 16 coral spark particles] → soot 120ms [startRespawn 3000-6000ms + 20 ink/dark-brown soot particles], `electricBurnProgressAt(elapsedMs)`). This task only adds the missing test coverage, modeled on the existing `tests/unit/laserBurn.test.ts` pattern — no design changes.

- [ ] **Step 1: Write the test**

```typescript
// tests/unit/electricBurn.test.ts
import { describe, it, expect } from "vitest";
import { ELECTRIC_BURN, electricBurnEffect, electricBurnProgressAt } from "../../src/effects/effectDefs/electricBurn";

describe("electricBurn stage durations", () => {
  it("matches ELECTRIC_BURN config exactly", () => {
    const durations = electricBurnEffect.stages.map((s) => s.durationMs);
    expect(durations).toEqual([
      ELECTRIC_BURN.crackleMs,
      ELECTRIC_BURN.flashMs,
      ELECTRIC_BURN.shrinkMs,
      ELECTRIC_BURN.sootMs,
    ]);
  });
});

describe("electricBurnProgressAt", () => {
  const boundaries = {
    crackleEnd: ELECTRIC_BURN.crackleMs,
    flashEnd: ELECTRIC_BURN.crackleMs + ELECTRIC_BURN.flashMs,
    shrinkEnd: ELECTRIC_BURN.crackleMs + ELECTRIC_BURN.flashMs + ELECTRIC_BURN.shrinkMs,
    totalMs:
      ELECTRIC_BURN.crackleMs + ELECTRIC_BURN.flashMs + ELECTRIC_BURN.shrinkMs + ELECTRIC_BURN.sootMs,
  };

  it("sequences stages at exact boundary timestamps", () => {
    expect(electricBurnProgressAt(0).stage).toBe("crackle");
    expect(electricBurnProgressAt(boundaries.crackleEnd).stage).toBe("flash");
    expect(electricBurnProgressAt(boundaries.flashEnd).stage).toBe("shrink");
    expect(electricBurnProgressAt(boundaries.shrinkEnd).stage).toBe("soot");
  });

  it("produces a monotonically non-decreasing overall progress metric across the full duration", () => {
    let last = -1;
    for (let t = 0; t <= boundaries.totalMs + 100; t += 25) {
      const p = electricBurnProgressAt(t).overallProgress;
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
  });

  it("clamps overallProgress to [0, 1]", () => {
    expect(electricBurnProgressAt(0).overallProgress).toBeGreaterThanOrEqual(0);
    expect(electricBurnProgressAt(boundaries.totalMs + 500).overallProgress).toBeLessThanOrEqual(1);
  });
});

describe("ELECTRIC_BURN charge threshold", () => {
  it("is a positive finite number of milliseconds", () => {
    expect(ELECTRIC_BURN.chargeThresholdMs).toBeGreaterThan(0);
    expect(Number.isFinite(ELECTRIC_BURN.chargeThresholdMs)).toBe(true);
  });
});
```

If `electricBurnProgressAt`'s actual return shape differs from `{ stage, overallProgress }` (check the real file's current export signature before running this step — it may return a different field name), adjust the property names in this test to match the real signature; do not change the real file's signature to match this test.

- [ ] **Step 2: Run to verify pass**

Run: `npx vitest run tests/unit/electricBurn.test.ts`
Expected: PASS immediately, since `electricBurn.ts` is already implemented — this test locks in its existing behavior rather than driving new implementation.

- [ ] **Step 3: Commit both the effect and its new test together**

```bash
git add src/effects/effectDefs/electricBurn.ts tests/unit/electricBurn.test.ts
git commit -m "test(effects): add electricBurn coverage and commit the already-implemented power"
```

### Task 13: `bugEat.ts` test coverage

**Files:**
- Test: `tests/unit/bugEat.test.ts` (new)

`src/effects/effectDefs/bugEat.ts` is already fully implemented and wired (4-stage effect: chomp1 80ms → chomp2 80ms → chomp3 60ms [markDying] → digest 80ms [startRespawn 2000-5000ms + 3-6 sage particles], driving `entity.behavior.data.bugBiteChunks` 0→1→2→3, `bugEatProgressAt(elapsedMs)`). This task only adds the missing test coverage.

- [ ] **Step 1: Write the test**

```typescript
// tests/unit/bugEat.test.ts
import { describe, it, expect } from "vitest";
import { BUG_EAT, bugEatEffect, bugEatProgressAt } from "../../src/effects/effectDefs/bugEat";

describe("bugEat stage durations", () => {
  it("matches BUG_EAT config exactly", () => {
    const durations = bugEatEffect.stages.map((s) => s.durationMs);
    expect(durations).toEqual([BUG_EAT.chomp1Ms, BUG_EAT.chomp2Ms, BUG_EAT.chomp3Ms, BUG_EAT.digestMs]);
  });
});

describe("bugEatProgressAt", () => {
  const boundaries = {
    chomp1End: BUG_EAT.chomp1Ms,
    chomp2End: BUG_EAT.chomp1Ms + BUG_EAT.chomp2Ms,
    chomp3End: BUG_EAT.chomp1Ms + BUG_EAT.chomp2Ms + BUG_EAT.chomp3Ms,
    totalMs: BUG_EAT.chomp1Ms + BUG_EAT.chomp2Ms + BUG_EAT.chomp3Ms + BUG_EAT.digestMs,
  };

  it("advances bugBiteChunks 0 -> 1 -> 2 -> 3 across the chomp stages", () => {
    expect(bugEatProgressAt(0).biteChunks).toBe(0);
    expect(bugEatProgressAt(boundaries.chomp1End).biteChunks).toBe(1);
    expect(bugEatProgressAt(boundaries.chomp2End).biteChunks).toBe(2);
    expect(bugEatProgressAt(boundaries.chomp3End).biteChunks).toBe(3);
  });

  it("produces a monotonically non-decreasing overall progress metric across the full duration", () => {
    let last = -1;
    for (let t = 0; t <= boundaries.totalMs + 100; t += 25) {
      const p = bugEatProgressAt(t).overallProgress;
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
  });
});

describe("BUG_EAT charge threshold", () => {
  it("is a positive finite number of milliseconds", () => {
    expect(BUG_EAT.chargeThresholdMs).toBeGreaterThan(0);
    expect(Number.isFinite(BUG_EAT.chargeThresholdMs)).toBe(true);
  });
});
```

As with Task 12, if `bugEatProgressAt`'s actual return shape differs from `{ biteChunks, overallProgress }`, adjust the test's property names to match the real file — do not alter the real signature to fit the test.

- [ ] **Step 2: Run to verify pass**

Run: `npx vitest run tests/unit/bugEat.test.ts`
Expected: PASS immediately (implementation pre-exists).

- [ ] **Step 3: Commit**

```bash
git add src/effects/effectDefs/bugEat.ts tests/unit/bugEat.test.ts
git commit -m "test(effects): add bugEat coverage and commit the already-implemented power"
```

### Task 14: `laserBurn` beam/glow render polish (visual-distinctiveness gap, spec §5a)

**Files:**
- Modify: `src/effects/effectDefs/laserBurn.ts`
- Modify: `src/render/Renderer.ts`
- Test: `tests/unit/laserBurn.test.ts` (extend, existing file)

Per spec §5a, `electricBurn` and `bugEat` already have their own dedicated per-frame render treatments (`electricBurn`'s jittering coral arc + white flash in `Renderer.ts`; `bugEat`'s accumulating bite-mark notches in `drawEye.ts`), but `laserBurn`'s four stages (`glow`→`line`→`shrink`→`dissolve`) currently only animate `entity.physics.scale` — there is no beam, no line, no glow actually drawn, despite the stage names implying one. This task closes that gap with a small, targeted addition: a straight, steady coral beam from the fire-cursor to the target during the `line` stage, plus a soft glow at the target building through `glow` and fading through `shrink` — contrasted deliberately with `electricBurn`'s jittered, branching polyline (steady vs. jittering is what reads as "concentrated" rather than "branching").

Per the confirmed outcome framing (spec §2a/§5a: eyes → laser → **"subject explodes"**), this task also closes a second, related gap: today the ash-particle burst is spawned in the `dissolve` stage's `onStart`, which runs *after* the `shrink` stage has already animated `physics.scale` down to `0` — so the sequence currently reads as "shrink to invisible, then a delayed puff of ash appears," not a sudden burst at the moment of impact. To read as an explosion, the burst needs to coincide with impact, not follow it. This task therefore also: moves the ash-particle spawn (and the `startRespawn` call) from `dissolve.onStart` to `shrink.onStart` (the instant the beam lands and the entity begins dying), and adds a brief, bright impact flash (`laserFlashT`) that pops at that same instant and decays quickly across the `shrink` stage — the explosion's "bang" — rendered as a larger, hotter burst than `electricBurn`'s existing spark-flash so the two remain visually distinct. This stays entirely inside the existing `EffectDef`/`Renderer.ts` architecture and the locked Paper-Cut Protest palette; no hungry-empress code, palette, or style is ported.

- [ ] **Step 1: Extend the failing test for the new pure opacity metrics**

```typescript
// tests/unit/laserBurn.test.ts — add to the existing describe block
it("beamOpacity is 0 during glow, ramps to 1 across line, and decays to 0 by the end of shrink", () => {
  expect(laserBurnProgressAt(0).beamOpacity).toBe(0);
  expect(laserBurnProgressAt(LASER_BURN.glowMs - 1).beamOpacity).toBe(0);
  expect(laserBurnProgressAt(LASER_BURN.glowMs + LASER_BURN.lineMs).beamOpacity).toBeCloseTo(1, 5);
  expect(laserBurnProgressAt(
    LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs,
  ).beamOpacity).toBeCloseTo(0, 5);
});

it("glowOpacity ramps up across glow, holds through line, and decays to 0 by the end of shrink", () => {
  expect(laserBurnProgressAt(0).glowOpacity).toBe(0);
  expect(laserBurnProgressAt(LASER_BURN.glowMs).glowOpacity).toBeCloseTo(1, 5);
  expect(laserBurnProgressAt(LASER_BURN.glowMs + LASER_BURN.lineMs).glowOpacity).toBeCloseTo(1, 5);
  expect(laserBurnProgressAt(
    LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs,
  ).glowOpacity).toBeCloseTo(0, 5);
});

it("flashOpacity pops to 1 at the instant shrink begins (impact) and decays to 0 well before shrink ends", () => {
  const impactMs = LASER_BURN.glowMs + LASER_BURN.lineMs;
  expect(laserBurnProgressAt(impactMs).flashOpacity).toBeCloseTo(1, 5);
  expect(laserBurnProgressAt(impactMs + LASER_BURN.shrinkMs).flashOpacity).toBe(0);
  // Decays faster than the shrink itself — should already be out well before shrink completes.
  expect(laserBurnProgressAt(impactMs + LASER_BURN.shrinkMs * 0.6).flashOpacity).toBe(0);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/laserBurn.test.ts`
Expected: FAIL — `beamOpacity`/`glowOpacity`/`flashOpacity` don't exist on `LaserBurnProgress` yet.

- [ ] **Step 3: Add the pure opacity metrics to `laserBurnProgressAt`**

```typescript
// src/effects/effectDefs/laserBurn.ts — extend LaserBurnProgress and laserBurnProgressAt
export type LaserBurnProgress = {
  stage: "glow" | "line" | "shrink" | "dissolve" | "done";
  glow: number;
  line: number;
  shrink: number;
  dissolve: number;
  beamOpacity: number;
  glowOpacity: number;
  flashOpacity: number;
};

export function laserBurnProgressAt(elapsedMs: number): LaserBurnProgress {
  if (elapsedMs < 0) elapsedMs = 0;
  const glow = Math.min(1, elapsedMs / LASER_BURN.glowMs);
  const lineT = (elapsedMs - LASER_BURN.glowMs) / LASER_BURN.lineMs;
  const line = lineT > 0 ? Math.min(1, lineT) : 0;
  const shrinkT = (elapsedMs - LASER_BURN.glowMs - LASER_BURN.lineMs) / LASER_BURN.shrinkMs;
  const shrink = shrinkT > 0 ? Math.min(1, shrinkT) : 0;
  const dissolveT = (elapsedMs - LASER_BURN.glowMs - LASER_BURN.lineMs - LASER_BURN.shrinkMs) /
    LASER_BURN.dissolveMs;
  const dissolve = dissolveT > 0 ? Math.min(1, dissolveT) : 0;

  let stage: LaserBurnProgress["stage"];
  if (elapsedMs < LASER_BURN.glowMs) stage = "glow";
  else if (elapsedMs < LASER_BURN.glowMs + LASER_BURN.lineMs) stage = "line";
  else if (elapsedMs < LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs) stage = "shrink";
  else if (elapsedMs < LASER_BURN.totalDurationMs) stage = "dissolve";
  else stage = "done";

  // Beam: invisible during glow, ramps in across line, fades out across shrink.
  const beamOpacity = line * (1 - shrink);
  // Glow: ramps in across glow, holds full through line, fades out across shrink.
  const glowOpacity = Math.max(glow, line) * (1 - shrink);
  // Impact flash: pops to 1 the instant shrink begins (beam-landing/"explosion" moment),
  // then decays to 0 faster than shrink itself so the pop reads as sudden, not lingering.
  const flashOpacity = shrink > 0 ? Math.max(0, 1 - shrink * 2.5) : 0;

  return { stage, glow, line, shrink, dissolve, beamOpacity, glowOpacity, flashOpacity };
}
```

- [ ] **Step 4: Write `laserBeamT`/`laserGlowT` into `entity.behavior.data` from each stage, mirroring the existing `electricArc`/`flashIntensity` pattern**

```typescript
// src/effects/effectDefs/laserBurn.ts — replace the stages array
export const laserBurnEffect: EffectDef = {
  id: "laserBurn",
  stages: [
    {
      durationMs: LASER_BURN.glowMs,
      easing: LASER_BURN.glowEase,
      update: (ctx, t) => {
        ctx.entity.physics.scale = (1 - t * 0.18);
        ctx.entity.behavior.data.laserGlowT = t;
        ctx.entity.behavior.data.laserBeamT = 0;
      },
    },
    {
      durationMs: LASER_BURN.lineMs,
      easing: LASER_BURN.lineEase,
      update: (ctx, t) => {
        ctx.entity.physics.scale = (1 - 0.18 - t * 0.18);
        ctx.entity.behavior.data.laserGlowT = 1;
        ctx.entity.behavior.data.laserBeamT = t;
      },
    },
    {
      durationMs: LASER_BURN.shrinkMs,
      easing: LASER_BURN.shrinkEase,
      onStart: (ctx) => {
        // Impact moment: the beam has just landed. This is where the entity starts
        // dying, where the ash burst fires, and where the impact flash pops — all
        // at once, so the ending reads as a sudden burst ("subject explodes", spec
        // §2a/§5a) rather than a shrink followed by a delayed puff of ash.
        ctx.world.markDying(ctx.entity.id);
        ctx.entity.behavior.data.laserFlashT = 1;
        const palette = ctx.entity.content.palette;
        const irisKey = palette?.iris as PaletteKey | undefined;
        const iris = irisKey && irisKey in PALETTE ? PALETTE[irisKey] : PALETTE.slate;
        const ink = PALETTE.ink;
        for (let i = 0; i < LASER_BURN.ashCount; i++) {
          const angle = ctx.rng.float() * Math.PI * 2;
          const speed = ctx.rng.range(LASER_BURN.ashMinR, LASER_BURN.ashMaxR);
          ctx.particles.spawn({
            x: ctx.target.x,
            y: ctx.target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifeMs: ctx.rng.range(380, 700),
            startSize: ctx.rng.range(2, 6),
            endSize: 0,
            color: i % 3 === 0 ? ink : iris,
            rotation: ctx.rng.float() * Math.PI,
            rotationSpeed: ctx.rng.range(-2, 2),
            spin: 0,
          });
        }
        ctx.world.startRespawn(ctx.entity.id, ctx.rng.rangeInt(3000, 6000));
      },
      update: (ctx, t) => {
        ctx.entity.physics.scale = (1 - 0.36) * (1 - t);
        ctx.entity.behavior.data.laserGlowT = 1 - t;
        ctx.entity.behavior.data.laserBeamT = 1 - t;
        // Mirrors laserBurnProgressAt's flashOpacity: pops to 1 at t=0, decays to 0
        // by t=0.4 — faster than the shrink itself, so the flash reads as a sudden
        // "bang" rather than lingering alongside the shrink/dissolve fade.
        ctx.entity.behavior.data.laserFlashT = Math.max(0, 1 - t * 2.5);
      },
    },
    {
      durationMs: LASER_BURN.dissolveMs,
      easing: LASER_BURN.dissolveEase,
      onStart: (ctx) => {
        // The burst and respawn scheduling already happened at shrink.onStart
        // (impact). This stage is purely the tail of the ash settling — it only
        // needs to make sure the beam/glow/flash data is fully zeroed.
        ctx.entity.behavior.data.laserGlowT = 0;
        ctx.entity.behavior.data.laserBeamT = 0;
        ctx.entity.behavior.data.laserFlashT = 0;
      },
      update: (ctx, _t) => {
        ctx.entity.physics.scale = 0;
      },
    },
  ],
};
```

The per-stage `t`-based formulas above are the stage-local equivalent of `beamOpacity`/`glowOpacity`/`flashOpacity` computed from global elapsed time in Step 3 — all three describe the same shapes (0 through glow, ramp-in through line, ramp-out through shrink or, for the flash, a fast pop-and-decay confined to the start of shrink), kept as separate expressions rather than one shared call because stage `update(ctx, t)` only receives stage-local eased time, not the global elapsed time `laserBurnProgressAt` takes. `laserBurnProgressAt`'s `beamOpacity`/`glowOpacity`/`flashOpacity` remain the authoritative, directly-testable contract (Steps 1-3); the stage closures are the runtime wiring that produces the same curves, and moving the particle burst + `startRespawn` call from `dissolve.onStart` to `shrink.onStart` is the retiming fix itself — the burst now fires at the same instant the flash pops and the entity begins its scale-to-zero, instead of after.

- [ ] **Step 5: Draw the beam and glow in `Renderer.ts`, alongside the existing `electricArc`/`flashIntensity` block**

```typescript
// src/render/Renderer.ts — inside the existing
// store.forEachAlive((e) => { ... electricArc/flashIntensity ... }) loop,
// add before the closing brace of that callback:
const glowT = data.laserGlowT as number | undefined;
const beamT = data.laserBeamT as number | undefined;
const laserFlashT = data.laserFlashT as number | undefined;

if (laserFlashT !== undefined && laserFlashT > 0) {
  // Impact "explosion" pop — deliberately larger and hotter than electricBurn's
  // spark-flash above (radius scale 30 → 55, coral-white vs. plain white) so the
  // two read as different damage signatures: a burst vs. a spark.
  ctx.save();
  ctx.globalAlpha = laserFlashT * 0.85;
  const flashRadius = (e.physics.scale || 1) * 55 * laserFlashT + 10;
  const flashGradient = ctx.createRadialGradient(
    e.physics.pos.x, e.physics.pos.y, 0,
    e.physics.pos.x, e.physics.pos.y, flashRadius,
  );
  flashGradient.addColorStop(0, "#FFFFFF");
  flashGradient.addColorStop(0.5, PALETTE.coral);
  flashGradient.addColorStop(1, "rgba(232, 169, 160, 0)");
  ctx.fillStyle = flashGradient;
  ctx.beginPath();
  ctx.arc(e.physics.pos.x, e.physics.pos.y, flashRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

if (glowT !== undefined && glowT > 0) {
  const radius = (e.physics.scale || 1) * 26;
  const gradient = ctx.createRadialGradient(
    e.physics.pos.x, e.physics.pos.y, 0,
    e.physics.pos.x, e.physics.pos.y, radius,
  );
  gradient.addColorStop(0, PALETTE.coral);
  gradient.addColorStop(1, "rgba(232, 169, 160, 0)");
  ctx.save();
  ctx.globalAlpha = glowT * 0.6;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(e.physics.pos.x, e.physics.pos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

if (beamT !== undefined && beamT > 0 && fx !== undefined && fy !== undefined) {
  ctx.save();
  ctx.globalAlpha = beamT;
  ctx.lineCap = "round";
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(e.physics.pos.x, e.physics.pos.y);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.coral;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(e.physics.pos.x, e.physics.pos.y);
  ctx.stroke();
  ctx.restore();
}
```

The straight `moveTo`/`lineTo` (no jitter, no segments) is the deliberate contrast with `electricBurn`'s jittered polyline immediately above it in the same file — a steady line reads as "concentrated heat," a jittering one reads as "branching current." `fx`/`fy` are the same `data.fireCursorX`/`fireCursorY` values already destructured earlier in this loop for `electricBurn`; no new cursor-tracking state is introduced. The ink-then-coral double-stroke (thicker dark line underneath, thinner coral line on top) keeps the beam inside the locked palette while giving it visible weight against the cream background, matching the same layered-stroke technique `drawEye.ts` already uses for outline-then-fill.

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run tests/unit/laserBurn.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 8: Manual verification**

- Charge and fire `laserBurn` (mode `eyes`) on a crowd member; confirm a soft coral glow builds at the target during the windup, then a straight ink-outlined coral beam draws from the cursor to the target.
- Confirm the beam is visibly straight/steady, in contrast to `electricBurn`'s jittering arc when firing that power in `pointedFinger` mode.
- Confirm the moment the beam lands, there is a sudden bright coral-white flash pop and the ash burst fires at the same instant — the whole thing should read as "the subject explodes," not "the subject shrinks, then some ash appears a beat later."

- [ ] **Step 9: Commit**

```bash
git add src/effects/effectDefs/laserBurn.ts src/render/Renderer.ts tests/unit/laserBurn.test.ts
git commit -m "feat(effects): give laserBurn its own beam/glow/impact-flash render treatment, distinct from electricBurn's arc"
```

---

## Phase E: Verification

### Task 15: Full regression pass, forbidden-files gate, and spec coverage self-check

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `npx vitest run`
Expected: PASS — every test added in Tasks 1-14 plus the full pre-existing suite remain green.

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 3: Confirm the forbidden-files rule was respected**

```bash
git diff main --stat -- src/core/Engine.ts src/entities/behaviors/StateMachine.ts src/entities/EntityStore.ts
```

Expected: empty output — these three remain untouched across the entire plan.

```bash
git diff main --stat -- src/physics/ForceField.ts
```

Expected: non-empty — `ForceField.ts` was intentionally modified in Task 2, per the spec's explicit, deliberate exception to the locked-core-files rule.

- [ ] **Step 4: Commit any fixups**

If Steps 1-2 required fixes, commit them individually with a message describing the specific fix. If no fixes were needed, skip this step.

---

## Spec Coverage Table

| Spec section / bullet (`2026-07-25-fun-satire-v2-expansion-design.md`) | Task(s) |
|---|---|
| §1 Subject skins (`subjectSkin: "figure" \| "lotus"`) | Task 4 (schema field), Task 5 (drawSubjectFigure/drawSubjectLotus/drawSubject dispatch), Task 10 (skin selector control), Task 11 (main.ts skin wiring) |
| §2 Crowd modes — `HudMode` widened to `"eyes" \| "bugs" \| "pointedFinger"` | Task 1 (HudMode/icons), Task 9 (Renderer dispatch) |
| §2 Crowd modes — bug scuttle-jitter idle animation | Task 6 |
| §2 Crowd modes — pointedFinger point-and-shake idle animation | Task 7 |
| §2 Crowd modes — Subject look-at rotation (all three modes, additive to flee/repel translation, per-mode gain: eyes ~0.2, bugs/pointedFinger ~0.85) | Task 3 (`computeLookAtAngle`/`computeLookAtRotation`/`LOOKAT_GAIN`), Task 9 Step 6 (Renderer applies rotation transform per drawer, eyes included), Task 11 Step 5 (computed once per tick in the shared crowd behavior loop, written to `physics.rotation`, reset to 0 when no Subject exists) |
| §2/§3 Crowd draw-order/depth compositing vs. the Subject, and shadow-depth visually responding to quantity/repel state | Task 9 Steps 7-9 (`computeCrowdDrawOrder` painter's-algorithm sort by y-position before the render loop; `computeShadowIntensity` derived from `quantity`+`repelMultiplier`, threaded into each drawer's `withPaperCutShadow` call) |
| Design-system consistency — "all assets should look and feel the same, part of one visual design system" (no bespoke per-drawer edge/shadow styling) | Task 5, Task 6, Task 7 (each drawer's outline/silhouette fill routed through the shared `paperCutEdgePath`/`withPaperCutShadow` from `src/render/paperCut.ts`, with a test asserting the shared shadow color is applied, not a bespoke implementation) |
| §2a Mode-locked power pairing (`MODE_POWER_MAP`, power derived from `HudMode` not independently selected) | Task 1 (`MODE_POWER_MAP: Record<HudMode, HudPower>` in `hudIcons.ts`), Task 11 Step 4 (`hud.onModeChange` drives `powerCtrl.setPower()`/`hud.setPower()` from the map), Task 11 Step 4a (removes the `1`/`2`/`3` keyboard listener and `switchPower()`) |
| §2a Power placard repurposed as read-only feedback, not a click target | Task 10 (confirmed via existing code review to already have no click handler attached — no change needed, noted explicitly so the plan doesn't silently skip it) |
| §3 HUD controls: quantity | Task 8 (`spawnOneCrowdMember`/`pickCrowdMemberToDespawn`), Task 10 (qty stepper UI), Task 11 (main.ts wiring) |
| §3 HUD controls: repel | Task 2 (`repelMultiplier` on `ForceField.compute`), Task 10 (repel track UI), Task 11 (main.ts wiring) |
| §4 No-overlap rule | Task 2 (`computeSeparation`/`accumulateSeparation`), Task 11 Step 5 (applied in the pre-physics tick, excluding the Subject) |
| §5 New powers — `electricBurn`/`bugEat` reconciliation (already built, needs tests + commit) | Task 12, Task 13 |
| §5a Visual-distinctiveness finding — `bugEat`/`electricBurn` already meet the "eaten away"/"burns" bar, `laserBurn` does not meet the "explodes" bar and needs beam/glow + retimed impact-flash/ash-burst polish | Task 14 |
| §6 Open design questions for v2 (ink smear/garbage/shame-stamp powers, change-minister/logo control) | Explicitly out of scope for this plan — not designed or implemented here, per the spec's own "not yet speced" marking |
| Relationship to existing specs — `ForceField.ts` is the one deliberate exception to the locked-core-files rule | Task 15 Step 3 (forbidden-files gate explicitly checks and confirms this) |
| Relationship to existing specs — v2 implementation blocked on PR #2 merging to `main` | Not a task in this plan (a pre-condition on when the plan's Task 1 may begin, not work the plan performs) — flagged here so the self-check doesn't read it as an uncovered gap |

## Self-Review

**1. Spec coverage:** Every numbered section of the v2 spec (§1-§5, §2a, §5a) maps to at least one task above; §6 is explicitly excluded by design (those powers/controls are marked "not yet speced" and this plan does not invent designs for them). No gaps found.

**2. Placeholder scan:** No `TBD`/`TODO`/"add appropriate error handling"/"similar to Task N" patterns appear in any task above — every step that changes code shows the actual code, including the two tasks (12, 13) that only add tests to pre-existing implementations, which show the full test file rather than describing it, and Task 14's amended impact-flash/retiming steps, which show the complete replacement `stages` array rather than a diff description.

**3. Type/signature consistency check across tasks:**
- `computeLookAtRotation(from, to, mode)` (Task 3) is called identically in Task 11 Step 5 with `(e.physics.pos, subject.physics.pos, hudMode)` — `hudMode` is typed `HudMode` (Task 1) which is structurally the same union as `LookAtMode` (Task 3's `keyof typeof LOOKAT_GAIN`); both are `"eyes" | "bugs" | "pointedFinger"`, so no cast is needed.
- `accumulateSeparation(members, opts?)` (Task 2) is called with the same `{ id, pos, radiusPx }[]` shape in both its own test and Task 11 Step 5's `crowdMembers` array.
- `DrawBugInput`/`DrawPointedFingerInput` (Tasks 6/7) both declare `rotation?: number` optional, matching how Task 9 Step 5 calls them with an explicit `rotation` value while Task 6/7's own tests call them without one (covering the default-to-0 path) — no signature drift.
- `Hud.onModeChange`/`onSkinChange`/`onQuantityChange`/`onRepelChange` (Task 10) are each registered in Task 11 Step 4 with matching callback parameter types (`HudMode`, `HudSkin`, `number` delta, `number` multiplier).
- `spawnOneCrowdMember`/`pickCrowdMemberToDespawn` (Task 8) are called in Task 11 Step 4 with the exact option field names defined in Task 8 (`rng, width, height, manifest, existing, nextId`).
- The look-at rotation requirement specifically: confirmed present in the spec-coverage table above with its own row, confirmed implemented as its own dedicated module (Task 3) plus its own dedicated application points (Task 9 Step 6, Task 11 Step 5), and confirmed additive-only (Task 11 Step 5's `physics.rotation` assignment never touches `physics.pos`/`physics.vel`, which remain driven solely by the existing force/spring/integrate pipeline).
- `MODE_POWER_MAP[mode]` (Task 1) returns `HudPower`, matching the parameter type `POWER_CONFIGS[power]` (Task 11 Step 4) already expects (`Record<HudPower, { effectId: string; chargeThresholdMs: number }>`, unchanged from its pre-existing shape) and `hud.setPower(power)` (Task 11 Step 4) already expects — no cast needed anywhere along that call chain.
- `LaserBurnProgress.beamOpacity`/`glowOpacity`/`flashOpacity` (Task 14 Step 3) and the stage-local `laserGlowT`/`laserBeamT`/`laserFlashT` fields written onto `entity.behavior.data` (Task 14 Step 4) are read by `Renderer.ts` (Task 14 Step 5) with the same `as number | undefined` narrowing pattern already used for `electricArc`/`flashIntensity` two lines above in the same loop — no new type introduced, same convention.
- **Task numbering check:** the plan now has 15 tasks (Phase A: Tasks 1-4, Task 1 gaining the added `MODE_POWER_MAP` export; Phase B: Tasks 5-9 unchanged; Phase C: Tasks 10-11; Phase D: Tasks 12-14, with Task 14 newly inserted per §5a; Phase E: Task 15, renumbered from the prior Task 14 "Full regression pass"). Task 15 Step 1's cross-reference has been updated to "Tasks 1-14" to match the renumbering.

**7. Design-system consistency and depth/shadow amendments (added for sprint-plan lane assignment):**
- Tasks 5, 6, and 7 each now carry an explicit `paperCut.ts` dependency in their **Files** list, import `paperCutEdgePath`/`withPaperCutShadow` from `../paperCut` in their Step 3 implementation, route their primary outline/silhouette fill through `withPaperCutShadow` (and `paperCutEdgePath` for every ellipse-derived shape — `drawSubjectFigure`'s hand-drawn shoulder bezier is the one shape `paperCutEdgePath` can't fit, so it uses `withPaperCutShadow` alone, noted inline), and each carries a dedicated `describe("paperCut.ts consistency ...")` test asserting the shared `shadowColor` (`"rgba(42, 36, 32, 0.22)"`) is applied during the draw call — a bespoke shadow implementation would not produce that exact value, making the assertion a reliable proxy for "used the shared utility, not a one-off."
- Task 9 gained two new steps (Steps 7-9, with the former Steps 7-9 renumbered to 10-12): a `computeCrowdDrawOrder` painter's-algorithm sort (stable, ascending by `pos.y`) applied immediately before the crowd render loop so depth composites correctly against the Subject, and a `computeShadowIntensity` function deriving a single per-frame numeric value from `quantity`+`repelMultiplier`, threaded through to `withPaperCutShadow` (which gains a third optional `intensity: number = 1` parameter, default-preserving all existing zero-arg call sites) via each drawer's new optional `shadowIntensity` input field. The exact quantity/repel-to-intensity constants (`SHADOW_INTENSITY`) are flagged in-line as initial plumbing values owned by visual-design review, not load-bearing physics — consistent with this plan's existing convention (see Task 14's similar treatment of tunable visual constants) of keeping magic numbers concrete and testable while flagging which ones are design-owned.
- Both additions are reflected in the Spec Coverage Table above (two new rows) and required no renumbering of any task other than Task 9's own internal steps.

No gaps found; plan is ready for execution.
