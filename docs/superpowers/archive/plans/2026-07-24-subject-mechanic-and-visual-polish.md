# Subject Mechanic & Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "burn any eye" mechanic with a single cursor-following Subject entity that is the only burn target — eyes become spectators that gaze-assist the burn and are never destructible — and apply the locked Paper-Cut Protest visual identity properly to the HUD placard and the new Subject rig.

**Architecture:** Follows the existing content-as-data/registry pattern (ADR 001) exactly as eyes do: a new `subject` rig gets a manifest entry type, a factory function, a behavior class, and a drawer, all registered through the same barrel files eyes use. `main.ts` remains the only file with side effects (per system-architecture.md) — all Subject-specific wiring (spawn/despawn/cooldown, physics-loop branching, retargeting press/drag) lives there. `Engine.ts`, `ForceField.ts`, `StateMachine.ts`, and `EntityStore.ts` are never touched. Gaze-lines reuse the existing `ForceField`-driven field-line math and generic `drawFieldLines` stroker (ADR 002) with a second origin set. The Subject's respawn is remove+recreate (via a new `spawnSubject()` factory call + `store.remove()`), NOT the eyes' in-place `RespawnScheduler` reposition pattern — the two are architecturally different and must not be conflated. The Subject is also directly draggable via the existing entity-agnostic `DragController` (unchanged, per the design-dummy review — same mechanism eyes already use); a press-and-move-before-threshold on the Subject cancels an in-progress charge and starts a drag instead, while a press-and-hold-still continues charging toward the burn threshold.

**Tech Stack:** TypeScript + Vite, Canvas2D, Vitest (fake-ctx / seeded-`Rng` patterns already established in `tests/unit/`), no new dependencies.

---

## Execution Model (worktree framework)

This plan has 4 phases. **Phase A is a hard prerequisite** for everything else (it changes shared type names). **Phase B is 5 independent tracks** — dispatch one subagent per track, each in its own git worktree, all branching from the commit that ends Phase A. **Phase C is integration** — must happen in a single worktree, sequentially, after all of Phase B has merged, because every Phase B track touches shared barrel files or `main.ts`. **Phase D is verification**, sequential, in the integration worktree.

```
Phase A (sequential, 1 worktree)
   Task 25 → Task 26
        │
        ▼
Phase B (parallel, 5 worktrees, branch from end of Phase A)
   Track 1 (Behavior):  Task 27
   Track 2 (Factory):   Task 28
   Track 3 (Rendering): Task 29 → Task 30 → Task 31
   Track 4 (Effects):   Task 32
   Track 5 (HUD):       Task 33
        │  (merge all 5 branches)
        ▼
Phase C (sequential, 1 worktree, branch from merged Phase B)
   Task 34 → Task 35 → Task 36
        │
        ▼
Phase D (sequential, same worktree)
   Task 37 → Task 38
```

Use `superpowers:using-git-worktrees` to create/merge each worktree. Track branch names: `subject-behavior`, `subject-factory`, `subject-rendering`, `subject-effects`, `subject-hud`.

---

## File Structure

**Renamed (Phase A, collision fix — the name `SubjectBehavior` is needed for a new class and is currently squatted by an eye-only type):**
- `src/content/schema.ts`: `SubjectColors` → `EyeColors`, `SubjectPhysics` → `EyePhysics`, `SubjectBehavior` (type) → `EyeBehaviorConfig`.
- `src/entities/Entity.ts`: `SubjectColorPalette` → `EntityColorPalette`.

**Modified (Phase A):**
- `src/content/schema.ts` — current `ManifestEntry` shape renamed to `EyeManifestEntry`; new `SubjectManifestEntry` added; `ManifestEntry = EyeManifestEntry | SubjectManifestEntry` (discriminated union on `rig`).
- `src/content/manifestLoader.ts` — `validateEntry` dispatches on `r.rig` ("eye" vs "subject") to two branch functions.

**Created (Phase A):**
- `src/content/manifests/subject.roster.json` — single-entry roster for the Subject rig.

**Created (Phase B, Track 1 — Behavior):**
- `src/entities/behaviors/SubjectBehavior.ts` — `SubjectBehavior` class, `homeFor(cursor): Vec2`.

**Modified (Phase B, Track 1):**
- `src/entities/behaviors/EyeBehavior.ts` — add exported pure function `isWithinBurnAssistRange(eyePos, subjectPos, radiusPx): boolean`.

**Modified (Phase B, Track 2 — Factory):**
- `src/entities/EntityFactory.ts` — add `spawnSubject(opts): Entity` (no placement-collision loop, single entity, cursor-anchored).

**Created (Phase B, Track 3 — Rendering):**
- `src/render/paperCut.ts` — `paperCutEdgePath(ctx, opts)` (deterministic wobble-edge path), `withPaperCutShadow(ctx, drawFn)` (shadow-wrapped draw callback).
- `src/render/drawers/drawSubject.ts` — `drawSubject(ctx, input)`, abstract flat-illustrated authority-figure silhouette.
- `src/render/drawers/drawGazeLines.ts` — `computeGazeLines(input): FieldLine[]`, reuses `FieldLine` type from `drawFieldLines.ts`.

**Modified (Phase B, Track 3):**
- `src/render/drawers/drawEye.ts` — wrap outline fill with `withPaperCutShadow`.

**Modified (Phase B, Track 4 — Effects):**
- `src/effects/effectDefs/laserBurn.ts` — dissolve stage's respawn delay branches on `ctx.entity.content.renderType` (Subject: ~1-2s, eyes: existing 3-6s — eyes keep this path only for future-proofing/tests, since eyes are no longer burn targets after Phase C).

**Modified (Phase B, Track 5 — HUD):**
- `src/hud/hud.css` — `.hud-placard__tear` gets layered drop-shadow; `.hud-placard__mode-label`/`.hud-placard__power-label` get `font-family: var(--font-display)` + `font-style: italic`; new `.hud-placard__grain` pseudo-element or layer reusing `--grain-tile-url`/`--grain-opacity`.
- `src/hud/Hud.ts` — no structural change expected; verify the DOM already has a hookable element for the grain layer, add one if not (see Task 33).

**Modified (Phase C — integration, after all Phase B tracks merge):**
- `src/entities/behaviors/index.ts` — export `SubjectBehavior` and `isWithinBurnAssistRange`.
- `src/render/drawers/index.ts` — export `drawSubject`, `computeGazeLines`.
- `src/render/Renderer.ts` — branch entity draw loop by `renderType`; draw gaze-lines + Subject via new `RenderFrameOptions` fields (`subject`, `chargeT`, `assistRadiusPx`).
- `src/main.ts` — Subject lifecycle state (`subjectId`, `subjectRespawnAtMs`, `nextEntityId`), physics-loop branch (Subject skips `ForceField`, uses `SubjectBehavior.homeFor` as spring home, suspended while dragged), press-handler retargeting (burn targets `subjectId`; drag targets either the Subject itself, via the existing `DragController`, or the nearest eye via the new local `queryNearestEye` helper; a press-then-move-past-deadzone on the Subject cancels an in-progress charge and starts a Subject drag instead), `worldAPI.startRespawn` branches remove+recreate (Subject) vs in-place (eyes), entrance-scale animation on spawn.

**Not modified anywhere in this plan (locked, per spec):** `src/core/Engine.ts`, `src/physics/ForceField.ts`, `src/entities/behaviors/StateMachine.ts`, `src/entities/EntityStore.ts`.

---

## Phase A: Schema Foundation (sequential — do this first, in one worktree)

### Task 25: Rename colliding types in schema.ts and Entity.ts

**Files:**
- Modify: `src/content/schema.ts`
- Modify: `src/entities/Entity.ts`
- Modify: `src/content/manifests/eyes.roster.json` (no change needed — JSON has no type references)
- Test: `tests/unit/schemaRename.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/schemaRename.test.ts
import { describe, expect, it } from "vitest";
import type { EyeColors, EyePhysics, EyeBehaviorConfig } from "../../src/content/schema";
import type { EntityColorPalette } from "../../src/entities/Entity";

describe("content/schema renamed types (T25)", () => {
  it("EyeColors/EyePhysics/EyeBehaviorConfig are usable type names", () => {
    const colors: EyeColors = { sclera: "cream", iris: "slate", pupil: "ink", highlight: null, outline: "ink" };
    const physics: EyePhysics = { baseSizePx: 56 };
    const behavior: EyeBehaviorConfig = {
      blinkIntervalMinMs: 2000,
      blinkIntervalMaxMs: 5000,
      blinkDurationMs: 120,
      pupilTrackMs: 180,
    };
    expect(colors.outline).toBe("ink");
    expect(physics.baseSizePx).toBe(56);
    expect(behavior.pupilTrackMs).toBe(180);
  });

  it("EntityColorPalette is a usable type name on entities/Entity", () => {
    const palette: EntityColorPalette = { sclera: "#EDE7DD", iris: "#5B7A8C", pupil: "#2A2420", highlight: null, outline: "#2A2420" };
    expect(palette.sclera).toBe("#EDE7DD");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/schemaRename.test.ts`
Expected: FAIL — `EyeColors`, `EyePhysics`, `EyeBehaviorConfig`, `EntityColorPalette` do not exist (TS compile error surfaced by vitest).

- [ ] **Step 3: Rename the types**

In `src/content/schema.ts`, rename (find-and-replace, all usages including the `ManifestEntry` field types that reference them):
- `SubjectColors` → `EyeColors`
- `SubjectPhysics` → `EyePhysics`
- `SubjectBehavior` (the type alias) → `EyeBehaviorConfig`

In `src/entities/Entity.ts`, rename:
- `SubjectColorPalette` → `EntityColorPalette`
- Update `ContentRef.palette?: SubjectColorPalette` → `ContentRef.palette?: EntityColorPalette`

Search the rest of the codebase for any other references to these four old names and update them (there should be none outside these two files based on current research, but verify):

