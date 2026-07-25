# Fun Satire v2 — Sprint Execution Plan (worktree-based, subagent-driven lanes)

This document organizes the 15 tasks in `docs/superpowers/plans/2026-07-25-fun-satire-v2-expansion.md` into specialist **lanes** for worktree-based, subagent-driven parallel execution, per the `superpowers:subagent-driven-development` and `superpowers:using-git-worktrees` conventions. It is a sprint-execution overlay only — it does not repeat, restate, or replace the task-level implementation detail (test code, production code, commit messages) that already lives in the expansion plan. Each lane section below cross-references task numbers in that plan; go there for the actual steps.

**Operational detail lives in a separate addendum.** `docs/superpowers/plans/2026-07-25-fun-satire-v2-subagent-orchestration.md` covers everything this document doesn't: the per-task two-stage review protocol (implementer → spec-compliance reviewer → code-quality reviewer, every task), worktree branch naming (`v2/phase-{X}/lane-{N}-{slug}`) and creation recipes, branch-base/merge strategy per phase (one PR per phase for the single-shared-worktree Phases A and C; one PR per task for the parallel-worktree Phases B and D; one PR for Task 14 in Phase E), model-tier selection per task, skills-to-load per subagent, the Phase C cross-cutting integration test, and rollback/re-plan triggers if a later phase reveals an earlier phase's merged work was wrong. Read it alongside this document before dispatching any subagent.

> **Blocked from starting.** The whole v2 sprint — every lane below — cannot begin until PR #2 (`https://github.com/abhisxn/fun-satire/pull/2`, "Add merged eyes design dummy prototype") merges to `main`. See the v2 spec's own "Relationship to existing specs" section (`docs/superpowers/specs/2026-07-25-fun-satire-v2-expansion-design.md`) for why — this document does not restate that reasoning, only the gate itself.

## Lane summary

| Lane | Owns | Maps to tasks | Phase |
|---|---|---|---|
| 1. Game design logic | Mode-locked power pairing design; reviews Task 2's no-overlap correctness | Task 1 | A |
| 2. Interactions & math | Physics/force-field/look-at math; crowd factory; draw-order sort + shadow-intensity plumbing | Tasks 2, 3, 8, 9 (sub-steps 7-9) | A, B, C |
| 3. Assets building | New drawers, all routed through shared `paperCut.ts` | Tasks 4, 5, 6, 7 | A, B |
| 4. UI controls | HUD controls + `main.ts` wiring | Tasks 10, 11 | C |
| 5. Exceptional visual design | Visual-consistency review, shadow-intensity design rule, laserBurn polish | Task 9 (design rule for sub-step 8), Task 14, cross-lane review of Lane 3's `paperCut.ts` usage | C, E |
| 6. Audio/effects engineering | Blocked — no task list yet | None (blocked) | — |
| 7. Overall experience & code review | Final regression + whole-implementation review | Task 15, plus final review pass | E (runs after all others) |

## 1. Game design logic

**Owns:** Task 1 — `hudIcons.ts` widening (`HudMode`/`HudSkin`/`HudPower` unions) and the `MODE_POWER_MAP: Record<HudMode, HudPower>` lock table (eyes→laserBurn, pointedFinger→electricBurn, bugs→bugEat), which is the concrete implementation of spec §2a's mode-locked power pairing.

This lane does not implement physics. It also reviews Task 2's no-overlap correctness (spec §4) — specifically, that `computeSeparation`/`accumulateSeparation` in `ForceField.ts` produce the *design-intended* behavior (crowd members repel each other without overlapping, without breaking the existing flee/attract force balance) rather than just checking the code compiles and its unit tests pass. This is a design-correctness review, not a re-implementation; Lane 2 owns the actual `ForceField.ts` code.

**Phase:** A. Runs in the single shared Phase A worktree alongside Lanes 2 and 3.

## 2. Interactions & math

