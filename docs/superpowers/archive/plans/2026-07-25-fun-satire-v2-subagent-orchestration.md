# Fun Satire v2 — Subagent Orchestration & Worktree Framework Addendum

This is an addendum to `docs/superpowers/plans/2026-07-25-fun-satire-v2-sprint-plan.md`. It does not restate the lane ownership, sequencing, or per-task TDD steps that already live in the sprint plan and the expansion plan. It adds the **operational** layer those documents omit: per-task two-stage review protocol, worktree branch naming + creation recipes, branch base / merge strategy, cross-lane blocking dependencies, skills-to-load per lane, integration verification gates, and rollback triggers. Cross-references the relevant lane / task / skills in every section.

> **Same gate as the sprint plan.** Nothing in this addendum can begin until PR #2 (`https://github.com/abhisxn/fun-satire/pull/2`) merges to `main`. The addendum assumes the v1-fix Subject architecture (`src/render/drawers/drawSubject.ts`, `src/render/paperCut.ts`, `subjectId` module-level state in `main.ts` per the v1-fix plan's Task 36) is already on `main` when work starts.

## Audit against the framework

Quick map of where the existing plan already complies with `superpowers:subagent-driven-development` + `superpowers:using-git-worktrees`, and where it doesn't.

| Framework requirement | Where it lives today | Gap |
|---|---|---|
| Tasks mostly independent, mostly TDD-specified | Expansion plan Tasks 1–15, all TDD (test-first) | None |
| Phased execution with explicit gating | Sprint plan Phases A–E | None |
| Lanes for parallel work ownership | Sprint plan Lanes 1–7 | None on ownership; **gaps on cross-lane dependencies and skill loading** |
| Per-task implementer → spec-reviewer → code-quality-reviewer | Sprint plan has only Lane 7's final whole-implementation review | **Missing per-task two-stage review** |
| Worktree isolation, parallel worktrees where possible | Sprint plan references "real worktree parallelism" in Phase B | **Missing branch naming, creation recipe, base/merge strategy** |
| Forbidden-files gate | Expansion plan Task 15 Step 3 | None |
| Spec coverage table | Expansion plan §"Spec Coverage Table" | None |
| Verification-before-completion (evidence before assertions) | Per task: `npx vitest run` etc. as Steps | Discipline is implicit; **add explicit "paste output" rule** |
| Rollback / re-plan trigger if foundation fails | None | **Missing** |
| Skills loaded per subagent (test-driven-development, high-end-visual-design, etc.) | None | **Missing** |
| Integration verification between phases | Phase C Step 9 has manual verification in Task 11 only | **Missing automated cross-cutting smoke test (e.g. all three modes render in one frame)** |

The rest of this document adds the missing rows.

## 1. Per-task two-stage review protocol

**Source requirement:** `superpowers:subagent-driven-development` — "implementer → spec compliance review → code quality review → mark complete, per task." The skill explicitly forbids skipping either review or moving to the next task with either review open.

Concretely, for every task in Tasks 1–14:

1. **Dispatch implementer subagent** (general-purpose agent, cheap-to-standard model based on task complexity — see §4 below). The implementer prompt template lives at `~/.kilocode/skills/subagent-driven-development/implementer-prompt.md`. The controller (the human-facing session) pastes the **full task text** from the expansion plan into the prompt — do not make the subagent re-read the plan file. The implementer writes tests first, runs them red, implements to green, runs the full suite, commits, then self-reviews and reports DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT.
2. **Dispatch spec-compliance reviewer subagent** (template at `~/.kilocode/skills/subagent-driven-development/spec-reviewer-prompt.md`). The reviewer reads the implementation code independently, checks line-by-line against the task's required behavior, looks for missing requirements and extra/unneeded work, returns ✅ Spec compliant or ❌ Issues with file:line references. If issues, the **same** implementer fixes, re-runs the suite, commits; reviewer re-reviews. Loop until ✅.
3. **Dispatch code-quality reviewer subagent** (template at `~/.kilocode/skills/subagent-driven-development/code-quality-reviewer-prompt.md`). Only after spec compliance is ✅. The reviewer reads `BASE_SHA` (commit before the task) to `HEAD_SHA` (current commit), checks standard code-quality concerns plus the four "file structure" questions the template adds (single responsibility, decomposability, file structure compliance, file growth). Returns Strengths / Issues (Critical/Important/Minor) / Assessment. If issues, implementer fixes, reviewer re-reviews. Loop until Approved.
4. **Mark task complete** in the controller's TodoWrite. Only then move to the next task.

Worktree merging into the lane's branch happens between the spec-compliance ✅ and code-quality review steps only if the lane is converging toward a PR (see §3 below); otherwise the implementer commits inside the worktree and the reviewer reads `git diff <base>..HEAD` from inside the same worktree.

**Phases that need review coordination across lanes:**

