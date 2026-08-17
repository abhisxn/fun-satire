# Fun Satire Audio Engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `src/audio/` engine plus a premium mute/volume HUD control, giving Fun Satire synthesized damage/HUD/charge/respawn cues, per-mode ambient loops, a tense filler texture, and a looping user-supplied music bed — with zero changes to `Engine.ts`, `StateMachine.ts`, or `EntityStore.ts`.

**Architecture:** A standalone `AudioEngine` (single `AudioContext`, three gain buses: `musicBus`/`sfxBus` → `masterBus` → destination) plus an `audioCueRegistry` mapping cue ids to pure Web Audio synth functions — the same registry pattern already used by `hudIcons.ts`/`subjectSkinRegistry.ts`. Existing systems call *into* audio the same way they already call into `ParticleSystem`: `EffectSystem.ts` gains an optional `cue` field on `EffectStage`, effectDefs set it, and `main.ts` (composition root) wires one `AudioEngine` instance everywhere it's needed. A standalone `AudioControl` HUD component (mirroring `Hud`'s placard construction) owns the mute toggle + volume slider.

**Tech Stack:** TypeScript, native Web Audio API (`AudioContext`, `GainNode`, `OscillatorNode`, `AudioBufferSourceNode`, `BiquadFilterNode`) — no audio libraries. Vitest + happy-dom for tests, matching the existing `tests/unit/*.test.ts` convention (`// @vitest-environment happy-dom` pragma where DOM is needed).

**Prerequisite:** This plan sequences after `docs/superpowers/plans/2026-07-25-fun-satire-v2-expansion.md` (adds `electricBurn`/`bugEat` effectDefs and crowd modes) and after the subject-browser-premium-hud plan (adds the `--ease-spring` token to `src/config/tokens.ts`/`src/styles/tokens.css` and the paper-stack `::before` shadow + `:active { transform: scale(0.9) }` press-feedback pattern to `hud.css`). Tasks 6 and 10 below assume `electricBurn.ts`/`bugEat.ts` effectDefs and a mode-change call site already exist; if their exact shape differs from what's described here, use the real names/structure found in the code — do not invent a parallel one.

## Global Constraints

- Never modify `src/core/Engine.ts`, `src/entities/behaviors/StateMachine.ts`, or `src/entities/EntityStore.ts`.
- No new colors, gradients, glassmorphism, or backdrop-blur — stay inside the locked Paper-Cut Protest palette (`PALETTE.cream/slate/sage/ink/coral` from `src/config/tokens.ts`) and `var(--font-mono)`.
- All new HUD motion routes through `var(--ease-spring)` (added by the subject-browser-premium-hud plan), never a default linear/ease-in-out transition.
- Only one ambient per-mode idle loop plays at a time; the tense filler texture and music bed are both always-on and mix continuously alongside it.
- One master volume/mute control for all three buses — no per-category sliders (YAGNI).
- Default audio state is **unmuted** (matches `prefers-reduced-motion`'s default-on posture).
- No asset files for one-shot or ambient cues — pure synthesis only. The only real audio asset is the user-supplied `public/audio/music-bed.mp3`; until it exists, `musicBed.ts` must fall back to a silent buffer rather than throwing.
- `AudioEngine` starts locked; audio only starts on the first `pointerdown` anywhere in the app.

---

## File Structure

- `src/audio/synthToolkit.ts` — shared `playTone`/`playNoiseBurst` one-shot synthesis helpers.
- `src/audio/audioCueRegistry.ts` — `registerAudioCue`/`getAudioCue`/`listAudioCueIds`, id → synth-fn map.
- `src/audio/AudioEngine.ts` — owns `AudioContext`, the three gain buses, mute/volume state, `play(cueId)`, `unlock()`.
- `src/audio/cues/hudCues.ts` — HUD interaction cue registrations (tick, press, drawer open/close, card select/drop).
- `src/audio/cues/chargeRespawnCues.ts` — charge-start / respawn-scheduled / respawn-complete cue registrations.
- `src/audio/cues/laserBurnCues.ts`, `src/audio/cues/electricBurnCues.ts`, `src/audio/cues/bugEatCues.ts` — one cue-registration file per damage effectDef.
- `src/audio/ambientBeds.ts` — per-mode looping textures + tense filler texture, built on looping `AudioBufferSourceNode`s.
- `src/audio/musicBed.ts` — fetch/decode/loop the user-supplied mp3 through the music bus, with silent-buffer fallback.
- `src/hud/AudioControl.ts` + `src/hud/audioControl.css` — the premium mute-toggle + volume-slider HUD placard.
- Modify `src/effects/EffectSystem.ts` — add `cue?: string` to `EffectStage`, `audio: AudioEngineLike` to `EffectCtx`, a 4th constructor param, and cue-firing at stage start.
- Modify `src/effects/effectDefs/laserBurn.ts`, `electricBurn.ts`, `bugEat.ts` — set `cue` on their glow/start and dissolve stages.
- Modify `src/main.ts` — construct `AudioEngine`, mount `AudioControl`, pass audio into `EffectSystem`, wire the pointerdown unlock listener and ambient-mode switching.
- Add asset (user-supplied, not part of this plan's tasks): `public/audio/music-bed.mp3`.

---

### Task 1: Synth toolkit + cue registry

**Files:**
- Create: `src/audio/synthToolkit.ts`
- Create: `src/audio/audioCueRegistry.ts`
- Test: `tests/unit/synthToolkit.test.ts`
- Test: `tests/unit/audioCueRegistry.test.ts`

**Interfaces:**
- Produces: `playTone(ctx: AudioContext, destination: AudioNode, opts: ToneOptions): void`, `playNoiseBurst(ctx: AudioContext, destination: AudioNode, opts: NoiseBurstOptions): void`, `type AudioCueSynthFn = (ctx: AudioContext, destination: AudioNode) => void`, `type AudioCueEntry = { id: string; synth: AudioCueSynthFn }`, `registerAudioCue(entry: AudioCueEntry): void`, `getAudioCue(id: string): AudioCueEntry`, `listAudioCueIds(): string[]`.

- [ ] **Step 1: Write the failing test for the synth toolkit**

```ts
// tests/unit/synthToolkit.test.ts
import { describe, expect, it } from "vitest";
import { playTone, playNoiseBurst } from "../../src/audio/synthToolkit";

class FakeParam {
  value = 0;
  setValueAtTime(v: number): void { this.value = v; }
  linearRampToValueAtTime(v: number): void { this.value = v; }
}

class FakeOscillator {
  type = "sine";
  frequency = new FakeParam();
  connected: unknown[] = [];
  started = false;
  stopped = false;
  connect(dest: unknown): void { this.connected.push(dest); }
  start(): void { this.started = true; }
  stop(): void { this.stopped = true; }
}

class FakeGain {
  gain = new FakeParam();
  connected: unknown[] = [];
  connect(dest: unknown): void { this.connected.push(dest); }
}

class FakeBufferSource {
  buffer: unknown = null;
  connected: unknown[] = [];
  started = false;
  stopped = false;
  connect(dest: unknown): void { this.connected.push(dest); }
  start(): void { this.started = true; }
  stop(): void { this.stopped = true; }
}

class FakeFilter {
  type = "";
  frequency = new FakeParam();
  connected: unknown[] = [];
  connect(dest: unknown): void { this.connected.push(dest); }
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createOscillator(): FakeOscillator { return new FakeOscillator(); }
  createGain(): FakeGain { return new FakeGain(); }
  createBufferSource(): FakeBufferSource { return new FakeBufferSource(); }
  createBiquadFilter(): FakeFilter { return new FakeFilter(); }
  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

describe("audio/synthToolkit", () => {
  it("playTone builds and starts an oscillator through a gain node into the destination", () => {
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    const dest = new FakeGain() as unknown as AudioNode;
    expect(() => playTone(ctx, dest, { freqStartHz: 440, durationMs: 100 })).not.toThrow();
  });

  it("playNoiseBurst builds a filtered noise burst into the destination", () => {
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    const dest = new FakeGain() as unknown as AudioNode;
    expect(() => playNoiseBurst(ctx, dest, { durationMs: 80 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/synthToolkit.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/synthToolkit'"

- [ ] **Step 3: Implement the synth toolkit**

```ts
// src/audio/synthToolkit.ts
export type ToneShape = "sine" | "square" | "sawtooth" | "triangle";

export type ToneOptions = {
  freqStartHz: number;
  freqEndHz?: number;
  durationMs: number;
  shape?: ToneShape;
  gainPeak?: number;
};

export function playTone(ctx: AudioContext, destination: AudioNode, opts: ToneOptions): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.shape ?? "sine";
  const now = ctx.currentTime;
  const durationSec = opts.durationMs / 1000;
  osc.frequency.setValueAtTime(opts.freqStartHz, now);
  if (opts.freqEndHz !== undefined) {
    osc.frequency.linearRampToValueAtTime(opts.freqEndHz, now + durationSec);
  }
  const peak = opts.gainPeak ?? 0.4;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + Math.min(0.01, durationSec / 4));
  gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + durationSec);
}

