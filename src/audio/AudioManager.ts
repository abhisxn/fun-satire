/** Default sound bed asset, served from public/audio/azaadi.mp3. */
export const AUDIO_BED_SRC = "/audio/azaadi.mp3";

export interface AudioManagerOptions {
  src?: string;
  volume?: number;
}

type LegacyWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

function resolveAudioContextConstructor(): typeof AudioContext | null {
  const w = window as LegacyWindow;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

/** How long before the loop boundary the next cycle starts, overlapping with the outgoing one. */
const CROSSFADE_SEC = 2.5;

/** How long a manual mute/volume change ramps, so toggling never hard-cuts the bed. */
const VOLUME_RAMP_SEC = 0.25;

interface CrossfadeState {
  readonly standbyIndex: 0 | 1;
  readonly startedAtMs: number;
}

/**
 * Wraps two alternating looping <audio> elements for the background sound
 * bed (crossfading between them near the loop boundary instead of letting
 * the native `loop` attribute hard-cut back to frame 0), and owns the one
 * shared AudioContext used by the hover tones in src/audio/hoverTones.ts.
 * A single shared context avoids allocating a new AudioContext per hover —
 * browsers rate-limit context creation and it is wasteful to construct one
 * repeatedly for short one-shot blips.
 */
export class AudioManager {
  private readonly beds: readonly [HTMLAudioElement, HTMLAudioElement];
  private activeIndex: 0 | 1 = 0;
  private volume: number;
  private muted = false;
  private playing = false;
  private crossfadeState: CrossfadeState | null = null;
  private rafId: number | null = null;
  private rampRafId: number | null = null;
  private context: AudioContext | null = null;
  private contextResumeArmed = false;
  private readonly onTimeUpdate = (): void => this.checkCrossfadeTrigger();
  private readonly retryContextResume = (): void => {
    if (!this.context || this.context.state !== "suspended") {
      this.disarmContextResumeRetry();
      return;
    }
    void this.context.resume().catch(() => {});
  };

  constructor(options: AudioManagerOptions = {}) {
    const src = options.src ?? AUDIO_BED_SRC;
    this.volume = clampVolume(options.volume ?? 0.5);
    this.beds = [this.createBed(src), this.createBed(src)];
  }

  private createBed(src: string): HTMLAudioElement {
    const audio = new Audio(src);
    // Looping is driven manually by the crossfade scheduler below, so the
    // native attribute (which would hard-cut back to frame 0) stays off.
    audio.loop = false;
    audio.volume = 0;
    audio.addEventListener("timeupdate", this.onTimeUpdate);
    return audio;
  }

  private get active(): HTMLAudioElement {
    return this.beds[this.activeIndex];
  }

  play(): Promise<void> {
    this.playing = true;
    this.active.volume = this.effectiveVolume();
    return this.active.play();
  }

  pause(): void {
    this.playing = false;
    this.cancelCrossfade();
    this.cancelVolumeRamp();
    for (const bed of this.beds) bed.pause();
  }

  /** Reflects the active bed's real playback state — never an optimistic flag. */
  isPlaying(): boolean {
    return !this.active.paused;
  }

  setVolume(volume: number): void {
    this.volume = clampVolume(volume);
    this.applyVolumeToActive();
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolumeToActive();
  }

  isMuted(): boolean {
    return this.muted;
  }

  private effectiveVolume(): number {
    return this.muted ? 0 : this.volume;
  }

  /** No-op mid-crossfade: the rAF tick in tickCrossfade() owns both beds' volume then. */
  private applyVolumeToActive(): void {
    if (this.crossfadeState) return;
    this.rampVolumeTo(this.effectiveVolume());
  }

  /** Ramps the active bed's volume smoothly instead of snapping it, so mute/unmute never hard-cuts. */
  private rampVolumeTo(target: number): void {
    this.cancelVolumeRamp();
    const bed = this.active;
    const start = bed.volume;
    if (start === target) return;

    const startedAtMs = performance.now();
    const tick = (): void => {
      const t = Math.min(1, (performance.now() - startedAtMs) / 1000 / VOLUME_RAMP_SEC);
      bed.volume = start + (target - start) * t;
      if (t >= 1) {
        this.rampRafId = null;
        return;
      }
      this.rampRafId = requestAnimationFrame(tick);
    };
    this.rampRafId = requestAnimationFrame(tick);
  }

  private cancelVolumeRamp(): void {
    if (this.rampRafId !== null) {
      cancelAnimationFrame(this.rampRafId);
      this.rampRafId = null;
    }
  }

  private checkCrossfadeTrigger(): void {
    if (!this.playing || this.crossfadeState) return;
    const bed = this.active;
    if (!Number.isFinite(bed.duration) || bed.duration <= 0) return;
    if (bed.duration - bed.currentTime <= CROSSFADE_SEC) {
      this.startCrossfade();
    }
  }

  private startCrossfade(): void {
    const standbyIndex: 0 | 1 = this.activeIndex === 0 ? 1 : 0;
    const standby = this.beds[standbyIndex];
    standby.currentTime = 0;
    standby.volume = 0;
    void standby.play().catch(() => {});
    this.crossfadeState = { standbyIndex, startedAtMs: performance.now() };
    this.tickCrossfade();
  }

  private tickCrossfade(): void {
    const state = this.crossfadeState;
    if (!state) return;

    const elapsedSec = (performance.now() - state.startedAtMs) / 1000;
    const t = Math.min(1, elapsedSec / CROSSFADE_SEC);
    const target = this.effectiveVolume();

    this.beds[this.activeIndex].volume = target * (1 - t);
    this.beds[state.standbyIndex].volume = target * t;

    if (t >= 1) {
      const outgoing = this.beds[this.activeIndex];
      outgoing.pause();
      outgoing.currentTime = 0;
      this.activeIndex = state.standbyIndex;
      this.crossfadeState = null;
      this.rafId = null;
      return;
    }
    this.rafId = requestAnimationFrame(() => this.tickCrossfade());
  }

  private cancelCrossfade(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.crossfadeState) {
      const standby = this.beds[this.crossfadeState.standbyIndex];
      standby.pause();
      standby.volume = 0;
      this.crossfadeState = null;
    }
  }

  /**
   * Lazily creates (once) the shared AudioContext used for hover tones, and
   * best-effort resumes it if an autoplay policy left it suspended. A
   * suspended context's resume() call made outside a user gesture (e.g. the
   * very first call here, at page-load init) silently never resolves — so
   * this also arms a retry on the next real pointerdown/touchstart, and
   * keeps retrying on each subsequent gesture until it actually resumes.
   * Returns null in environments with no Web Audio support at all.
   */
  getAudioContext(): AudioContext | null {
    if (!this.context) {
      const Ctor = resolveAudioContextConstructor();
      if (!Ctor) return null;
      this.context = new Ctor();
    }
    if (this.context.state === "suspended") {
      void this.context.resume().catch(() => {});
      this.armContextResumeRetry();
    }
    return this.context;
  }

  private armContextResumeRetry(): void {
    if (this.contextResumeArmed) return;
    this.contextResumeArmed = true;
    window.addEventListener("pointerdown", this.retryContextResume);
    window.addEventListener("touchstart", this.retryContextResume, { passive: true });
  }

  private disarmContextResumeRetry(): void {
    if (!this.contextResumeArmed) return;
    this.contextResumeArmed = false;
    window.removeEventListener("pointerdown", this.retryContextResume);
    window.removeEventListener("touchstart", this.retryContextResume);
  }

  destroy(): void {
    this.disarmContextResumeRetry();
    this.cancelCrossfade();
    this.cancelVolumeRamp();
    for (const bed of this.beds) {
      bed.removeEventListener("timeupdate", this.onTimeUpdate);
      bed.pause();
      bed.removeAttribute("src");
    }
    if (this.context) {
      void this.context.close().catch(() => {});
      this.context = null;
    }
  }
}
