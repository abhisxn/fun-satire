# Fun Satire — Design Spec

Status: v1 approved and in implementation. v2/v3 are roadmap-level (directionally agreed, not yet detailed-planned or approved for implementation).

## Context

Inspired by the recent CJP/youth protests at Jantar Mantar, India, against failing political governance, this project is a browser-based interactive satire toy. A canvas full of small "creatures" reacts to the user's cursor like a magnet — repelling/fleeing, with visible field lines — and the user wields "powers" to destroy targets with a cathartic particle effect. It is built to grow across three versions without re-architecting:

- **v1 — Core Loop**: abstract eye creatures, one power (laser burn). No real-world likenesses. Proves the mechanic.
- **v2 — Expansion**: more creature types (pointed finger, bugs), more powers (electric shock, eat, ink smear, garbage, shame stamp), universal controls (change minister/logo).
- **v3 — Real Roster**: the actual satire subjects (ministers, CJI, agencies, media anchors/logos) as flat, illustrated, paper-craft-style caricatures — never photoreal, never doctored photos.

## Decisions Locked (apply across all versions unless a version explicitly overrides)

- **Stack**: Vite + TypeScript, no frontend framework, no backend. Static client-side app, deployable to Vercel/Netlify/GitHub Pages. HTMX explicitly rejected — this is a real-time canvas physics problem, not server-driven hypermedia.
- **Rendering**: Canvas2D + `requestAnimationFrame`. WebGL not needed at this scale, revisit only if entity counts grow far beyond current plans.
- **Content-as-data**: every subject (shape, colors, rig, behavior) lives in a JSON/TS manifest, never hardcoded in engine logic. This is the single principle that lets v3's real roster be pure data with zero engine changes.
- **Registry pattern**: `renderType` and `rig` keys on each manifest entry index into a behaviors registry and a drawers registry. Adding a new creature type or power is additive — a new behavior file, a new drawer file, a new registry entry — and never requires touching `Engine.ts`, `ForceField.ts`, `StateMachine.ts`, or `EntityStore.ts`.
- **Visual identity — "Paper-Cut Protest"** (matches the user's reference image): warm cream background `#EDE7DD`, slate-blue `#5B7A8C` and sage-green `#6D7A5E` accents, near-black `#2A2420` shapes, soft coral `#E8A9A0` cursor/highlight. Typography: Fraunces (italic ~500, display) + Space Mono (HUD/labels), self-hosted. Subtle grain/noise overlay. Custom coral circle+crosshair cursor replaces the native pointer.
- **HUD**: minimal "torn-paper placard," fixed bottom-center, showing current mode + power icons.
- **Motion principle**: GPU-safe only (`transform`/`opacity`), custom cubic-bezier easing everywhere, no instant state snaps, no linear/ease-in-out.
- **Touch/mobile**: best-effort, not a blocking requirement — desktop cursor-driven interaction is the core concept.
- **Content guardrail** (enforced via schema, not runtime image analysis): every subject manifest must declare `visual.styleGuardrail: 'flat-illustrated'`. Manifest validation fails without it. This keeps v3's real-figure caricatures satirical-illustration only — never photoreal/doctored photos, no hate iconography.

## v1 — Core Loop (approved, in implementation)

- **Scope**: one creature type (abstract eyes), one power (laser burn).
- **Why abstract first**: avoids likeness/defamation risk while the core interaction mechanic (field-repulsion, drag, charge-and-burn, respawn) is unproven. Real figures are deferred to v3, once the mechanic itself is validated.
- **Burn effect**: satisfying pop & dissolve (~400ms) — glow at pupil → laser line draw → shrink → ash-particle dissolve. Chosen over a slower "char & crack" and a comic-book "zap" because it reads as cathartic stress-relief rather than violence, matching the flat-illustration warmth of the reference image.
- **Respawn**: burned eyes reappear elsewhere after 3–6s. The canvas never empties — reads as "the establishment keeps growing back," which is thematically the point.
- **Power trigger**: click-and-hold charge-up. A pulsing coral ring expands from the cursor while charging; field lines intensify toward the target; the burn auto-fires at ~500–600ms; releasing early cancels with a fade.
- Full architecture, data model, and sprint/task breakdown: see `docs/superpowers/plans/2026-07-23-fun-satire-v1-plan.md`.

## v2 — Expansion (roadmap-level)

- **New creature types** (each a new rig: behavior file + drawer file + registry entry, no engine changes):
  - **Pointed Finger** — follows cursor, points/wags accusingly, draggable.
  - **Bugs** — small, skittish, faster movement response than eyes, draggable.
- **New powers** (each a new `EffectDef` + `Power` registry entry, reusing the existing generic `EffectSystem`/`ParticleSystem`):
  - **Electric current burn** (Pointed Finger's power) — arcs of current from cursor to target, crackle/flash particle burst.
  - **Eat** (Bugs' power) — target is consumed/shrunk into the bug, quick gulp animation.
- **Universal user controls** (available regardless of active creature mode):
  - **Change minister/logo** — swaps the active manifest/roster at runtime; pure content swap, no engine change.
  - **Put garbage** — spawns inert clutter entities/decals on the canvas.
  - **Smudge ink** — a drag-driven ink-smear decal layer over the canvas.
  - **Stamp shame** — stamps a "shame" decal onto a target, cosmetic overlay rather than a destroy effect.
- **Open design questions for v2** (to resolve in its own brainstorm/plan cycle before implementation): exact visual language for each new power's particle burst; whether "garbage"/"ink"/"stamp" are player-armed powers (like laser burn) or passive/always-on tools; UI for switching between creature modes and powers in the HUD.

## v3 — Real Roster (roadmap-level)

- **Scope**: replace/extend the abstract eye roster with the actual satire subjects — PM, Home Minister, Petroleum Minister, Finance Minister, Road Minister, Education Minister, Railway Minister, Raghav Chadda, Smriti Irani, Sambit Patra; BJP logo; CJI; national agencies (NTA, FSSAI); "Godi Media" hosts (Sushant Sinha, Rubika Liyaquat, Sudhir Chaudhary, Arnab Goswami, Navika Kumar, Anjana Om Kashyap, Amish Devgan, Aman Chopra, Chitra Tripathi) and outlet logos (NDTV, AajTak, ABP, Republic, Zee News, India TV, News18 India, Times Now).
  - **Staleness caveat**: this is a name/role snapshot from 2026-07-23 (portfolios reshuffle, anchors/shows change). Do not treat it as current at v3 authoring time — re-verify officeholders and lineup via the web-research pass (below) before briefing the illustration pass.
- **Content pipeline** (agents, not engine work):
  1. **Web-research pass** — general-purpose agents gather protest-art/editorial-cartoon reference and factual grounding per subject (public role, most-recognizable visual signifiers) to brief the illustration pass.
  2. **Asset-capture pass** — agents source official/public logos as legally-usable reference (trademarks referenced descriptively/satirically, not reproduced as brand assets).
  3. **Caricature-illustration pass** — human-directed, AI-assisted — produces flat, paper-craft-style SVG/PNG assets per subject, each satisfying the `styleGuardrail: 'flat-illustrated'` schema field. Satirical caricature only; never photoreal or doctored real photographs; no hate iconography.
  4. **Wiring pass** — new roster is authored as manifest data (`content/manifests/*.json`) and loaded exactly like the v1 eyes roster; zero engine changes required by design.
- **Guardrail enforcement**: manifest validation (already built in v1's `content/schema.ts`) rejects any entry missing or misusing `styleGuardrail`. This is a structural check, not a runtime image-content check — the guarantee comes from the authoring pipeline and schema gate, not from inspecting pixels.
- **Open design questions for v3** (to resolve in its own brainstorm/plan cycle before implementation): per-subject "power" assignment (does every real figure use the same laser burn, or do some subjects get bespoke powers/effects reflecting their public persona?); legal/editorial review step before any subject ships; whether outlet logos are treated as their own entity type or as a badge/decal on host entities.

## Relationship Between Versions

v2 and v3 are additive by construction: both build on the same `Entity`/`EntityStore`/`ForceField`/`EffectSystem` core from v1 without modification. Each version's actual implementation plan (sprints, ordered tasks, exit criteria) is written and approved separately, immediately before that version's work begins — this spec fixes the shared architecture and locked decisions so later planning doesn't re-litigate them.
