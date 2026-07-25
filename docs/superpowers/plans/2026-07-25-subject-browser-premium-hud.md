# Subject Browser & Premium HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the click-to-cycle Subject skin selector with a slide-out subject browser (illustrated roster cards + a typed-text compose row) that drags or taps onto the canvas to swap the live Subject's skin, and elevate every v2 HUD control (mode, power, skin→subject-browser, quantity, repel) to a "premium/game-studio-grade" visual bar built entirely from the existing locked Paper-Cut Protest palette and motif.

**Architecture:** Widens the `subjectSkin` render-only-swap value from a bare string (`"figure" | "lotus"`) into a discriminated union (`{kind:"illustrated",id}` or `{kind:"text",value,scale}`), dispatched through a new `src/hud/subjectSkinRegistry.ts` registry (same content-as-data pattern as `hudIcons.ts`). A new `SubjectDrawer` component owns the slide-out panel DOM; a new `SubjectDragSource` owns pointer-based drag-to-canvas and tap-to-select, fully separate from the existing entity-level `DragController`. `Hud.ts` is modified to remove the old skin placard and mount the new toggle+drawer; `main.ts` is modified to replace `hud.onSkinChange` wiring with the new discriminated-union wiring. A shared overshoot spring-easing CSS token is added and applied across all existing and new HUD controls for the premium visual bar — no new colors, fonts, or DOM/rendering systems beyond what's specified.

**Tech Stack:** TypeScript, Vite, Vitest (+ `happy-dom` for DOM-touching tests), Canvas 2D, plain CSS custom properties (no animation library).

**Prerequisite:** `docs/superpowers/plans/2026-07-25-fun-satire-v2-expansion.md` must be implemented first (specifically its Tasks 1, 4, 5, 10, 11 — `hudIcons.ts`'s `HudMode`/`HudMpower`/`MODE_POWER_MAP`, `schema.ts`'s `subjectSkin` field, `drawSubjectFigure.ts`/`drawSubjectLotus.ts`/`drawSubject.ts` dispatcher, `Hud.ts`'s skin/quantity/repel controls, and `main.ts`'s crowd/skin/quantity/repel wiring). This plan's tasks modify those exact files and assume their contracts exist exactly as that plan specifies them (if the real code differs when a task starts, use the real names — do not invent a parallel variable, per that plan's own naming-discipline note).

## Global Constraints

- No new colors, fonts, gradients, glassmorphism, or backdrop-blur anywhere — stay inside `PALETTE.cream/slate/sage/ink/coral` (`src/config/tokens.ts`), `--font-mono`/`--font-display`, and the torn-paper placard motif (spec §6).
- Never touch `src/core/Engine.ts`, `src/entities/behaviors/StateMachine.ts` (or wherever `StateMachine.ts` lives per the v1-fix plan), `src/entities/EntityStore.ts`, or `src/physics/ForceField.ts` (spec Context).
- `subjectSkin` swaps are render-only: they mutate `subj.behavior.data.subjectSkin` on the live entity, never respawn it, never touch `physics`/`lifecycle` state (spec §1, §4).
- Resize applies only to `{kind:"text"}` skins. Illustrated skins keep the existing fixed `baseSizePx` — never make illustrated subjects resizable (spec §1).
- The new panel-to-canvas drag system (`SubjectDragSource`) must not share state, classes, or DOM handlers with the existing entity-level `src/input/DragController.ts` (spec §4).
- The subject browser drawer is the only way to choose the active subject going forward — the old click-to-cycle skin placard (`.hud-placard__skin-icon`/`.hud-placard__skin-label`, `SKIN_CYCLE`, `onSkinChange`/`setSkin`) is removed entirely, not left in place alongside the new control (spec §4, §5).
- Every new canvas drawer (`drawSubjectScribe.ts`, `drawSubjectHerald.ts`, `drawSubjectJester.ts`, `drawSubjectText.ts`) must use `src/render/paperCut.ts`'s `paperCutEdgePath`/`withPaperCutShadow` for edge wobble and offset shadow — the same design-system consistency requirement the prerequisite plan's Task 5 established. `withPaperCutShadow` sets `shadowColor` to the literal `"rgba(42, 36, 32, 0.22)"` while active; tests assert on that literal as the "used the shared utility" signal.
- `styleGuardrail: 'flat-illustrated'` applies to every new illustrated subject (spec §2).

---

## Phase A: Subject data model & registry

### Task 1: Widen the illustrated-subject id type and scaffold `subjectSkinRegistry.ts`