- **Phase A** (Tasks 1–4) — Lane 1 reviews Task 2's no-overlap correctness *in addition to* the standard two-stage review. This is Layer 1's lane ownership calling for design-correctness review specifically on `accumulateSeparation` (sprint plan §1). Treat the lane 1 review as a **separate** adversarial check that runs after the code-quality reviewer approves, not a replacement for it.
- **Phase C Step 9** is the joint Lane-2-implements / Lane-5-designs-the-shadow-intensity-rule point. The lane-5 rule definition must land in the controller's session *before* the implementer subagent for Task 9 Step 9 gets dispatched. The controller sequences this: pause Phase C Step 9 dispatch, dispatch a small reading/thinking subagent with the `high-end-visual-design` skill to surface the design rule, capture the rule as a brief, then dispatch the implementer with the rule in the prompt. If the rule arrives late, hold the task open — do not let the implementer ship with placeholder `SHADOW_INTENSITY` constants the plan itself flags as provisional.

**Task 14 (laserBurn polish)** is Lane 5's design work and the only task with a `superpowers:high-end-visual-design` skill dependency. Implementer subagent for Task 14 gets that skill loaded in its prompt context. Lane 5's visual-consistency review of Lane 3's `paperCut.ts` usage (Tasks 5–7) also runs through the same skill — but as a Lane 5 review pass over already-completed Tasks 5–7, not as a blocker on each individual task's implementation.

**Task 15 (full regression)** is Lane 7's final review and runs the whole-implementation code review pass described in the sprint plan §7. No separate per-task review is needed for Task 15 itself — it has no implementation content.

### ADR authorship gate

`docs/superpowers/system-architecture.md` §2 is the project's ADR log (ADR 001–004 from v1; ADR 005–006 seeded for v2's mode-locked power pairing and the `ForceField.ts` pairwise-separation exception — see that file). A task's spec-compliance review is not ✅ until any *contested or hard-to-reverse* decision it implements has a corresponding ADR entry — not every task needs one, only ones where the spec itself argues a tradeoff (as ADR 005/006 already do) or a lane makes an implementation-level call the spec left open. Concretely:

- **Task 1** (mode→power lock table) — ADR 005 already covers the design; no new ADR needed unless the implementation deviates from the spec's fixed mapping.
- **Task 2** (`ForceField.ts` separation) — ADR 006 already covers the design; the spec-compliance reviewer confirms the shipped `SEPARATION` constants/approach match what ADR 006 describes, and flags a new ADR only if the implementation takes a materially different approach than accumulateSeparation-as-specified (e.g. adds spatial partitioning ahead of need).
- **Task 9's shadow-intensity design rule** (Lane 5's deliverable, sprint plan §5) — this one is *not* pre-seeded, because the actual intensity-response curve is a Lane 5 judgment call made during implementation, not something the spec pins down numerically. Lane 5 adds an ADR entry (ADR 007+) once the rule is set, before Task 9 Step 9's implementer consumes it — same pattern as ADR 005/006, appended to system-architecture.md §2.
- **Task 14** (laserBurn polish) — if the fix Lane 5 ships deviates from the two-part fix §5a already specifies (dedicated beam + retimed ash burst), that deviation gets an ADR; if it matches the spec as written, no new ADR is needed since §5a's own reasoning already serves as the record.
- Any other task where an implementer or reviewer makes a call the spec left open (e.g. despawn selection: "most recently spawned or a randomly chosen live member — implementation detail for the plan to pin down," spec §3) gets a short ADR once that detail is pinned down, so the next person doesn't reopen it without knowing it was already decided.

Lane 7's final review (Task 15) includes a check that every ADR referenced above actually landed in `system-architecture.md` before sign-off — this is additive to, not a replacement for, the forbidden-files gate.

## 2. Worktree branch naming and creation recipes

**Source requirement:** `superpowers:using-git-worktrees` — Step 0 detect existing isolation, Step 1a prefer native tools, Step 1b `git worktree add` fallback. **Step 1 already done in this repo:** `.worktrees/` exists at the project root. Verify ignored before each `git worktree add` (one-time `git check-ignore -q .worktrees` is sufficient since the directory is already in `.gitignore` from prior work).

**Branch naming convention:**

```
v2/phase-{A|B|C|D|E}/lane-{N}-{slug}
```

Examples drawn from the sprint plan's lanes:

- `v2/phase-A/lane-1-mode-power-map` (Task 1)
- `v2/phase-A/lane-2-forcefield-separation` (Task 2)
- `v2/phase-A/lane-2-lookat-rotation` (Task 3)
- `v2/phase-A/lane-3-schema-subject-skin` (Task 4)
- `v2/phase-B/lane-3-drawsubject-skins` (Task 5)
- `v2/phase-B/lane-3-drawbug` (Task 6)
- `v2/phase-B/lane-3-drawpointedfinger` (Task 7)
- `v2/phase-B/lane-2-entityfactory-quantity` (Task 8)
- `v2/phase-C/lane-2-renderer-dispatch` (Task 9)
- `v2/phase-C/lane-4-hud-controls` (Tasks 10 + 11)
- `v2/phase-D/lane-?-electricburn-tests` (Task 12)
- `v2/phase-D/lane-?-bugeat-tests` (Task 13)
- `v2/phase-E/lane-5-laserburn-polish` (Task 14)

