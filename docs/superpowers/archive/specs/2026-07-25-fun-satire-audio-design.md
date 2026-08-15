# Fun Satire — Audio/Effects Engineering — Design Spec

Status: ready for implementation planning. Fills Lane 6 of `docs/superpowers/plans/2026-07-25-fun-satire-v2-sprint-plan.md`, previously blocked pending this document.

## Context

Lane 6 was seeded with four scope inputs: damage-signature cues per mode/power pair, ambient idle audio per crowd mode, HUD interaction feedback, and charge/respawn lifecycle cues — plus a volume/mute placement question. Visual effects (`src/effects/ParticleSystem.ts`, `EffectSystem.ts`, `effectDefs/laserBurn.ts`) are already complete and out of scope here: this spec is audio-only. It does not touch `Engine.ts`, `StateMachine.ts`, or `EntityStore.ts`.

**Prerequisite:** only `laserBurn.ts` exists today. `electricBurn`/`bugEat` effectDefs and the crowd-mode/mode-locked-power system are defined in `docs/superpowers/specs/2026-07-25-fun-satire-v2-expansion-design.md` and must land first (same dependency the subject-browser-premium-hud spec already has on it). The implementation plan for this spec should sequence after that one.

## 1. Architecture

A new `src/audio/` module, following the same pattern already established by `ParticleSystem`/`EffectSystem`: a standalone service that other systems call into, never the reverse.

- **`AudioEngine.ts`** — owns the single `AudioContext`, three gain nodes (`musicBus`, `sfxBus`, `masterBus`, with `musicBus`/`sfxBus` feeding into `masterBus`), mute state, and the current master volume level. Exposes `play(cueId: string, opts?)`, `startAmbient(modeId: string)` / `stopAmbient()`, `setMasterVolume(v: number)`, `toggleMute()`, `isMuted()`.
- **`audioCueRegistry.ts`** — maps cue ids to synth-generator functions, mirroring `hudIcons.ts`/`subjectSkinRegistry.ts`: `{ id: string; synth: (ctx: AudioContext, destination: AudioNode) => void }`. One-shot cues (damage, HUD ticks, charge/respawn) are pure synthesis functions built from oscillators/noise/gain envelopes — no asset files.
- **`ambientBeds.ts`** — per-crowd-mode looping ambient textures (scuttle-jitter for bugs, point-and-shake for pointedFinger), plus the tense filler chords/texture bed, all built the same synthesis way but as looping `AudioBufferSourceNode`/scheduled-oscillator loops rather than one-shots.
- **`musicBed.ts`** — loads and loops the user-supplied mp3 (added to `public/audio/`) through `musicBus`, decoded once via `AudioContext.decodeAudioData`, looping via `AudioBufferSourceNode.loop = true`.

**Wiring (no locked files touched):**
- `EffectSystem.ts`'s existing `EffectStage.onStart` hook gains an optional cue trigger; `laserBurn.ts` and sibling effectDefs (electricBurn, bugEat) call `ctx.audio.play("laserBurn.dissolve")` etc. from their existing stage hooks — same mechanism they already use for `ctx.particles.spawn(...)`.
- `main.ts` (composition root) constructs one `AudioEngine`, passes it into `EffectCtx`, into the charge/respawn scheduler call sites, and into `Hud.ts`.
- `Hud.ts` calls `audio.play(...)` directly from its existing click/drag/press handlers (quantity stepper, repel track, subject drawer open/close/card select/drag-drop).

## 2. Cue catalog (all in v1)