export type NoiseBurstOptions = {
  durationMs: number;
  filterFreqHz?: number;
  gainPeak?: number;
};

export function playNoiseBurst(ctx: AudioContext, destination: AudioNode, opts: NoiseBurstOptions): void {
  const durationSec = opts.durationMs / 1000;
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = opts.filterFreqHz ?? 1200;
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  const peak = opts.gainPeak ?? 0.3;
  gain.gain.setValueAtTime(peak, now);
  gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(now);
  source.stop(now + durationSec);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/synthToolkit.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for the cue registry**

```ts
// tests/unit/audioCueRegistry.test.ts
import { describe, expect, it } from "vitest";
import { registerAudioCue, getAudioCue, listAudioCueIds } from "../../src/audio/audioCueRegistry";

describe("audio/audioCueRegistry", () => {
  it("registers and retrieves a cue by id", () => {
    registerAudioCue({ id: "test.registry.one", synth: () => {} });
    const entry = getAudioCue("test.registry.one");
    expect(entry.id).toBe("test.registry.one");
    expect(typeof entry.synth).toBe("function");
  });

  it("throws a descriptive error for an unknown cue id", () => {
    expect(() => getAudioCue("test.registry.missing")).toThrow(/unknown cue id/);
  });

  it("lists every registered cue id", () => {
    registerAudioCue({ id: "test.registry.two", synth: () => {} });
    expect(listAudioCueIds()).toContain("test.registry.two");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/unit/audioCueRegistry.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/audioCueRegistry'"

- [ ] **Step 7: Implement the cue registry**

```ts
// src/audio/audioCueRegistry.ts
export type AudioCueSynthFn = (ctx: AudioContext, destination: AudioNode) => void;

export type AudioCueEntry = {
  id: string;
  synth: AudioCueSynthFn;
};

const registry = new Map<string, AudioCueEntry>();

export function registerAudioCue(entry: AudioCueEntry): void {
  registry.set(entry.id, entry);
}

export function getAudioCue(id: string): AudioCueEntry {
  const entry = registry.get(id);
  if (!entry) throw new Error(`audioCueRegistry: unknown cue id "${id}"`);
  return entry;
}

export function listAudioCueIds(): string[] {
  return [...registry.keys()];
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/unit/audioCueRegistry.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add src/audio/synthToolkit.ts src/audio/audioCueRegistry.ts tests/unit/synthToolkit.test.ts tests/unit/audioCueRegistry.test.ts
git commit -m "feat(audio): add synth toolkit and cue registry"
```

---

### Task 2: AudioEngine core

**Files:**
- Create: `src/audio/AudioEngine.ts`
- Test: `tests/unit/audioEngine.test.ts`

**Interfaces:**
- Consumes: `getAudioCue` from `src/audio/audioCueRegistry.ts` (Task 1).
- Produces: `class AudioEngine` with `constructor(ctx: AudioContext)`, `getContext(): AudioContext`, `getBus(bus: "music" | "sfx"): GainNode`, `unlock(): void`, `isUnlocked(): boolean`, `setMasterVolume(v: number): void`, `getMasterVolume(): number`, `toggleMute(): boolean`, `isMuted(): boolean`, `play(cueId: string): void`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/audioEngine.test.ts
import { describe, expect, it } from "vitest";
import { AudioEngine } from "../../src/audio/AudioEngine";
import { registerAudioCue } from "../../src/audio/audioCueRegistry";

class FakeGainNode {
  gain = { value: 1 };
  connectedTo: unknown[] = [];
  connect(dest: unknown): void { this.connectedTo.push(dest); }
}

class FakeAudioContext {
  destination = {};
  state: "suspended" | "running" = "suspended";
  currentTime = 0;
  resumeCalls = 0;
  createGain(): FakeGainNode { return new FakeGainNode(); }
  resume(): Promise<void> {
    this.resumeCalls++;
    this.state = "running";
    return Promise.resolve();
  }
}

function makeEngine(): { engine: AudioEngine; ctx: FakeAudioContext } {
  const ctx = new FakeAudioContext();
  const engine = new AudioEngine(ctx as unknown as AudioContext);
  return { engine, ctx };
}

describe("audio/AudioEngine", () => {
  it("defaults to 0.8 master volume and unmuted", () => {
    const { engine } = makeEngine();
    expect(engine.getMasterVolume()).toBe(0.8);
    expect(engine.isMuted()).toBe(false);
  });

  it("setMasterVolume clamps into [0, 1]", () => {
    const { engine } = makeEngine();
    engine.setMasterVolume(1.5);
    expect(engine.getMasterVolume()).toBe(1);
    engine.setMasterVolume(-1);
    expect(engine.getMasterVolume()).toBe(0);
  });

  it("toggleMute silences the master bus and restores it", () => {
    const { engine } = makeEngine();
    const masterBus = engine.getBus("sfx");
    void masterBus;
    expect(engine.toggleMute()).toBe(true);
    expect(engine.isMuted()).toBe(true);
    expect(engine.toggleMute()).toBe(false);
    expect(engine.isMuted()).toBe(false);
  });

  it("unlock resumes a suspended context exactly once", () => {
    const { engine, ctx } = makeEngine();
    expect(engine.isUnlocked()).toBe(false);
    engine.unlock();
    engine.unlock();
    expect(engine.isUnlocked()).toBe(true);
    expect(ctx.resumeCalls).toBe(1);
  });

  it("play() looks up the cue registry and calls its synth with the sfx bus", () => {
    const { engine, ctx } = makeEngine();
    const calls: unknown[][] = [];
    registerAudioCue({
      id: "test.engine.cue",
      synth: (synthCtx, dest) => calls.push([synthCtx, dest]),
    });
    engine.play("test.engine.cue");
    expect(calls.length).toBe(1);
    expect(calls[0]![0]).toBe(ctx);
    expect(calls[0]![1]).toBe(engine.getBus("sfx"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/audioEngine.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/AudioEngine'"

- [ ] **Step 3: Implement AudioEngine**

```ts
// src/audio/AudioEngine.ts
import { getAudioCue } from "./audioCueRegistry";

export type AudioBus = "music" | "sfx";

export class AudioEngine {
  private readonly ctx: AudioContext;
  private readonly musicBus: GainNode;
  private readonly sfxBus: GainNode;
  private readonly masterBus: GainNode;
  private muted = false;
  private masterVolume = 0.8;
  private unlocked = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterBus = ctx.createGain();
    this.masterBus.gain.value = this.masterVolume;
    this.masterBus.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 1;
    this.musicBus.connect(this.masterBus);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.masterBus);
  }

  getContext(): AudioContext {
    return this.ctx;
  }

  getBus(bus: AudioBus): GainNode {
    return bus === "music" ? this.musicBus : this.sfxBus;
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.masterBus.gain.value = this.muted ? 0 : this.masterVolume;
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.masterBus.gain.value = this.muted ? 0 : this.masterVolume;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(cueId: string): void {
    const entry = getAudioCue(cueId);
    entry.synth(this.ctx, this.sfxBus);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/audioEngine.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/audio/AudioEngine.ts tests/unit/audioEngine.test.ts
git commit -m "feat(audio): add AudioEngine with gain buses, mute/volume, and unlock"
```

---

### Task 3: HUD interaction cues

**Files:**
- Create: `src/audio/cues/hudCues.ts`
- Test: `tests/unit/hudCues.test.ts`

**Interfaces:**
- Consumes: `registerAudioCue`, `getAudioCue` (Task 1), `playTone` (Task 1).
- Produces: registers cue ids `"hud.tick"`, `"hud.press"`, `"hud.drawerOpen"`, `"hud.drawerClose"`, `"hud.cardSelect"`, `"hud.cardDrop"` as a side effect of importing the module.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/hudCues.test.ts
import { describe, expect, it } from "vitest";
import "../../src/audio/cues/hudCues";
import { getAudioCue } from "../../src/audio/audioCueRegistry";

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createOscillator() {
    return { type: "sine", frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, value: 1 }, connect() {} };
  }
}

const HUD_CUE_IDS = ["hud.tick", "hud.press", "hud.drawerOpen", "hud.drawerClose", "hud.cardSelect", "hud.cardDrop"];

describe("audio/cues/hudCues", () => {
  it.each(HUD_CUE_IDS)("registers %s and synthesizes without throwing", (id) => {
    const entry = getAudioCue(id);
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/hudCues.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/cues/hudCues'"

- [ ] **Step 3: Implement HUD cues**

```ts
// src/audio/cues/hudCues.ts
import { registerAudioCue } from "../audioCueRegistry";
import { playTone } from "../synthToolkit";

registerAudioCue({
  id: "hud.tick",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 900, durationMs: 40, shape: "square", gainPeak: 0.25 }),
});

registerAudioCue({
  id: "hud.press",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 520, durationMs: 60, shape: "triangle", gainPeak: 0.3 }),
});

