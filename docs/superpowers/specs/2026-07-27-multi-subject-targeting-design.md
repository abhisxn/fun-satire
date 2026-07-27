# Fun Satire — Multi-Subject Targeting (PR2) — Design Spec

Status: ready for implementation planning. Extends `docs/superpowers/specs/2026-07-27-premium-visual-collective-attack-design.md` (PR1), which shipped the typed `EffectVisual` schema, avatar pipeline, text formatting, HUD chrome, and audio layering — all on top of the still-singleton Subject entity. PR2 iterates that singleton into a collection.

## Design references

Figma file (`Untitled`, `oPAdd7oWLQVMTP1v6pJOW0`), nodes to review at PR2 kickoff:
- [Page 1](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=0-1)
- [Frame 18:113](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=18-113) — control-bar layout (ATTACK CTA wiring changes in §5)
- [Frame 44:287](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=44-287) — avatar sticker-sheet gallery (multi-card drop targets)

Pinterest mood board: `in.pinterest.com/abhisxn/attacks` (11 pins) — no new pins needed; PR2 is structural, not visual. Existing attack VFX from PR1's `109:3669` reference apply per-subject without modification.

## Context

PR1 shipped the premium visual overhaul on a singleton Subject: one entity, one skin, one target for all attacks, one gaze fan, one respawn timer. The engine layers below (`PowerController`, `EffectSystem`, `EntityStore`, drawers, `SubjectSkin` as a value type) are already identity-agnostic — `PowerController.tryPress(targetId, ...)` takes any entity ID, `EffectSystem.start(defId, entityId, ...)` is ID-based, drawers are pure per-call functions, and `SubjectSkin` discriminates by kind without assuming a single instance.

The singleton lives entirely in the wiring: `main.ts`'s module-level `subjectId`/`activeSubjectSkin`/`subjectRespawnAtMs`/`subjectSpawnedAtMs`/`subjectPressOrigin`, `SubjectDragSource`'s swap-only drop (no coordinates), `SubjectBehavior.homeFor`'s cursor-follow assumption, `Renderer`'s singular `subject` slot + single gaze fan, and the HUD's formatting callbacks that mutate "the" skin without a subject identity.

**What PR2 changes:** the singleton becomes a collection. Subjects are spawned via drag-to-place (replacing swap), locked via tap, and targeted via `lockedSubjectId`. Look-at distributes across subjects. Renderer accepts a subjects array. HUD formatting binds to the locked subject. Respawn becomes per-subject.

**What PR2 does NOT change:** crowd modes, mode-locked power pairing, quantity/repel mechanics, the no-overlap rule, `PowerController`'s target-id parameterization (already PR2-ready), `EffectSystem`'s concurrent-effects support, `EntityStore`'s generic API, drawer purity, or `SubjectSkin`'s value-type shape. Closed-file touch remains: `ForceField.ts`, `Engine.ts`, `StateMachine.ts`, `EntityStore.ts` are untouched.

**PR1 features preserved:** avatar pipeline, text formatting (font/align/size), ATTACK CTA (now wired to `lockedSubjectId`), collective-effect renderer (per-subject targeting), ambient audio bed, randomized crowd sizing.

## 1. Multi-subject model

Replace `main.ts`'s singleton state with a collection:

```ts
type SubjectRecord = {
  id: EntityId;
  skin: SubjectSkin;
  spawnedAtMs: number;
  locked: boolean;
};

let subjects: Map<EntityId, SubjectRecord> = new Map();
let lockedSubjectId: EntityId | null = null;
```

- `subjects` tracks all live subjects with their skin and spawn timestamp.
- `lockedSubjectId` is the currently locked target (null = no lock, attacks target nearest subject to press point).
- A subject is "locked" when tapped (see §3). Only one lock at a time (matches the single-charge model in `PowerController`).

**Spawn:** drag-to-place (see §2) adds a new entry to `subjects`. No auto-respawn at cursor — placement is explicit.

**Death:** when a subject dies (effect timeline completes), its entry is removed from `subjects`. If it was locked, `lockedSubjectId` is cleared.

**Respawn:** no automatic respawn timer. Subjects are re-placed via drag-to-place. This replaces PR1's `subjectRespawnAtMs` timer.

## 2. Drag-to-place (replaces swap)

`SubjectDragSource` currently emits only a skin on drop (`onSwap(cb: (skin) => void)`). PR2 widens this to emit coordinates:

```ts
type DragDropResult = {
  skin: SubjectSkin;
  canvasPos: Vec2 | null; // null if dropped outside canvas
};

onDrop(cb: (result: DragDropResult) => void): void;
```

- **Mouse drag:** pointerdown on card → ghost drag → pointerup over canvas → emit `{skin, canvasPos}`.
- **Touch tap:** tap on card → emit `{skin, canvasPos: null}` (no coordinate; spawn at default position or prompt for placement).
- **Drop outside canvas:** emit `{skin, canvasPos: null}` — no spawn, no swap.

`main.ts` handles the drop:
- If `canvasPos` is non-null: spawn a new subject at that position with the dropped skin.
- If `canvasPos` is null: no-op (or future: enter placement mode where next canvas tap spawns).

**Skin provenance:** the dropped card's skin becomes the new subject's skin. No global `activeSubjectSkin` mutation. Each subject carries its own skin from drop time.

## 3. Tap-to-lock

A subject is locked by tapping it (canvas press on a subject entity). This sets `lockedSubjectId` to that subject's ID.

- **Lock:** `pointer.press()` on a subject entity → `lockedSubjectId = entityId`.
- **Unlock:** tap the same subject again → `lockedSubjectId = null` (toggle). Or tap a different subject → lock transfers.
- **Visual feedback:** locked subject gets a subtle indicator (e.g., a ring or glow — design detail for PR2 kickoff).
- **ATTACK CTA:** when `lockedSubjectId` is non-null, the ATTACK CTA targets it. When null, the CTA is disabled or targets nearest subject to cursor (design decision for PR2 kickoff).

**Interaction with drag-to-place:** dragging a card and dropping it on an existing subject could either (a) replace that subject's skin, or (b) spawn a new subject. PR2 defaults to (b) — drop always spawns new. Skin replacement is a future enhancement.

## 4. Look-at targeting