```bash
grep -rn "SubjectColors\|SubjectPhysics\|SubjectColorPalette\b" src/ --include="*.ts" | grep -v "SubjectBehavior\.ts\|SubjectManifestEntry"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/schemaRename.test.ts`
Expected: PASS

- [ ] **Step 5: Run full suite to confirm no other file broke**

Run: `npx vitest run`
Expected: PASS (all existing tests still green — these were pure renames)

- [ ] **Step 6: Commit**

```bash
git add src/content/schema.ts src/entities/Entity.ts tests/unit/schemaRename.test.ts
git commit -m "refactor(schema): rename Subject-prefixed eye-only types to Eye-prefixed, free SubjectBehavior name"
```

### Task 26: Widen ManifestEntry into a discriminated union and add subject roster

**Files:**
- Modify: `src/content/schema.ts`
- Modify: `src/content/manifestLoader.ts`
- Create: `src/content/manifests/subject.roster.json`
- Test: `tests/unit/subjectManifest.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/subjectManifest.test.ts
import { describe, expect, it } from "vitest";
import { loadManifestFromText } from "../../src/content/manifestLoader";
import subjectRoster from "../../src/content/manifests/subject.roster.json";

describe("content/manifestLoader subject rig (T26)", () => {
  it("loads the subject roster with exactly one entry shaped for the subject rig", () => {
    const manifest = loadManifestFromText(JSON.stringify(subjectRoster));
    expect(manifest.entries.length).toBe(1);
    const entry = manifest.entries[0];
    expect(entry.rig).toBe("subject");
    expect(entry.renderType).toBe("subject");
    expect(entry.visual.styleGuardrail).toBe("flat-illustrated");
  });

  it("rejects a subject entry with an invalid colors.suit value", () => {
    const bad = {
      schemaVersion: "1.0.0",
      name: "bad-subject",
      entries: [
        {
          id: "subject-bad",
          rig: "subject",
          renderType: "subject",
          visual: { styleGuardrail: "flat-illustrated" },
          colors: { suit: "coral", shirt: "cream", outline: "ink" },
          physics: { baseSizePx: 96 },
        },
      ],
    };
    expect(() => loadManifestFromText(JSON.stringify(bad))).toThrowError();
  });

  it("still loads the existing eyes roster unchanged (regression)", () => {
    const eyesRosterText = require("fs").readFileSync(
      require("path").join(__dirname, "../../src/content/manifests/eyes.roster.json"),
      "utf-8",
    );
    const manifest = loadManifestFromText(eyesRosterText);
    expect(manifest.entries.length).toBe(18);
    expect(manifest.entries[0].rig).toBe("eye");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/subjectManifest.test.ts`
Expected: FAIL — `src/content/manifests/subject.roster.json` does not exist (import error).

- [ ] **Step 3: Widen the schema union**

In `src/content/schema.ts`, rename the existing `ManifestEntry` type to `EyeManifestEntry`, then add:

```typescript
export type EyeManifestEntry = ManifestEntry; // (this line is illustrative only — actually perform the rename in place, do not alias)
```

Concretely, replace the current `export type ManifestEntry = { ... }` block with:

```typescript
export type EyeManifestEntry = {
  id: string;
  rig: "eye";
  renderType: "eye";
  visual: {
    styleGuardrail: "flat-illustrated";
    shapeVariant: ShapeVariant;
  };
  colors: EyeColors;
  physics: EyePhysics;
  behavior: EyeBehaviorConfig;
};

export type SubjectManifestEntry = {
  id: string;
  rig: "subject";
  renderType: "subject";
  visual: {
    styleGuardrail: "flat-illustrated";
  };
  colors: {
    suit: "slate" | "sage" | "ink";
    shirt: "cream";
    outline: "ink";
  };
  physics: {
    baseSizePx: number;
  };
};

export type ManifestEntry = EyeManifestEntry | SubjectManifestEntry;
```

(`Manifest.entries: ManifestEntry[]` stays as-is — it already references the type name, not the shape.)

- [ ] **Step 4: Branch manifestLoader.ts validation on rig**

In `src/content/manifestLoader.ts`, the current `validateEntry(raw, index, issues)` function (lines 33-103) validates unconditionally as an eye. Restructure it to dispatch:

```typescript
function validateEntry(raw: unknown, index: number, issues: ManifestLoadIssue[]): ManifestEntry | null {
  const base = `/entries/${index}`;
  if (typeof raw !== "object" || raw === null) {
    issues.push({ path: base, message: "entry must be an object" });
    return null;
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !/^[a-z0-9-_]{2,32}$/.test(r.id)) {
    issues.push({ path: `${base}/id`, message: "id must be a lowercase slug, 2-32 chars" });
    return null;
  }
  if (r.rig === "subject") {
    return validateSubjectEntry(r, base, issues);
  }
  if (r.rig !== "eye") {
    issues.push({ path: `${base}/rig`, message: 'rig must be "eye" or "subject"' });
    return null;
  }
  return validateEyeEntry(r, base, issues);
}
```

Rename the existing body (everything currently inside `validateEntry` after the `id`/`rig`/`renderType` checks) into a new function `validateEyeEntry(r, base, issues): EyeManifestEntry | null`, keeping its logic byte-for-byte identical (it already validates `renderType === "eye"`, `visual.shapeVariant`, `colors`, `physics`, `behavior`).

Add the new branch function:

```typescript
const SUIT_COLORS = new Set(["slate", "sage", "ink"]);

function validateSubjectEntry(
  r: Record<string, unknown>,
  base: string,
  issues: ManifestLoadIssue[],
): SubjectManifestEntry | null {
  if (r.renderType !== "subject") {
    issues.push({ path: `${base}/renderType`, message: 'renderType must equal "subject"' });
  }
  const visual = (r.visual as Record<string, unknown> | undefined) ?? {};
  if (visual.styleGuardrail !== "flat-illustrated") {
    issues.push({ path: `${base}/visual/styleGuardrail`, message: 'styleGuardrail must equal "flat-illustrated"' });
  }
  const colors = (r.colors as Record<string, unknown> | undefined) ?? {};
  if (typeof colors.suit !== "string" || !SUIT_COLORS.has(colors.suit)) {
    issues.push({ path: `${base}/colors/suit`, message: 'suit must be "slate", "sage", or "ink"' });
  }
  if (colors.shirt !== "cream") {
    issues.push({ path: `${base}/colors/shirt`, message: 'shirt must equal "cream"' });
  }
  if (colors.outline !== "ink") {
    issues.push({ path: `${base}/colors/outline`, message: 'outline must equal "ink"' });
  }
  const physics = (r.physics as Record<string, unknown> | undefined) ?? {};
  const baseSizePx = typeof physics.baseSizePx === "number" ? physics.baseSizePx : NaN;
  between(baseSizePx, 24, 160, `${base}/physics/baseSizePx`, issues);

  if (issues.length > 0) return null;
  return r as unknown as SubjectManifestEntry;
}
```

