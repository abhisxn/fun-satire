# Fun Satire — Subject Browser & Premium HUD — Design Spec

Status: ready for implementation planning. Extends `docs/superpowers/specs/2026-07-25-fun-satire-v2-expansion-design.md` ("the v2 expansion spec"), which must be implemented first.

## Context

The v2 expansion spec (§1) introduced `subjectSkin: "figure" | "lotus"`, chosen via a click-to-cycle HUD placard identical in interaction pattern to the existing mode/power selectors. This spec replaces that click-to-cycle skin selector with a browsable, drag-and-drop subject list, widens the subject concept from two fixed skins to an open, named roster plus arbitrary typed-text subjects, and defines a "premium HUD" visual bar applied across all v2 HUD controls (not just the new panel).

This spec does not change: crowd modes (§2), mode-locked power pairing (§2a), quantity/repel controls' mechanics (§3, visual treatment updated per §3 below), the no-overlap rule (§4), or the two reconciled powers (§5) from the v2 expansion spec. It also does not touch `Engine.ts`, `StateMachine.ts`, `EntityStore.ts`, or `ForceField.ts` beyond what the v2 expansion spec already specifies there.

## 1. Subject data model

`subjectSkin` widens from a fixed string union to a discriminated instance value stored on the Subject entity's `behavior.data`:

```ts
type SubjectSkin =
  | { kind: "illustrated"; id: string }              // "figure" | "lotus" | new placeholders
  | { kind: "text"; value: string; scale: number };  // user-typed, composed per-drop
```