**Files:**
- Modify: `src/content/schema.ts`
- Modify: `tests/unit/schemaSubjectSkin.test.ts` (created by the prerequisite plan's Task 4 — update its `SubjectSkin` references to the renamed type)
- Create: `src/hud/subjectSkinRegistry.ts`
- Test: `tests/unit/subjectSkinRegistry.test.ts` (new)

**Interfaces:**
- Consumes: `SubjectColors` (`src/content/schema.ts`, prerequisite plan), `drawSubjectFigure`/`drawSubjectLotus` (`src/render/drawers/drawSubjectFigure.ts`/`drawSubjectLotus.ts`, prerequisite plan Task 5).
- Produces: `IllustratedSubjectId` (`src/content/schema.ts`), `SubjectSkin`, `DrawSubjectSkinFn`, `SubjectSkinRegistryEntry`, `SUBJECT_SKIN_REGISTRY`, `getSubjectSkinEntry(id)` (`src/hud/subjectSkinRegistry.ts`) — consumed by Tasks 2, 4, 7, 12.

The prerequisite plan's Task 4 exports a `SubjectSkin` type from `content/schema.ts` meaning the fixed union `"figure" | "lotus"`. This spec reuses the name `SubjectSkin` for the new *discriminated* runtime value, which would collide with that export. This task resolves the collision by renaming the manifest-level type to `IllustratedSubjectId` (same literal members, widened) and defining the new `SubjectSkin` discriminated union in `subjectSkinRegistry.ts` instead.

- [ ] **Step 1: Write the failing test for the widened schema type**

```typescript
// tests/unit/schemaSubjectSkin.test.ts — replace the prerequisite plan's SubjectSkin references
import { describe, it, expect } from "vitest";
import type { ManifestEntry, IllustratedSubjectId } from "../../src/content/schema";

describe("IllustratedSubjectId", () => {
  it("accepts all five registry ids", () => {
    const ids: IllustratedSubjectId[] = ["figure", "lotus", "scribe", "herald", "jester"];
    expect(ids).toHaveLength(5);
  });

  it("ManifestEntry.subjectSkin is optional and typed as IllustratedSubjectId", () => {
    const partial: Pick<ManifestEntry, "subjectSkin"> = { subjectSkin: "scribe" };
    expect(partial.subjectSkin).toBe("scribe");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/schemaSubjectSkin.test.ts`
Expected: FAIL (TypeScript compile error) — `IllustratedSubjectId` isn't exported yet, and `"scribe"` isn't assignable to the old `SubjectSkin` union.

- [ ] **Step 3: Rename and widen the schema type**

In `src/content/schema.ts`, find the prerequisite plan's:

```typescript
export type SubjectSkin = "figure" | "lotus";
```

Replace with:

```typescript
export type IllustratedSubjectId = "figure" | "lotus" | "scribe" | "herald" | "jester";
```

And update `SubjectManifestEntry`'s field:

```typescript
export type SubjectManifestEntry = {
  id: string;
  rig: "subject";
  renderType: "subject";
  visual: {
    styleGuardrail: "flat-illustrated";
  };
  colors: SubjectColors;
  physics: SubjectPhysics;
  subjectSkin?: IllustratedSubjectId;
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/schemaSubjectSkin.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for the registry**

```typescript
// tests/unit/subjectSkinRegistry.test.ts
import { describe, it, expect } from "vitest";
import {
  SUBJECT_SKIN_REGISTRY,
  getSubjectSkinEntry,
  type SubjectSkin,
} from "../../src/hud/subjectSkinRegistry";
import type { IllustratedSubjectId } from "../../src/content/schema";

describe("SUBJECT_SKIN_REGISTRY", () => {
  it("has exactly one entry per IllustratedSubjectId", () => {
    const ids: IllustratedSubjectId[] = ["figure", "lotus", "scribe", "herald", "jester"];
    expect(SUBJECT_SKIN_REGISTRY.map((e) => e.id).sort()).toEqual([...ids].sort());
  });

  it("every entry has a non-empty label and a callable drawer", () => {
    for (const entry of SUBJECT_SKIN_REGISTRY) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.drawer).toBe("function");
    }
  });

  it("getSubjectSkinEntry returns the matching entry", () => {
    expect(getSubjectSkinEntry("lotus").id).toBe("lotus");
  });

  it("getSubjectSkinEntry throws for an unknown id", () => {
    // @ts-expect-error intentionally invalid
    expect(() => getSubjectSkinEntry("not-an-id")).toThrow(/unknown illustrated subject id/);
  });

  it("SubjectSkin discriminates illustrated vs text", () => {
    const illustrated: SubjectSkin = { kind: "illustrated", id: "figure" };
    const text: SubjectSkin = { kind: "text", value: "Resign Now", scale: 1 };
    expect(illustrated.kind).toBe("illustrated");
    expect(text.kind).toBe("text");
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/unit/subjectSkinRegistry.test.ts`
Expected: FAIL — `src/hud/subjectSkinRegistry.ts` doesn't exist yet.

- [ ] **Step 7: Implement the registry (figure/lotus only — placeholders wired in Task 2)**

```typescript
// src/hud/subjectSkinRegistry.ts
import type { IllustratedSubjectId, SubjectColors } from "../content/schema";
import { drawSubjectFigure } from "../render/drawers/drawSubjectFigure";
import { drawSubjectLotus } from "../render/drawers/drawSubjectLotus";

export type SubjectSkin =
  | { kind: "illustrated"; id: IllustratedSubjectId }
  | { kind: "text"; value: string; scale: number };

export type DrawSubjectSkinFn = (
  ctx: CanvasRenderingContext2D,
  input: {
    pos: { x: number; y: number };
    sizePx: number;
    colors: SubjectColors;
    scale: number;
    rotation: number;
  },
) => void;

export type SubjectSkinRegistryEntry = {
  id: IllustratedSubjectId;
  label: string;
  drawer: DrawSubjectSkinFn;
};

export const SUBJECT_SKIN_REGISTRY: readonly SubjectSkinRegistryEntry[] = [
  { id: "figure", label: "figure", drawer: drawSubjectFigure },
  { id: "lotus", label: "lotus", drawer: drawSubjectLotus },
];

export function getSubjectSkinEntry(id: IllustratedSubjectId): SubjectSkinRegistryEntry {
  const entry = SUBJECT_SKIN_REGISTRY.find((e) => e.id === id);
  if (!entry) throw new Error(`subjectSkinRegistry: unknown illustrated subject id "${id}"`);
  return entry;
}
```

- [ ] **Step 8: Run tests (registry test will still fail on the id-count check — expected until Task 2)**

Run: `npx vitest run tests/unit/subjectSkinRegistry.test.ts`
Expected: 3 of 5 tests PASS; "has exactly one entry per IllustratedSubjectId" FAILs (only 2 of 5 ids registered). This is expected — Task 2 completes the registry.

- [ ] **Step 9: Commit**

```bash
git add src/content/schema.ts tests/unit/schemaSubjectSkin.test.ts src/hud/subjectSkinRegistry.ts tests/unit/subjectSkinRegistry.test.ts
git commit -m "feat(content,hud): rename schema SubjectSkin to IllustratedSubjectId, scaffold subjectSkinRegistry with figure/lotus"
```

### Task 2: Placeholder illustrated subjects — Scribe, Herald, Jester

**Files:**
- Create: `src/render/drawers/drawSubjectScribe.ts`, `src/render/drawers/drawSubjectHerald.ts`, `src/render/drawers/drawSubjectJester.ts`
- Modify: `src/hud/subjectSkinRegistry.ts`
- Test: `tests/unit/drawSubjectPlaceholders.test.ts` (new)

**Interfaces:**
- Consumes: `paperCutEdgePath`/`withPaperCutShadow` (`src/render/paperCut.ts`), `SubjectColors` (`src/content/schema.ts`), `PALETTE` (`src/config/tokens.ts`).
- Produces: `drawSubjectScribe`, `drawSubjectHerald`, `drawSubjectJester` — each `(ctx, { pos, sizePx, colors, scale, rotation }) => void`, same shape as `DrawSubjectSkinFn` from Task 1. Registered into `SUBJECT_SKIN_REGISTRY`, consumed by Task 4's dispatcher.

Exact subject identities/likenesses are undecided per spec §2 and §7 — these three are placeholder silhouettes distinguished only by a simple accessory shape, proving the registry/list/drag-drop mechanism end-to-end. Each reuses the same head-and-shoulders base geometry as `drawSubjectFigure` (same `SubjectColors` fields, same locked palette) plus one distinguishing paper-cut shape.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/drawSubjectPlaceholders.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawSubjectScribe } from "../../src/render/drawers/drawSubjectScribe";
import { drawSubjectHerald } from "../../src/render/drawers/drawSubjectHerald";
import { drawSubjectJester } from "../../src/render/drawers/drawSubjectJester";

const fakeCtxWithShadowSpy = () => {
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
};

const colors = { suit: "slate", shirt: "cream", outline: "ink" } as const;
const input = { pos: { x: 10, y: 10 }, sizePx: 80, colors, scale: 1, rotation: 0 };

describe("placeholder illustrated subjects", () => {
  it("drawSubjectScribe does not throw and applies the shared paper-cut shadow", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    expect(() => drawSubjectScribe(ctx, input)).not.toThrow();
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });

  it("drawSubjectHerald does not throw and applies the shared paper-cut shadow", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    expect(() => drawSubjectHerald(ctx, input)).not.toThrow();
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });

  it("drawSubjectJester does not throw and applies the shared paper-cut shadow", () => {
    const { ctx, shadowColors } = fakeCtxWithShadowSpy();
    expect(() => drawSubjectJester(ctx, input)).not.toThrow();
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/drawSubjectPlaceholders.test.ts`
Expected: FAIL — the three files don't exist.

- [ ] **Step 3: Implement the three placeholder drawers**

```typescript
// src/render/drawers/drawSubjectScribe.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectScribeInput = {
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
    default: throw new Error(`drawSubjectScribe: color "${k}" is not in the locked palette`);
  }
};

/** Placeholder illustrated subject: head + shoulders plus a held rolled-scroll accessory. */
export function drawSubjectScribe(ctx: CanvasRenderingContext2D, input: DrawSubjectScribeInput): void {
  const { pos, sizePx, scale, rotation } = input;
  const s = sizePx * scale;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y - s * 0.32, rx: s * 0.22, ry: s * 0.24, seed: 31 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y - s * 0.32, rx: s * 0.19, ry: s * 0.21, seed: 31 });
  ctx.fillStyle = colorByName(input.colors.shirt);
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
  ctx.fillStyle = colorByName(input.colors.suit);
  ctx.fill();

  // distinguishing accessory: a held rolled scroll, right side
  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: pos.x + s * 0.34, cy: pos.y + s * 0.18, rx: s * 0.06, ry: s * 0.16, seed: 32 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: pos.x + s * 0.34, cy: pos.y + s * 0.18, rx: s * 0.045, ry: s * 0.13, seed: 32 });
  ctx.fillStyle = colorByName(input.colors.shirt);
  ctx.fill();

  ctx.restore();
}
```

```typescript
// src/render/drawers/drawSubjectHerald.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectHeraldInput = {
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
    default: throw new Error(`drawSubjectHerald: color "${k}" is not in the locked palette`);
  }
};

/** Placeholder illustrated subject: head + shoulders plus a triangular chest banner. */
export function drawSubjectHerald(ctx: CanvasRenderingContext2D, input: DrawSubjectHeraldInput): void {
  const { pos, sizePx, scale, rotation } = input;
  const s = sizePx * scale;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y - s * 0.32, rx: s * 0.22, ry: s * 0.24, seed: 41 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y - s * 0.32, rx: s * 0.19, ry: s * 0.21, seed: 41 });
  ctx.fillStyle = colorByName(input.colors.shirt);
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
  ctx.fillStyle = colorByName(input.colors.suit);
  ctx.fill();

  // distinguishing accessory: a triangular chest banner
  withPaperCutShadow(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y + s * 0.06);
    ctx.lineTo(pos.x - s * 0.14, pos.y + s * 0.4);
    ctx.lineTo(pos.x + s * 0.14, pos.y + s * 0.4);
    ctx.closePath();
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y + s * 0.1);
  ctx.lineTo(pos.x - s * 0.1, pos.y + s * 0.36);
  ctx.lineTo(pos.x + s * 0.1, pos.y + s * 0.36);
  ctx.closePath();
  ctx.fillStyle = colorByName("coral");
  ctx.fill();

  ctx.restore();
}
```

```typescript
// src/render/drawers/drawSubjectJester.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectJesterInput = {
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
    default: throw new Error(`drawSubjectJester: color "${k}" is not in the locked palette`);
  }
};

/** Placeholder illustrated subject: head + shoulders plus a three-peaked paper-cut cap. */
export function drawSubjectJester(ctx: CanvasRenderingContext2D, input: DrawSubjectJesterInput): void {
  const { pos, sizePx, scale, rotation } = input;
  const s = sizePx * scale;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y - s * 0.32, rx: s * 0.22, ry: s * 0.24, seed: 51 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y - s * 0.32, rx: s * 0.19, ry: s * 0.21, seed: 51 });
  ctx.fillStyle = colorByName(input.colors.shirt);
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
  ctx.fillStyle = colorByName(input.colors.suit);
  ctx.fill();

  // distinguishing accessory: three-peaked cap above the head
  for (let i = -1; i <= 1; i++) {
    withPaperCutShadow(ctx, () => {
      paperCutEdgePath(ctx, {
        cx: pos.x + i * s * 0.14,
        cy: pos.y - s * 0.56,
        rx: s * 0.07,
        ry: s * 0.1,
        seed: 52 + i,
      });
      ctx.fillStyle = colorByName(input.colors.outline);
      ctx.fill();
    });
    paperCutEdgePath(ctx, {
      cx: pos.x + i * s * 0.14,
      cy: pos.y - s * 0.56,
      rx: s * 0.055,
      ry: s * 0.085,
      seed: 52 + i,
    });
    ctx.fillStyle = colorByName(i === 0 ? "coral" : "sage");
    ctx.fill();
  }

  ctx.restore();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/drawSubjectPlaceholders.test.ts`
Expected: PASS.

- [ ] **Step 5: Register the three new entries**

```typescript
// src/hud/subjectSkinRegistry.ts — add imports and entries
import { drawSubjectScribe } from "../render/drawers/drawSubjectScribe";
import { drawSubjectHerald } from "../render/drawers/drawSubjectHerald";
import { drawSubjectJester } from "../render/drawers/drawSubjectJester";

// SUBJECT_SKIN_REGISTRY becomes:
export const SUBJECT_SKIN_REGISTRY: readonly SubjectSkinRegistryEntry[] = [
  { id: "figure", label: "figure", drawer: drawSubjectFigure },
  { id: "lotus", label: "lotus", drawer: drawSubjectLotus },
  { id: "scribe", label: "scribe", drawer: drawSubjectScribe },
  { id: "herald", label: "herald", drawer: drawSubjectHerald },
  { id: "jester", label: "jester", drawer: drawSubjectJester },
];
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS — `tests/unit/subjectSkinRegistry.test.ts`'s "has exactly one entry per IllustratedSubjectId" now passes too.

- [ ] **Step 7: Commit**

```bash
git add src/render/drawers/drawSubjectScribe.ts src/render/drawers/drawSubjectHerald.ts src/render/drawers/drawSubjectJester.ts src/hud/subjectSkinRegistry.ts tests/unit/drawSubjectPlaceholders.test.ts
git commit -m "feat(render): add scribe/herald/jester placeholder illustrated subjects, register in subjectSkinRegistry"
```

### Task 3: `drawSubjectText.ts` — generic typed-text placard drawer

**Files:**
- Create: `src/render/drawers/drawSubjectText.ts`
- Test: `tests/unit/drawSubjectText.test.ts` (new)

**Interfaces:**
- Consumes: `paperCutEdgePath`/`withPaperCutShadow` (`src/render/paperCut.ts`), `SubjectColors` (`src/content/schema.ts`), `PALETTE`/`FONT` (`src/config/tokens.ts`).
- Produces: `drawSubjectText(ctx, { pos, sizePx, value, scale, colors, rotation }) => void` — consumed by Task 4's dispatcher.

Per spec §1/§3, a typed-text subject renders as a generic paper-cut placard bearing the text — never a bespoke per-string illustration. `scale` drives both the placard's size and the font size together, so resizing (spec §4) is a single scalar knob.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/drawSubjectText.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawSubjectText, SUBJECT_TEXT_DRAW } from "../../src/render/drawers/drawSubjectText";

const fakeCtx = () => {
  const shadowColors: string[] = [];
  const fillTextCalls: unknown[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "canvas") return {};
        if (prop === "fillText") return (...args: unknown[]) => fillTextCalls.push(args);
        return typeof prop === "string" ? vi.fn() : undefined;
      },
      set: () => true,
    },
  );
  Object.defineProperty(ctx, "shadowColor", {
    set: (v: string) => shadowColors.push(v),
    get: () => "",
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, shadowColors, fillTextCalls };
};

const colors = { suit: "slate", shirt: "cream", outline: "ink" } as const;

describe("drawSubjectText", () => {
  it("does not throw for a short string", () => {
    const { ctx } = fakeCtx();
    expect(() =>
      drawSubjectText(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, value: "Resign", scale: 1, colors, rotation: 0 }),
    ).not.toThrow();
  });

  it("truncates values beyond the max character limit", () => {
    const { ctx, fillTextCalls } = fakeCtx();
    const long = "x".repeat(200);
    drawSubjectText(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, value: long, scale: 1, colors, rotation: 0 });
    const rendered = fillTextCalls[0]?.[0] as string;
    expect(rendered.length).toBeLessThanOrEqual(SUBJECT_TEXT_DRAW.maxChars);
  });

  it("applies the shared paper-cut shadow treatment", () => {
    const { ctx, shadowColors } = fakeCtx();
    drawSubjectText(ctx, { pos: { x: 0, y: 0 }, sizePx: 80, value: "Recall", scale: 1, colors, rotation: 0 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/drawSubjectText.test.ts`
Expected: FAIL — `src/render/drawers/drawSubjectText.ts` doesn't exist.

- [ ] **Step 3: Implement the drawer**

```typescript
// src/render/drawers/drawSubjectText.ts
import { PALETTE, FONT } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectTextInput = {
  pos: { x: number; y: number };
  sizePx: number;
  value: string;
  scale: number;
  colors: SubjectColors;
  rotation: number;
};

export const SUBJECT_TEXT_DRAW = Object.freeze({
  maxChars: 24,
  paddingXFraction: 0.14,
  paddingYFraction: 0.28,
  fontSizeFraction: 0.22,
  paperCutSeed: 61,
} as const);

const colorByName = (k: string): string => {
  switch (k) {
    case "cream": return PALETTE.cream;
    case "slate": return PALETTE.slate;
    case "sage": return PALETTE.sage;
    case "ink": return PALETTE.ink;
    case "coral": return PALETTE.coral;
    default: throw new Error(`drawSubjectText: color "${k}" is not in the locked palette`);
  }
};

/** Generic paper-cut placard bearing user-typed text — the only visual for every typed-text subject. */
export function drawSubjectText(ctx: CanvasRenderingContext2D, input: DrawSubjectTextInput): void {
  const { pos, sizePx, scale, rotation, colors } = input;
  const s = sizePx * scale;
  const text = input.value.length > SUBJECT_TEXT_DRAW.maxChars
    ? input.value.slice(0, SUBJECT_TEXT_DRAW.maxChars)
    : input.value;
  const rx = s * (0.5 + SUBJECT_TEXT_DRAW.paddingXFraction);
  const ry = s * (0.28 + SUBJECT_TEXT_DRAW.paddingYFraction);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y, rx, ry, seed: SUBJECT_TEXT_DRAW.paperCutSeed });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: pos.x, cy: pos.y, rx: rx * 0.92, ry: ry * 0.86, seed: SUBJECT_TEXT_DRAW.paperCutSeed });
  ctx.fillStyle = colorByName(colors.shirt);
  ctx.fill();

  ctx.fillStyle = colorByName(colors.outline);
  ctx.font = `700 ${Math.max(10, s * SUBJECT_TEXT_DRAW.fontSizeFraction)}px ${FONT.mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pos.x, pos.y);

  ctx.restore();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/drawSubjectText.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/drawers/drawSubjectText.ts tests/unit/drawSubjectText.test.ts
git commit -m "feat(render): add drawSubjectText — generic paper-cut placard for typed-text subjects"
```

### Task 4: Rewire `drawSubject.ts` dispatch onto the discriminated `SubjectSkin`

**Files:**
- Modify: `src/render/drawers/drawSubject.ts`
- Modify: `tests/unit/drawSubjectSkins.test.ts` (created by the prerequisite plan's Task 5 — update to the new discriminated-union input shape)

**Interfaces:**
- Consumes: `SubjectSkin`, `getSubjectSkinEntry` (`src/hud/subjectSkinRegistry.ts`, Tasks 1-2), `drawSubjectText` (`src/render/drawers/drawSubjectText.ts`, Task 3), `SubjectColors` (`src/content/schema.ts`).
- Produces: widened `DrawSubjectInput` (`subjectSkin: SubjectSkin` instead of the old bare string) — consumed by Task 13's `main.ts` wiring wherever `drawSubject` is called from `Renderer.ts`.

- [ ] **Step 1: Update the failing test to the new input shape**

```typescript
// tests/unit/drawSubjectSkins.test.ts — replace the prerequisite plan's version
import { describe, it, expect, vi } from "vitest";
import { drawSubject } from "../../src/render/drawers/drawSubject";

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

const colors = { suit: "slate", shirt: "cream", outline: "ink" } as const;

describe("drawSubject dispatch on discriminated SubjectSkin", () => {
  it("does not throw for an illustrated 'figure' skin", () => {
    expect(() =>
      drawSubject(fakeCtx(), {
        pos: { x: 10, y: 10 },
        sizePx: 80,
        subjectSkin: { kind: "illustrated", id: "figure" },
        colors,
        scale: 1,
        seed: 1,
      }),
    ).not.toThrow();
  });

  it("does not throw for an illustrated 'jester' skin", () => {
    expect(() =>
      drawSubject(fakeCtx(), {
        pos: { x: 10, y: 10 },
        sizePx: 80,
        subjectSkin: { kind: "illustrated", id: "jester" },
        colors,
        scale: 1,
        seed: 1,
      }),
    ).not.toThrow();
  });

  it("does not throw for a text skin", () => {
    expect(() =>
      drawSubject(fakeCtx(), {
        pos: { x: 10, y: 10 },
        sizePx: 80,
        subjectSkin: { kind: "text", value: "Recall", scale: 1 },
        colors,
        scale: 1,
        seed: 1,
      }),
    ).not.toThrow();
  });

  it("throws for an unknown illustrated id", () => {
    expect(() =>
      drawSubject(fakeCtx(), {
        pos: { x: 0, y: 0 },
        sizePx: 80,
        // @ts-expect-error intentionally invalid
        subjectSkin: { kind: "illustrated", id: "not-a-skin" },
        colors,
        scale: 1,
        seed: 1,
      }),
    ).toThrow(/unknown illustrated subject id/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/drawSubjectSkins.test.ts`
Expected: FAIL — the current dispatcher still expects a bare `"figure" | "lotus"` string.

- [ ] **Step 3: Rewrite the dispatcher**

```typescript
// src/render/drawers/drawSubject.ts
import type { SubjectColors } from "../../content/schema";
import type { SubjectSkin } from "../../hud/subjectSkinRegistry";
import { getSubjectSkinEntry } from "../../hud/subjectSkinRegistry";
import { drawSubjectText } from "./drawSubjectText";

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
  const { subjectSkin } = input;
  if (subjectSkin.kind === "illustrated") {
    const entry = getSubjectSkinEntry(subjectSkin.id);
    entry.drawer(ctx, {
      pos: input.pos,
      sizePx: input.sizePx,
      colors: input.colors,
      scale: input.scale,
      rotation,
    });
    return;
  }
  drawSubjectText(ctx, {
    pos: input.pos,
    sizePx: input.sizePx,
    value: subjectSkin.value,
    scale: subjectSkin.scale,
    colors: input.colors,
    rotation,
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/drawSubjectSkins.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/drawers/drawSubject.ts tests/unit/drawSubjectSkins.test.ts
git commit -m "feat(render): dispatch drawSubject on the discriminated SubjectSkin union instead of a bare string"
```

---

## Phase B: Premium HUD visual foundation

### Task 5: Shared overshoot spring-easing token

**Files:**
- Modify: `src/styles/tokens.css`, `src/config/tokens.ts`
- Test: `tests/unit/tokens.test.ts` (new, or extend an existing tokens test if one already exists — check `tests/unit/` before creating)

**Interfaces:**
- Produces: CSS custom property `--ease-spring`, and `EASE.spring` (`src/config/tokens.ts`) — consumed by Task 6's placard restyle and Task 7's drawer stagger-reveal CSS.

Spec §6/§7 requires "a shared custom spring/cubic-bezier easing with slight overshoot, defined once... and reused everywhere." The existing `--ease-protest` (`cubic-bezier(0.22, 1, 0.36, 1)`) has no overshoot (y never exceeds 1) and stays reserved for the placard's initial reveal transition it already drives — this task adds a distinct token for the new overshoot requirement rather than redefining `--ease-protest`'s existing behavior.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/tokens.test.ts
import { describe, it, expect } from "vitest";
import { EASE } from "../../src/config/tokens";

describe("EASE.spring", () => {
  it("is a cubic-bezier string with an overshoot (a y-value above 1)", () => {
    expect(EASE.spring).toMatch(/^cubic-bezier\(/);
    const nums = EASE.spring.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[3]).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/tokens.test.ts`
Expected: FAIL — `EASE.spring` doesn't exist.

- [ ] **Step 3: Add the token to both `config/tokens.ts` and `styles/tokens.css`**

```typescript
// src/config/tokens.ts — EASE becomes:
export const EASE = Object.freeze({
  protest: "cubic-bezier(0.22, 1, 0.36, 1)",
  charge: "cubic-bezier(0.32, 0.72, 0, 1)",
  fade: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const);
```

```css
/* src/styles/tokens.css — :root block, add alongside --ease-protest/--ease-charge */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/tokens.ts src/styles/tokens.css tests/unit/tokens.test.ts
git commit -m "feat(tokens): add --ease-spring overshoot easing for premium HUD motion"
```

### Task 6: Premium "paper stack" depth, spacing, and press feedback on existing placard controls

**Files:**
- Modify: `src/hud/hud.css`

**Interfaces:**
- Consumes: `--ease-spring` (Task 5), existing `.hud-placard`/`.hud-placard__mode-icon`/`.hud-placard__qty-inc`/`.hud-placard__qty-dec`/`.hud-placard__repel-input` classes (prerequisite plan's Task 10).
- Produces: no new classes — restyles existing ones. No test file: this is a pure visual/CSS task with no DOM-shape or behavior change to assert against (spec §6 explicitly scopes this as "visual/motion-craft pass only... not any control's underlying data flow"). Verify by running the dev server and visually inspecting, per the project's UI-verification convention.

Applies spec §6's five remaining principles (layered depth, spring motion, thin iconography, breathing room, tactile press feedback) to every control already in place before the new subject-browser control exists — Task 7 applies the same principles to the new drawer.

- [ ] **Step 1: Add the "paper stack" layered depth to `.hud-placard`**

```css
/* src/hud/hud.css — .hud-placard, append a ::before layer */
.hud-placard {
  /* ...existing rules unchanged... */
}

.hud-placard::before {
  content: "";
  position: absolute;
  inset: 3px -3px -5px 3px;
  background: var(--color-ink);
  opacity: 0.08;
  border-radius: 6px;
  z-index: -1;
  pointer-events: none;
}
```

- [ ] **Step 2: Increase breathing room on the inner row**

```css
/* src/hud/hud.css — .hud-placard__inner, widen gap/padding */
.hud-placard__inner {
  gap: 14px; /* was 10px */
  padding: 0 32px; /* was 0 28px */
}
```

- [ ] **Step 3: Route existing transitions through `--ease-spring` and add tactile press feedback**

```css
/* src/hud/hud.css — replace the .hud-placard__mode-icon,.hud-placard__skin-icon rule
   (the .hud-placard__skin-icon half of this selector is removed by Task 12; leave
   .hud-placard__mode-icon here as its own rule now) */
.hud-placard__mode-icon {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 160ms var(--ease-spring);
}

.hud-placard__mode-icon:hover {
  transform: scale(1.12);
}

.hud-placard__mode-icon:active,
.hud-placard__qty-inc:active,
.hud-placard__qty-dec:active {
  transform: scale(0.9);
}

.hud-placard__qty-inc,
.hud-placard__qty-dec {
  transition: transform 140ms var(--ease-spring), background 120ms var(--ease-protest);
}

.hud-placard__repel-input::-webkit-slider-thumb {
  transition: transform 160ms var(--ease-spring);
}

.hud-placard__repel-input::-webkit-slider-thumb:active {
  transform: scale(0.88);
}
```

- [ ] **Step 4: Reduced-motion guard for the new rules**

```css
/* src/hud/hud.css — extend the existing @media (prefers-reduced-motion: reduce) block */
@media (prefers-reduced-motion: reduce) {
  .hud-placard__mode-icon,
  .hud-placard__qty-inc,
  .hud-placard__qty-dec,
  .hud-placard__repel-input::-webkit-slider-thumb {
    transition: none;
  }
}
```

- [ ] **Step 5: Visually verify**

Run: `npm run dev`, open the app, confirm: placard casts a soft offset ink-tinted shadow layer behind it, mode-icon/quantity buttons/repel thumb scale down briefly on press (`:active`), and spacing reads noticeably more generous without the placard growing wider than `min(560px, calc(100vw - 32px))`.

- [ ] **Step 6: Commit**

```bash
git add src/hud/hud.css
git commit -m "style(hud): add paper-stack depth layer, breathing room, and spring press feedback to existing placard controls"
```

---

## Phase C: Subject browser drawer component

### Task 7: `SubjectDrawer` — panel scaffold, illustrated card list, staggered reveal

**Files:**
- Create: `src/hud/SubjectDrawer.ts`, `src/hud/subjectDrawer.css`
- Test: `tests/unit/subjectDrawer.test.ts` (new, `happy-dom`)

**Interfaces:**
- Consumes: `SUBJECT_SKIN_REGISTRY`, `SubjectSkin` (`src/hud/subjectSkinRegistry.ts`, Tasks 1-2), `--ease-spring` (Task 5).
- Produces: `class SubjectDrawer { constructor(root, opts); open(); close(); toggle(); isOpen(): boolean; getCardElements(): { skin: SubjectSkin; el: HTMLElement }[] }` — consumed by Task 8 (compose row), Task 10 (drag source attaches to card elements), Task 12 (`Hud.ts` mounts it).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/subjectDrawer.test.ts
// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { SubjectDrawer } from "../../src/hud/SubjectDrawer";

describe("SubjectDrawer scaffold", () => {
  it("starts closed and toggles open/closed", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    expect(drawer.isOpen()).toBe(false);
    drawer.open();
    expect(drawer.isOpen()).toBe(true);
    expect(root.querySelector(".subject-drawer")!.getAttribute("data-open")).toBe("true");
    drawer.close();
    expect(drawer.isOpen()).toBe(false);
    expect(root.querySelector(".subject-drawer")!.getAttribute("data-open")).toBe("false");
  });

  it("toggle() flips between open and closed", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "left" });
    drawer.toggle();
    expect(drawer.isOpen()).toBe(true);
    drawer.toggle();
    expect(drawer.isOpen()).toBe(false);
  });

  it("renders one card per SUBJECT_SKIN_REGISTRY entry", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const cards = root.querySelectorAll(".subject-drawer__card");
    expect(cards.length).toBe(5);
  });

  it("getCardElements returns an illustrated SubjectSkin per card", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const entries = drawer.getCardElements();
    expect(entries.length).toBe(5);
    for (const { skin } of entries) {
      expect(skin.kind).toBe("illustrated");
    }
  });

  it("applies a per-card stagger delay via inline custom property", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".subject-drawer__card"));
    const delays = cards.map((c) => c.style.getPropertyValue("--reveal-delay"));
    expect(new Set(delays).size).toBeGreaterThan(1);
  });

  it("anchors to the requested screen edge via a data attribute", () => {
    const root = document.createElement("div");
    new SubjectDrawer(root, { anchor: "left" });
    expect(root.querySelector(".subject-drawer")!.getAttribute("data-anchor")).toBe("left");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/subjectDrawer.test.ts`
Expected: FAIL — `src/hud/SubjectDrawer.ts` doesn't exist.

- [ ] **Step 3: Implement the scaffold**

```typescript
// src/hud/SubjectDrawer.ts
import { SUBJECT_SKIN_REGISTRY, type SubjectSkin } from "./subjectSkinRegistry";

export type SubjectDrawerOptions = {
  anchor: "left" | "right";
};

const STAGGER_MS = 48;

export class SubjectDrawer {
  private readonly panel: HTMLElement;
  private readonly cardList: HTMLElement;
  private open_ = false;
  private readonly cardEntries: { skin: SubjectSkin; el: HTMLElement }[] = [];

  constructor(root: HTMLElement, opts: SubjectDrawerOptions) {
    this.panel = document.createElement("div");
    this.panel.className = "subject-drawer";
    this.panel.dataset.anchor = opts.anchor;
    this.panel.dataset.open = "false";
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-label", "Subject browser");
    this.panel.innerHTML = `
      <div class="subject-drawer__compose" data-slot="compose"></div>
      <div class="subject-drawer__list" role="list"></div>
    `;
    root.appendChild(this.panel);
    this.cardList = this.panel.querySelector<HTMLElement>(".subject-drawer__list")!;
    this.renderCards();
  }

  private renderCards(): void {
    SUBJECT_SKIN_REGISTRY.forEach((entry, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "subject-drawer__card";
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", `Select ${entry.label} subject`);
      card.style.setProperty("--reveal-delay", `${i * STAGGER_MS}ms`);
      card.innerHTML = `
        <span class="subject-drawer__card-thumb" data-skin-id="${entry.id}" aria-hidden="true"></span>
        <span class="subject-drawer__card-label">${entry.label}</span>
      `;
      this.cardList.appendChild(card);
      this.cardEntries.push({ skin: { kind: "illustrated", id: entry.id }, el: card });
    });
  }

  getCardElements(): { skin: SubjectSkin; el: HTMLElement }[] {
    return this.cardEntries;
  }

  getComposeSlot(): HTMLElement {
    return this.panel.querySelector<HTMLElement>('[data-slot="compose"]')!;
  }

  open(): void {
    this.open_ = true;
    this.panel.dataset.open = "true";
  }

  close(): void {
    this.open_ = false;
    this.panel.dataset.open = "false";
  }

  toggle(): void {
    if (this.open_) this.close();
    else this.open();
  }

  isOpen(): boolean {
    return this.open_;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/subjectDrawer.test.ts`
Expected: PASS.

- [ ] **Step 5: Style the panel, card list, and staggered reveal**

```css
/* src/hud/subjectDrawer.css */
.subject-drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  width: min(320px, 86vw);
  background: var(--color-cream);
  border-left: 1.5px solid var(--color-ink);
  border-right: 1.5px solid var(--color-ink);
  box-shadow: 0 0 0 3px var(--color-ink) inset, 6px 0 14px rgba(42, 36, 32, 0.22);
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: var(--font-mono);
  color: var(--color-ink);
  z-index: var(--z-hud);
  transition: transform var(--duration-slow) var(--ease-spring);
  overflow-y: auto;
}

.subject-drawer[data-anchor="right"] {
  right: 0;
  transform: translateX(100%);
}

.subject-drawer[data-anchor="left"] {
  left: 0;
  transform: translateX(-100%);
}

.subject-drawer[data-open="true"] {
  transform: translateX(0);
}

.subject-drawer__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.subject-drawer__card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-cream);
  border: 1.4px solid var(--color-ink);
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-mono);
  text-transform: lowercase;
  color: var(--color-ink);
  opacity: 0;
  transform: translateY(14px);
  transition: transform var(--duration-base) var(--ease-spring),
              opacity var(--duration-base) var(--ease-spring),
              background 120ms var(--ease-protest);
  transition-delay: var(--reveal-delay, 0ms);
}

.subject-drawer[data-open="true"] .subject-drawer__card {
  opacity: 1;
  transform: translateY(0);
}

.subject-drawer__card:hover {
  background: var(--color-coral);
}

.subject-drawer__card:active {
  transform: scale(0.96);
}

.subject-drawer__card-thumb {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-slate);
  flex-shrink: 0;
}

.subject-drawer__card-label {
  font-size: 0.8rem;
  letter-spacing: 0.02em;
}

@media (prefers-reduced-motion: reduce) {
  .subject-drawer,
  .subject-drawer__card {
    transition: none;
    transition-delay: 0ms;
  }
}
```

Import this stylesheet the same way `hud.css` is imported:

```typescript
// src/main.ts — alongside the existing `import "./hud/hud.css";`
import "./hud/subjectDrawer.css";
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hud/SubjectDrawer.ts src/hud/subjectDrawer.css src/main.ts tests/unit/subjectDrawer.test.ts
git commit -m "feat(hud): add SubjectDrawer panel scaffold with staggered-reveal illustrated card list"
```

### Task 8: Compose row — typed text, size stepper, live preview

**Files:**
- Modify: `src/hud/SubjectDrawer.ts`, `src/hud/subjectDrawer.css`
- Test: `tests/unit/subjectDrawer.test.ts`

**Interfaces:**
- Consumes: `SubjectSkin` (`src/hud/subjectSkinRegistry.ts`).
- Produces: `SubjectDrawer.getComposePreviewCard(): { getSkin(): SubjectSkin; el: HTMLElement }` — consumed by Task 10 (drag source attaches to the live preview card using a payload-provider function, since its `SubjectSkin` value changes as the user types/steps).

Per spec §3, the compose row holds a text input and a small/medium/large size stepper, and previews the resulting text-card's scale live before any drop. Per spec §1, scale values are carried as plain numbers (`0.75`/`1`/`1.35` for small/medium/large) rather than named steps at the data layer — the stepper only presents three discrete choices in the UI.

- [ ] **Step 1: Extend the failing test**

```typescript
// tests/unit/subjectDrawer.test.ts — add to the existing describe block
describe("SubjectDrawer compose row", () => {
  it("starts with an empty text value and medium scale", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const preview = drawer.getComposePreviewCard();
    const skin = preview.getSkin();
    expect(skin).toEqual({ kind: "text", value: "", scale: 1 });
  });

  it("typing into the compose input updates the preview's text value", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const input = root.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
    input.value = "No Kings";
    input.dispatchEvent(new Event("input"));
    const skin = drawer.getComposePreviewCard().getSkin();
    expect(skin).toEqual({ kind: "text", value: "No Kings", scale: 1 });
  });

  it("clicking small/large stepper buttons updates the preview's scale", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    root.querySelector<HTMLElement>('[data-size="small"]')!.click();
    expect(drawer.getComposePreviewCard().getSkin().scale).toBe(0.75);
    root.querySelector<HTMLElement>('[data-size="large"]')!.click();
    expect(drawer.getComposePreviewCard().getSkin().scale).toBe(1.35);
    root.querySelector<HTMLElement>('[data-size="medium"]')!.click();
    expect(drawer.getComposePreviewCard().getSkin().scale).toBe(1);
  });

  it("the preview card shows the typed text as its label", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const input = root.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
    input.value = "Term Limits";
    input.dispatchEvent(new Event("input"));
    expect(drawer.getComposePreviewCard().el.textContent).toContain("Term Limits");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/subjectDrawer.test.ts`
Expected: FAIL — no compose-row markup or `getComposePreviewCard` yet.

- [ ] **Step 3: Implement the compose row**

```typescript
// src/hud/SubjectDrawer.ts — additions
export type SizeStep = "small" | "medium" | "large";

const SIZE_SCALE: Record<SizeStep, number> = { small: 0.75, medium: 1, large: 1.35 };

// inside class SubjectDrawer, add fields:
  private composeText = "";
  private composeScale = SIZE_SCALE.medium;
  private composePreviewEl!: HTMLElement;
  private composePreviewLabel!: HTMLElement;

// replace the constructor's compose slot population — after `this.renderCards();` add:
    this.renderCompose();

// new private method:
  private renderCompose(): void {
    const slot = this.getComposeSlot();
    slot.innerHTML = `
      <input type="text" class="subject-drawer__compose-input" placeholder="type a subject..." maxlength="24" aria-label="Typed subject text" />
      <div class="subject-drawer__compose-sizes" role="group" aria-label="Text size">
        <button type="button" data-size="small" class="subject-drawer__size-btn">S</button>
        <button type="button" data-size="medium" class="subject-drawer__size-btn subject-drawer__size-btn--active">M</button>
        <button type="button" data-size="large" class="subject-drawer__size-btn">L</button>
      </div>
      <button type="button" class="subject-drawer__card subject-drawer__compose-preview" aria-label="Typed subject preview, drag or tap to place">
        <span class="subject-drawer__card-thumb subject-drawer__compose-preview-thumb" aria-hidden="true"></span>
        <span class="subject-drawer__card-label subject-drawer__compose-preview-label"></span>
      </button>
    `;
    const input = slot.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
    this.composePreviewEl = slot.querySelector<HTMLElement>(".subject-drawer__compose-preview")!;
    this.composePreviewLabel = slot.querySelector<HTMLElement>(".subject-drawer__compose-preview-label")!;
    input.addEventListener("input", () => {
      this.composeText = input.value;
      this.refreshComposePreview();
    });
    for (const step of Object.keys(SIZE_SCALE) as SizeStep[]) {
      slot.querySelector<HTMLElement>(`[data-size="${step}"]`)!.addEventListener("click", () => {
        this.composeScale = SIZE_SCALE[step];
        for (const btn of slot.querySelectorAll<HTMLElement>(".subject-drawer__size-btn")) {
          btn.classList.toggle("subject-drawer__size-btn--active", btn.dataset.size === step);
        }
        this.refreshComposePreview();
      });
    }
    this.refreshComposePreview();
  }

  private refreshComposePreview(): void {
    this.composePreviewLabel.textContent = this.composeText || "(empty)";
    this.composePreviewEl.style.fontSize = `${0.8 * this.composeScale}rem`;
  }

  getComposePreviewCard(): { getSkin: () => SubjectSkin; el: HTMLElement } {
    return {
      getSkin: () => ({ kind: "text", value: this.composeText, scale: this.composeScale }),
      el: this.composePreviewEl,
    };
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/subjectDrawer.test.ts`
Expected: PASS.

- [ ] **Step 5: Style the compose row**

```css
/* src/hud/subjectDrawer.css — append */
.subject-drawer__compose {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 14px;
  border-bottom: 1.4px dashed var(--color-ink);
}

.subject-drawer__compose-input {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  padding: 8px 10px;
  border: 1.4px solid var(--color-ink);
  border-radius: 3px;
  background: var(--color-cream);
  color: var(--color-ink);
}

.subject-drawer__compose-sizes {
  display: flex;
  gap: 6px;
}

.subject-drawer__size-btn {
  flex: 1;
  padding: 6px 0;
  border: 1.4px solid var(--color-ink);
  background: var(--color-cream);
  color: var(--color-ink);
  font-family: var(--font-mono);
  border-radius: 3px;
  cursor: pointer;
  transition: transform 140ms var(--ease-spring), background 120ms var(--ease-protest);
}

.subject-drawer__size-btn:active {
  transform: scale(0.92);
}

.subject-drawer__size-btn--active {
  background: var(--color-coral);
}

.subject-drawer__compose-preview {
  margin-top: 4px;
}
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hud/SubjectDrawer.ts src/hud/subjectDrawer.css tests/unit/subjectDrawer.test.ts
git commit -m "feat(hud): add compose row with typed text, small/medium/large size stepper, and live preview"
```

### Task 9: Resize-after-placement — bind the stepper to the live active subject

**Files:**
- Modify: `src/hud/SubjectDrawer.ts`
- Test: `tests/unit/subjectDrawer.test.ts`

**Interfaces:**
- Consumes: `SubjectSkin` (`src/hud/subjectSkinRegistry.ts`).
- Produces: `SubjectDrawer.setActiveSkin(skin: SubjectSkin | null): void`, `SubjectDrawer.onResize(cb: (scale: number) => void): void` — consumed by Task 12 (`Hud.ts` forwards the currently-active skin in) and Task 13 (`main.ts` registers the resize callback).

Per spec §4, reopening the drawer while a text subject is active surfaces the same stepper now bound to the live entity's scale — adjusting it resizes the placed subject immediately rather than composing a new one. This task adds that binding without touching the compose text input (changing the *text* of an active subject still requires a fresh drag/tap per spec's data-model scope, per this plan's `SubjectDrawer` design note below).

- [ ] **Step 1: Extend the failing test**

```typescript
// tests/unit/subjectDrawer.test.ts — add to the existing describe block
describe("SubjectDrawer resize-after-placement", () => {
  it("setActiveSkin(text) pre-populates the compose row and marks resize mode", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    drawer.setActiveSkin({ kind: "text", value: "Step Down", scale: 1.35 });
    const input = root.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
    expect(input.value).toBe("Step Down");
    expect(root.querySelector('[data-size="large"]')!.classList.contains("subject-drawer__size-btn--active")).toBe(true);
  });

  it("setActiveSkin(illustrated) clears resize mode", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    drawer.setActiveSkin({ kind: "text", value: "X", scale: 1 });
    drawer.setActiveSkin({ kind: "illustrated", id: "figure" });
    const cb = vi.fn();
    drawer.onResize(cb);
    root.querySelector<HTMLElement>('[data-size="large"]')!.click();
    expect(cb).not.toHaveBeenCalled();
  });

  it("stepper clicks call onResize with the new scale only while a text skin is active", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    drawer.setActiveSkin({ kind: "text", value: "Step Down", scale: 1 });
    const cb = vi.fn();
    drawer.onResize(cb);
    root.querySelector<HTMLElement>('[data-size="large"]')!.click();
    expect(cb).toHaveBeenCalledWith(1.35);
  });
});
```

Add `vi` to the existing test file's import if not already present: `import { describe, it, expect, vi } from "vitest";`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/subjectDrawer.test.ts`
Expected: FAIL — `setActiveSkin`/`onResize` don't exist yet.

- [ ] **Step 3: Implement resize-binding**

```typescript
// src/hud/SubjectDrawer.ts — additions

// new field:
  private activeSkin: SubjectSkin | null = null;
  private resizeCb: ((scale: number) => void) | null = null;

  setActiveSkin(skin: SubjectSkin | null): void {
    this.activeSkin = skin;
    if (skin?.kind === "text") {
      const input = this.getComposeSlot().querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
      input.value = skin.value;
      this.composeText = skin.value;
      this.composeScale = skin.scale;
      const step = (Object.entries(SIZE_SCALE).find(([, v]) => v === skin.scale)?.[0] as SizeStep | undefined) ?? "medium";
      for (const btn of this.getComposeSlot().querySelectorAll<HTMLElement>(".subject-drawer__size-btn")) {
        btn.classList.toggle("subject-drawer__size-btn--active", btn.dataset.size === step);
      }
      this.refreshComposePreview();
    }
  }

  onResize(cb: (scale: number) => void): void {
    this.resizeCb = cb;
  }

// modify the size-stepper click handler added in Task 8:
    for (const step of Object.keys(SIZE_SCALE) as SizeStep[]) {
      slot.querySelector<HTMLElement>(`[data-size="${step}"]`)!.addEventListener("click", () => {
        this.composeScale = SIZE_SCALE[step];
        for (const btn of slot.querySelectorAll<HTMLElement>(".subject-drawer__size-btn")) {
          btn.classList.toggle("subject-drawer__size-btn--active", btn.dataset.size === step);
        }
        this.refreshComposePreview();
        if (this.activeSkin?.kind === "text") {
          this.resizeCb?.(this.composeScale);
        }
      });
    }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/subjectDrawer.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hud/SubjectDrawer.ts tests/unit/subjectDrawer.test.ts
git commit -m "feat(hud): bind size stepper to the live active text subject for post-placement resize"
```

---

## Phase D: Interaction — drag and tap

### Task 10: `SubjectDragSource` — desktop pointer-drag from a drawer card to the canvas

**Files:**
- Create: `src/input/SubjectDragSource.ts`
- Test: `tests/unit/subjectDragSource.test.ts` (new, `happy-dom`)

**Interfaces:**
- Consumes: `SubjectSkin` (`src/hud/subjectSkinRegistry.ts`).
- Produces: `class SubjectDragSource { constructor(opts: { dropTarget: HTMLElement }); attachCard(card, getSkin: () => SubjectSkin): void; onSwap(cb: (skin: SubjectSkin) => void): void }` — consumed by Task 12 (`Hud.ts` wires every `SubjectDrawer` card, including the compose preview, into one `SubjectDragSource`).

Per spec §4, this is a new drag source implemented independently of `src/input/DragController.ts` — it never touches `EntityStore`, entity physics, or `DragController`'s own `dragged`/`lastX`/`lastY` state. It uses Pointer Events with a floating ghost element and a geometry check against the drop target's bounding rect at pointer-up, rather than the HTML5 Drag and Drop API (native `DataTransfer` is unreliable across the `happy-dom` test environment this project already uses for DOM tests).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/subjectDragSource.test.ts
// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { SubjectDragSource } from "../../src/input/SubjectDragSource";
import type { SubjectSkin } from "../../src/hud/subjectSkinRegistry";

function firePointer(el: EventTarget, type: string, x: number, y: number, pointerType = "mouse"): void {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType, bubbles: true }));
}