**Owns:** Task 2 (`ForceField.ts` — `repelMultiplier` param, `computeSeparation`/`accumulateSeparation`, `SEPARATION` export — the one deliberate exception to the never-touch-`ForceField.ts` rule, per spec §4 and the v1-fix spec's registry-extension discipline), Task 3 (`src/physics/LookAt.ts` — `computeLookAtAngle`/`computeLookAtRotation`/`LOOKAT_GAIN`), Task 8 (`EntityFactory.ts` — `spawnOneCrowdMember`/`pickCrowdMemberToDespawn`).

Also owns two sub-steps added to Task 9 (see the expansion plan's Task 9 Steps 7-9, inserted ahead of the former Steps 7-9 which are now 10-12):

- **(a) Draw-order sort** — `computeCrowdDrawOrder`, a stable painter's-algorithm sort of crowd members by ascending `pos.y`, applied immediately before the render loop iterates crowd members. Pure function of existing position state; no new physics system.
- **(b) Shadow-intensity/depth value** — `computeShadowIntensity`, deriving a single per-frame number from current `quantity` + `repelMultiplier` state, consumed by `paperCut.ts`'s `withPaperCutShadow` (which gains an optional third `intensity` parameter) via each drawer's new `shadowIntensity` input field.

For (b), this lane computes and exposes the live numeric input only — the *design rule* for how strongly shadow depth should respond to quantity/repel changes is owned by Lane 5 (Exceptional visual design). The expansion plan's Task 9 Step 9 ships initial plumbing constants (`SHADOW_INTENSITY`) explicitly flagged as provisional, pending Lane 5's rule. See "Sequencing" below for how these two lanes order relative to each other within Phase C.

**Phase:** A (Tasks 2-3), B (Task 8), C (Task 9 sub-steps 7-9, jointly with Lane 5).

## 3. Assets building

**Owns:** Task 4 (`schema.ts` — `SubjectSkin` type, `subjectSkin` field on `ManifestEntry`), Task 5 (`drawSubjectFigure.ts`, `drawSubjectLotus.ts`, `drawSubject.ts` dispatcher), Task 6 (`drawBug.ts`), Task 7 (`drawPointedFinger.ts`).

**Hard constraint:** all three new drawers (Tasks 5, 6, 7) MUST call the shared `src/render/paperCut.ts` utility (`paperCutEdgePath` for edge wobble, `withPaperCutShadow` for offset shadow) — the same treatment `drawEye.ts`/`drawSubject.ts` use per the v1-fix plan's Task 29. No bespoke per-drawer shadow or edge-wobble implementation is permitted. This is a direct design-system-consistency requirement: every asset in the game must look and feel like it belongs to one visual system, not a collection of independently-styled sprites. The expansion plan now enforces this concretely — each of Tasks 5, 6, 7 carries a `describe("paperCut.ts consistency ...")` test asserting the shared shadow color (`"rgba(42, 36, 32, 0.22)"`) is applied during the draw call, which a bespoke implementation would not produce.

**Phase:** A (Task 4's schema field, needed by Task 5), B (Tasks 5-7). Task 4 must land before Tasks 5-7 start since `drawSubject.ts`'s dispatcher takes a `SubjectSkin`. Within Phase B, this lane may run Tasks 5-7 in one worktree sequentially, or as three small worktrees in parallel — an implementation choice, not a hard requirement, since Tasks 5-7 touch disjoint files.

## 4. UI controls

**Owns:** Task 10 (`Hud.ts`/`hud.css` — skin/mode selectors, quantity stepper, repel track control), Task 11 (`main.ts` wiring — removes `switchPower()`/keyboard listener, wires `hud.onModeChange`/`onSkinChange`/`onQuantityChange`/`onRepelChange`, applies `repelMultiplier` + no-overlap separation + look-at rotation in `engine.onTick("pre-physics", ...)`, computed once per tick).

**Phase:** C. Sequential — depends on all of Phase A and Phase B, and specifically on Task 9's dispatch wiring landing first (Task 11 writes `physics.rotation`, which Task 9 already knows how to read and apply per-drawer).

## 5. Exceptional visual design

Invoked via the `/high-end-visual-design` skill as a rigor reference, not a license to deviate — every deliverable in this lane stays inside the locked Paper-Cut Protest palette (cream `#EDE7DD`, slate `#5B7A8C`, sage `#6D7A5E`, ink `#2A2420`, coral `#E8A9A0`) and the Fraunces + Space Mono typography, both locked by the umbrella spec.

**Owns:**

- Task 14 — `laserBurn` beam/glow render polish (spec §5a's visual-distinctiveness gap: `laserBurn` currently fails the "the subject explodes" damage-signature bar because no beam is drawn and the ash burst fires after the entity is already invisible; `bugEat`/`electricBurn` already meet their respective bars).
- Visual-consistency review of Lane 3's `paperCut.ts` usage across all three new drawers (Tasks 5-7) — confirming the shared-utility constraint is met not just mechanically (the test assertion) but visually (edge wobble amplitude, shadow offset, and seed choice read as part of the same design system as `drawEye.ts`, not merely "technically calling the same function").
- Defining the shadow-depth-intensity **design rule** that Lane 2's Task 9 sub-step (b) consumes as its numeric input — i.e., deciding how strongly shadow offset/blur should actually move per unit of quantity/repel change, and reviewing/retuning the provisional `SHADOW_INTENSITY` constants Lane 2 ships as plumbing.

**Phase:** C (the design-rule definition, sequenced ahead of Lane 2's Task 9 implementation — see "Sequencing"), E (Task 14).

## 6. Audio/effects engineering

**Blocked pending `docs/superpowers/specs/<date>-fun-satire-audio-design.md` (not yet written).** No implementation task exists in the expansion plan for audio — this lane has no task list to execute yet. The following scope-inputs are noted here to seed that future spec:

- Damage-signature audio cues to match each mode/power pair's visual bar (spec §5a): a distinct sound for "the subject explodes" (eyes/laserBurn), "the subject burns" (pointedFinger/electricBurn), "the subject is eaten away" (bugs/bugEat).
- Ambient/idle audio layer for the crowd modes (scuttle-jitter for bugs, point-and-shake for pointedFinger) — whether idle animation should carry a subtle audio loop or stay silent.
- HUD interaction feedback (mode/skin cycling, quantity stepper, repel track) — click/tick sounds, if any, consistent with the Paper-Cut Protest identity (tactile, hand-cut, non-digital-feeling).
- Charge/respawn lifecycle audio (from the v1-fix Subject spec) — whether v2's new crowd modes/skins change or extend that cycle's audio needs.
- Volume/mute control placement within the existing HUD layout, and any reduced-motion-equivalent "reduced audio" accessibility posture.

## 7. Overall experience & code review

Cross-cutting, **not** worktree-isolated. Runs after all other lanes complete — not in parallel with them.

**Owns:** Task 15 (full regression pass: `npx vitest run`, `npx tsc --noEmit && npm run build`, forbidden-files gate confirming `Engine.ts`/`StateMachine.ts`/`EntityStore.ts` are untouched and `ForceField.ts` is touched), plus a final whole-implementation code review pass mirroring the pattern used on PR #2 (`https://github.com/abhisxn/fun-satire/pull/2`, "Add merged eyes design dummy prototype"): subagent-driven-development execution + spec-compliance/code-quality review per task, followed by a final whole-implementation review ending in a "Ready to merge" verdict.

**Phase:** E, last.

## Sequencing

- **Phase A (sequential, one shared worktree).** Tasks 1-4. Lane 1 (Task 1), Lane 2 (Tasks 2-3), Lane 3 (Task 4's schema field). Must fully complete and merge before Phase B starts — Tasks 5-8 in Phase B depend on Task 4's `subjectSkin` field, Task 1's widened `HudMode`, and (for Task 8's separation-aware spawn logic reviewed by Lane 1) Task 2's `ForceField.ts` changes.
- **Phase B (parallelizable, real worktree parallelism).** Tasks 5-8. Lane 3 owns Tasks 5-7 — one worktree run sequentially, or three small worktrees, is an implementation choice. Lane 2 owns Task 8. These can run in parallel worktrees since Tasks 5-8 touch disjoint files (per the expansion plan's own Phase B header).
- **Phase C (sequential, one shared worktree).** Tasks 9-11. Task 9 is joint Lane 2 (implements the draw-order sort and shadow-intensity computation, Steps 7-9) + Lane 5 (defines the shadow-intensity design rule, and confirms the rotation-transform visual correctness of Task 9 Step 6's eyes-case wrapper). Sequence Lane 5's rule definition before Lane 2 implements the consuming code in Task 9 Step 9 — in practice this means Lane 5 reviews/sets the `SHADOW_INTENSITY` constants before that step's commit, not after. Tasks 10-11 are Lane 4, and depend on Task 9's dispatch wiring landing first.
- **Phase D.** Tasks 12-13 (electricBurn/bugEat test coverage — both already-implemented, tests only). Explicitly unowned by design among the 7 lanes; assign to whichever lane/subagent is free when Phase D starts, or treat as Lane 7's general coverage responsibility. Stated explicitly here since no lane above claims Tasks 12-13.
- **Phase E.** Task 14 = Lane 5. Task 15 = Lane 7, runs last, strictly after every other lane's work has merged.

## Closing note

Lane 6 (audio/effects engineering) is the only lane without a task list in this sprint plan. It stays blocked until `docs/superpowers/specs/<date>-fun-satire-audio-design.md` is written; once that spec exists, this document should be updated with Lane 6's actual task numbers from whatever plan implements it, following the same lane format as Lanes 1-5 and 7 above.