registerAudioCue({
  id: "hud.drawerOpen",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 400, freqEndHz: 700, durationMs: 140, shape: "sine", gainPeak: 0.3 }),
});

registerAudioCue({
  id: "hud.drawerClose",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 700, freqEndHz: 400, durationMs: 120, shape: "sine", gainPeak: 0.3 }),
});

registerAudioCue({
  id: "hud.cardSelect",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 660, durationMs: 70, shape: "triangle", gainPeak: 0.3 }),
});

registerAudioCue({
  id: "hud.cardDrop",
  synth: (ctx, dest) => playTone(ctx, dest, { freqStartHz: 300, freqEndHz: 220, durationMs: 90, shape: "sine", gainPeak: 0.35 }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/hudCues.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/audio/cues/hudCues.ts tests/unit/hudCues.test.ts
git commit -m "feat(audio): register HUD interaction cues"
```

---

### Task 4: Charge/respawn cues

**Files:**
- Create: `src/audio/cues/chargeRespawnCues.ts`
- Test: `tests/unit/chargeRespawnCues.test.ts`

**Interfaces:**
- Consumes: `registerAudioCue` (Task 1), `playTone` (Task 1), `LASER_BURN.chargeThresholdMs` from `src/effects/effectDefs/laserBurn.ts` (existing).
- Produces: registers cue ids `"charge.start"`, `"respawn.scheduled"`, `"respawn.complete"`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/chargeRespawnCues.test.ts
import { describe, expect, it } from "vitest";
import "../../src/audio/cues/chargeRespawnCues";
import { getAudioCue } from "../../src/audio/audioCueRegistry";

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createOscillator() {
    return { type: "sine", frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, value: 1 }, connect() {} };
  }
}

describe("audio/cues/chargeRespawnCues", () => {
  it.each(["charge.start", "respawn.scheduled", "respawn.complete"])("registers %s", (id) => {
    const entry = getAudioCue(id);
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/chargeRespawnCues.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/cues/chargeRespawnCues'"

- [ ] **Step 3: Implement charge/respawn cues**

```ts
// src/audio/cues/chargeRespawnCues.ts
import { registerAudioCue } from "../audioCueRegistry";
import { playTone } from "../synthToolkit";
import { LASER_BURN } from "../../effects/effectDefs/laserBurn";

registerAudioCue({
  id: "charge.start",
  synth: (ctx, dest) =>
    playTone(ctx, dest, {
      freqStartHz: 220,
      freqEndHz: 880,
      durationMs: LASER_BURN.chargeThresholdMs,
      shape: "sawtooth",
      gainPeak: 0.2,
    }),
});

registerAudioCue({
  id: "respawn.scheduled",
  synth: (ctx, dest) =>
    playTone(ctx, dest, { freqStartHz: 260, freqEndHz: 180, durationMs: 90, shape: "sine", gainPeak: 0.25 }),
});

registerAudioCue({
  id: "respawn.complete",
  synth: (ctx, dest) =>
    playTone(ctx, dest, { freqStartHz: 440, freqEndHz: 660, durationMs: 110, shape: "sine", gainPeak: 0.3 }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/chargeRespawnCues.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/audio/cues/chargeRespawnCues.ts tests/unit/chargeRespawnCues.test.ts
git commit -m "feat(audio): register charge and respawn cues"
```

---

### Task 5: EffectSystem cue hook + laserBurn wiring

**Files:**
- Create: `src/audio/cues/laserBurnCues.ts`
- Modify: `src/effects/EffectSystem.ts`
- Modify: `src/effects/effectDefs/laserBurn.ts`
- Test: `tests/unit/laserBurnCues.test.ts`
- Test: `tests/unit/effectSystemAudio.test.ts`

**Interfaces:**
- Consumes: `registerAudioCue`, `playTone`, `playNoiseBurst` (Task 1); `LASER_BURN` (existing, from `laserBurn.ts`).
- Produces: `export type AudioEngineLike = { play(cueId: string): void }` from `EffectSystem.ts`; `EffectStage.cue?: string`; `EffectCtx.audio: AudioEngineLike`; `new EffectSystem(particles, rng, world, audio)` (4-arg constructor — this is a **breaking change** to the existing 3-arg call site in `main.ts`, fixed in Task 10). Registers cue ids `"laserBurn.glow"`, `"laserBurn.dissolve"`.

- [ ] **Step 1: Write the failing test for laserBurn cues**

```ts
// tests/unit/laserBurnCues.test.ts
import { describe, expect, it } from "vitest";
import "../../src/audio/cues/laserBurnCues";
import { getAudioCue } from "../../src/audio/audioCueRegistry";

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createOscillator() {
    return { type: "sine", frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, value: 1 }, connect() {} };
  }
  createBufferSource() {
    return { buffer: null, connect() {}, start() {}, stop() {} };
  }
  createBiquadFilter() {
    return { type: "", frequency: { value: 0 }, connect() {} };
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

describe("audio/cues/laserBurnCues", () => {
  it.each(["laserBurn.glow", "laserBurn.dissolve"])("registers %s", (id) => {
    const entry = getAudioCue(id);
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/laserBurnCues.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/cues/laserBurnCues'"

- [ ] **Step 3: Implement laserBurn cues**

```ts
// src/audio/cues/laserBurnCues.ts
import { registerAudioCue } from "../audioCueRegistry";
import { playTone, playNoiseBurst } from "../synthToolkit";
import { LASER_BURN } from "../../effects/effectDefs/laserBurn";

registerAudioCue({
  id: "laserBurn.glow",
  synth: (ctx, dest) =>
    playTone(ctx, dest, {
      freqStartHz: 500,
      freqEndHz: 1400,
      durationMs: LASER_BURN.glowMs + LASER_BURN.lineMs,
      shape: "sawtooth",
      gainPeak: 0.3,
    }),
});

registerAudioCue({
  id: "laserBurn.dissolve",
  synth: (ctx, dest) =>
    playNoiseBurst(ctx, dest, { durationMs: LASER_BURN.dissolveMs, filterFreqHz: 2200, gainPeak: 0.35 }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/laserBurnCues.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for the EffectSystem cue hook**

```ts
// tests/unit/effectSystemAudio.test.ts
import { describe, expect, it } from "vitest";
import { EffectSystem, EASE_LINEAR, type EffectDef, type WorldAPI, type AudioEngineLike } from "../../src/effects/EffectSystem";
import { ParticleSystem } from "../../src/effects/ParticleSystem";
import { Rng } from "../../src/core/Rng";
import type { Entity, EntityId } from "../../src/entities/Entity";

function makeEntity(id: EntityId): Entity {
  return {
    id,
    physics: { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, home: { x: 0, y: 0 }, scale: 1 },
    lifecycle: { alive: true, dying: false, dragged: false, respawnAt: null },
    content: { palette: {} },
    behavior: { data: {} },
  } as unknown as Entity;
}

describe("effects/EffectSystem audio cue wiring", () => {
  it("plays each stage's cue as that stage starts", () => {
    const played: string[] = [];
    const audio: AudioEngineLike = { play: (id) => played.push(id) };
    const entity = makeEntity(1 as EntityId);
    const world: WorldAPI = {
      getEntity: () => entity,
      markDying: () => {},
      startRespawn: () => {},
    };
    const particles = new ParticleSystem(new Rng(1), 8);
    const system = new EffectSystem(particles, new Rng(1), world, audio);
    const def: EffectDef = {
      id: "test.cueOrder",
      stages: [
        { durationMs: 10, easing: EASE_LINEAR, cue: "test.a", update: () => {} },
        { durationMs: 10, easing: EASE_LINEAR, cue: "test.b", update: () => {} },
      ],
    };
    system.register(def);
    system.start("test.cueOrder", 1 as EntityId, { x: 0, y: 0 }, 0);
    expect(played).toEqual(["test.a"]);
    system.update(11);
    expect(played).toEqual(["test.a", "test.b"]);
  });

  it("does not play a cue for a stage that has none", () => {
    const played: string[] = [];
    const audio: AudioEngineLike = { play: (id) => played.push(id) };
    const entity = makeEntity(2 as EntityId);
    const world: WorldAPI = {
      getEntity: () => entity,
      markDying: () => {},
      startRespawn: () => {},
    };
    const particles = new ParticleSystem(new Rng(1), 8);
    const system = new EffectSystem(particles, new Rng(1), world, audio);
    const def: EffectDef = {
      id: "test.noCue",
      stages: [{ durationMs: 10, easing: EASE_LINEAR, update: () => {} }],
    };
    system.register(def);
    system.start("test.noCue", 2 as EntityId, { x: 0, y: 0 }, 0);
    expect(played).toEqual([]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/unit/effectSystemAudio.test.ts`
Expected: FAIL with a type error / runtime error — `EffectStage` has no `cue` field yet and `EffectSystem`'s constructor takes 3 args, not 4.

- [ ] **Step 7: Add the cue hook to EffectSystem.ts**

Modify `src/effects/EffectSystem.ts`:

```ts
export type EffectStage = {
  durationMs: number;
  easing: EffectEasing;
  cue?: string;
  onStart?: (ctx: EffectCtx) => void;
  update: (ctx: EffectCtx, t: number) => void;
};
```

```ts
export type AudioEngineLike = {
  play(cueId: string): void;
};
```

```ts
export type EffectCtx = {
  entity: Entity;
  target: Vec2;
  particles: ParticleSystem;
  rng: import("../core/Rng").Rng;
  world: WorldAPI;
  audio: AudioEngineLike;
  stageIndex: number;
  effect: ActiveEffect;
};
```

```ts
export class EffectSystem {
  private effects: ActiveEffect[] = [];
  private nextId = 1;
  private readonly defs = new Map<string, EffectDef>();
  private readonly particles: ParticleSystem;
  private readonly rng: import("../core/Rng").Rng;
  private readonly world: WorldAPI;
  private readonly audio: AudioEngineLike;

  constructor(particles: ParticleSystem, rng: import("../core/Rng").Rng, world: WorldAPI, audio: AudioEngineLike) {
    this.particles = particles;
    this.rng = rng;
    this.world = world;
    this.audio = audio;
  }
```

In `start()`, add `audio: this.audio,` to the `ctx` object literal, and fire the first stage's cue right after `onStart`:

```ts
    const ctx: EffectCtx = {
      entity,
      target,
      particles: this.particles,
      rng: this.rng,
      world: this.world,
      audio: this.audio,
      stageIndex: 0,
      effect,
    };
    const stage = def.stages[0]!;
    stage.onStart?.(ctx);
    if (stage.cue) this.audio.play(stage.cue);
    return effect;
```

In `update()`, add `audio: this.audio,` to the `ctx` object literal inside the `while` loop, and fire the next stage's cue right after its `onStart`:

```ts
        const ctx: EffectCtx = {
          entity,
          target: effect.target,
          particles: this.particles,
          rng: this.rng,
          world: this.world,
          audio: this.audio,
          stageIndex: effect.stageIndex,
          effect,
        };
        stage.update(ctx, t);
        if (tRaw >= 1) {
          const nextStart = effect.stageStartedAtMs + stage.durationMs;
          effect.stageIndex++;
          effect.stageStartedAtMs = nextStart;
          if (effect.stageIndex >= def.stages.length) {
            effect.done = true;
          } else {
            const next = def.stages[effect.stageIndex]!;
            next.onStart?.(ctx);
            if (next.cue) this.audio.play(next.cue);
          }
        } else {
          break;
        }
```

- [ ] **Step 8: Set `cue` on laserBurn's glow and dissolve stages**

Modify `src/effects/effectDefs/laserBurn.ts` — add `cue: "laserBurn.glow",` to the first stage object (glow) and `cue: "laserBurn.dissolve",` to the fourth stage object (dissolve, alongside its existing `onStart`):

```ts
    {
      durationMs: LASER_BURN.glowMs,
      easing: LASER_BURN.glowEase,
      cue: "laserBurn.glow",
      update: (ctx, t) => {
        ctx.entity.physics.scale = (1 - t * 0.18);
      },
    },
```

```ts
    {
      durationMs: LASER_BURN.dissolveMs,
      easing: LASER_BURN.dissolveEase,
      cue: "laserBurn.dissolve",
      onStart: (ctx) => {
```

(the rest of the `dissolve` stage's `onStart` body and its `update` are unchanged)

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run tests/unit/effectSystemAudio.test.ts tests/unit/laserBurnCues.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 10: Run the full existing effects test suite to confirm nothing else broke**

Run: `npx vitest run tests/unit`
Expected: PASS — note any other file constructing `new EffectSystem(...)` with 3 args will now fail to typecheck; fix those call sites to pass a 4th `AudioEngineLike` argument (a fake with a no-op `play` is sufficient in tests unrelated to audio).

- [ ] **Step 11: Commit**

```bash
git add src/audio/cues/laserBurnCues.ts src/effects/EffectSystem.ts src/effects/effectDefs/laserBurn.ts tests/unit/laserBurnCues.test.ts tests/unit/effectSystemAudio.test.ts
git commit -m "feat(audio): add EffectStage cue hook and wire laserBurn cues"
```

---

### Task 6: electricBurn/bugEat cue registration + wiring

**Files:**
- Create: `src/audio/cues/electricBurnCues.ts`
- Create: `src/audio/cues/bugEatCues.ts`
- Modify: `src/effects/effectDefs/electricBurn.ts` (from the prerequisite v2-expansion plan)
- Modify: `src/effects/effectDefs/bugEat.ts` (from the prerequisite v2-expansion plan)
- Test: `tests/unit/electricBurnCues.test.ts`
- Test: `tests/unit/bugEatCues.test.ts`
- Test: `tests/unit/damageCueWiring.test.ts`

**Interfaces:**
- Consumes: `registerAudioCue`, `playTone`, `playNoiseBurst` (Task 1); `electricBurnEffect: EffectDef` exported from `electricBurn.ts` and `bugEatEffect: EffectDef` exported from `bugEat.ts` (same export-naming convention as `laserBurnEffect` from `laserBurn.ts`) — if the prerequisite plan named these exports differently, use the real names.
- Produces: registers cue ids `"electricBurn.start"`, `"electricBurn.dissolve"`, `"bugEat.start"`, `"bugEat.dissolve"`.

- [ ] **Step 1: Write the failing test for electricBurn cues**

```ts
// tests/unit/electricBurnCues.test.ts
import { describe, expect, it } from "vitest";
import "../../src/audio/cues/electricBurnCues";
import { getAudioCue } from "../../src/audio/audioCueRegistry";

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createOscillator() {
    return { type: "sine", frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, value: 1 }, connect() {} };
  }
  createBufferSource() {
    return { buffer: null, connect() {}, start() {}, stop() {} };
  }
  createBiquadFilter() {
    return { type: "", frequency: { value: 0 }, connect() {} };
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

describe("audio/cues/electricBurnCues", () => {
  it.each(["electricBurn.start", "electricBurn.dissolve"])("registers %s", (id) => {
    const entry = getAudioCue(id);
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/electricBurnCues.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/cues/electricBurnCues'"

- [ ] **Step 3: Implement electricBurn cues**

```ts
// src/audio/cues/electricBurnCues.ts
import { registerAudioCue } from "../audioCueRegistry";
import { playTone, playNoiseBurst } from "../synthToolkit";

registerAudioCue({
  id: "electricBurn.start",
  synth: (ctx, dest) => {
    playTone(ctx, dest, { freqStartHz: 180, freqEndHz: 60, durationMs: 90, shape: "square", gainPeak: 0.25 });
    playNoiseBurst(ctx, dest, { durationMs: 90, filterFreqHz: 3000, gainPeak: 0.2 });
  },
});

registerAudioCue({
  id: "electricBurn.dissolve",
  synth: (ctx, dest) => playNoiseBurst(ctx, dest, { durationMs: 140, filterFreqHz: 2600, gainPeak: 0.3 }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/electricBurnCues.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for bugEat cues**

```ts
// tests/unit/bugEatCues.test.ts
import { describe, expect, it } from "vitest";
import "../../src/audio/cues/bugEatCues";
import { getAudioCue } from "../../src/audio/audioCueRegistry";

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createBufferSource() {
    return { buffer: null, connect() {}, start() {}, stop() {} };
  }
  createBiquadFilter() {
    return { type: "", frequency: { value: 0 }, connect() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, value: 1 }, connect() {} };
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

describe("audio/cues/bugEatCues", () => {
  it.each(["bugEat.start", "bugEat.dissolve"])("registers %s", (id) => {
    const entry = getAudioCue(id);
    const ctx = new FakeAudioContext() as unknown as AudioContext;
    expect(() => entry.synth(ctx, ctx.destination as unknown as AudioNode)).not.toThrow();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/unit/bugEatCues.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/cues/bugEatCues'"

- [ ] **Step 7: Implement bugEat cues**

```ts
// src/audio/cues/bugEatCues.ts
import { registerAudioCue } from "../audioCueRegistry";
import { playNoiseBurst } from "../synthToolkit";

registerAudioCue({
  id: "bugEat.start",
  synth: (ctx, dest) => {
    for (let i = 0; i < 4; i++) {
      playNoiseBurst(ctx, dest, { durationMs: 30, filterFreqHz: 3500 + i * 400, gainPeak: 0.15 });
    }
  },
});

registerAudioCue({
  id: "bugEat.dissolve",
  synth: (ctx, dest) => playNoiseBurst(ctx, dest, { durationMs: 100, filterFreqHz: 1800, gainPeak: 0.25 }),
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/unit/bugEatCues.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Write the failing test for the effectDef wiring**

```ts
// tests/unit/damageCueWiring.test.ts
import { describe, expect, it } from "vitest";
import { electricBurnEffect } from "../../src/effects/effectDefs/electricBurn";
import { bugEatEffect } from "../../src/effects/effectDefs/bugEat";

describe("damage effectDef cue wiring", () => {
  it("electricBurn's first stage plays electricBurn.start", () => {
    expect(electricBurnEffect.stages[0]!.cue).toBe("electricBurn.start");
  });

  it("electricBurn has a stage that plays electricBurn.dissolve", () => {
    expect(electricBurnEffect.stages.some((s) => s.cue === "electricBurn.dissolve")).toBe(true);
  });

  it("bugEat's first stage plays bugEat.start", () => {
    expect(bugEatEffect.stages[0]!.cue).toBe("bugEat.start");
  });

  it("bugEat has a stage that plays bugEat.dissolve", () => {
    expect(bugEatEffect.stages.some((s) => s.cue === "bugEat.dissolve")).toBe(true);
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run tests/unit/damageCueWiring.test.ts`
Expected: FAIL — neither stage array has a `cue` field set yet.

- [ ] **Step 11: Wire cues into the effectDef stages**

In `src/effects/effectDefs/electricBurn.ts`: add `cue: "electricBurn.start",` to the first entry in the `stages: [...]` array (index 0). Find the stage whose `onStart` calls `ctx.world.startRespawn(...)` (the stage that ends the effect and schedules respawn — the same structural role as `laserBurn.ts`'s dissolve stage) and add `cue: "electricBurn.dissolve",` to that same stage object, alongside its existing properties.

In `src/effects/effectDefs/bugEat.ts`: apply the same two edits with `cue: "bugEat.start"` on the first stage and `cue: "bugEat.dissolve"` on the stage that calls `ctx.world.startRespawn(...)`.

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run tests/unit/damageCueWiring.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 13: Commit**

```bash
git add src/audio/cues/electricBurnCues.ts src/audio/cues/bugEatCues.ts src/effects/effectDefs/electricBurn.ts src/effects/effectDefs/bugEat.ts tests/unit/electricBurnCues.test.ts tests/unit/bugEatCues.test.ts tests/unit/damageCueWiring.test.ts
git commit -m "feat(audio): register and wire electricBurn/bugEat cues"
```

---

### Task 7: Ambient per-mode textures + tense filler

**Files:**
- Create: `src/audio/ambientBeds.ts`
- Test: `tests/unit/ambientBeds.test.ts`

**Interfaces:**
- Consumes: `AudioEngine.getContext()`, `AudioEngine.getBus("sfx")` (Task 2).
- Produces: `startAmbientForMode(engine: AudioEngine, modeId: string): void`, `stopAmbientMode(): void`, `startTenseFiller(engine: AudioEngine): void`, `stopTenseFiller(): void`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ambientBeds.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { AudioEngine } from "../../src/audio/AudioEngine";
import { startAmbientForMode, stopAmbientMode, startTenseFiller, stopTenseFiller } from "../../src/audio/ambientBeds";

class FakeParam {
  value = 0;
}

class FakeBufferSource {
  buffer: unknown = null;
  loop = false;
  stopCalls = 0;
  connect() {}
  disconnect() {}
  start() {}
  stop() { this.stopCalls++; }
}

class FakeFilter {
  type = "";
  frequency = new FakeParam();
  connect() {}
  disconnect() {}
}

class FakeGainNode {
  gain = new FakeParam();
  connect() {}
  disconnect() {}
}

class FakeAudioContext {
  destination = {};
  currentTime = 0;
  sampleRate = 44100;
  state: "suspended" | "running" = "suspended";
  bufferSourcesCreated = 0;
  createGain(): FakeGainNode { return new FakeGainNode(); }
  createBufferSource(): FakeBufferSource {
    this.bufferSourcesCreated++;
    return new FakeBufferSource();
  }
  createBiquadFilter(): FakeFilter { return new FakeFilter(); }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  resume(): Promise<void> { return Promise.resolve(); }
}

describe("audio/ambientBeds", () => {
  let ctx: FakeAudioContext;
  let engine: AudioEngine;

  beforeEach(() => {
    ctx = new FakeAudioContext();
    engine = new AudioEngine(ctx as unknown as AudioContext);
  });

  it("starts a looping texture for a known mode", () => {
    startAmbientForMode(engine, "bugs");
    expect(ctx.bufferSourcesCreated).toBe(1);
    stopAmbientMode();
  });

  it("no-ops for an unknown mode id", () => {
    startAmbientForMode(engine, "not-a-real-mode");
    expect(ctx.bufferSourcesCreated).toBe(0);
  });

  it("switching mode stops the previous loop before starting the next", () => {
    startAmbientForMode(engine, "bugs");
    startAmbientForMode(engine, "pointedFinger");
    expect(ctx.bufferSourcesCreated).toBe(2);
    stopAmbientMode();
  });

  it("starting the tense filler twice does not create a second loop", () => {
    startTenseFiller(engine);
    startTenseFiller(engine);
    expect(ctx.bufferSourcesCreated).toBe(1);
    stopTenseFiller();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ambientBeds.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/ambientBeds'"

- [ ] **Step 3: Implement ambientBeds**

```ts
// src/audio/ambientBeds.ts
import type { AudioEngine } from "./AudioEngine";

export type AmbientHandle = { stop(): void };

type TextureSpec = {
  durationMs: number;
  filterFreqHz: number;
  gainPeak: number;
};

const MODE_TEXTURES: Record<string, TextureSpec> = {
  bugs: { durationMs: 900, filterFreqHz: 3200, gainPeak: 0.12 },
  pointedFinger: { durationMs: 1400, filterFreqHz: 140, gainPeak: 0.1 },
};

const TENSE_FILLER: TextureSpec = { durationMs: 4000, filterFreqHz: 260, gainPeak: 0.08 };

function loopTexture(ctx: AudioContext, destination: AudioNode, spec: TextureSpec): AmbientHandle {
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * (spec.durationMs / 1000)));
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = spec.filterFreqHz;
  const gain = ctx.createGain();
  gain.gain.value = spec.gainPeak;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(ctx.currentTime);
  return {
    stop: () => {
      source.stop();
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    },
  };
}

let activeModeAmbient: AmbientHandle | null = null;
let activeTenseFiller: AmbientHandle | null = null;

export function startAmbientForMode(engine: AudioEngine, modeId: string): void {
  stopAmbientMode();
  const spec = MODE_TEXTURES[modeId];
  if (!spec) return;
  activeModeAmbient = loopTexture(engine.getContext(), engine.getBus("sfx"), spec);
}

export function stopAmbientMode(): void {
  activeModeAmbient?.stop();
  activeModeAmbient = null;
}

export function startTenseFiller(engine: AudioEngine): void {
  if (activeTenseFiller) return;
  activeTenseFiller = loopTexture(engine.getContext(), engine.getBus("sfx"), TENSE_FILLER);
}

export function stopTenseFiller(): void {
  activeTenseFiller?.stop();
  activeTenseFiller = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ambientBeds.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/audio/ambientBeds.ts tests/unit/ambientBeds.test.ts
git commit -m "feat(audio): add per-mode ambient loops and tense filler texture"
```

---

### Task 8: Background music bed

**Files:**
- Create: `src/audio/musicBed.ts`
- Test: `tests/unit/musicBed.test.ts`

**Interfaces:**
- Consumes: `AudioEngine.getContext()`, `AudioEngine.getBus("music")` (Task 2).
- Produces: `startMusicBed(engine: AudioEngine, url: string): Promise<{ stop(): void }>`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/musicBed.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { AudioEngine } from "../../src/audio/AudioEngine";
import { startMusicBed } from "../../src/audio/musicBed";

class FakeGainNode {
  gain = { value: 1 };
  connect() {}
}

class FakeBufferSource {
  buffer: unknown = null;
  loop = false;
  connectedTo: unknown[] = [];
  stopCalls = 0;
  connect(dest: unknown) { this.connectedTo.push(dest); }
  disconnect() {}
  start() {}
  stop() { this.stopCalls++; }
}

class FakeAudioContext {
  destination = {};
  currentTime = 0;
  sampleRate = 44100;
  state: "suspended" | "running" = "suspended";
  createGain(): FakeGainNode { return new FakeGainNode(); }
  createBufferSource(): FakeBufferSource { return new FakeBufferSource(); }
  decodeAudioData(_data: ArrayBuffer): Promise<unknown> {
    return Promise.resolve({ duration: 30 });
  }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    return { duration: length / sampleRate };
  }
  resume(): Promise<void> { return Promise.resolve(); }
}

describe("audio/musicBed", () => {
  let ctx: FakeAudioContext;
  let engine: AudioEngine;

  beforeEach(() => {
    ctx = new FakeAudioContext();
    engine = new AudioEngine(ctx as unknown as AudioContext);
  });

  it("loops the decoded buffer through the music bus on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
    const handle = await startMusicBed(engine, "/audio/music-bed.mp3");
    expect(typeof handle.stop).toBe("function");
    vi.unstubAllGlobals();
  });

  it("falls back to a silent buffer if the asset fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("404")));
    const handle = await startMusicBed(engine, "/audio/music-bed.mp3");
    expect(typeof handle.stop).toBe("function");
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/musicBed.test.ts`
Expected: FAIL with "Cannot find module '../../src/audio/musicBed'"

- [ ] **Step 3: Implement musicBed**

```ts
// src/audio/musicBed.ts
import type { AudioEngine } from "./AudioEngine";

export type MusicBedHandle = { stop(): void };

export async function startMusicBed(engine: AudioEngine, url: string): Promise<MusicBedHandle> {
  const ctx = engine.getContext();
  let buffer: AudioBuffer;
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    buffer = (await ctx.decodeAudioData(arrayBuffer)) as AudioBuffer;
  } catch {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate) as AudioBuffer;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(engine.getBus("music"));
  source.start(ctx.currentTime);
  return {
    stop: () => {
      source.stop();
      source.disconnect();
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/musicBed.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/audio/musicBed.ts tests/unit/musicBed.test.ts
git commit -m "feat(audio): add looping music bed with silent-buffer fallback"
```

---

### Task 9: AudioControl HUD component (mute toggle + volume slider)

**Files:**
- Create: `src/hud/AudioControl.ts`
- Create: `src/hud/audioControl.css`
- Modify: `src/main.ts` (import the new stylesheet — see Task 10 for the rest of the wiring)
- Test: `tests/unit/audioControl.test.ts`

**Interfaces:**
- Consumes: `PALETTE` from `src/config/tokens.ts` (existing); `var(--ease-spring)`, `var(--duration-fast)`, `var(--duration-slow)`, `var(--z-hud)` (existing tokens, `--ease-spring` added by the subject-browser-premium-hud plan).
- Produces: `export type AudioControlEngine = { setMasterVolume(v: number): void; getMasterVolume(): number; toggleMute(): boolean; isMuted(): boolean }`; `class AudioControl { constructor(host: HTMLElement, engine: AudioControlEngine); isMuted(): boolean; getVolume(): number }`. `AudioEngine` (Task 2) already satisfies `AudioControlEngine` structurally — no adapter needed.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/audioControl.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { AudioControl, type AudioControlEngine } from "../../src/hud/AudioControl";
// @vitest-environment happy-dom

function makeFakeEngine(): AudioControlEngine & { muted: boolean; volume: number } {
  return {
    muted: false,
    volume: 0.8,
    isMuted() { return this.muted; },
    getMasterVolume() { return this.volume; },
    toggleMute() { this.muted = !this.muted; return this.muted; },
    setMasterVolume(v: number) { this.volume = v; },
  };
}

describe("hud/AudioControl", () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.querySelector<HTMLElement>("#host")!;
  });

  it("mounts a toggle button and a volume slider bound to the engine's current volume", () => {
    new AudioControl(host, makeFakeEngine());
    expect(host.querySelector(".audio-control__toggle")).not.toBeNull();
    expect(host.querySelector<HTMLInputElement>(".audio-control__slider")?.value).toBe("0.8");
  });

  it("clicking the toggle mutes the engine and flips the muted dataset", () => {
    const engine = makeFakeEngine();
    const control = new AudioControl(host, engine);
    host.querySelector<HTMLButtonElement>(".audio-control__toggle")!.click();
    expect(engine.muted).toBe(true);
    expect(control.isMuted()).toBe(true);
    expect(host.querySelector<HTMLElement>(".audio-control")!.dataset.muted).toBe("true");
  });

  it("moving the slider updates the engine's master volume", () => {
    const engine = makeFakeEngine();
    const control = new AudioControl(host, engine);
    const slider = host.querySelector<HTMLInputElement>(".audio-control__slider")!;
    slider.value = "0.3";
    slider.dispatchEvent(new Event("input"));
    expect(engine.volume).toBe(0.3);
    expect(control.getVolume()).toBe(0.3);
  });

  it("uses only the locked palette colors in the rendered HTML", () => {
    new AudioControl(host, makeFakeEngine());
    const html = host.innerHTML;
    const banned = ["#aa3bff", "#646cff", "#ffffff", "#000000", "system-ui", "Inter"];
    for (const b of banned) {
      expect(html.toLowerCase()).not.toContain(b.toLowerCase());
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/audioControl.test.ts`
Expected: FAIL with "Cannot find module '../../src/hud/AudioControl'"

- [ ] **Step 3: Implement AudioControl**

```ts
// src/hud/AudioControl.ts
import { PALETTE } from "../config/tokens";

export type AudioControlEngine = {
  setMasterVolume(v: number): void;
  getMasterVolume(): number;
  toggleMute(): boolean;
  isMuted(): boolean;
};

const SPEAKER_ON_PATH = "M4 10v4h4l5 4V6l-5 4H4z M15 9c1.2 1 1.2 5 0 6 M17.5 7c2.2 2 2.2 8 0 10";
const SPEAKER_MUTED_PATH = "M4 10v4h4l5 4V6l-5 4H4z M15 9l6 6 M21 9l-6 6";

export class AudioControl {
  private readonly placard: HTMLElement;
  private readonly toggleBtn: HTMLButtonElement;
  private readonly iconHost: HTMLElement;
  private readonly slider: HTMLInputElement;
  private readonly engine: AudioControlEngine;

  constructor(host: HTMLElement, engine: AudioControlEngine) {
    this.engine = engine;
    this.placard = document.createElement("div");
    this.placard.className = "audio-control";
    this.placard.setAttribute("role", "group");
    this.placard.setAttribute("aria-label", "Sound controls");
    this.placard.innerHTML = `
      <button type="button" class="audio-control__toggle">
        <span class="audio-control__icon" aria-hidden="true"></span>
      </button>
      <input type="range" class="audio-control__slider" min="0" max="1" step="0.01" aria-label="Volume" />
    `;
    host.appendChild(this.placard);
    this.toggleBtn = this.placard.querySelector<HTMLButtonElement>(".audio-control__toggle")!;
    this.iconHost = this.placard.querySelector<HTMLElement>(".audio-control__icon")!;
    this.slider = this.placard.querySelector<HTMLInputElement>(".audio-control__slider")!;
    this.slider.value = String(engine.getMasterVolume());
    this.refreshIcon();
    this.toggleBtn.addEventListener("click", () => {
      engine.toggleMute();
      this.refreshIcon();
    });
    this.slider.addEventListener("input", () => {
      engine.setMasterVolume(Number(this.slider.value));
    });
    requestAnimationFrame(() => this.placard.classList.add("audio-control--ready"));
  }

  private refreshIcon(): void {
    const muted = this.engine.isMuted();
    this.placard.dataset.muted = muted ? "true" : "false";
    this.toggleBtn.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
    this.iconHost.innerHTML =
      `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${PALETTE.ink}" stroke-width="1.5" ` +
      `stroke-linecap="round" stroke-linejoin="round"><path d="${muted ? SPEAKER_MUTED_PATH : SPEAKER_ON_PATH}"/></svg>`;
  }

  isMuted(): boolean {
    return this.engine.isMuted();
  }

  getVolume(): number {
    return this.engine.getMasterVolume();
  }
}
```

```css
/* src/hud/audioControl.css */
.audio-control {
  position: fixed;
  right: 16px;
  bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-hud);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--color-cream);
  border: 1px solid var(--color-ink);
  border-radius: 999px;
  opacity: 0;
  transform: translateY(12px) scale(0.95);
  transition: transform var(--duration-slow) var(--ease-spring),
              opacity var(--duration-slow) var(--ease-spring);
}

.audio-control--ready {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.audio-control::before {
  content: "";
  position: absolute;
  inset: 3px -3px -3px 3px;
  background: var(--color-ink);
  opacity: 0.12;
  border-radius: inherit;
  z-index: -1;
}

.audio-control__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring);
}

.audio-control__toggle:active {
  transform: scale(0.9);
}

.audio-control__slider {
  width: 90px;
  accent-color: var(--color-coral);
}

@media (prefers-reduced-motion: reduce) {
  .audio-control {
    transition: none;
    transform: none;
    opacity: 1;
  }
  .audio-control__toggle {
    transition: none;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/audioControl.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hud/AudioControl.ts src/hud/audioControl.css tests/unit/audioControl.test.ts
git commit -m "feat(hud): add premium mute/volume AudioControl placard"
```

---

### Task 10: main.ts wiring — construct AudioEngine, mount AudioControl, autoplay unlock

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `AudioEngine` (Task 2), `AudioControl` (Task 9), `startAmbientForMode`/`stopAmbientMode`/`startTenseFiller` (Task 7), `startMusicBed` (Task 8), the cue-registration side-effect modules from Tasks 3-6 (`hudCues.ts`, `chargeRespawnCues.ts`, `laserBurnCues.ts`, `electricBurnCues.ts`, `bugEatCues.ts`), the 4-arg `EffectSystem` constructor (Task 5).

This task has no automated test — `main.ts` is the app's composition root and isn't unit-tested elsewhere in this codebase (confirmed: no `main.test.ts` exists). Verify it manually with `npm run dev` per Step 5.

- [ ] **Step 1: Import the new modules**

At the top of `src/main.ts`, alongside the existing imports (after the `import { Hud } from "./hud/Hud";` line):

```ts
import "./audio/cues/hudCues";
import "./audio/cues/chargeRespawnCues";
import "./audio/cues/laserBurnCues";
import "./audio/cues/electricBurnCues";
import "./audio/cues/bugEatCues";
import { AudioEngine } from "./audio/AudioEngine";
import { AudioControl } from "./hud/AudioControl";
import { startAmbientForMode, startTenseFiller } from "./audio/ambientBeds";
import { startMusicBed } from "./audio/musicBed";
```

And add the new stylesheet next to the existing `import "./hud/hud.css";` line:

```ts
import "./hud/audioControl.css";
```

- [ ] **Step 2: Construct the AudioEngine and mount AudioControl**

Immediately after the existing line `const hud = new Hud(hudRoot);` in `src/main.ts`, add:

```ts
const audioEngine = new AudioEngine(new AudioContext());
new AudioControl(document.body, audioEngine);
```

- [ ] **Step 3: Pass the AudioEngine into EffectSystem**

Change the existing line:

```ts
const effects = new EffectSystem(particles, rng, worldAPI);
```

to:

```ts
const effects = new EffectSystem(particles, rng, worldAPI, audioEngine);
```

- [ ] **Step 4: Wire the autoplay-unlock listener and initial ambient state**

After the existing `spawnInitialEyes();` / `pointer.attach();` / `engine.start();` lines at the bottom of `src/main.ts`, add:

```ts
const unlockAudio = (): void => {
  audioEngine.unlock();
  void startMusicBed(audioEngine, "/audio/music-bed.mp3");
  startTenseFiller(audioEngine);
  startAmbientForMode(audioEngine, "eyes");
};
document.addEventListener("pointerdown", unlockAudio, { once: true });
```

Separately: wherever the app's mode-selector calls `hud.setMode(nextMode)` in response to a mode change (added by the prerequisite v2-expansion plan), add `startAmbientForMode(audioEngine, nextMode)` immediately after that call, so the ambient loop follows the active crowd mode instead of staying locked to `"eyes"`.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open the app in a browser, click/tap anywhere on the page.
Expected: no console errors; a mute/volume pill appears bottom-right; clicking a laser-burn target produces an audible zap-to-crackle-to-dissolve sequence; dragging the volume slider changes loudness; clicking the mute icon silences everything (including the tense filler texture, audible as a very quiet background hum); a placeholder silent music bed loads without a 404 console error being thrown to the page (network tab will show the missing `/audio/music-bed.mp3` 404 until the asset is supplied).

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS across all `tests/unit/*.test.ts` files.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts
git commit -m "feat(audio): wire AudioEngine, AudioControl, and autoplay unlock into main.ts"
```

---

## Spec Coverage

| Spec section | Task(s) |
|---|---|
| §1 Architecture — `AudioEngine.ts` (buses, mute/volume) | Task 2 |
| §1 Architecture — `audioCueRegistry.ts` | Task 1 |
| §1 Architecture — `ambientBeds.ts` | Task 7 |
| §1 Architecture — `musicBed.ts` | Task 8 |
| §1 Wiring — `EffectStage.onStart` cue trigger, `main.ts` composition, `Hud.ts`-equivalent click handlers | Tasks 5, 9, 10 |
| §2 Cue catalog — laserBurn | Task 5 |
| §2 Cue catalog — electricBurn / bugEat | Task 6 |
| §2 Cue catalog — ambient idle (bugs, pointedFinger) | Task 7 |
| §2 Cue catalog — ambient tense filler | Task 7 |
| §2 Cue catalog — background music bed | Task 8 |
| §2 Cue catalog — HUD feedback | Task 3 |
| §2 Cue catalog — charge/respawn | Task 4 |
| §2 "only one ambient idle loop at a time" | Task 7 (`startAmbientForMode` stops the previous loop) |
| §3 Volume & mute control (premium placard, slider) | Task 9 |
| §4 Autoplay unlock (first pointerdown, resume + start beds) | Task 10 |
| §5 Accessibility (single mute toggle, default unmuted) | Task 2 (`masterVolume = 0.8`, `muted = false` by default), Task 9 |
| §6 File structure | File Structure section above; Tasks 1-10 |
| §7 Testing (mock AudioContext, registry structural tests, fake-engine integration tests) | Every task's test step |
| Open question — placeholder silence until mp3 supplied | Task 8 |

## Self-Review

**Spec coverage:** every numbered section of `2026-07-25-fun-satire-audio-design.md` maps to at least one task (see table above). No gaps found.

**Placeholder scan:** no "TBD"/"TODO"/"add appropriate error handling" phrases appear in any task. The one `try/catch` (Task 8, music bed) is spec-mandated (Open Questions), not defensive filler. The `bugEat.ts`/`electricBurn.ts` edits in Task 6 use a structural marker ("the stage whose `onStart` calls `ctx.world.startRespawn`") instead of fabricated line numbers, since those files don't exist yet at plan-writing time — this is a deliberate, disclosed exception, not a vague placeholder; it's still a concrete, grep-able instruction.

**Type consistency:** `AudioEngineLike` (Task 5, defined in `EffectSystem.ts`) is structurally satisfied by `AudioEngine` (Task 2) without an adapter — both expose `play(cueId: string): void`. `AudioControlEngine` (Task 9) is likewise structurally satisfied by `AudioEngine`'s `setMasterVolume`/`getMasterVolume`/`toggleMute`/`isMuted`. Cue id strings are consistent between registration (Tasks 3-6) and their trigger sites (Task 5 stage `cue` fields, Task 6 wiring instructions, Task 10's future mode-change extension). The `EffectSystem` constructor's 4th parameter is introduced in Task 5 and its only call site in `main.ts` is updated in Task 10 — no other files construct `EffectSystem` in the current codebase (confirmed via the file structure exploration for this plan).