Currently all eyes rotate toward the one subject (`Renderer`'s `computeGazeLines({ eyes, subjectPos, ... })`). PR2 distributes look-at across subjects:

- **Default (no lock):** each eye looks at the nearest subject. `computeGazeLines` becomes `computeGazeLines({ eyes, subjects: SubjectRenderInfo[], assistRadiusPx, chargeT })` and returns per-eye target assignments.
- **With lock:** all eyes look at the locked subject (preserves the current single-target behavior when locked).

**Gaze lines:** rendered per-eye to its assigned subject. If multiple eyes target the same subject, lines converge (matches PR1's collective-effect visual style).

**Assist radius:** per-subject `assistRadiusPx` (same value for all subjects, configurable later). Eyes within assist radius of any subject are eligible for collective attacks on that subject.

## 5. Renderer changes

`RenderFrameOptions.subject` (singular optional slot) becomes `subjects`:

```ts
type SubjectRenderInfo = {
  id: EntityId;
  pos: Vec2;
  sizePx: number;
  colors: SubjectColors;
  scale: number;
  subjectSkin?: SubjectSkin;
  locked: boolean;
};

type RenderFrameOptions = {
  // ... existing fields
  subjects: SubjectRenderInfo[];
  // subject?: SubjectRenderInfo | null; // removed
};
```

- `Renderer` iterates `subjects` and draws each via the existing drawer dispatch (`drawSubject`).
- Gaze lines: computed per-eye against the subjects array (nearest or locked).
- Charge target: `chargeTargetId` remains singular (one charge at a time, per `PowerController`), but can target any subject in the array.
- Collective effects: `selectCollectiveContributors` already takes a `targetPos` — called per active effect, which already iterates per live effect. No change needed for multi-subject; the effect's `targetId` determines which subject is attacked.

**Locked indicator:** drawn as a subtle ring around the locked subject (design detail for PR2 kickoff — could reuse PR1's glow archetype with a different color, e.g., gold/amber).

## 6. HUD changes

**Formatting controls bind to locked subject:**
- `onSubjectSkinChange`, `onSubjectResize`, `onSubjectFontChange`, `onSubjectAlignChange` callbacks now include a subject ID: `(subjectId: EntityId, value: ...) => void`.
- If `lockedSubjectId` is null, formatting controls are disabled or show a prompt to lock a subject first.
- When a subject is locked, the HUD's compose panel reflects that subject's current skin (text value, font, align, size).

**Subject count indicator:** HUD shows the current subject count (e.g., "3 subjects") alongside the existing mode/quantity/repel controls.

**ATTACK CTA wiring:**
- `hud.setCurrentSubjectId(lockedSubjectId)` is now called whenever the lock changes.
- ATTACK CTA's `onAttackPress(subjectId)` receives the locked subject ID (or nearest to cursor if no lock).
- This fixes the dead path in PR1 where `setCurrentSubjectId` was never called.

**Subject browser:**
- Dragging a card from the browser spawns a new subject (drag-to-place).
- Tapping a card (touch) could either spawn at a default position or enter placement mode (design decision for PR2 kickoff).

## 7. Respawn changes

PR1's auto-respawn timer (`subjectRespawnAtMs`) is removed. Subjects are re-placed explicitly via drag-to-place.

- When a subject dies, its entry is removed from `subjects`.
- No timer is set. The user drags a new card to replace it.
- This simplifies the respawn logic and gives the user explicit control over subject placement.

**Effect defs:** `laserBurn.ts` and `electricBurn.ts` already branch on `ctx.entity.content.renderType === "subject"` for shorter respawn windows. This check remains valid — when a subject dies, the effect system calls `worldAPI.startRespawn`, which now just removes the entity (no timer).

## 8. `spawnSubject` changes

`EntityFactory.spawnSubject` currently reads `opts.manifest[0]` (first entry only). PR2 widens this:

```ts
export type SpawnSubjectOpts = {
  manifest: readonly SubjectManifestEntry[];
  cursor: Vec2;
  nextId: number;
  skin?: SubjectSkin; // new: skin from dropped card
};
```

- If `skin` is provided, it's stamped into `behavior.data.subjectSkin` at spawn time.
- If `skin` is absent, the manifest entry's `subjectSkin` default is used (currently dead code — PR2 activates it).
- `spawnSubject` still returns a single `Entity` (one subject per call). Multi-subject is achieved by calling it multiple times.

**Manifest entry selection:** `spawnSubject` could accept a `manifestId` parameter to select a specific entry, or default to the first. PR2 defaults to first entry; manifest selection is a future enhancement.

## 9. Open questions

- **Locked indicator visual:** ring, glow, or other? Color? Size? (Design detail for PR2 kickoff — could reuse PR1's glow archetype or add a new `"lock"` archetype to `EffectVisual`.)
- **Touch tap-to-spawn:** when a card is tapped (no drag coordinate), should it spawn at a default position (e.g., center) or enter a placement mode where the next canvas tap spawns? (UX decision for PR2 kickoff.)
- **ATTACK CTA with no lock:** disabled, or target nearest subject to cursor? (UX decision for PR2 kickoff.)
- **Subject count limit:** is there a max number of simultaneous subjects? (Perf consideration — PR1's `maxContributors: 16` cap in the collective renderer already limits per-effect cost, but N subjects × M effects could add up. Suggest a soft cap of 3-5 subjects for v1, tunable later.)
- **Skin replacement:** dropping a card on an existing subject — replace skin or spawn new? PR2 defaults to spawn new; skin replacement is a future enhancement.
- **Per-subject paper-cut seeds:** PR1's `drawSubjectText.ts` and `drawSubjectAvatar.ts` use fixed seeds (61/71), so same-kind subjects look identical. PR2 could randomize the seed per subject for visual variety, but this is cosmetic and can be deferred.

## 10. Relationship to existing specs

- `docs/superpowers/specs/2026-07-27-premium-visual-collective-attack-design.md` (PR1) — prerequisite; PR2 iterates the singleton Subject into a collection but does not modify PR1's avatar/text/formatting/audio/collective-effect mechanisms.
- `docs/superpowers/specs/2026-07-25-fun-satire-v2-expansion-design.md` — prerequisite; mode/power/quantity/repel mechanics are unchanged.
- `docs/superpowers/specs/2026-07-25-subject-browser-premium-hud-design.md` — prerequisite; HUD formatting controls gain subject identity binding but preserve the premium visual-bar principles.
- `docs/superpowers/specs/2026-07-25-fun-satire-audio-design.md` — prerequisite; audio layering is unchanged.
- PR3 (future) — would build on PR2's multi-subject foundation for advanced targeting (e.g., multi-lock, subject groups, subject-specific powers).