Note: `between()` already exists in this file (line ~23) and pushes an issue + returns nothing usable — follow the existing call convention used by `validateEyeEntry` for other numeric fields (check the existing file for whether `between` returns a boolean or just mutates `issues`; match that call site's pattern exactly).

Import `SubjectManifestEntry` and `EyeManifestEntry` into `manifestLoader.ts`'s existing type-only import line from `./schema`.

- [ ] **Step 5: Create the subject roster**

```json
{
  "schemaVersion": "1.0.0",
  "name": "subject-roster-v1",
  "entries": [
    {
      "id": "subject-figure-01",
      "rig": "subject",
      "renderType": "subject",
      "visual": { "styleGuardrail": "flat-illustrated" },
      "colors": { "suit": "slate", "shirt": "cream", "outline": "ink" },
      "physics": { "baseSizePx": 96 }
    }
  ]
}
```

Save as `src/content/manifests/subject.roster.json`.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/subjectManifest.test.ts`
Expected: PASS

- [ ] **Step 7: Run full suite to confirm eyes roster validation still passes unchanged**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/content/schema.ts src/content/manifestLoader.ts src/content/manifests/subject.roster.json tests/unit/subjectManifest.test.ts
git commit -m "feat(content): widen ManifestEntry into eye|subject union, add subject roster + validation"
```

---

## Phase B: Parallel Tracks (5 worktrees, branch from end of Task 26)

### Track 1 — Behavior

### Task 27: SubjectBehavior class + eye burn-assist-range helper

**Files:**
- Create: `src/entities/behaviors/SubjectBehavior.ts`
- Modify: `src/entities/behaviors/EyeBehavior.ts`
- Test: `tests/unit/subjectBehavior.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/subjectBehavior.test.ts
import { describe, expect, it } from "vitest";
import { SubjectBehavior } from "../../src/entities/behaviors/SubjectBehavior";
import { isWithinBurnAssistRange } from "../../src/entities/behaviors/EyeBehavior";

describe("entities/behaviors/SubjectBehavior (T27)", () => {
  it("homeFor offsets the cursor position by the configured default offset", () => {
    const b = new SubjectBehavior();
    const home = b.homeFor({ x: 100, y: 100 });
    expect(home.x).toBe(100);
    expect(home.y).toBeLessThan(100);
  });

  it("homeFor uses a custom offset when provided", () => {
    const b = new SubjectBehavior({ x: 10, y: 20 });
    const home = b.homeFor({ x: 0, y: 0 });
    expect(home).toEqual({ x: 10, y: 20 });
  });
});

describe("entities/behaviors/EyeBehavior isWithinBurnAssistRange (T27)", () => {
  it("returns true when the eye is within radius of the subject", () => {
    expect(isWithinBurnAssistRange({ x: 0, y: 0 }, { x: 30, y: 40 }, 100)).toBe(true);
  });

  it("returns false when the eye is outside radius of the subject", () => {
    expect(isWithinBurnAssistRange({ x: 0, y: 0 }, { x: 300, y: 400 }, 100)).toBe(false);
  });

  it("treats exactly-on-boundary distance as within range", () => {
    expect(isWithinBurnAssistRange({ x: 0, y: 0 }, { x: 60, y: 80 }, 100)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/subjectBehavior.test.ts`
Expected: FAIL — `src/entities/behaviors/SubjectBehavior.ts` does not exist; `isWithinBurnAssistRange` is not exported from `EyeBehavior.ts`.

- [ ] **Step 3: Implement SubjectBehavior**

```typescript
// src/entities/behaviors/SubjectBehavior.ts
import type { Vec2 } from "../Entity";

export const SUBJECT_BEHAVIOR = Object.freeze({
  offsetX: 0,
  offsetY: -40,
} as const);

export class SubjectBehavior {
  private readonly offset: Vec2;

  constructor(offset: Vec2 = { x: SUBJECT_BEHAVIOR.offsetX, y: SUBJECT_BEHAVIOR.offsetY }) {
    this.offset = offset;
  }

  homeFor(cursor: Vec2): Vec2 {
    return { x: cursor.x + this.offset.x, y: cursor.y + this.offset.y };
  }
}
```

- [ ] **Step 4: Add isWithinBurnAssistRange to EyeBehavior.ts**

Open `src/entities/behaviors/EyeBehavior.ts`. Add near the top (after existing imports) an import of `Vec2` if not already imported:

```typescript
import type { Vec2 } from "../Entity";
```

Add this exported function at the bottom of the file, outside the `EyeBehavior` class:

```typescript
export function isWithinBurnAssistRange(eyePos: Vec2, subjectPos: Vec2, radiusPx: number): boolean {
  const dx = eyePos.x - subjectPos.x;
  const dy = eyePos.y - subjectPos.y;
  return dx * dx + dy * dy <= radiusPx * radiusPx;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/subjectBehavior.test.ts`
Expected: PASS

- [ ] **Step 6: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/entities/behaviors/SubjectBehavior.ts src/entities/behaviors/EyeBehavior.ts tests/unit/subjectBehavior.test.ts
git commit -m "feat(behaviors): add SubjectBehavior cursor-follow steering + eye burn-assist-range helper"
```

### Track 2 — Factory

### Task 28: spawnSubject in EntityFactory.ts

**Files:**
- Modify: `src/entities/EntityFactory.ts`
- Test: `tests/unit/entityFactorySubject.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/entityFactorySubject.test.ts
import { describe, expect, it } from "vitest";
import { spawnSubject } from "../../src/entities/EntityFactory";
import type { SubjectManifestEntry } from "../../src/content/schema";

const entry: SubjectManifestEntry = {
  id: "subject-figure-01",
  rig: "subject",
  renderType: "subject",
  visual: { styleGuardrail: "flat-illustrated" },
  colors: { suit: "slate", shirt: "cream", outline: "ink" },
  physics: { baseSizePx: 96 },
};

describe("entities/EntityFactory spawnSubject (T28)", () => {
  it("returns null when the manifest has no entries", () => {
    const e = spawnSubject({ manifest: [], cursor: { x: 10, y: 10 }, nextId: 1 });
    expect(e).toBeNull();
  });

  it("builds a single Entity at the cursor position, scale 0, using the given id", () => {
    const e = spawnSubject({ manifest: [entry], cursor: { x: 200, y: 150 }, nextId: 42 });
    expect(e).not.toBeNull();
    expect(e!.id).toBe(42);
    expect(e!.content.rig).toBe("subject");
    expect(e!.content.renderType).toBe("subject");
    expect(e!.physics.pos).toEqual({ x: 200, y: 150 });
    expect(e!.physics.home).toEqual({ x: 200, y: 150 });
    expect(e!.physics.scale).toBe(0);
    expect(e!.lifecycle.alive).toBe(true);
    expect(e!.lifecycle.dying).toBe(false);
    expect(e!.behavior.data.baseSizePx).toBe(96);
    expect((e!.behavior.data.colors as typeof entry.colors).suit).toBe("slate");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/entityFactorySubject.test.ts`
Expected: FAIL — `spawnSubject` is not exported from `EntityFactory.ts`.

- [ ] **Step 3: Implement spawnSubject**

In `src/entities/EntityFactory.ts`, add (near `spawnEyes`, using the same imports already present — `Entity`, `Vec2` from `./Entity`):

```typescript
import type { SubjectManifestEntry } from "../content/schema";

export type SpawnSubjectOpts = {
  manifest: readonly SubjectManifestEntry[];
  cursor: Vec2;
  nextId: number;
};

export function spawnSubject(opts: SpawnSubjectOpts): Entity | null {
  const entry = opts.manifest[0];
  if (!entry) return null;
  return {
    id: opts.nextId,
    content: {
      manifestId: entry.id,
      rig: entry.rig,
      renderType: entry.renderType,
    },
    physics: {
      pos: { x: opts.cursor.x, y: opts.cursor.y },
      vel: { x: 0, y: 0 },
      home: { x: opts.cursor.x, y: opts.cursor.y },
      scale: 0,
      rotation: 0,
    },
    behavior: {
      data: {
        baseSizePx: entry.physics.baseSizePx,
        colors: entry.colors,
      },
    },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}
```

Note `content.palette` is intentionally omitted (left `undefined`) — the Subject's suit/shirt/outline colors live in `behavior.data.colors` and are read directly by `drawSubject`, not through the eye-shaped `palette` field.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/entityFactorySubject.test.ts`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/entities/EntityFactory.ts tests/unit/entityFactorySubject.test.ts
git commit -m "feat(entities): add spawnSubject factory for single cursor-anchored Subject entity"
```

### Track 3 — Rendering

### Task 29: paperCut.ts shared utility + drawEye.ts adoption

**Files:**
- Create: `src/render/paperCut.ts`
- Modify: `src/render/drawers/drawEye.ts`
- Test: `tests/unit/paperCut.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/paperCut.test.ts
import { describe, expect, it } from "vitest";
import { paperCutEdgePath, withPaperCutShadow } from "../../src/render/paperCut";

const makeCtx = () => {
  const calls: string[] = [];
  const ctx: Record<string, unknown> = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    closePath: () => calls.push("closePath"),
    fill: () => calls.push("fill"),
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: "",
  };
  ctx.calls = calls;
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
};

describe("render/paperCut (T29)", () => {
  it("paperCutEdgePath draws a closed polygon with beginPath/moveTo/lineTo/closePath", () => {
    const ctx = makeCtx();
    paperCutEdgePath(ctx, { cx: 50, cy: 50, rx: 40, ry: 30, seed: 3 });
    const c = (ctx as unknown as { calls: string[] }).calls;
    expect(c).toContain("beginPath");
    expect(c).toContain("moveTo");
    expect(c.filter((x) => x === "lineTo").length).toBeGreaterThan(4);
    expect(c).toContain("closePath");
  });

  it("paperCutEdgePath is deterministic for the same seed", () => {
    const points: Array<{ moveTo?: [number, number]; lineTo: Array<[number, number]> }> = [];
    for (let i = 0; i < 2; i++) {
      const lineTo: Array<[number, number]> = [];
      let moveTo: [number, number] | undefined;
      const ctx: Record<string, unknown> = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: (x: number, y: number) => (moveTo = [x, y]),
        lineTo: (x: number, y: number) => lineTo.push([x, y]),
        closePath: () => {},
        fill: () => {},
      };
      paperCutEdgePath(ctx as unknown as CanvasRenderingContext2D, { cx: 50, cy: 50, rx: 40, ry: 30, seed: 3 });
      points.push({ moveTo, lineTo });
    }
    expect(points[0]).toEqual(points[1]);
  });

  it("withPaperCutShadow sets shadow properties around the draw callback then restores", () => {
    const ctx = makeCtx();
    let sawShadow = false;
    withPaperCutShadow(ctx, () => {
      sawShadow = (ctx.shadowBlur as number) > 0;
    });
    expect(sawShadow).toBe(true);
    expect(ctx.shadowBlur).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/paperCut.test.ts`
Expected: FAIL — `src/render/paperCut.ts` does not exist.

- [ ] **Step 3: Implement paperCut.ts**

```typescript
// src/render/paperCut.ts
export type PaperCutEdgeOpts = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  seed: number;
  segments?: number;
  jitterFraction?: number;
};

const PAPER_CUT = Object.freeze({
  defaultSegments: 14,
  defaultJitterFraction: 0.06,
} as const);

function pseudoRandom(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function paperCutEdgePath(ctx: CanvasRenderingContext2D, opts: PaperCutEdgeOpts): void {
  const segments = opts.segments ?? PAPER_CUT.defaultSegments;
  const jitterFraction = opts.jitterFraction ?? PAPER_CUT.defaultJitterFraction;
  const jitterX = opts.rx * jitterFraction;
  const jitterY = opts.ry * jitterFraction;

  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const j = pseudoRandom(opts.seed * 1000 + i);
    const wobble = (j - 0.5) * 2;
    const x = opts.cx + Math.cos(t) * (opts.rx + wobble * jitterX);
    const y = opts.cy + Math.sin(t) * (opts.ry + wobble * jitterY);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function withPaperCutShadow(ctx: CanvasRenderingContext2D, draw: () => void): void {
  ctx.save();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 6;
  ctx.shadowColor = "rgba(42, 36, 32, 0.22)";
  draw();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.restore();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/paperCut.test.ts`
Expected: PASS

- [ ] **Step 5: Adopt withPaperCutShadow in drawEye.ts**

Open `src/render/drawers/drawEye.ts`. Find the outline fill step (the first `ctx.fill()` call in `drawEye`, which fills the ink outline shape before the sclera is drawn on top). Wrap only that fill call:

```typescript
import { withPaperCutShadow } from "../paperCut";
```

```typescript
withPaperCutShadow(ctx, () => {
  ctx.fill();
});
```

Do not touch the bezier path construction that precedes it — only wrap the existing `fill()` invocation. This adds a soft shadow to the eye's outline without changing its geometry, so `tests/unit/drawEye.test.ts`'s existing `fill >= 4` / `arc >= 3` call-count assertions remain valid (an extra `save`/`restore` pair from `withPaperCutShadow` does not affect those counts).

- [ ] **Step 6: Run drawEye tests to confirm no regression**

Run: `npx vitest run tests/unit/drawEye.test.ts`
Expected: PASS (all 5 existing tests still green)

- [ ] **Step 7: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/render/paperCut.ts src/render/drawers/drawEye.ts tests/unit/paperCut.test.ts
git commit -m "feat(render): add shared paperCut utility (edge wobble + shadow), adopt shadow in drawEye"
```

### Task 30: drawSubject.ts

**Files:**
- Create: `src/render/drawers/drawSubject.ts`
- Test: `tests/unit/drawSubject.test.ts`

**Depends on:** Task 29 (imports `paperCutEdgePath`, `withPaperCutShadow` from `../paperCut`)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/drawSubject.test.ts
import { describe, expect, it } from "vitest";
import { drawSubject } from "../../src/render/drawers/drawSubject";

const baseColors = { suit: "slate" as const, shirt: "cream" as const, outline: "ink" as const };

const makeCtx = () => {
  const calls: string[] = [];
  const ctx: Record<string, unknown> = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    closePath: () => calls.push("closePath"),
    arc: () => calls.push("arc"),
    fill: () => calls.push("fill"),
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: "",
    fillStyle: "",
  };
  ctx.calls = calls;
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
};

describe("render/drawers/drawSubject (T30)", () => {
  it("draws head + shoulders using only fill/arc/paperCut-path calls at scale 1", () => {
    const ctx = makeCtx();
    drawSubject(ctx, { pos: { x: 100, y: 200 }, sizePx: 96, colors: baseColors, scale: 1 });
    expect(ctx.calls).toContain("save");
    expect(ctx.calls).toContain("restore");
    expect(ctx.calls.filter((c) => c === "fill").length).toBeGreaterThanOrEqual(4);
    expect(ctx.calls.filter((c) => c === "arc").length).toBeGreaterThanOrEqual(2);
  });

  it("draws nothing when scale is effectively zero", () => {
    const ctx = makeCtx();
    drawSubject(ctx, { pos: { x: 100, y: 200 }, sizePx: 96, colors: baseColors, scale: 0.01 });
    expect(ctx.calls.filter((c) => c === "fill").length).toBe(0);
  });

  it("throws when given a color name outside the locked palette", () => {
    const ctx = makeCtx();
    expect(() =>
      drawSubject(ctx, {
        pos: { x: 0, y: 0 },
        sizePx: 96,
        colors: { suit: "neon" as never, shirt: "cream", outline: "ink" },
        scale: 1,
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/drawSubject.test.ts`
Expected: FAIL — `src/render/drawers/drawSubject.ts` does not exist.

- [ ] **Step 3: Implement drawSubject.ts**

```typescript
// src/render/drawers/drawSubject.ts
import { PALETTE } from "../../config/tokens";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectColors = {
  suit: "slate" | "sage" | "ink";
  shirt: "cream";
  outline: "ink";
};

export type DrawSubjectInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: DrawSubjectColors;
  scale: number;
};

const SUBJECT_DRAW = Object.freeze({
  minVisibleScale: 0.02,
  headRadiusFraction: 0.22,
  shoulderWidthFraction: 0.62,
  shoulderHeightFraction: 0.5,
  headOffsetYFraction: 0.32,
  bodyTopOffsetYFraction: 0.08,
} as const);

function colorByName(k: string): string {
  switch (k) {
    case "cream":
      return PALETTE.cream;
    case "slate":
      return PALETTE.slate;
    case "sage":
      return PALETTE.sage;
    case "ink":
      return PALETTE.ink;
    case "coral":
      return PALETTE.coral;
    default:
      throw new Error(`drawSubject: color "${k}" is not in the locked palette`);
  }
}

export function drawSubject(ctx: CanvasRenderingContext2D, input: DrawSubjectInput): void {
  const { pos, sizePx, colors, scale } = input;
  if (scale <= SUBJECT_DRAW.minVisibleScale) return;

  const headR = sizePx * SUBJECT_DRAW.headRadiusFraction * scale;
  const shoulderW = sizePx * SUBJECT_DRAW.shoulderWidthFraction * scale;
  const shoulderH = sizePx * SUBJECT_DRAW.shoulderHeightFraction * scale;
  const cx = pos.x;
  const headCy = pos.y - sizePx * SUBJECT_DRAW.headOffsetYFraction * scale;
  const bodyTop = pos.y - sizePx * SUBJECT_DRAW.bodyTopOffsetYFraction * scale;
  const bodyCy = bodyTop + shoulderH / 2;

  ctx.save();

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx, cy: bodyCy, rx: shoulderW / 2, ry: shoulderH / 2, seed: 11 });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  });

  paperCutEdgePath(ctx, { cx, cy: bodyCy, rx: shoulderW / 2 - 2, ry: shoulderH / 2 - 2, seed: 11 });
  ctx.fillStyle = colorByName(colors.suit);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, headCy, headR + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = colorByName(colors.outline);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fillStyle = colorByName(colors.shirt);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 3, bodyTop);
  ctx.lineTo(cx + 3, bodyTop);
  ctx.lineTo(cx, bodyTop + shoulderH * 0.35);
  ctx.closePath();
  ctx.fillStyle = colorByName(colors.outline);
  ctx.fill();

  ctx.restore();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/drawSubject.test.ts`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/render/drawers/drawSubject.ts tests/unit/drawSubject.test.ts
git commit -m "feat(render): add drawSubject — abstract flat-illustrated authority-figure silhouette"
```

### Task 31: computeGazeLines

**Files:**
- Create: `src/render/drawers/drawGazeLines.ts`
- Test: `tests/unit/drawGazeLines.test.ts`

**Depends on:** none within Track 3 (does not depend on Task 29/30, can run first if preferred — listed last here only for narrative order); imports the existing `FieldLine` type from `drawFieldLines.ts` (already in the repo).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/drawGazeLines.test.ts
import { describe, expect, it } from "vitest";
import { computeGazeLines } from "../../src/render/drawers/drawGazeLines";

describe("render/drawers/drawGazeLines computeGazeLines (T31)", () => {
  it("returns no lines when there is no subject", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 0, y: 0 } }],
      subjectPos: null,
      assistRadiusPx: 100,
      chargeT: 0,
    });
    expect(lines).toEqual([]);
  });

  it("includes only eyes within assistRadiusPx of the subject", () => {
    const lines = computeGazeLines({
      eyes: [
        { id: 1, pos: { x: 10, y: 0 } },
        { id: 2, pos: { x: 500, y: 500 } },
      ],
      subjectPos: { x: 0, y: 0 },
      assistRadiusPx: 100,
      chargeT: 0,
    });
    expect(lines.length).toBe(1);
    expect(lines[0].x1).toBe(10);
    expect(lines[0].x2).toBe(0);
  });

  it("increases opacity as chargeT increases, for the same geometry", () => {
    const base = { eyes: [{ id: 1, pos: { x: 10, y: 0 } }], subjectPos: { x: 0, y: 0 }, assistRadiusPx: 100 };
    const low = computeGazeLines({ ...base, chargeT: 0 })[0];
    const high = computeGazeLines({ ...base, chargeT: 1 })[0];
    expect(high.opacity).toBeGreaterThan(low.opacity);
  });

  it("clamps opacity to a maximum of 1", () => {
    const lines = computeGazeLines({
      eyes: [{ id: 1, pos: { x: 1, y: 0 } }],
      subjectPos: { x: 0, y: 0 },
      assistRadiusPx: 100,
      chargeT: 1,
    });
    expect(lines[0].opacity).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/drawGazeLines.test.ts`
Expected: FAIL — `src/render/drawers/drawGazeLines.ts` does not exist.

- [ ] **Step 3: Implement computeGazeLines**

```typescript
// src/render/drawers/drawGazeLines.ts
import type { FieldLine } from "./drawFieldLines";

export type GazeLineEye = { id: number; pos: { x: number; y: number } };

export type GazeLineInput = {
  eyes: readonly GazeLineEye[];
  subjectPos: { x: number; y: number } | null;
  assistRadiusPx: number;
  chargeT: number;
};

const GAZE_LINE = Object.freeze({
  baseOpacity: 0.12,
  proximityWeight: 0.35,
  chargeWeight: 0.5,
} as const);

export function computeGazeLines(input: GazeLineInput): FieldLine[] {
  const { eyes, subjectPos, assistRadiusPx, chargeT } = input;
  if (!subjectPos) return [];

  const out: FieldLine[] = [];
  const radiusSq = assistRadiusPx * assistRadiusPx;
  let index = 0;
  for (const eye of eyes) {
    const dx = eye.pos.x - subjectPos.x;
    const dy = eye.pos.y - subjectPos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > radiusSq) continue;
    const dist = Math.sqrt(distSq);
    const proximity = 1 - dist / assistRadiusPx;
    const opacity = Math.min(
      1,
      GAZE_LINE.baseOpacity + proximity * GAZE_LINE.proximityWeight + chargeT * GAZE_LINE.chargeWeight,
    );
    out.push({ x1: eye.pos.x, y1: eye.pos.y, x2: subjectPos.x, y2: subjectPos.y, opacity, index: index++ });
  }
  return out;
}
```

If `FieldLine` (as defined in `src/render/drawers/drawFieldLines.ts`) does not have an `index` field, drop the `index` property from the object literal above and from the test assumptions — check `drawFieldLines.ts`'s actual `FieldLine` type export before finalizing this step, and match its exact shape (this plan's Task 29/30/31 tracks run in parallel with no cross-dependency here, so the implementer must read `src/render/drawers/drawFieldLines.ts` directly rather than relying on this plan's paraphrase).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/drawGazeLines.test.ts`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/render/drawers/drawGazeLines.ts tests/unit/drawGazeLines.test.ts
git commit -m "feat(render): add computeGazeLines — coral gaze-line geometry from in-range eyes to subject"
```

### Track 4 — Effects

### Task 32: Type-aware respawn delay in laserBurn.ts

**Files:**
- Modify: `src/effects/effectDefs/laserBurn.ts`
- Test: `tests/unit/laserBurnRespawnDelay.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/laserBurnRespawnDelay.test.ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { Rng } from "../../src/core/Rng";
import { EntityStore } from "../../src/entities/EntityStore";
import { ParticleSystem } from "../../src/effects/ParticleSystem";
import { EffectSystem } from "../../src/effects/EffectSystem";
import { laserBurnEffect, LASER_BURN } from "../../src/effects/effectDefs/laserBurn";
import type { Entity } from "../../src/entities/Entity";

function makeEntity(id: number, renderType: "eye" | "subject", x: number, y: number): Entity {
  return {
    id,
    content: { manifestId: `${renderType}-1`, rig: renderType, renderType },
    physics: { pos: { x, y }, vel: { x: 0, y: 0 }, home: { x, y }, scale: 1, rotation: 0 },
    behavior: { data: {} },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("effects/effectDefs/laserBurn respawn delay by renderType (T32)", () => {
  it("uses the subject respawn window (LASER_BURN.subjectRespawnMinMs..MaxMs) for a subject entity", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, "subject", 0, 0));
    const startRespawn = vi.fn();
    const worldAPI = {
      getEntity: (id: number) => store.get(id, { live: true }),
      markDying: (id: number) => store.markDying(id),
      startRespawn,
    };
    const fx = new EffectSystem(new ParticleSystem(new Rng(1), 8), new Rng(1), worldAPI);
    fx.register(laserBurnEffect);
    fx.start("laserBurn", 1, { x: 0, y: 0 }, 0);
    fx.update(LASER_BURN.totalDurationMs + 10);
    expect(startRespawn).toHaveBeenCalledTimes(1);
    const [, delayMs] = startRespawn.mock.calls[0];
    expect(delayMs).toBeGreaterThanOrEqual(LASER_BURN.subjectRespawnMinMs);
    expect(delayMs).toBeLessThanOrEqual(LASER_BURN.subjectRespawnMaxMs);
  });

  it("uses the eye respawn window (3000..6000ms) for an eye entity", () => {
    const store = new EntityStore();
    store.insert(makeEntity(2, "eye", 0, 0));
    const startRespawn = vi.fn();
    const worldAPI = {
      getEntity: (id: number) => store.get(id, { live: true }),
      markDying: (id: number) => store.markDying(id),
      startRespawn,
    };
    const fx = new EffectSystem(new ParticleSystem(new Rng(1), 8), new Rng(1), worldAPI);
    fx.register(laserBurnEffect);
    fx.start("laserBurn", 2, { x: 0, y: 0 }, 0);
    fx.update(LASER_BURN.totalDurationMs + 10);
    const [, delayMs] = startRespawn.mock.calls[0];
    expect(delayMs).toBeGreaterThanOrEqual(LASER_BURN.eyeRespawnMinMs);
    expect(delayMs).toBeLessThanOrEqual(LASER_BURN.eyeRespawnMaxMs);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/laserBurnRespawnDelay.test.ts`
Expected: FAIL — `LASER_BURN.subjectRespawnMinMs` etc. are not exported/defined; the dissolve stage always uses the hardcoded `rangeInt(3000, 6000)` regardless of entity type.

- [ ] **Step 3: Add config constants and branch the dissolve stage**

In `src/effects/effectDefs/laserBurn.ts`, add to the existing `LASER_BURN` frozen config object:

```typescript
subjectRespawnMinMs: 1000,
subjectRespawnMaxMs: 2000,
eyeRespawnMinMs: 3000,
eyeRespawnMaxMs: 6000,
```

Find the dissolve stage's `onStart` handler (currently ending with `ctx.world.startRespawn(ctx.entity.id, ctx.rng.rangeInt(3000, 6000));`). Replace that final call with:

```typescript
const isSubject = ctx.entity.content.renderType === "subject";
const delayMs = isSubject
  ? ctx.rng.rangeInt(LASER_BURN.subjectRespawnMinMs, LASER_BURN.subjectRespawnMaxMs)
  : ctx.rng.rangeInt(LASER_BURN.eyeRespawnMinMs, LASER_BURN.eyeRespawnMaxMs);
ctx.world.startRespawn(ctx.entity.id, delayMs);
```

Ensure `LASER_BURN` is already exported (`export const LASER_BURN = ...`) — if it is currently a module-private `const`, add `export` to its declaration since the test above imports it directly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/laserBurnRespawnDelay.test.ts`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/effects/effectDefs/laserBurn.ts tests/unit/laserBurnRespawnDelay.test.ts
git commit -m "feat(effects): branch laserBurn respawn delay by renderType (subject ~1-2s, eye 3-6s)"
```

### Track 5 — HUD

### Task 33: HUD placard torn-paper card, Fraunces-italic labels, own grain layer

**Files:**
- Modify: `src/hud/hud.css`
- Modify: `src/hud/Hud.ts` (only if a grain hook element needs to be added — see Step 3)
- Test: `tests/unit/hudPlacard.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/hudPlacard.test.ts
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Hud } from "../../src/hud/Hud";

describe("hud/Hud placard structure + hud.css tokens (T33)", () => {
  it("hud-root contains a grain hook element for the placard's own grain treatment", () => {
    const root = document.createElement("div");
    root.id = "hud-root";
    document.body.appendChild(root);
    new Hud(root);
    const grainEl = root.querySelector(".hud-placard__grain");
    expect(grainEl).not.toBeNull();
  });

  it("hud.css promotes mode/power labels to the display font in italic", () => {
    const css = fs.readFileSync(path.join(__dirname, "../../src/hud/hud.css"), "utf-8");
    const modeLabelBlock = css.slice(css.indexOf(".hud-placard__mode-label"));
    expect(modeLabelBlock).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(modeLabelBlock).toMatch(/font-style:\s*italic/);
  });

  it("hud.css gives .hud-placard__tear a drop-shadow", () => {
    const css = fs.readFileSync(path.join(__dirname, "../../src/hud/hud.css"), "utf-8");
    const tearBlock = css.slice(css.indexOf(".hud-placard__tear"), css.indexOf(".hud-placard__tear") + 400);
    expect(tearBlock).toMatch(/filter:\s*drop-shadow/);
  });

  it("hud.css gives .hud-placard__grain the shared grain tile token", () => {
    const css = fs.readFileSync(path.join(__dirname, "../../src/hud/hud.css"), "utf-8");
    expect(css).toMatch(/\.hud-placard__grain[\s\S]*?var\(--grain-tile-url\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/hudPlacard.test.ts`
Expected: FAIL — no `.hud-placard__grain` element in `Hud.ts`'s constructed DOM; `hud.css` has no `font-family`/`font-style` override on the labels, no `filter: drop-shadow` on `.hud-placard__tear`, no `.hud-placard__grain` rule.

- [ ] **Step 3: Add the grain hook element in Hud.ts**

Open `src/hud/Hud.ts`. In the constructor's `innerHTML` template string (which currently builds the SVG tear shape plus `.hud-placard__inner`), add a sibling `<div class="hud-placard__grain"></div>` immediately after the `.hud-placard__tear` SVG markup and before `.hud-placard__inner`, so it sits between the card background and the content, e.g.:

```typescript
this.root.innerHTML = `
  <div class="hud-placard">
    <div class="hud-placard__tear">${/* existing SVG tear markup, unchanged */ ""}</div>
    <div class="hud-placard__grain"></div>
    <div class="hud-placard__inner">${/* existing inner content, unchanged */ ""}</div>
  </div>
`;
```

(Locate the actual existing template literal in `Hud.ts` and insert the single new `<div class="hud-placard__grain"></div>` line in the position described — do not rewrite the surrounding markup.)

- [ ] **Step 4: Update hud.css**

In `.hud-placard__tear` (currently `inset: 0` with no shadow/filter), add a layered drop-shadow:

```css
.hud-placard__tear {
  filter: drop-shadow(0 2px 3px rgba(42, 36, 32, 0.18)) drop-shadow(0 6px 10px rgba(42, 36, 32, 0.14));
}
```

Add a new rule for the grain hook, positioned absolutely to cover the card and reusing the shared grain tokens at low opacity:

```css
.hud-placard__grain {
  position: absolute;
  inset: 0;
  background-image: var(--grain-tile-url);
  background-size: 192px 192px;
  background-repeat: repeat;
  opacity: var(--grain-opacity);
  mix-blend-mode: multiply;
  pointer-events: none;
  border-radius: inherit;
}
```

In `.hud-placard__mode-label, .hud-placard__power-label` (currently `font-weight: 700` only, inheriting `font-family: var(--font-mono)` from `.hud-placard`), add:

```css
.hud-placard__mode-label,
.hud-placard__power-label {
  font-weight: 700;
  font-family: var(--font-display);
  font-style: italic;
}
```

(Keep `.hud-placard`'s base `font-family: var(--font-mono)` as-is — it now applies only to the HUD numbers/charge-related text, per spec section 4(a): "Space Mono, which should be reserved for HUD numbers/labels only" means the mode/power *words* move to Fraunces italic, while numeric/charge readouts stay mono.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/hudPlacard.test.ts`
Expected: PASS

- [ ] **Step 6: Manual visual check**

Run: `npm run dev`, open the app in a browser, confirm the HUD placard now shows a soft shadow, a faint grain texture consistent with the page background, and the mode/power words in italic serif while numbers stay monospace. This is a visual-polish task — Playwright/automated pixel testing is not required per the locked v1 plan's verification strategy (manual/visual for pure CSS polish), but this manual check must be performed before the commit.

- [ ] **Step 7: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/hud/Hud.ts src/hud/hud.css tests/unit/hudPlacard.test.ts
git commit -m "feat(hud): add torn-paper drop-shadow, own grain layer, Fraunces-italic mode/power labels"
```

---

## Phase C: Integration (sequential, one worktree, after all Phase B branches merge)

### Task 34: Register Subject exports in barrel files

**Files:**
- Modify: `src/entities/behaviors/index.ts`
- Modify: `src/render/drawers/index.ts`
- Test: `tests/unit/barrels.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/barrels.test.ts
import { describe, expect, it } from "vitest";
import { SubjectBehavior, isWithinBurnAssistRange } from "../../src/entities/behaviors";
import { drawSubject, computeGazeLines } from "../../src/render/drawers";

describe("barrel exports include Subject rig (T34)", () => {
  it("entities/behaviors exports SubjectBehavior and isWithinBurnAssistRange", () => {
    expect(typeof SubjectBehavior).toBe("function");
    expect(typeof isWithinBurnAssistRange).toBe("function");
  });

  it("render/drawers exports drawSubject and computeGazeLines", () => {
    expect(typeof drawSubject).toBe("function");
    expect(typeof computeGazeLines).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/barrels.test.ts`
Expected: FAIL — imports resolve to `undefined`.

- [ ] **Step 3: Update entities/behaviors/index.ts**

```typescript
export { StateMachine } from "./StateMachine";
export { EyeBehavior, EyeBlinkTimer, isWithinBurnAssistRange } from "./EyeBehavior";
export type { EyeLifecycle, EyeLocomotion, EyeBlink, LifecycleEvent, LocomotionEvent } from "./EyeBehavior";
export { SubjectBehavior, SUBJECT_BEHAVIOR } from "./SubjectBehavior";
```

- [ ] **Step 4: Update render/drawers/index.ts**

```typescript
export { drawCursor, computeCursorState, CURSOR } from "./drawCursor";
export { drawFieldLines, computeFieldLines } from "./drawFieldLines";
export { drawEye } from "./drawEye";
export { drawSubject } from "./drawSubject";
export { computeGazeLines } from "./drawGazeLines";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/barrels.test.ts`
Expected: PASS

- [ ] **Step 6: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/entities/behaviors/index.ts src/render/drawers/index.ts tests/unit/barrels.test.ts
git commit -m "chore(barrels): export SubjectBehavior, isWithinBurnAssistRange, drawSubject, computeGazeLines"
```

### Task 35: Renderer.ts — branch entity draw, wire gaze-lines and Subject draw

**Files:**
- Modify: `src/render/Renderer.ts`
- Test: `tests/unit/rendererSubject.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/rendererSubject.test.ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/render/drawers/drawEye", () => ({ drawEye: vi.fn() }));
vi.mock("../../src/render/drawers/drawSubject", () => ({ drawSubject: vi.fn() }));
vi.mock("../../src/render/drawers/drawGazeLines", () => ({ computeGazeLines: vi.fn(() => []) }));
vi.mock("../../src/render/drawers/drawFieldLines", () => ({
  computeFieldLines: vi.fn(() => []),
  drawFieldLines: vi.fn(),
}));
vi.mock("../../src/render/drawers/drawCursor", () => ({
  computeCursorState: vi.fn(() => ({ ringRadius: 0, ringOpacity: 0 })),
  drawCursor: vi.fn(),
}));

import { renderFrame } from "../../src/render/Renderer";
import { drawEye } from "../../src/render/drawers/drawEye";
import { drawSubject } from "../../src/render/drawers/drawSubject";
import { EntityStore } from "../../src/entities/EntityStore";
import type { Entity } from "../../src/entities/Entity";

function makeCtx(): CanvasRenderingContext2D {
  const noop = () => {};
  return {
    save: noop, restore: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
    arc: noop, fill: noop, stroke: noop, clip: noop, bezierCurveTo: noop,
    fillRect: noop, clearRect: noop,
    fillStyle: "", strokeStyle: "", lineWidth: 0, globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function makeEyeEntity(id: number): Entity {
  return {
    id,
    content: { manifestId: "eye-1", rig: "eye", renderType: "eye", palette: { sclera: "#EDE7DD", iris: "#5B7A8C", pupil: "#2A2420", highlight: null, outline: "#2A2420" } },
    physics: { pos: { x: 10, y: 10 }, vel: { x: 0, y: 0 }, home: { x: 10, y: 10 }, scale: 1, rotation: 0 },
    behavior: { data: { shapeVariant: "almond", blinkScaleY: 1 } },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

function makeSubjectEntity(id: number): Entity {
  return {
    id,
    content: { manifestId: "subject-figure-01", rig: "subject", renderType: "subject" },
    physics: { pos: { x: 50, y: 50 }, vel: { x: 0, y: 0 }, home: { x: 50, y: 50 }, scale: 1, rotation: 0 },
    behavior: { data: { baseSizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" } } },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("render/Renderer subject branching (T35)", () => {
  it("draws eyes via drawEye and does not call drawEye for the subject entity", () => {
    const store = new EntityStore();
    store.insert(makeEyeEntity(1));
    store.insert(makeSubjectEntity(2));
    renderFrame({
      ctx: makeCtx(),
      width: 400,
      height: 300,
      store,
      cursor: { x: 0, y: 0, active: false },
      particles: { forEach: () => {} } as never,
      hoverEntityId: null,
      cursorRingRadius: 0,
      cursorRingOpacity: 0,
      reducedMotion: false,
      subject: null,
      chargeT: 0,
      assistRadiusPx: 140,
    } as never);
    expect(drawEye).toHaveBeenCalledTimes(1);
  });

  it("calls drawSubject once when opts.subject is provided", () => {
    const store = new EntityStore();
    store.insert(makeSubjectEntity(2));
    renderFrame({
      ctx: makeCtx(),
      width: 400,
      height: 300,
      store,
      cursor: { x: 0, y: 0, active: false },
      particles: { forEach: () => {} } as never,
      hoverEntityId: null,
      cursorRingRadius: 0,
      cursorRingOpacity: 0,
      reducedMotion: false,
      subject: { id: 2, pos: { x: 50, y: 50 }, sizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" }, scale: 1 },
      chargeT: 0,
      assistRadiusPx: 140,
    } as never);
    expect(drawSubject).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rendererSubject.test.ts`
Expected: FAIL — `renderFrame` currently draws every alive entity via `drawEye` unconditionally (would try to draw the subject entity as an eye, throwing or miscounting calls); `RenderFrameOptions` has no `subject`/`chargeT`/`assistRadiusPx` fields.

- [ ] **Step 3: Read the current Renderer.ts and locate the exact edit points**

Read `src/render/Renderer.ts` in full before editing (its exact current line numbers were captured in earlier research as lines 1-107, but re-read to get current line numbers since Phase A/B commits may have shifted nothing in this file — it has not been touched yet in this plan). Identify:
- The `RenderEntitiesOptions`/`RenderFrameOptions` type definitions.
- The `store.forEachAlive(...)` loop that calls `drawEye` unconditionally.
- The point after the eye-drawing loop and before particle drawing (where gaze-lines + subject should be drawn).

- [ ] **Step 4: Extend RenderFrameOptions**

Add to the `RenderFrameOptions` type:

```typescript
subject: {
  id: number;
  pos: { x: number; y: number };
  sizePx: number;
  colors: { suit: "slate" | "sage" | "ink"; shirt: "cream"; outline: "ink" };
  scale: number;
} | null;
chargeT: number;
assistRadiusPx: number;
```

- [ ] **Step 5: Branch the entity draw loop**

Change the `store.forEachAlive(...)` loop that currently draws every entity via `drawEye` so it skips non-eye entities:

```typescript
const eyePositions: Array<{ id: number; pos: { x: number; y: number } }> = [];
store.forEachAlive((e) => {
  if (e.content.renderType !== "eye") return;
  eyePositions.push({ id: e.id, pos: e.physics.pos });
  // ... existing per-eye pupilOffset computation and drawEye(ctx, {...}) call, unchanged ...
});
```

(Collect `eyePositions` alongside the existing loop body — do not duplicate the loop, just add the `if` guard at the top and push into the array before the existing `drawEye` call.)

- [ ] **Step 6: Draw gaze-lines and the Subject after the eye loop**

Immediately after the eye-drawing loop (and before the existing particle-drawing step), add:

```typescript
import { computeGazeLines } from "./drawers/drawGazeLines";
import { drawSubject } from "./drawers/drawSubject";
import { drawFieldLines } from "./drawers/drawFieldLines";
```

```typescript
if (opts.subject) {
  const gazeLines = computeGazeLines({
    eyes: eyePositions,
    subjectPos: opts.subject.pos,
    assistRadiusPx: opts.assistRadiusPx,
    chargeT: opts.chargeT,
  });
  drawFieldLines(opts.ctx, gazeLines, { stroke: PALETTE.coral, ink: PALETTE.ink });
  drawSubject(opts.ctx, {
    pos: opts.subject.pos,
    sizePx: opts.subject.sizePx,
    colors: opts.subject.colors,
    scale: opts.subject.scale,
  });
}
```

(`PALETTE` is already imported in `Renderer.ts` per prior research — reuse the existing import rather than adding a duplicate.)

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/unit/rendererSubject.test.ts`
Expected: PASS

- [ ] **Step 8: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/render/Renderer.ts tests/unit/rendererSubject.test.ts
git commit -m "feat(render): branch entity draw loop by renderType, wire gaze-lines + Subject draw into renderFrame"
```

### Task 36: main.ts wiring — Subject spawn/despawn/cooldown, physics branch, retargeting

**Files:**
- Modify: `src/main.ts`
- Test: `tests/unit/mainSubjectWiring.test.ts` (a focused test extracting the pure logic into a testable form — see Step 3)

This is the largest integration task. `main.ts` is the sole side-effect file per system-architecture.md, and most of its logic is imperative wiring that is normally verified manually/visually (per the locked v1 plan's verification strategy) rather than unit tested line-by-line. To keep this task TDD-compatible without testing DOM/`requestAnimationFrame` wiring directly, this task extracts the two purely-computational pieces that are safe and valuable to unit test — the physics-branch home computation and the respawn-delay/cooldown-gate decision — into small named functions inside `main.ts` that the test imports directly. The rest of the wiring (event handler registration, engine tick subscriptions) is verified manually in Step 8.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mainSubjectWiring.test.ts
import { describe, expect, it } from "vitest";
import { queryNearestEye, shouldSpawnSubject } from "../../src/main";
import { EntityStore } from "../../src/entities/EntityStore";
import type { Entity } from "../../src/entities/Entity";

function makeEntity(id: number, renderType: "eye" | "subject", x: number, y: number): Entity {
  return {
    id,
    content: { manifestId: `${renderType}-${id}`, rig: renderType, renderType },
    physics: { pos: { x, y }, vel: { x: 0, y: 0 }, home: { x, y }, scale: 1, rotation: 0 },
    behavior: { data: {} },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("main.ts subject wiring helpers (T36)", () => {
  it("queryNearestEye ignores the subject entity and returns the nearest eye within range", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, "subject", 5, 5));
    store.insert(makeEntity(2, "eye", 100, 100));
    const found = store; // placeholder to keep structure; real call below
    const result = queryNearestEye(store, { x: 98, y: 98 }, 70);
    expect(result?.id).toBe(2);
  });

  it("queryNearestEye returns null when only a subject is in range", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, "subject", 10, 10));
    const result = queryNearestEye(store, { x: 12, y: 12 }, 70);
    expect(result).toBeNull();
  });

  it("shouldSpawnSubject is false before the cooldown timer elapses", () => {
    expect(shouldSpawnSubject({ subjectId: null, subjectRespawnAtMs: 5000, nowMs: 4000, cursorActive: true })).toBe(false);
  });

  it("shouldSpawnSubject is false while the cursor is inactive, even after cooldown elapses", () => {
    expect(shouldSpawnSubject({ subjectId: null, subjectRespawnAtMs: 5000, nowMs: 6000, cursorActive: false })).toBe(false);
  });

  it("shouldSpawnSubject is false while a subject already exists", () => {
    expect(shouldSpawnSubject({ subjectId: 7, subjectRespawnAtMs: 5000, nowMs: 6000, cursorActive: true })).toBe(false);
  });

  it("shouldSpawnSubject is true once cooldown has elapsed, cursor is active, and no subject exists", () => {
    expect(shouldSpawnSubject({ subjectId: null, subjectRespawnAtMs: 5000, nowMs: 6000, cursorActive: true })).toBe(true);
  });

  it("shouldSpawnSubject is false when there is no pending respawn timer", () => {
    expect(shouldSpawnSubject({ subjectId: null, subjectRespawnAtMs: null, nowMs: 6000, cursorActive: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mainSubjectWiring.test.ts`
Expected: FAIL — `queryNearestEye` and `shouldSpawnSubject` are not exported from `main.ts` (they don't exist yet).

- [ ] **Step 3: Read main.ts in full before editing**

Read `src/main.ts` in full to get current exact line numbers (unchanged since original research — this file has not been touched by any earlier task in this plan).

- [ ] **Step 4: Add pure helper functions (exported for testability)**

Add near the top of `main.ts`, after the existing type aliases (around where `LifecycleState`/`LifecycleEvent` etc. are declared):

```typescript
export function queryNearestEye(
  store: EntityStore,
  point: { x: number; y: number },
  maxRange: number,
): Entity | null {
  let best: Entity | null = null;
  let bestDistSq = maxRange * maxRange;
  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    const dx = e.physics.pos.x - point.x;
    const dy = e.physics.pos.y - point.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= bestDistSq) {
      bestDistSq = distSq;
      best = e;
    }
  });
  return best;
}

export function shouldSpawnSubject(input: {
  subjectId: EntityId | null;
  subjectRespawnAtMs: number | null;
  nowMs: number;
  cursorActive: boolean;
}): boolean {
  if (input.subjectId !== null) return false;
  if (input.subjectRespawnAtMs === null) return false;
  if (!input.cursorActive) return false;
  return input.nowMs >= input.subjectRespawnAtMs;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/mainSubjectWiring.test.ts`
Expected: PASS

- [ ] **Step 6: Wire Subject state and lifecycle into main.ts**

Add module-level state (near the existing `behaviors`/`blinkTimers`/`pupilOffsets` Maps, around line 122-124):

```typescript
import { spawnSubject } from "./entities/EntityFactory";
import { SubjectBehavior } from "./entities/behaviors";
import subjectRoster from "./content/manifests/subject.roster.json";
import type { SubjectManifestEntry } from "./content/schema";
import { EASE_PROTEST } from "./effects/EffectSystem";
```

```typescript
const subjectManifest = loadManifestFromText(JSON.stringify(subjectRoster));
let subjectId: EntityId | null = null;
let subjectSpawnedAtMs = 0;
let subjectRespawnAtMs: number | null = null;
let nextEntityId = 1;
const subjectBehavior = new SubjectBehavior();
const SUBJECT_ASSIST_RADIUS_PX = 140;

function spawnSubjectAt(pos: { x: number; y: number }, nowMs: number): void {
  const entity = spawnSubject({
    manifest: subjectManifest.entries.filter((e): e is SubjectManifestEntry => e.rig === "subject"),
    cursor: pos,
    nextId: nextEntityId++,
  });
  if (!entity) return;
  store.insert(entity);
  subjectId = entity.id;
  subjectSpawnedAtMs = nowMs;
}
```

- [ ] **Step 7: Branch worldAPI.startRespawn by renderType**

Find the existing `worldAPI` object (lines 126-135) and replace its `startRespawn` implementation:

```typescript
startRespawn: (id: EntityId, delayMs: number) => {
  const e = store.get(id, { live: false });
  if (!e) return;
  if (e.content.renderType === "subject") {
    store.remove(id);
    if (subjectId === id) subjectId = null;
    subjectRespawnAtMs = engine.getNow() + delayMs;
    return;
  }
  respawn.schedule(e, engine.getNow(), delayMs);
},
```

- [ ] **Step 8: Branch the pre-physics integration loop**

Find the main physics `engine.onTick("pre-physics", (dt) => {...})` handler (lines 231-257). Guard the existing eye loop and add a separate Subject branch:

```typescript
engine.onTick("pre-physics", (dt) => {
  const dtSec = Math.min(0.1, dt / 1000);
  const cursor = engine.cursor();

  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    if (e.lifecycle.dragged) return;
    const force = FF.compute({ cursor, entityPos: e.physics.pos });
    const spring = computeSpring({ pos: e.physics.pos, vel: e.physics.vel, home: e.physics.home, dtSeconds: dtSec });
    const next = integrate({
      pos: e.physics.pos,
      vel: e.physics.vel,
      acc: { x: force.fx + spring.ax, y: force.fy + spring.ay },
      dtSeconds: dtSec,
      maxSpeed: 600,
    });
    e.physics.pos = next.pos;
    e.physics.vel = next.vel;
  });

  if (subjectId !== null && cursor.active) {
    const subj = store.get(subjectId, { live: true });
    if (subj && !subj.lifecycle.dragged) {
      subj.physics.home = subjectBehavior.homeFor({ x: cursor.x, y: cursor.y });
      const spring = computeSpring({ pos: subj.physics.pos, vel: subj.physics.vel, home: subj.physics.home, dtSeconds: dtSec });
      const next = integrate({
        pos: subj.physics.pos,
        vel: subj.physics.vel,
        acc: { x: spring.ax, y: spring.ay },
        dtSeconds: dtSec,
        maxSpeed: 900,
      });
      subj.physics.pos = next.pos;
      subj.physics.vel = next.vel;
      if (subj.physics.scale < 1) {
        const elapsed = engine.getNow() - subjectSpawnedAtMs;
        subj.physics.scale = EASE_PROTEST(Math.min(1, elapsed / DURATION.slow));
      }
    }
  }

  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    const beh = behaviors.get(e.id);
    if (beh) beh.tick(rng, engine.getNow());
  });
});
```

(Import `DURATION` from `./config/tokens` if not already imported in `main.ts`.)

- [ ] **Step 9: Gate Subject respawn in the post-physics tick**

Find the `post-physics` phase handler inside the existing `engine.events.on("tick", ...)` block (lines 70-120). After the existing `respawn.tick(...)` handling, add:

```typescript
const nowMs = engine.getNow();
if (shouldSpawnSubject({ subjectId, subjectRespawnAtMs, nowMs, cursorActive: engine.cursor().active })) {
  const cur = engine.cursor();
  spawnSubjectAt({ x: cur.x, y: cur.y }, nowMs);
  subjectRespawnAtMs = null;
}
```

- [ ] **Step 10: Retarget the press handler, add Subject drag-vs-charge disambiguation**

`PointerTracker`'s sink interface (`src/input/PointerTracker.ts`) only exposes `press()`/`release()` — there is no per-move hook to the sink, so the deadzone check must happen in the existing pre-physics tick handler (Step 8), which already reads `engine.cursor()` every frame. `PowerController` is single-charge and untargeted by id: `isCharging(): boolean`, `chargeTargetId(): number | null`, `cancel(): void` (no arguments — confirmed in `src/input/PowerController.ts`), so the code below calls them accordingly, not with a `subjectId` argument.

Find `pointer = new PointerTracker(stage, {...})`'s `press()` method (lines 208-216). Replace its body:

```typescript
const SUBJECT_DRAG_DEADZONE_PX = 12;
let subjectPressOrigin: { x: number; y: number } | null = null;

press() {
  const cur = engine.cursor();
  if (!cur.active) return;
  if (subjectId !== null) {
    powerCtrl.tryPress(subjectId, cur.x, cur.y, engine.getNow());
    subjectPressOrigin = { x: cur.x, y: cur.y };
  }
  const eyeTarget = queryNearestEye(store, { x: cur.x, y: cur.y }, 70);
  if (eyeTarget) {
    dragCtrl.tryStart(eyeTarget.id, cur.x, cur.y);
  }
},

release() {
  subjectPressOrigin = null;
},
```

Then, in the pre-physics tick handler from Step 8, add the deadzone check right after `const cursor = engine.cursor();`:

```typescript
if (
  subjectId !== null &&
  subjectPressOrigin &&
  powerCtrl.isCharging() &&
  powerCtrl.chargeTargetId() === subjectId
) {
  const dx = cursor.x - subjectPressOrigin.x;
  const dy = cursor.y - subjectPressOrigin.y;
  if (dx * dx + dy * dy > SUBJECT_DRAG_DEADZONE_PX * SUBJECT_DRAG_DEADZONE_PX) {
    powerCtrl.cancel();
    dragCtrl.tryStart(subjectId, cursor.x, cursor.y);
    subjectPressOrigin = null;
  }
}
```

This cancels the in-progress charge (same fade-out path `PowerController.cancel()` already drives for early release) and starts a Subject drag via the existing, unmodified `DragController` the moment the pointer moves past the deadzone while charging the Subject.

- [ ] **Step 11: Wire Subject render info and pass to renderFrame**

Find the `render` phase branch inside the tick handler where `renderFrame({...})` is called. Add before that call:

```typescript
const subjEntity = subjectId !== null ? store.get(subjectId, { live: true }) : null;
const subjectRenderInfo = subjEntity
  ? {
      id: subjEntity.id,
      pos: subjEntity.physics.pos,
      sizePx: (subjEntity.behavior.data as { baseSizePx: number }).baseSizePx,
      colors: (subjEntity.behavior.data as { colors: { suit: "slate" | "sage" | "ink"; shirt: "cream"; outline: "ink" } }).colors,
      scale: subjEntity.physics.scale,
    }
  : null;
```

Add `subject: subjectRenderInfo, chargeT: ringT, assistRadiusPx: SUBJECT_ASSIST_RADIUS_PX,` to the existing `renderFrame({...})` call's options object (reuse the existing `ringT` variable already computed in this phase per prior research — do not recompute it).

- [ ] **Step 12: Prime the initial cooldown at boot**

Find the boot sequence at the bottom of `main.ts` (`spawnInitialEyes(); pointer.attach(); engine.start();`). Change it to:

```typescript
spawnInitialEyes();
nextEntityId = Math.max(0, ...store.ids()) + 1;
subjectRespawnAtMs = engine.getNow();
pointer.attach();
engine.start();
```

This makes the very first Subject spawn as soon as the cursor becomes active, reusing the same `shouldSpawnSubject`/`spawnSubjectAt` path as every subsequent respawn — no separate boot-only spawn code path.

- [ ] **Step 13: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Fix any type mismatches surfaced (e.g., `EntityId`/`Entity` import paths, `EASE_PROTEST`/`DURATION` import paths) before proceeding.

- [ ] **Step 14: Run full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 15: Manual verification**

Run: `npm run dev`, open in browser:
- Confirm a Subject figure appears near the cursor and follows it with a slight lag/offset.
- Move the cursor near an eye that is also near the Subject; confirm a coral gaze-line appears from that eye to the Subject.
- Click-and-hold near the Subject; confirm charge-ring intensifies, gaze-lines intensify, and at threshold the 4-stage burn effect fires on the Subject (not on any eye).
- Confirm eyes cannot be burned (clicking directly on an eye far from the Subject does nothing but may still drag it).
- After the burn completes, confirm the Subject disappears, a ~1-2s cooldown occurs (crosshair only, no Subject, gaze-lines idle since no Subject to gaze at), then a new Subject fades/scales in at the current cursor position.
- Confirm early release (before threshold) cancels the charge and fades out, and gaze-lines fade with it.
- Click-and-hold on the Subject, then drag before the burn threshold: confirm the charge cancels (ring/gaze-lines fade the same as an early release) and the Subject follows the pointer exactly for the rest of the drag.
- Release the drag: confirm the Subject resumes spring-pursuit of the cursor from its dropped position (no snap/teleport back to a stale home point).
- Click-and-hold on the Subject and keep the pointer still past the deadzone: confirm the charge completes normally and burns the Subject (drag never triggers when the pointer doesn't move).

- [ ] **Step 16: Commit**

```bash
git add src/main.ts tests/unit/mainSubjectWiring.test.ts
git commit -m "feat(main): wire Subject spawn/despawn/cooldown lifecycle, cursor-follow physics branch, burn retargeting"
```

---

## Phase D: Verification

### Task 37: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `npx vitest run`
Expected: PASS — every test file in `tests/unit/`, including all tests added in Tasks 25-36, plus all pre-existing tests (`powerController.test.ts`, `drawEye.test.ts`, `behavior.test.ts`, and any others in the suite) remain green.

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 3: Confirm forbidden files were never touched**

```bash
git diff main --stat -- src/core/Engine.ts src/physics/ForceField.ts src/entities/behaviors/StateMachine.ts src/entities/EntityStore.ts
```

Expected: empty output (no changes to any of these four files across the whole plan).

- [ ] **Step 4: Commit (if any fixups were needed)**

If Steps 1-2 required any fixes, commit them individually with a message describing the specific fix (e.g., `fix(main): correct EntityId import path surfaced by tsc`). If no fixes were needed, skip this step — do not create an empty commit.

### Task 38: Spec coverage self-check

**Files:** none (documentation-only verification, recorded in the plan's own PR/commit description if executed via subagent-driven-development)

- [ ] **Step 1: Walk each of the spec's 4 numbered sections against the tasks above and confirm coverage**

| Spec requirement | Covered by |
|---|---|
| New `subject` rig, manifest entry, `SubjectBehavior.ts`, `drawSubject.ts`, registered in barrels | Tasks 26, 27, 30, 34 |
| No changes to Engine/ForceField/StateMachine/EntityStore | Verified in Task 37 Step 3 |
| SubjectBehavior eases toward cursor via SpringHome/Integrator, offset/lag | Task 27 (`homeFor`), Task 36 Step 8 |
| Subject is directly draggable via the existing `DragController`; spring pursuit suspends while dragged and resumes on release; press-then-move-past-deadzone while charging cancels the charge and starts a drag instead | Task 36 Step 8 (`!subj.lifecycle.dragged` guard), Task 36 Step 10 (deadzone check, `powerCtrl.cancel()` + `dragCtrl.tryStart(subjectId, ...)`) |
| EyeBehavior unchanged except exposing burn-assist range | Task 27 (`isWithinBurnAssistRange`) |
| PowerController always targets the single Subject or no-ops | Task 36 Step 10 (press handler passes `subjectId` only; PowerController itself untouched, confirmed in research as already generic) |
| Eyes removed from burn/effect pipeline, never destructible | Task 36 Step 10 (drag-only via `queryNearestEye`, burn only via `subjectId`) |
| Charging has no effect during cooldown | Task 36 Step 10 (`if (subjectId !== null)` guard) |
| Gaze-lines from in-range eyes to Subject, intensify with charge | Tasks 31, 35 |
| Gaze-lines share coral color/weight with burn laser-line | Task 35 Step 6 (`drawFieldLines` with `PALETTE.coral`, same stroker used by the existing field-line/laser rendering) |
| 4-stage burn fires on Subject at threshold | Existing `laserBurnEffect` (untouched structurally), now targeting `subjectId` via Task 36 |
| Early release cancels with existing fade-out, gaze-lines fade with it | Existing cancel/fade path (untouched); gaze-lines are recomputed every frame from live `chargeT`, so they fade automatically as `chargeT` falls |
| Subject entity removed on burn completion, ~1-2s cooldown | Task 32, Task 36 Step 7 |
| Crosshair-only during cooldown, gaze-lines idle | Task 35 (`if (opts.subject)` guard — no subject means no gaze-lines/no Subject draw, cursor/crosshair drawing is untouched and always runs) |
| New Subject fades/scales in at cursor after cooldown, entrance easing | Task 28 (`scale: 0` on spawn), Task 36 Step 8 (`EASE_PROTEST`/`DURATION.slow` ramp) |
| HUD placard torn-paper card: cream fill, irregular edge, drop-shadow, grain | Task 33 (edge/fill already existed via SVG tear path; this task adds drop-shadow + grain) |
| HUD mode/power label promoted to Fraunces italic | Task 33 |
| Shared `paperCut.ts`, used by drawEye and drawSubject | Task 29, Task 30 |
| `drawSubject.ts` abstract, non-photoreal, `flat-illustrated` guardrail | Task 30 |
| Motion audit — gaze-lines/Subject entrance use `--ease-protest`/no new timing values | Task 36 Step 8 uses `EASE_PROTEST`/`DURATION.slow`, both pre-existing exports; gaze-line opacity has no independent timing (recomputed per-frame from `chargeT`, which already uses the existing charge easing) |

Expected: every row has a task reference; no gaps. If a gap is found while executing this task, stop and add a task to a follow-up plan rather than silently skipping it — do not mark this task complete with an unresolved gap.

- [ ] **Step 2: Confirm no forbidden-file edits slipped in** (re-confirms Task 37 Step 3; run again here as the final gate)

```bash
git diff main --stat -- src/core/Engine.ts src/physics/ForceField.ts src/entities/behaviors/StateMachine.ts src/entities/EntityStore.ts
```

Expected: empty output.