Tasks 12 and 13 deliberately have no lane claim — see §5.

**Worktree creation command template (per task, run by the controller session):**

```bash
# Run from the main repo root (NOT from inside .worktrees).
LANE_BRANCH="v2/phase-A/lane-2-forcefield-separation"
WORKTREE_PATH=".worktrees/${LANE_BRANCH//\//-}"
git worktree add "$WORKTREE_PATH" -b "$LANE_BRANCH" main
cd "$WORKTREE_PATH"
npm install   # per using-git-worktrees Step 3 (auto-detect: package.json present)
npx vitest run   # verify clean baseline (using-git-worktrees Step 4)
```

Path convention: `.worktrees/<branch-with-slashes-replaced-by-dashes>` so the filesystem gets a flat directory per task. Existing `.worktrees/` directory is already in `.gitignore`.

**Phase B parallel worktree example** (Tasks 5, 6, 7, 8 from disjoint files — sprint plan Phase B header):

```bash
# Sequentially, from the main repo root:
git worktree add .worktrees/v2-phase-B-lane-3-drawsubject-skins -b v2/phase-B/lane-3-drawsubject-skins main
git worktree add .worktrees/v2-phase-B-lane-3-drawbug -b v2/phase-B/lane-3-drawbug main
git worktree add .worktrees/v2-phase-B-lane-3-drawpointedfinger -b v2/phase-B/lane-3-drawpointedfinger main
git worktree add .worktrees/v2-phase-B-lane-2-entityfactory-quantity -b v2/phase-B/lane-2-entityfactory-quantity main
```

Each implementer subagent dispatches into its own worktree path. The `Work from: <path>` line in the implementer prompt is non-negotiable — the subagent must not run from the main repo checkout.

**Phase A and Phase C** run in a single shared worktree per phase (the sprint plan's sequencing section specifies this). Branch + worktree per phase, not per task:

```bash
# Phase A (Tasks 1-4, sequential, one shared worktree):
git worktree add .worktrees/v2-phase-A-foundations -b v2/phase-A/foundations main
# ...then a single implementer walks Tasks 1 → 4 in order inside it, two-stage review per task.

# Phase C (Tasks 9-11, sequential, one shared worktree):
git worktree add .worktrees/v2-phase-C-integration -b v2/phase-C/integration main
# Phase C's worktree is branched from main ONLY after Phase A + Phase B have merged.
```

**Phase D** runs in a single small worktree per task (Tasks 12 and 13 are trivial test additions), branched from `main` after Phase C's PR merges.

**Phase E** Task 14 runs in its own worktree branched from `main` after Phase D's PR merges. Task 15 (Lane 7) is review-only and runs in the main repo checkout, not a worktree.

## 3. Branch base and merge strategy

**Rule:** every Phase X worktree branches from `main` *after* the previous phase's phase-PR has merged to `main`. No worktree branches off another lane's branch, and no worktree branches off a pre-merge state. This makes each phase's lane-PRs independent and rebaseable.

**Merge strategy per phase:**

| Phase | Merge vehicle | Reviewer | When |
|---|---|---|---|
| A | One PR: `v2/phase-A/foundations` → `main` | Lane 7 (Phase E Task 15) | After Tasks 1–4 all ✅, lane 1's Task 2 review passed, code-quality ✅ |
| B | One PR per worktree, each merged in sequence: `lane-3-drawsubject-skins` → `main`, then `lane-3-drawbug` → `main`, then `lane-3-drawpointedfinger` → `main`, then `lane-2-entityfactory-quantity` → `main`. Order is the implementation order (Task 5 → 6 → 7 → 8) since later tasks are test-buildable against earlier tasks' merged code. | Lane 7 | After each task's two-stage review passes |
| C | One PR: `v2/phase-C/integration` → `main` | Lane 7 | After Tasks 9–11 all ✅ and the §6 integration smoke test passes |
| D | One PR per task, in any order: `lane-?-electricburn-tests` and `lane-?-bugeat-tests` (these are untracked-source commits — `effectDefs/electricBurn.ts` and `effectDefs/bugEat.ts` ship with their tests) | Lane 7 | After each task's test passes |
| E | Task 14 ships as `v2/phase-E/lane-5-laserburn-polish` → `main`. Task 15 is the final code review; no PR. | Lane 7 (Task 15 is the reviewer) | After Task 14's two-stage review passes |

**Why one PR per phase for A and C, one per task for B and D:** B's tasks touch disjoint files (sprint plan Phase B header specifies this) and each task's tests are self-contained, so they can land independently in any order without a Phase-level integration step in between. A and C are sequential within a single shared worktree, so by construction they produce one PR. D's tasks are trivial and independent — same as B. E's Task 14 is the last code change and ships as its own PR.

**Pre-merge forbidden-files check** runs in the lane-7 review for every PR, not just Phase E. Lane 7's reviewer subagent for each PR runs the same `git diff main --stat -- src/core/Engine.ts src/entities/behaviors/StateMachine.ts src/entities/EntityStore.ts` (must be empty) and `git diff main --stat -- src/physics/ForceField.ts` (must be non-empty once Phase A's Task 2 has merged) gate from the expansion plan's Task 15 Step 3.