- **Illustrated** subjects are backed by a static registry, `src/hud/subjectSkinRegistry.ts`: an array of `{ id: string; label: string; drawer: DrawSubjectFn }` entries — same registry pattern as `hudIcons.ts`. `figure` and `lotus` (already spec'd) become the first two entries; this spec adds 3–4 new placeholder entries (see §2). `drawSubject.ts`'s dispatch reads `subjectSkin.kind`: for `"illustrated"`, it looks up `id` in the registry and calls that entry's drawer; for `"text"`, it calls the one generic `drawSubjectText.ts` drawer with `value` and `scale`.
- **Text** subjects are never pre-registered. They're composed fresh in the subject drawer panel's compose row (§3) and carried purely as instance data once dropped — there is no persisted list of "past custom text entries." The compose row is reusable for the next entry (YAGNI: no custom-entry management system).
- Swapping `subjectSkin` (of either kind) is a pure render-only concern, exactly as v2 expansion spec §1 already establishes for `figure`/`lotus`: it takes effect on the current Subject entity immediately, no respawn, physics/charge/drag state untouched.
- Resize (§4) only applies to `"text"` kind. Illustrated subjects keep the existing fixed `baseSizePx` sizing shared with the no-overlap rule's separation math (v2 expansion spec §4) — this is a deliberate scope boundary, not an oversight, so text resizing never interacts with pairwise-separation physics tuned for fixed-size crowd members.

## 2. New placeholder illustrated subjects

3–4 new entries beyond `figure`/`lotus`, each a new `drawSubject<Name>.ts` built on the shared `paperCut.ts` utility, same locked palette (cream/slate/sage/ink/coral) and `styleGuardrail: 'flat-illustrated'` as every other drawer in this codebase. Exact subjects/likenesses and their Figma references are **not decided in this spec** — placeholder content only, to prove the registry/list/drag-drop mechanism end-to-end. Real roster art is authored later, the same way `figure`/`lotus` were authored ahead of full v2 rollout (v2 expansion spec §1).

## 3. Subject browser panel

A slide-out side drawer, toggled by a new HUD button using the same premium placard treatment as every other control (§6).

- **Layout:** anchored to one screen edge (implementation picks left or right based on where the mode/power/skin placards already sit, to avoid overlap); scrollable vertical list of illustrated-subject cards (thumbnail + label), with a fixed compose row pinned at the top of the panel containing a text input and a size stepper (small/medium/large steps).
- **Compose row:** typing text and adjusting the size stepper previews the resulting text-card's scale live (rendered as a small placard preview inside the row) before it's ever dropped onto the canvas.
- Opening/closing the drawer does not affect the live Subject entity or any physics/behavior state — purely a UI-visibility toggle.

## 4. Interaction: drag, tap, and resize

- **Desktop drag:** dragging a card (illustrated or the composed text preview) out of the drawer and releasing anywhere over the play canvas swaps the active Subject's `subjectSkin` to that value. This is a new drag source — panel-to-canvas — implemented separately from the existing entity-level `DragController` (which handles repositioning the already-placed Subject via click-and-drag on the canvas itself). The two drag systems don't share state; a panel-drag release simply calls the same swap path §1 describes, it does not simulate a canvas pointer-drag on the entity.
- **Touch fallback:** tapping a card swaps immediately, no drag gesture required — parity with mouse without needing touch-drag simulation.
- **Replaces, not adds to:** this drawer is the only way to choose the active subject going forward. The v2 expansion spec's click-to-cycle skin placard (§1 there) is removed, not left as a redundant second control — consistent with how that same spec already removed the independent power selector in favor of mode-locking (§2a there).
- **Resize after placement:** reopening the drawer while a text subject is currently active surfaces the same size stepper, now bound to the live entity's `scale` — adjusting it updates the on-canvas text subject's size immediately, same "render-only, no respawn" rule as any other skin swap.

## 5. HUD controls affected — inventory

This spec's premium visual treatment (§6) applies to every HUD control already introduced across both v2 documents, plus the two new controls this spec adds:

| Control | Origin | Interaction change here? |
|---|---|---|
| Mode selector (eyes/bugs/pointedFinger) | v2 expansion §2 | No — visual only |
| Power reflection (read-only) | v2 expansion §2a | No — visual only |
| Quantity stepper | v2 expansion §3 | No — visual only |
| Repel track control | v2 expansion §3 | No — visual only |
| Skin selector (click-to-cycle) | v2 expansion §1 | **Removed**, replaced by §3/§4 above |
| Subject browser toggle button | this spec | New |
| Subject browser drawer + compose row | this spec | New |

## 6. Premium HUD visual bar

A set of concrete design principles applied uniformly to every control in §5's table, staying strictly inside the locked Paper-Cut Protest palette (cream/slate/sage/ink/coral), Space Mono type, and torn-paper placard motif established across prior specs. No new colors, no gradients/glows, no glassmorphism/backdrop-blur, no additional fonts — the bar is craft and physics, not new visual materials.

- **Layered depth ("paper stack").** Every placard/card is constructed as two layers: a soft ink-tinted shadow/base shape sitting slightly offset behind the torn-paper top layer — an extension of the offset-shadow paper-cut treatment `paperCut.ts` already provides, not a new rendering system. Reads as physically stacked cut paper.
- **Spring-physics motion.** All state transitions (mode switch, drawer open/close, quantity step, repel drag, subject swap) use a shared custom spring/cubic-bezier easing with slight overshoot, defined once (e.g. a shared CSS custom property or animation-timing constant) and reused everywhere — never a default linear/ease transition.
- **Precise thin-line iconography.** Every HUD icon (mode, skin-browser toggle, quantity +/−, any glyphs) is drawn at a single consistent thin stroke weight — no mixing thick default icons with thin ones.
- **Generous breathing room.** Increased internal placard padding and inter-control spacing versus a minimal-viable layout, without growing the HUD's total footprint on the play area (existing HUD placement/real-estate budget from the umbrella spec is unchanged).
- **Staggered reveal.** The subject browser drawer's cards fade + rise in with a per-card stagger (roughly 40–60ms delay increment) as the panel opens, using the same spring easing above — not an instant slide-and-populate.
- **Tactile press feedback.** Interactive controls (quantity buttons, subject cards, drawer toggle) scale down slightly on press/tap before releasing back, simulating physical give — not just a color/state swap.

This is a visual/motion-craft pass only: it changes `hud.css`/`Hud.ts` rendering and transition code, not any HUD control's underlying data flow, event contract, or the mechanics defined in the v2 expansion spec or §1–§4 above.

## 7. Open questions

- Exact placeholder subject identities/likenesses for §2 are undecided — content-only gap, not a mechanism gap.
- Which screen edge the drawer anchors to (left vs right) is an implementation call, not fixed here, to avoid clashing with the existing mode/power/quantity/repel placard cluster's current position.
- Whether the shared spring-easing constant from §6 should live as a CSS custom property, a JS animation-timing module, or both, is an implementation detail for the plan to pin down.

## Relationship to existing specs

- `docs/superpowers/specs/2026-07-25-fun-satire-v2-expansion-design.md` — prerequisite. This spec's §1 supersedes that spec's click-to-cycle skin-selector interaction (that spec's §1) while keeping its underlying `subjectSkin` render-only-swap architecture intact; §6 here elevates the visual treatment of every control that spec (and this one) introduces.
- `docs/superpowers/specs/2026-07-24-subject-mechanic-and-visual-polish-design.md` — the Subject entity's charge/burn/drag/respawn lifecycle remains unchanged and in force; this spec only changes how a skin gets selected and how HUD controls look/animate.