| Category | Trigger | Sound character |
|---|---|---|
| Damage: eyes/laserBurn | `laserBurn` effectDef stages | Sharp synthesized zap/glow rising tone → crackle → dissolve noise-burst |
| Damage: pointedFinger/electricBurn | electricBurn effectDef stages | Electrical buzz/crackle, short noise bursts |
| Damage: bugs/bugEat | bugEat effectDef stages | Rapid clustered click/chitter texture |
| Ambient idle: bugs (scuttle-jitter) | mode becomes active | Low-level looping skittering texture |
| Ambient idle: pointedFinger (point-and-shake) | mode becomes active | Low-level looping tense tremor texture |
| Ambient tense filler | always-on background layer | Procedural sustained chord/texture bed, synthesized |
| Background music bed | app start (post-unlock) | User-supplied mp3, looped, lowest-priority bus |
| HUD feedback | quantity +/-, repel drag, drawer open/close, card select/drop | Short tactile tick/press clicks, consistent with paper-cut "hand-cut" feel |
| Charge/respawn | charge threshold reached / respawn scheduled / respawn complete | Rising charge tone / soft pop |

Only one ambient idle loop plays at a time (matches the mode-locked-power rule already established — modes are mutually exclusive). The tense filler texture and music bed are both always-on background layers and mix together continuously.

## 3. Volume & mute control

A new premium HUD placard (same paper-stack/spring/thin-line treatment as every other control from the subject-browser-premium-hud spec): a thin-line speaker icon toggle plus a short drag-track volume slider, reusing the repel track control's slider mechanics. Controls `AudioEngine.setMasterVolume`/`toggleMute` — one master level for now (all three buses scale together), no per-category sliders (YAGNI).

## 4. Autoplay unlock

Browsers block audio until a user gesture. `AudioEngine` starts in a "locked" state; the first `pointerdown` anywhere in the app (already-existing global listener territory in `main.ts`) calls `audioContext.resume()` and starts the music bed + ambient filler texture. No visible loading state needed — inaudible until that first tap, which happens before any gameplay-relevant sound would fire anyway.

## 5. Accessibility

Muting is a single toggle, always available, defaulting to **unmuted** (matches `prefers-reduced-motion`'s existing default-on posture in `tokens.css`, i.e., audio ships on by default like motion does). No separate "reduced audio" mode beyond mute — a graduated reduction isn't warranted for a lane this size (YAGNI); mute already satisfies the accessibility need.

## 6. File structure

- Create: `src/audio/AudioEngine.ts`, `src/audio/audioCueRegistry.ts`, `src/audio/cues/laserBurnCues.ts`, `src/audio/cues/electricBurnCues.ts`, `src/audio/cues/bugEatCues.ts`, `src/audio/cues/hudCues.ts`, `src/audio/cues/chargeRespawnCues.ts`, `src/audio/ambientBeds.ts`, `src/audio/musicBed.ts`
- Modify: `src/effects/EffectSystem.ts` (optional cue field on `EffectStage`), `src/effects/effectDefs/laserBurn.ts` + sibling effectDefs, `src/hud/Hud.ts`, `src/hud/hud.css` (new mute placard), `main.ts` (construct/wire `AudioEngine`)
- Add asset: `public/audio/music-bed.mp3` (user-supplied)

## 7. Testing

- `AudioEngine` unit tests run against a mock `AudioContext` (no real audio hardware needed in CI) — verify gain node wiring, mute/volume math, and that `play()` looks up the registry correctly.
- Cue registry entries are tested for structural correctness (id uniqueness, synth function doesn't throw against a mock context) rather than asserting actual audio output.
- HUD/effectDef integration tests assert `audio.play(id)` is called with the right cue id at the right stage/handler, using a fake `AudioEngine`.

## Open questions

- Exact mp3 file for the background music bed is user-supplied and not yet in the repo — implementation can proceed with a placeholder silence/short test tone until it's provided, per the existing "placeholder content" precedent (subject-browser spec §2).

## Relationship to existing specs

- `docs/superpowers/specs/2026-07-24-subject-mechanic-and-visual-polish-design.md` and the v2 expansion spec — the charge/burn/drag/respawn lifecycle and mode/power pairing are unchanged; this spec only adds sound triggers alongside those existing transitions.
- `docs/superpowers/specs/2026-07-25-subject-browser-premium-hud-design.md` — the new mute/volume placard and HUD tick cues (quantity, repel, drawer) follow that spec's premium visual bar (§6) for consistency.