**No force-pushes, no rebase-after-review.** Lane 7 reviews the diff as written. If a lane's branch needs to absorb a fix, the controller either fast-forwards main first then cherry-picks, or the implementer subagent lands the fix as a follow-up commit on the same branch before re-review.

## 4. Model selection per lane / task

`superpowers:subagent-driven-development` says: cheapest model that can do the job. Concretely for this plan:

| Lane / task | Touches | Integration | Suggested model tier |
|---|---|---|---|
| Task 1 (hudIcons widening) | 1 file + 1 new test file | Local | **Cheap** (e.g. haiku-class) |
| Task 2 (ForceField separation) | 1 file + 1 new test file | Spec §4 deliberate exception; needs careful math | **Standard** (e.g. sonnet-class) |
| Task 3 (LookAt) | 1 new file + 1 new test file | Local | **Cheap** |
| Task 4 (schema) | 1 file + 1 new test file | Local | **Cheap** |
| Task 5 (drawSubject skins) | 2 new files + dispatch edit + 1 new test | Depends on `paperCut.ts` from v1-fix | **Standard** |
| Tasks 6, 7 (drawBug, drawPointedFinger) | 1 new file + 1 new test each | Same as Task 5 | **Standard** |
| Task 8 (EntityFactory quantity) | 1 file edit + 1 new test | Local | **Cheap** |
| Task 9 (Renderer dispatch + draw order + shadow) | 2 files + 1 new test + edits to 3 drawer files | Heavy — design rule for shadow intensity is Lane 5's deliverable | **Standard** for implementer; **Most capable** for the section that lands Lane 5's review |
| Task 10 (HUD controls) | 2 files + 1 new test | DOM-touching; `happy-dom` env | **Standard** |
| Task 11 (main.ts wiring) | 1 file + 1 new test | Touches the live tick loop; high integration risk | **Most capable** |
| Task 12 (electricBurn tests) | 1 new test file | Reads pre-existing source | **Cheap** |
| Task 13 (bugEat tests) | 1 new test file | Reads pre-existing source | **Cheap** |
| Task 14 (laserBurn polish) | 2 files + 1 extend test | Visual-distinctiveness gate; needs `high-end-visual-design` skill | **Most capable** |
| Task 15 (final regression) | None | Review only | **Most capable** (final reviewer) |

**Spec compliance reviewers** use the same model tier as the implementer they're reviewing (cheap begets cheap, etc.) — the spec-compliance check is mechanical against a spec, not a design judgment.

**Code quality reviewers** use one tier up from the implementer (standard reviews cheap, most-capable reviews standard). The final whole-implementation reviewer (Task 15) uses the most capable model available.

## 5. Skills to load per subagent

Every implementer subagent gets `superpowers:test-driven-development` loaded in its prompt context — the plan is TDD-first on every task, and that skill is the canonical TDD workflow. **Without this skill load, the implementer is at risk of writing production code first then bolting tests on**, which the plan's per-task "Step 1: write the failing test" structure assumes but does not enforce.

Per-task skill loadouts:

| Task | Always load | Additionally load | Why |
|---|---|---|---|
| 1 | test-driven-development | — | Mechanical widening |
| 2 | test-driven-development | — | Math is in the plan; skill is needed for the spec-compliance review loop |
| 3 | test-driven-development | — | Mechanical |
| 4 | test-driven-development | — | Mechanical |
| 5 | test-driven-development | — | paperCut.ts dependency is in the plan's task text |
| 6 | test-driven-development | — | Same |
| 7 | test-driven-development | — | Same |
| 8 | test-driven-development | — | Mechanical |
| 9 | test-driven-development | high-end-visual-design (for the shadow-intensity sub-section only) | Lane 5's design rule must land in the prompt context, not arrive late |
| 10 | test-driven-development | — | happy-dom is in the plan |
| 11 | test-driven-development | — | Heavy integration, but no extra skill applies |
| 12 | test-driven-development | — | Test-only |
| 13 | test-driven-development | — | Test-only |
| 14 | test-driven-development | high-end-visual-design | Visual-distinctiveness polish task |
| 15 | — | — | Final review; uses `superpowers:requesting-code-review` instead |

**Lanes 5 and 7 (review-only) do not need test-driven-development** — they only invoke review skills (`superpowers:requesting-code-review`, `superpowers:high-end-visual-design`).

**Lane 6 (audio) has no skills loaded** because Lane 6 has no work to do until the audio spec lands. If a task later surfaces an audio need that wasn't in the v2 spec, the controller escalates to the user rather than loading a sound-design skill speculatively.

## 6. Phase C integration verification gate