describe("SubjectDragSource", () => {
  it("calls onSwap when a mouse drag ends over the drop target", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 100, right: 300, top: 100, bottom: 300, width: 200, height: 200, x: 100, y: 100, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    const skin: SubjectSkin = { kind: "illustrated", id: "figure" };
    source.attachCard(card, () => skin);
    const cb = vi.fn();
    source.onSwap(cb);

    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 150, 150);
    firePointer(window, "pointerup", 150, 150);

    expect(cb).toHaveBeenCalledWith(skin);
  });

  it("does not call onSwap when the drag ends outside the drop target", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 100, right: 300, top: 100, bottom: 300, width: 200, height: 200, x: 100, y: 100, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "illustrated", id: "figure" }));
    const cb = vi.fn();
    source.onSwap(cb);

    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 20, 20);
    firePointer(window, "pointerup", 20, 20);

    expect(cb).not.toHaveBeenCalled();
  });

  it("ignores touch pointerdown (handled separately by tap-to-select)", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 0, right: 999, top: 0, bottom: 999, width: 999, height: 999, x: 0, y: 0, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "illustrated", id: "figure" }));
    const cb = vi.fn();
    source.onSwap(cb);

    firePointer(card, "pointerdown", 10, 10, "touch");
    firePointer(window, "pointermove", 150, 150, "touch");
    firePointer(window, "pointerup", 150, 150, "touch");

    expect(cb).not.toHaveBeenCalled();
  });

  it("reads getSkin() at drag-start time, not attach time (compose preview support)", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 100, right: 300, top: 100, bottom: 300, width: 200, height: 200, x: 100, y: 100, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    let currentValue = "first";
    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "text", value: currentValue, scale: 1 }));
    const cb = vi.fn();
    source.onSwap(cb);

    currentValue = "second";
    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 150, 150);
    firePointer(window, "pointerup", 150, 150);

    expect(cb).toHaveBeenCalledWith({ kind: "text", value: "second", scale: 1 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/subjectDragSource.test.ts`
Expected: FAIL — `src/input/SubjectDragSource.ts` doesn't exist.

- [ ] **Step 3: Implement `SubjectDragSource`**

```typescript
// src/input/SubjectDragSource.ts
import type { SubjectSkin } from "../hud/subjectSkinRegistry";

export type SubjectDragSourceOptions = {
  dropTarget: HTMLElement;
};

type DragState = {
  getSkin: () => SubjectSkin;
  ghost: HTMLElement;
  onMove: (e: PointerEvent) => void;
  onUp: (e: PointerEvent) => void;
};

/**
 * Panel-to-canvas drag source for the subject browser. Deliberately separate
 * from src/input/DragController.ts (entity-level canvas repositioning) — no
 * shared state, and swapping subjectSkin on drop is the only effect.
 */
export class SubjectDragSource {
  private readonly dropTarget: HTMLElement;
  private swapCb: ((skin: SubjectSkin) => void) | null = null;
  private dragging: DragState | null = null;

  constructor(opts: SubjectDragSourceOptions) {
    this.dropTarget = opts.dropTarget;
  }

  onSwap(cb: (skin: SubjectSkin) => void): void {
    this.swapCb = cb;
  }

  attachCard(card: HTMLElement, getSkin: () => SubjectSkin): void {
    card.addEventListener("pointerdown", (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerType === "touch") return;
      pe.preventDefault();
      this.startDrag(getSkin, pe.clientX, pe.clientY, card);
    });
    card.addEventListener("pointerup", (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerType !== "touch") return;
      this.swapCb?.(getSkin());
    });
  }

  private startDrag(getSkin: () => SubjectSkin, startX: number, startY: number, card: HTMLElement): void {
    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "9999";
    ghost.style.opacity = "0.85";
    ghost.style.left = `${startX - 24}px`;
    ghost.style.top = `${startY - 24}px`;
    document.body.appendChild(ghost);

    const state: DragState = {
      getSkin,
      ghost,
      onMove: (e) => {
        ghost.style.left = `${e.clientX - 24}px`;
        ghost.style.top = `${e.clientY - 24}px`;
      },
      onUp: (e) => {
        ghost.remove();
        window.removeEventListener("pointermove", state.onMove);
        window.removeEventListener("pointerup", state.onUp);
        this.dragging = null;
        const rect = this.dropTarget.getBoundingClientRect();
        const overTarget =
          e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (overTarget) this.swapCb?.(getSkin());
      },
    };
    this.dragging = state;
    window.addEventListener("pointermove", state.onMove);
    window.addEventListener("pointerup", state.onUp);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/subjectDragSource.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/input/SubjectDragSource.ts tests/unit/subjectDragSource.test.ts
git commit -m "feat(input): add SubjectDragSource — pointer-based drawer-card-to-canvas drag, independent of DragController"
```

### Task 11: Touch tap-to-select parity

**Files:**
- Modify: `tests/unit/subjectDragSource.test.ts` only (verifies existing Task 10 behavior more thoroughly)

**Interfaces:**
- Consumes/Produces: none new — `attachCard`'s touch-tap branch was already implemented in Task 10 Step 3 (the `pointerup` listener gated on `pe.pointerType !== "touch"` returning early, i.e. only touch reaches `this.swapCb?.(getSkin())`). This task exists as its own reviewable, independently-testable deliverable per spec §4's explicit "Touch fallback" requirement, adding the coverage that proves tap-to-select works standalone without any drag gesture.

- [ ] **Step 1: Write the failing test proving tap alone (no pointerdown-drag) swaps immediately**

```typescript
// tests/unit/subjectDragSource.test.ts — add to the existing describe block
describe("SubjectDragSource touch tap-to-select", () => {
  it("a bare touch pointerup on a card swaps immediately, with no pointerdown/move needed", () => {
    const dropTarget = document.createElement("canvas");
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    const skin: SubjectSkin = { kind: "illustrated", id: "lotus" };
    source.attachCard(card, () => skin);
    const cb = vi.fn();
    source.onSwap(cb);

    card.dispatchEvent(new PointerEvent("pointerup", { clientX: 5, clientY: 5, pointerType: "touch", bubbles: true }));

    expect(cb).toHaveBeenCalledWith(skin);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("touch tap position is irrelevant — it never checks the drop-target rect", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 900, right: 999, top: 900, bottom: 999, width: 99, height: 99, x: 900, y: 900, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "illustrated", id: "lotus" }));
    const cb = vi.fn();
    source.onSwap(cb);

    card.dispatchEvent(new PointerEvent("pointerup", { clientX: 0, clientY: 0, pointerType: "touch", bubbles: true }));

    expect(cb).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it already passes (regression-proof, not new behavior)**

Run: `npx vitest run tests/unit/subjectDragSource.test.ts`
Expected: PASS immediately — this locks in Task 10's touch branch as its own named contract so a future refactor of `SubjectDragSource` can't silently drop tap-to-select.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/subjectDragSource.test.ts
git commit -m "test(input): lock in touch tap-to-select as an independently-verified SubjectDragSource contract"
```

---

## Phase E: HUD integration and wiring

### Task 12: `Hud.ts` — remove click-to-cycle skin selector, mount subject-browser toggle + drawer

**Files:**
- Modify: `src/hud/Hud.ts`, `src/hud/hud.css`
- Test: `tests/unit/hudControls.test.ts` (created by the prerequisite plan's Task 10 — remove its skin-cycling test, add the new subject-browser tests below)

**Interfaces:**
- Consumes: `SubjectDrawer` (Task 7-9), `SubjectDragSource` (Task 10), `SubjectSkin` (`src/hud/subjectSkinRegistry.ts`).
- Produces: widened `Hud` constructor `(root: HTMLElement, canvasDropTarget: HTMLElement)`, new methods `onSubjectSkinChange(cb: (skin: SubjectSkin) => void)`, `onSubjectResize(cb: (scale: number) => void)`, `setActiveSubjectSkin(skin: SubjectSkin)` — consumed by Task 13's `main.ts` wiring, replacing `onSkinChange`/`setSkin`.

- [ ] **Step 1: Update the failing tests**

```typescript
// tests/unit/hudControls.test.ts — remove the prerequisite plan's
// "cycles HudSkin on skin-icon click and calls onSkinChange" test entirely
// (that control no longer exists), and add:

describe("Hud subject browser", () => {
  it("Hud constructor takes a canvas drop target and does not render a skin-cycle icon", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    expect(root.querySelector(".hud-placard__skin-icon")).toBeNull();
    expect(root.querySelector(".hud-placard__skin-label")).toBeNull();
  });

  it("renders a subject-browser toggle button in the placard", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    expect(root.querySelector(".hud-placard__subject-toggle")).not.toBeNull();
  });

  it("clicking the toggle opens the SubjectDrawer", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    root.querySelector<HTMLElement>(".hud-placard__subject-toggle")!.click();
    expect(root.querySelector(".subject-drawer")!.getAttribute("data-open")).toBe("true");
  });

  it("onSubjectSkinChange fires when a card is tapped (touch)", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const cb = vi.fn();
    hud.onSubjectSkinChange(cb);
    root.querySelector<HTMLElement>(".hud-placard__subject-toggle")!.click();
    const firstCard = root.querySelector<HTMLElement>(".subject-drawer__card")!;
    firstCard.dispatchEvent(new PointerEvent("pointerup", { clientX: 1, clientY: 1, pointerType: "touch", bubbles: true }));
    expect(cb).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/hudControls.test.ts`
Expected: FAIL — `Hud` still takes one constructor arg and still renders the old skin-cycle icon.

- [ ] **Step 3: Remove the skin-cycle control and mount the new drawer**

```typescript
// src/hud/Hud.ts — full replacement of the skin-related pieces

import { PALETTE } from "../config/tokens";
import { hudIcons, HUD_TEAR_PATH, type HudMode, type HudPower } from "./hudIcons";
import { SubjectDrawer } from "./SubjectDrawer";
import { SubjectDragSource } from "../input/SubjectDragSource";
import type { SubjectSkin } from "./subjectSkinRegistry";

const MODE_CYCLE: readonly HudMode[] = ["eyes", "bugs", "pointedFinger"];
const QTY_MIN = 1;
const QTY_MAX = 60;

export class Hud {
  // ...existing fields unchanged, MINUS: skinLabel, skinIconHost, skin, skinChangeCb, SKIN_CYCLE usage...
  private readonly drawer: SubjectDrawer;
  private readonly dragSource: SubjectDragSource;
  private subjectSkinChangeCb: ((skin: SubjectSkin) => void) | null = null;

  constructor(root: HTMLElement, canvasDropTarget: HTMLElement) {
    root.dataset.layer = "hud";
    root.innerHTML = "";
    this.placard = document.createElement("div");
    this.placard.className = "hud-placard";
    this.placard.dataset.mode = this.mode;
    this.placard.dataset.power = this.power;
    this.placard.setAttribute("aria-label", "Mode, subject, and active power");
    this.placard.setAttribute("role", "status");
    this.placard.innerHTML = `
      <svg class="hud-placard__tear" viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="${HUD_TEAR_PATH}" fill="${PALETTE.cream}" stroke="${PALETTE.ink}" stroke-width="1"/>
      </svg>
      <div class="hud-placard__grain"></div>
      <div class="hud-placard__inner">
        <button type="button" class="hud-placard__mode-icon" aria-label="Cycle crowd mode"></button>
        <span class="hud-placard__mode-label">eyes</span>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <button type="button" class="hud-placard__subject-toggle" aria-label="Browse subjects"></button>
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
    this.qtyValue = this.placard.querySelector<HTMLElement>(".hud-placard__qty-value")!;
    this.modeIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__mode-icon")!;
    this.powerIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__power-icon")!;
    this.repelInput = this.placard.querySelector<HTMLInputElement>(".hud-placard__repel-input")!;
    this.chargeRing = this.placard.querySelector<HTMLElement>(".hud-placard__charge")!;

    this.drawer = new SubjectDrawer(root, { anchor: "right" });
    this.dragSource = new SubjectDragSource({ dropTarget: canvasDropTarget });
    for (const { skin, el } of this.drawer.getCardElements()) {
      this.dragSource.attachCard(el, () => skin);
    }
    const preview = this.drawer.getComposePreviewCard();
    this.dragSource.attachCard(preview.el, preview.getSkin);
    this.dragSource.onSwap((skin) => {
      this.drawer.close();
      this.subjectSkinChangeCb?.(skin);
    });

    this.placard.querySelector<HTMLElement>(".hud-placard__subject-toggle")!.addEventListener("click", () => {
      this.drawer.toggle();
    });

    this.refreshIcons();
    this.wireControls();
    requestAnimationFrame(() => this.placard.classList.add("hud-placard--ready"));
  }

  // wireControls() loses its skinIconHost click handler entirely; the
  // mode/qty/repel handlers are unchanged from the prerequisite plan's Task 10.

  // refreshIcons() loses the `this.skinIconHost.innerHTML = ...` line.

  // setSkin()/onSkinChange() are DELETED. Replaced by:

  setActiveSubjectSkin(skin: SubjectSkin): void {
    this.drawer.setActiveSkin(skin);
  }

  onSubjectSkinChange(cb: (skin: SubjectSkin) => void): void {
    this.subjectSkinChangeCb = cb;
  }

  onSubjectResize(cb: (scale: number) => void): void {
    this.drawer.onResize(cb);
  }
}
```

Also add a subject-browser icon to `hudIcons.ts` (single thin stroke weight, matching every other icon per spec §6):

```typescript
// src/hud/hudIcons.ts — add to the hudIcons object
subjectToggleIcon: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="${PALETTE.ink}" stroke-width="1.4"/><path d="M4 9 H20 M9 9 V20" stroke="${PALETTE.ink}" stroke-width="1.4"/></svg>`,
```

And set it in the constructor after the toggle button is created:

```typescript
// src/hud/Hud.ts — after the .hud-placard__subject-toggle element is queried
this.placard.querySelector<HTMLElement>(".hud-placard__subject-toggle")!.innerHTML = hudIcons.subjectToggleIcon;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/hudControls.test.ts`
Expected: PASS.

- [ ] **Step 5: Remove the old skin styles and add styles for the new toggle button**

```css
/* src/hud/hud.css — DELETE these rules entirely (Task 6 already split
   .hud-placard__mode-icon into its own selector, so removing the shared
   .hud-placard__skin-icon half is a clean deletion here): */
.hud-placard__skin-label { /* deleted */ }

/* add: */
.hud-placard__subject-toggle {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 160ms var(--ease-spring);
}

.hud-placard__subject-toggle:hover {
  transform: scale(1.12);
}

.hud-placard__subject-toggle:active {
  transform: scale(0.9);
}
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hud/Hud.ts src/hud/hud.css src/hud/hudIcons.ts tests/unit/hudControls.test.ts
git commit -m "feat(hud): remove click-to-cycle skin selector, mount SubjectDrawer + drag source behind a new browse toggle"
```

### Task 13: `main.ts` — wire the subject browser into the live Subject entity

**Files:**
- Modify: `src/main.ts`
- Test: `tests/unit/mainSubjectSkinWiring.test.ts` (new)

**Interfaces:**
- Consumes: `Hud.onSubjectSkinChange`/`onSubjectResize`/`setActiveSubjectSkin` (Task 12), `SubjectSkin` (`src/hud/subjectSkinRegistry.ts`), the module-level `subjectId: EntityId | null` and `store`/`stage` already declared by the v1-fix plan and the prerequisite v2 expansion plan's Task 11.

This directly replaces the prerequisite plan's `hud.onSkinChange((skin) => { ... data.subjectSkin = skin; })` block with the discriminated-union equivalent, and switches `new Hud(hudRoot)` to pass the canvas so `SubjectDragSource` has a real drop target.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mainSubjectSkinWiring.test.ts
import { describe, it, expect } from "vitest";
import type { SubjectSkin } from "../../src/hud/subjectSkinRegistry";

// This test documents the exact behavior.data shape main.ts must write —
// a focused unit test of the swap logic extracted as a pure function,
// since main.ts itself is a top-level wiring script without exports to call directly.
function applySubjectSkinSwap(data: Record<string, unknown>, skin: SubjectSkin): void {
  data.subjectSkin = skin;
}

describe("subject skin swap data shape", () => {
  it("writes an illustrated skin verbatim onto behavior.data.subjectSkin", () => {
    const data: Record<string, unknown> = {};
    applySubjectSkinSwap(data, { kind: "illustrated", id: "jester" });
    expect(data.subjectSkin).toEqual({ kind: "illustrated", id: "jester" });
  });

  it("writes a text skin verbatim onto behavior.data.subjectSkin", () => {
    const data: Record<string, unknown> = {};
    applySubjectSkinSwap(data, { kind: "text", value: "No Kings", scale: 1.35 });
    expect(data.subjectSkin).toEqual({ kind: "text", value: "No Kings", scale: 1.35 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/mainSubjectSkinWiring.test.ts`
Expected: PASS trivially (it's a same-file pure function) — this step exists to pin the exact `behavior.data.subjectSkin` shape `main.ts`'s real wiring must match, before editing the real file.

- [ ] **Step 3: Update `main.ts`'s `Hud` construction and imports**

```typescript
// src/main.ts — replace
const hud = new Hud(hudRoot);
// with
const hud = new Hud(hudRoot, stage);
```

```typescript
// src/main.ts — add import alongside the existing hud/hudIcons import
import type { SubjectSkin } from "./hud/subjectSkinRegistry";
```

- [ ] **Step 4: Replace the `hud.onSkinChange` block with `hud.onSubjectSkinChange`/`onSubjectResize`**

```typescript
// src/main.ts — DELETE the prerequisite plan's Task 11 block:
// hud.onSkinChange((skin) => {
//   subjectSkin = skin;
//   const subj = subjectId !== null ? store.get(subjectId, { live: true }) : null;
//   if (subj) {
//     const data = subj.behavior.data as Record<string, unknown>;
//     data.subjectSkin = skin;
//   }
// });

// REPLACE with:
let activeSubjectSkin: SubjectSkin = { kind: "illustrated", id: "figure" };

hud.onSubjectSkinChange((skin) => {
  activeSubjectSkin = skin;
  const subj = subjectId !== null ? store.get(subjectId, { live: true }) : null;
  if (subj) {
    const data = subj.behavior.data as Record<string, unknown>;
    data.subjectSkin = skin;
  }
  hud.setActiveSubjectSkin(skin);
});

hud.onSubjectResize((scale) => {
  if (activeSubjectSkin.kind !== "text") return;
  activeSubjectSkin = { ...activeSubjectSkin, scale };
  const subj = subjectId !== null ? store.get(subjectId, { live: true }) : null;
  if (subj) {
    const data = subj.behavior.data as Record<string, unknown>;
    data.subjectSkin = activeSubjectSkin;
  }
});
```

The module-level `let subjectSkin: HudSkin = "figure";` declared by the prerequisite plan's Task 11 is renamed/replaced by `activeSubjectSkin: SubjectSkin` above — remove the old declaration line (`let subjectSkin: HudSkin = "figure";`) so there isn't a stale, now-unused variable left in the file. If the Subject entity's initial spawn code (from the v1-fix plan) reads that old variable to seed `behavior.data.subjectSkin`, update it to seed `{ kind: "illustrated", id: "figure" }` instead, matching this task's new shape.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`. Confirm: clicking the new subject-browser toggle opens the drawer with a staggered card reveal; dragging an illustrated card onto the canvas swaps the Subject's rendered skin immediately with no flicker/respawn; typing text + choosing a size in the compose row and dragging (or, on a touch device / touch emulation, tapping) it onto the canvas places the typed-text placard; reopening the drawer while that text subject is active shows the stepper pre-set to its current size, and clicking a different size immediately resizes the on-canvas subject.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts tests/unit/mainSubjectSkinWiring.test.ts
git commit -m "feat(main): wire SubjectDrawer/SubjectDragSource into the live Subject entity, replacing hud.onSkinChange"
```

---

## Spec coverage

| Spec section | Covered by |
|---|---|
| §1 Subject data model (`SubjectSkin` discriminated union, registry, render-only swap, resize scoped to text) | Task 1 (type rename + scaffold), Task 4 (dispatcher), Task 13 (render-only swap wiring), Task 9 (resize scoping) |
| §2 New placeholder illustrated subjects | Task 2 |
| §3 Subject browser panel (slide-out drawer, scrollable card list, compose row, live preview) | Task 7, Task 8 |
| §4 Interaction: drag, tap, resize; replaces click-to-cycle; separate from `DragController` | Task 10, Task 11, Task 12 (removal), Task 9 (resize) |
| §5 HUD controls inventory (visual-only changes to mode/power/qty/repel; skin selector removed; toggle+drawer added) | Task 6 (visual-only), Task 12 (removal + addition) |
| §6 Premium HUD visual bar (layered depth, spring motion, thin iconography, breathing room, staggered reveal, tactile press feedback) | Task 5 (shared easing token), Task 6 (existing controls), Task 7 (staggered reveal), Task 12 (new toggle icon/motion) |
| §7 Open questions resolved by this plan | Placeholder identities: Task 2 (scribe/herald/jester). Drawer anchor: Task 7 (`anchor: "right"`, configurable). Spring-easing storage: Task 5 (CSS custom property `--ease-spring` + mirrored `EASE.spring` JS constant) |

## Self-review

- **Spec coverage:** every numbered section (§1-§7) maps to at least one task, per the table above.
- **Placeholder scan:** no TBD/TODO/"add appropriate error handling"/"similar to Task N" phrasing appears in any step; every code block is complete, real code. The one intentionally-deferred item (exact placeholder subject *identities/likenesses*) is explicitly named in spec §7 as content-only, not a mechanism gap, and Task 2 supplies concrete (if placeholder-named) `scribe`/`herald`/`jester` subjects with real, distinct geometry.
- **Type consistency:** `SubjectSkin` is defined once (Task 1, `src/hud/subjectSkinRegistry.ts`) and its exact shape (`{kind:"illustrated",id}` / `{kind:"text",value,scale}`) is reused unchanged through Tasks 3, 4, 7-13 — no task redefines or aliases it. `IllustratedSubjectId` (Task 1, `src/content/schema.ts`) is reused unchanged in Task 2's registration and Task 4's dispatcher. `getSubjectSkinEntry`/`SUBJECT_SKIN_REGISTRY` (Task 1) are the single source Tasks 2, 4, and 7 all read from. `SubjectDragSource.attachCard`'s `getSkin: () => SubjectSkin` provider-function signature (Task 10) is used identically by Task 12 for both fixed illustrated cards and the mutable compose preview card — no divergent second attach method was introduced.
- **Scope check:** this plan touches only `src/hud/`, `src/render/drawers/`, `src/input/SubjectDragSource.ts` (new file), `src/content/schema.ts` (one field rename), `src/config/tokens.ts`/`src/styles/tokens.css` (one new token), and `src/main.ts`'s skin-wiring block. `Engine.ts`/`StateMachine.ts`/`EntityStore.ts`/`ForceField.ts` are never referenced. `DragController.ts` is never modified or imported by any new file.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-25-subject-browser-premium-hud.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