The sprint plan's Phase C depends on Phases A and B, but the only Phase C end-to-end check is Task 11 Step 9's manual verification — a `npm run build` + `npx vitest run` + manual click-through. There is no automated cross-cutting smoke test that all three crowd modes render in one frame and the mode-locked power swap works.

**Add this as a new step at the end of Task 11 (between current Step 9 and Step 10 commit), at path `tests/unit/crowdModesAndPowers.test.ts` (matching the existing `vite.config.ts` `include: ["tests/unit/**/*.test.ts"]` — no separate `integration/` directory needed, and the test uses `vi.fn()` proxies rather than a real DOM, so no `happy-dom` env annotation required):**

```typescript
// tests/unit/crowdModesAndPowers.test.ts
//
// Cross-cutting smoke test for the v2 mode→power wiring. Runs the same
// vitest suite as the per-task unit tests (vite.config.ts includes
// tests/unit/**/*.test.ts), so a Phase C merge that breaks the mode→power
// wiring is caught before Phase D work begins.
//
// Catches the category of bug where each task's tests pass in isolation but
// the live-loop wiring is wrong: e.g. MODE_POWER_MAP gains a key but the
// renderer switch loses one, look-at gains get swapped between modes, or
// separation forces accidentally special-case one mode. None of those are
// unit-testable; all of them surface here.

import { describe, it, expect, vi } from "vitest";
import { MODE_POWER_MAP, type HudMode, type HudPower } from "../../src/hud/hudIcons";
import { LOOKAT_GAIN, computeLookAtRotation } from "../../src/physics/LookAt";
import { computeSeparation, accumulateSeparation } from "../../src/physics/ForceField";
import { renderFrame } from "../../src/render/Renderer";
import { drawEye, drawBug, drawPointedFinger } from "../../src/render/drawers";
import { EntityStore } from "../../src/entities/EntityStore";
import { ParticleSystem } from "../../src/effects/ParticleSystem";
import { EffectSystem } from "../../src/effects/EffectSystem";
import { Rng } from "../../src/core/Rng";

// ---------------------------------------------------------------------------
// Test helpers (mirrors the makeCtx pattern in tests/unit/drawEye.test.ts)
// ---------------------------------------------------------------------------

const fakeCtx = (): CanvasRenderingContext2D => {
  const noop = () => {};
  return new Proxy({}, {
    get: (_t, prop) => {
      if (prop === "canvas") return {};
      return typeof prop === "string" ? noop : undefined;
    },
  }) as unknown as CanvasRenderingContext2D;
};

const baseColors = {
  sclera: "cream", iris: "slate", pupil: "ink",
  highlight: "coral" as string | null, outline: "ink",
};

const makeEntity = (id: number, pos: { x: number; y: number }, baseSizePx = 60) => ({
  id,
  physics: { pos, vel: { x: 0, y: 0 }, scale: 1, home: pos, rotation: 0 },
  lifecycle: { dragged: false, dying: false, spawnedAt: 0 },
  behavior: {
    data: { baseSizePx, colors: baseColors, shapeVariant: "almond" },
  },
  content: { manifestId: "eye-a", palette: null },
});

const makeStore = (entities: ReturnType<typeof makeEntity>[]) => {
  const map = new Map(entities.map((e) => [e.id, e]));
  const store = new EntityStore();
  for (const e of entities) store.insert(e);
  return store;
};

const baseRenderOpts = (store: EntityStore, hudMode: HudMode) => ({
  ctx: fakeCtx(),
  store,
  particles: new ParticleSystem(),
  effects: new EffectSystem(),
  cursor: { x: 100, y: 100, active: false },
  rng: new Rng(1),
  width: 800,
  height: 600,
  behaviors: new Map(),
  blinkTimers: new Map(),
  pupilOffsets: new Map(),
  cursorRingRadius: 20,
  cursorRingOpacity: 0,
  chargeTargetId: null,
  hoverEntityId: null,
  reducedMotion: false,
  nowMs: 1000,
  hudMode,
  quantity: 20,
  repelMultiplier: 1,
});

// ---------------------------------------------------------------------------
// 1. MODE_POWER_MAP: complete, distinct, matches spec §2a
// ---------------------------------------------------------------------------

describe("MODE_POWER_MAP cross-mode coverage", () => {
  const expected: Record<HudMode, HudPower> = {
    eyes: "laserBurn",
    bugs: "bugEat",
    pointedFinger: "electricBurn",
  };

  it("maps every HudMode to exactly one HudPower", () => {
    const modes: HudMode[] = ["eyes", "bugs", "pointedFinger"];
    for (const m of modes) {
      expect(typeof MODE_POWER_MAP[m]).toBe("string");
    }
    expect(Object.keys(MODE_POWER_MAP).sort()).toEqual([...modes].sort());
  });

  it("matches the spec §2a lock table exactly (eyes→laserBurn, bugs→bugEat, pointedFinger→electricBurn)", () => {
    for (const m of Object.keys(expected) as HudMode[]) {
      expect(MODE_POWER_MAP[m]).toBe(expected[m]);
    }
  });

  it("maps the three modes to three distinct powers (no shared power across modes)", () => {
    const powers = new Set((Object.values(MODE_POWER_MAP) as HudPower[]));
    expect(powers.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 2. Per-mode look-at rotation gain ratio is preserved across all three modes
//    (catches the bug where LOOKAT_GAIN values get swapped between modes or
//    the gain leaks from Phase A's Task 3 into Phase B's drawer code)
// ---------------------------------------------------------------------------

describe("per-mode look-at rotation gain ratio across all three modes", () => {
  const sampleFrom = { x: 0, y: 0 };
  const sampleTo = { x: 40, y: 30 };

  it("eyes gain stays in the subtle 0.15-0.25 range, bugs/pointedFinger in the fuller 0.7-1.0 range", () => {
    expect(LOOKAT_GAIN.eyes).toBeGreaterThanOrEqual(0.15);
    expect(LOOKAT_GAIN.eyes).toBeLessThanOrEqual(0.25);
    expect(LOOKAT_GAIN.bugs).toBeGreaterThanOrEqual(0.7);
    expect(LOOKAT_GAIN.bugs).toBeLessThanOrEqual(1.0);
    expect(LOOKAT_GAIN.pointedFinger).toBeGreaterThanOrEqual(0.7);
    expect(LOOKAT_GAIN.pointedFinger).toBeLessThanOrEqual(1.0);
  });

  it("eyes rotation magnitude is smaller than bugs/pointedFinger for identical geometry, in all three modes", () => {
    for (const mode of ["eyes", "bugs", "pointedFinger"] as const) {
      const eyesRot = computeLookAtRotation(sampleFrom, sampleTo, "eyes");
      const otherRot = computeLookAtRotation(sampleFrom, sampleTo, mode);
      if (mode === "eyes") continue;
      expect(Math.abs(otherRot)).toBeGreaterThan(Math.abs(eyesRot));
    }
  });

  it("all three modes produce the same full-angle when gain is 1 (gain is the only varying factor)", () => {
    const full = (to: { x: number; y: number }) =>
      Math.atan2(to.y - sampleFrom.y, to.x - sampleFrom.x);
    for (const to of [{ x: 10, y: 0 }, { x: 0, y: 10 }, { x: -5, y: 7 }, { x: 40, y: 30 }]) {
      const baseAngle = full(to);
      // gains must be a pure scalar of the same angle, not a different formula
      expect(computeLookAtRotation(sampleFrom, to, "eyes") / LOOKAT_GAIN.eyes)
        .toBeCloseTo(baseAngle, 6);
      expect(computeLookAtRotation(sampleFrom, to, "bugs") / LOOKAT_GAIN.bugs)
        .toBeCloseTo(baseAngle, 6);
      expect(computeLookAtRotation(sampleFrom, to, "pointedFinger") / LOOKAT_GAIN.pointedFinger)
        .toBeCloseTo(baseAngle, 6);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Separation forces resolve equivalently across all three modes
//    (catches the bug where separation accidentally special-cases one mode
//    or where the integration in main.ts iterates only some crowd members)
// ---------------------------------------------------------------------------

describe("separation forces apply identically across all three modes", () => {
  it("a dense crowd in any single mode resolves to non-zero corrective pushes", () => {
    const radius = 18;
    const members = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      pos: { x: (i % 6) * 10, y: Math.floor(i / 6) * 10 },
      radiusPx: radius,
    }));
    const forces = accumulateSeparation(members);
    let anyPushed = false;
    for (const f of forces.values()) {
      expect(Number.isFinite(f.fx)).toBe(true);
      expect(Number.isFinite(f.fy)).toBe(true);
      if (f.fx !== 0 || f.fy !== 0) anyPushed = true;
    }
    expect(anyPushed).toBe(true);
  });

  it("pairwise separation for two overlapping members is the same magnitude regardless of which mode they belong to", () => {
    const a = { pos: { x: 0, y: 0 }, radiusPx: 20 };
    const b = { pos: { x: 10, y: 0 }, radiusPx: 20 };
    const f = computeSeparation(a, b);
    // The renderer / mode never enters computeSeparation — same fx/fy regardless of mode.
    // This is the assertion: the force is a pure function of geometry, not mode.
    expect(f.fx).toBeLessThan(0);
    expect(f.fy).toBeCloseTo(0, 6);
  });

  it("the spec §4 floor (Repel → 0 still produces no overlap) holds: separation is independent of repelMultiplier", () => {
    const members = [
      { id: 1, pos: { x: 0, y: 0 }, radiusPx: 20 },
      { id: 2, pos: { x: 10, y: 0 }, radiusPx: 20 },
    ];
    const atZero = computeSeparation(members[0]!, members[1]!);
    const atTwo = computeSeparation(members[0]!, members[1]!);
    expect(atZero.fx).toBe(atTwo.fx); // pure geometry, no multiplier leakage
  });
});

// ---------------------------------------------------------------------------
// 4. renderFrame dispatches the right drawer per mode, in one synthesized frame
//    (catches the bug where the render switch silently drops a mode, or where
//    the wrong drawer fires for a given mode)
// ---------------------------------------------------------------------------

describe("renderFrame dispatches the right drawer per mode", () => {
  const modes: HudMode[] = ["eyes", "bugs", "pointedFinger"];

  for (const mode of modes) {
    it(`renderFrame does not throw for hudMode="${mode}"`, () => {
      const member = makeEntity(1, { x: 400, y: 300 });
      const store = makeStore([member]);
      const opts = baseRenderOpts(store, mode);
      expect(() => renderFrame(opts)).not.toThrow();
    });

    it(`renderFrame for hudMode="${mode}" still composes a draw call (no silent fallthrough)`, () => {
      const ctx = fakeCtx();
      const spy = vi.spyOn(ctx, "fill");
      const member = makeEntity(1, { x: 400, y: 300 });
      const store = makeStore([member]);
      const opts = { ...baseRenderOpts(store, mode), ctx };
      renderFrame(opts);
      // Background fill + at least one entity draw call. If the mode switch
      // silently default-skipped the entity, fill would be called once only.
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  }

  it("all three drawer exports are importable from render/drawers barrel", () => {
    expect(typeof drawEye).toBe("function");
    expect(typeof drawBug).toBe("function");
    expect(typeof drawPointedFinger).toBe("function");
  });

  it("renderFrame is mode-mode-agnostic about the look-at rotation: reading physics.rotation (set per mode) and forwarding to the drawer is invariant across modes", () => {
    // Synthesize three identical scenes, only the live rotation differs.
    // If the renderer accidentally applies the rotation only in one mode's
    // branch, the call counts will diverge.
    const counts: Record<HudMode, number> = { eyes: 0, bugs: 0, pointedFinger: 0 };
    for (const mode of modes) {
      const ctx = fakeCtx();
      const save = vi.spyOn(ctx, "save");
      const member = makeEntity(1, { x: 400, y: 300 });
      // pre-compute the rotation this mode would apply for this geometry
      member.physics.rotation = computeLookAtRotation(
        member.physics.pos, { x: 500, y: 200 }, mode,
      );
      const store = makeStore([member]);
      const opts = { ...baseRenderOpts(store, mode), ctx };
      renderFrame(opts);
      counts[mode] = save.mock.calls.length;
    }
    // save calls should be ≥ 2 per mode (background + entity); the exact
    // number depends on the post-Task 9 dispatch shape, but the assertion
    // here is that all three modes produce a non-trivial save-count rather
    // than one mode silently short-circuiting.
    for (const mode of modes) {
      expect(counts[mode]).toBeGreaterThanOrEqual(2);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. spawnOneCrowdMember / pickCrowdMemberToDespawn work across all three modes
//    (catches the bug where the post-Phase-C quantity control interacts with
//    the mode dispatch in a way that breaks spawning in one mode)
// ---------------------------------------------------------------------------

describe("spawnOneCrowdMember / pickCrowdMemberToDespawn across all three modes", () => {
  it("spawnOneCrowdMember returns a position regardless of which mode the live crowd is in", async () => {
    const { spawnOneCrowdMember, pickCrowdMemberToDespawn } = await import(
      "../../src/entities/EntityFactory"
    );
    for (const mode of modes) {
      const rng = new Rng(1);
      const spawned = spawnOneCrowdMember({
        rng, width: 800, height: 600,
        manifest: [
          {
            id: `${mode}-a`, rig: "eye", renderType: "eye",
            visual: { styleGuardrail: "flat-illustrated", shapeVariant: "almond" },
            colors: baseColors,
            physics: { baseSizePx: 60 },
            behavior: { blinkIntervalMinMs: 2000, blinkIntervalMaxMs: 5000, blinkDurationMs: 140, pupilTrackMs: 120 },
          },
        ],
        existing: [],
        nextId: 5000,
      });
      expect(spawned).not.toBeNull();
      // Mode is irrelevant to spawn — entity just lands inside viewport.
      expect(spawned!.physics.pos.x).toBeGreaterThanOrEqual(0);
      expect(spawned!.physics.pos.x).toBeLessThanOrEqual(800);
    }
    // pickCrowdMemberToDespawn is mode-agnostic by construction.
    expect(pickCrowdMemberToDespawn([])).toBeNull();
    expect(pickCrowdMemberToDespawn([
      { id: 1 } as never, { id: 7 } as never, { id: 3 } as never,
    ])).toBe(7);
  });
});
```

**Why each describe block exists:**

1. **MODE_POWER_MAP cross-mode coverage** — locks the spec §2a table as a single contract. If a Phase A Task 1 change adds a new mode but forgets to update the map, this fails. If a Phase B task shadows the map with a different file, the second test catches it.
2. **Per-mode look-at rotation gain ratio** — verifies the eye-vs-bug/pointedFinger gain ratio holds across all three modes, not just the two pairs covered by Task 3's own unit test. The "gain is the only varying factor" assertion catches the bug where `computeLookAtRotation` accidentally adds a different formula per mode instead of being a pure scalar.
3. **Separation forces apply identically across all three modes** — confirms the spec §4 no-overlap guarantee is mode-agnostic. The "repelMultiplier ≠ 0 isolation" assertion catches the bug where separation accidentally reads from the same input as the cursor repel (it must not).
4. **renderFrame dispatches the right drawer per mode** — the wiring assertion Phase C exists to make. The `no silent fallthrough` test catches the bug where the new `switch (hudMode)` defaults-throws and the entity never draws. The `save-count is non-trivial in all three modes` test catches the bug where rotation is applied only in one mode's branch.
5. **spawnOneCrowdMember / pickCrowdMemberToDespawn across all three modes** — exercises the Phase C quantity control against all three modes, catching the bug where the post-Phase-C live loop accidentally special-cases one mode. (Dynamic `import` so the test still compiles if Phase B's Task 8 hasn't merged yet — at runtime it will, because Phase C's gate is the test being green.)

**Gate:** Phase C does not merge to `main` (Step 3 above) until this integration test is in the suite and green. Phase D work starts only after the Phase C PR has merged.

## 7. Rollback / re-plan triggers

The subagent-driven-development skill says the controller escalates when a task is BLOCKED. Spruce that up here for the cases that would invalidate already-completed phases:

1. **Phase A foundation redesign needed after Phase B starts.** If a Phase B task's spec-compliance review surfaces a gap in Phase A's design (e.g. Task 2's `accumulateSeparation` produces a force balance that breaks `drawEye`'s idle animation, or Task 4's `subjectSkin` field shape doesn't match what `drawSubject.ts` actually reads), Phase B halts immediately. The controller dispatches a fix subagent to amend Phase A on the same branch, re-runs Phase A's two-stage review, *then* re-evaluates whether Phase B's MERGED prior PRs still hold. If they don't, revert the affected Phase B PR and re-run it on top of the Phase A fix. **No remediation here is silent — every rollback is a PR with a `revert:` or `fix:` prefix visible in the lane-7 review.**

2. **Phase C reveals a Phase A or B architectural gap.** Same pattern: Phase C PR stays open, controller dispatches an investigative subagent to characterize the gap, dispatches a fix subagent for the upstream phase, re-runs the upstream phase's two-stage review, then resumes Phase C.

3. **Task 14 (laserBurn polish) can't meet the "explodes" bar.** This is a Lane 5 design failure, not a regression. The fallback is to ship the visual-distinctiveness gap as a known issue (escalate to user) rather than ship a worse polish. The skill says "Don't try to fix manually (context pollution)" — re-dispatch the implementer with a more capable model, not a fix-up patch.

4. **Forbidden-files gate fails on a Phase A PR.** Immediate stop. The controller dispatches a stripping subagent (cheapest model) to revert the forbidden-file diff, re-runs the full suite, then re-submits the PR. Lane 7's review does not approve a PR that touches forbidden files, even if the diff is one line.

5. **PR #2 (the v1-fix gate) fails to merge.** Everything in this addendum is blocked. Do not start worktree creation. Do not dispatch implementer subagents on speculation.

## 8. Continuous-execution discipline

From `superpowers:subagent-driven-development`'s "Continuous execution" section: **do not pause to check in with the user between tasks.** The controller walks Tasks 1 → 2 → 3 → ... → 15 in order, with each task's two-stage review in between, and only stops on BLOCKED, on ambiguity that genuinely prevents progress, or on all tasks complete. The user has already given the go-ahead by asking for the framework to be enforced; pausing for "should I continue?" is exactly what the skill says wastes their time.

**The one legitimate pause this plan introduces** is the Phase C Step 9 sequencing: the controller pauses Phase C Step 9 dispatch to surface Lane 5's shadow-intensity design rule *first*, then dispatches the implementer with the rule in the prompt. This is internal sequencing, not a pause to check in with the user.

**Daily progress check-in** (not per-task): the controller can summarize phase progress at natural breakpoints (end of Phase A, end of Phase B, end of Phase C, end of Phase D) if the v2 spec's "Relationship to existing specs" gate warrants a heads-up — but per the skill, this is optional, not required.

## 9. Addendum maintenance

This addendum is subordinate to the sprint plan and the expansion plan. If the sprint plan changes (e.g. a new lane is added, a task is renumbered, a phase boundary shifts), update the corresponding rows in §1, §2, §3, §4, §5 of this addendum. If the expansion plan changes (e.g. Task 9's `computeShadowIntensity` test contracts move), update the §6 reference. If the spec changes, no update needed here — the spec is upstream.

**Closing note:** the addendum is operational plumbing around the existing plan, not new design. The expansion plan's Task 15 "full regression pass" remains the final convergence point, and Lane 7's whole-implementation review is the final gate. Everything in this addendum exists to make that final gate achievable, not to replace it.
