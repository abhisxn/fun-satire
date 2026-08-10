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

/**
 * Whether this platform lets JavaScript set a media element's volume at all.
 * iOS keeps the audio level under the user's physical control: writes to
 * `volume` are silently dropped and reads always return 1
 * (https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html).
 * Everything volume-driven in this class — the crossfade, the mute ramp —
 * therefore has to be gated on this, or it becomes a silent no-op that
 * leaves two beds blaring at full volume with no way to turn them down.
 * Muting is handled separately via the element's `muted` flag, which IS
 * honoured on iOS.
 */
function detectVolumeControlSupport(): boolean {
  try {
    const probe = new Audio();
    probe.volume = 0.4;
    return Math.abs(probe.volume - 0.4) < 1e-6;
  } catch {
    return false;
  }
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
  private readonly volumeControlSupported: boolean;
  private activeIndex: 0 | 1 = 0;
  private volume: number;
  private muted = false;
  private playing = false;
  private suspendedByVisibility = false;
  private crossfadeState: CrossfadeState | null = null;
  private rafId: number | null = null;
  private rampRafId: number | null = null;
  private context: AudioContext | null = null;
  private contextResumeArmed = false;
  private stateChangeListener: (() => void) | null = null;
  private readonly onTimeUpdate = (): void => this.checkCrossfadeTrigger();
  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.handleHidden();
    else this.handleVisible();
  };
  private readonly onPageHide = (): void => this.handleHidden();
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
    this.volumeControlSupported = detectVolumeControlSupport();
    this.beds = [this.createBed(src), this.createBed(src, false)];
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("pagehide", this.onPageHide);
  }

  private createBed(src: string, primary = true): HTMLAudioElement {
    const audio = new Audio(src);
    // Looping is driven manually by the crossfade scheduler below, so the
    // native attribute (which would hard-cut back to frame 0) stays off —
    // unless the platform ignores volume writes, in which case a crossfade
    // is impossible (both beds would play at full volume simultaneously)
    // and native looping is the only correct option.
    audio.loop = !this.volumeControlSupported;
    if (this.volumeControlSupported) {
      audio.volume = 0;
      // timeupdate exists only to drive the crossfade scheduler.
      audio.addEventListener("timeupdate", this.onTimeUpdate);
    } else if (!primary) {
      // Native looping uses the primary bed only and never crossfades, so the
      // second bed must not download a copy of an asset it will never play.
      audio.preload = "none";
    }
    return audio;
  }

  /**
   * False on iOS, where `element.volume` is not writable. Callers should hide
   * volume UI in that case and rely on mute plus the hardware volume keys.
   */
  isVolumeControlSupported(): boolean {
    return this.volumeControlSupported;
  }

  /**
   * Notified whenever the *real* playback state changes for a reason the
   * caller did not initiate (currently: auto-pause on backgrounding and the
   * auto-resume on return), so UI can re-read isPlaying()/isMuted().
   */
  setStateChangeListener(listener: (() => void) | null): void {
    this.stateChangeListener = listener;
  }

  private notifyStateChange(): void {
    this.stateChangeListener?.();
  }

  private get active(): HTMLAudioElement {
    return this.beds[this.activeIndex];
  }

  play(): Promise<void> {
    this.playing = true;
    this.suspendedByVisibility = false;
    this.applyMutedToBeds();
    if (this.volumeControlSupported) this.active.volume = this.effectiveVolume();
    return this.active.play();
  }

  pause(): void {
    this.playing = false;
    this.suspendedByVisibility = false;
    this.stopBeds();
    // A mute ramp in flight is cancelled above, so its completion callback
    // (which sets `bed.muted`) never runs — re-sync here so the beds always
    // mirror `this.muted` after any state transition.
    this.applyMutedToBeds();
  }

  private stopBeds(): void {
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

  /**
   * The element's own `muted` flag is the authoritative mute: it is the one
   * control that works on every platform (iOS drops volume writes, so a
   * volume-only mute leaves the bed playing at full blast there). Where
   * volume IS writable the flag is deferred to the end of the fade — setting
   * it up front would silence the bed instantly and make the ramp pointless.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;

    // Unmuting: clear the flag first, so the ramp back up is actually audible.
    if (!muted) this.applyMutedToBeds();

    // No usable fade (iOS, or a crossfade already owns both beds' volume):
    // the flag is the entire mute.
    if (!this.volumeControlSupported || this.crossfadeState) {
      this.applyMutedToBeds();
      return;
    }

    this.rampVolumeTo(this.effectiveVolume(), muted ? () => this.applyMutedToBeds() : null);
  }

  private applyMutedToBeds(): void {
    for (const bed of this.beds) bed.muted = this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private effectiveVolume(): number {
    return this.muted ? 0 : this.volume;
  }

  /**
   * No-op mid-crossfade (the rAF tick in tickCrossfade() owns both beds'
   * volume then) and on platforms that ignore volume writes. Mute is applied
   * separately in applyMutedToBeds(), so neither case can swallow a mute.
   */
  private applyVolumeToActive(): void {
    if (!this.volumeControlSupported || this.crossfadeState) return;
    this.rampVolumeTo(this.effectiveVolume());
  }

  /**
   * Ramps the active bed's volume smoothly instead of snapping it, so
   * mute/unmute never hard-cuts. `onComplete` runs once the ramp lands on its
   * target (and immediately if there is nothing to ramp); a superseding ramp
   * cancels it, so a stale mute can never be applied after an unmute.
   */
  private rampVolumeTo(target: number, onComplete: (() => void) | null = null): void {
    this.cancelVolumeRamp();
    const bed = this.active;
    const start = bed.volume;
    if (start === target) {
      onComplete?.();
      return;
    }

    const startedAtMs = performance.now();
    const tick = (): void => {
      const t = Math.min(1, (performance.now() - startedAtMs) / 1000 / VOLUME_RAMP_SEC);
      bed.volume = start + (target - start) * t;
      if (t >= 1) {
        this.rampRafId = null;
        onComplete?.();
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
    // Beds loop natively when volume is not controllable; starting a fade
    // there would just layer a second full-volume copy over the first.
    if (!this.volumeControlSupported) return;
    if (!this.playing || this.crossfadeState || document.hidden) return;
    const bed = this.active;
    if (!Number.isFinite(bed.duration) || bed.duration <= 0) return;
    if (bed.duration - bed.currentTime <= CROSSFADE_SEC) {
      this.startCrossfade();
    }
  }

  private startCrossfade(): void {
    const standbyIndex: 0 | 1 = this.activeIndex === 0 ? 1 : 0;
    const standby = this.beds[standbyIndex];
    // Invariant: at most one bed is audible outside a fade, and a fade only
    // ever starts from a standby bed that is genuinely idle. Without this, a
    // second cycle could be layered on top of one already playing.
    if (!standby.paused) return;
    standby.currentTime = 0;
    standby.volume = 0;
    standby.muted = this.muted;
    void standby.play().catch(() => {});
    this.crossfadeState = { standbyIndex, startedAtMs: performance.now() };
    this.tickCrossfade();
  }

  private tickCrossfade(): void {
    const state = this.crossfadeState;
    if (!state) return;
    // Playback stopped under the fade (user pause, backgrounding): tear the
    // fade down rather than letting it un-pause a bed on the next tick.
    if (!this.playing) {
      this.cancelCrossfade();
      return;
    }

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

  /**
   * Backgrounding (tab switch, app switch, screen lock) stops playback
   * outright rather than letting the bed keep going inaudibly behind another
   * app. It also settles any in-flight crossfade first: rAF does not fire
   * while the document is hidden, so a fade left mid-flight would keep
   * `crossfadeState` set indefinitely, and that state suppresses every later
   * volume change (see applyVolumeToActive).
   */
  private handleHidden(): void {
    this.resolveCrossfadeImmediately();
    if (!this.playing || this.suspendedByVisibility) return;
    this.suspendedByVisibility = true;
    this.stopBeds();
    this.notifyStateChange();
  }

  /**
   * Resumes only what backgrounding itself paused — never overrides a user
   * pause, because pause() clears the suspension flag this guards on. Goes
   * through play() so the resume inherits the one canonical start sequence.
   */
  private handleVisible(): void {
    if (!this.suspendedByVisibility) return;
    this.play()
      .catch(() => {
        // Autoplay policy may refuse a resume without a fresh gesture; the
        // widget's toggle stays the manual fallback and the notify below
        // makes its icon tell the truth either way.
      })
      .finally(() => this.notifyStateChange());
  }

  /**
   * Snaps an in-progress crossfade straight to its end state instead of
   * leaving it to the next requestAnimationFrame tick — rAF stops firing
   * while the document is hidden, so without this an in-flight fade freezes
   * mid-mix (both beds partially audible) for as long as the tab stays
   * backgrounded.
   */
  private resolveCrossfadeImmediately(): void {
    const state = this.crossfadeState;
    if (!state) return;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.cancelVolumeRamp();

    const outgoing = this.beds[this.activeIndex];
    outgoing.pause();
    outgoing.currentTime = 0;
    outgoing.volume = 0;

    this.beds[state.standbyIndex].volume = this.effectiveVolume();
    this.activeIndex = state.standbyIndex;
    this.crossfadeState = null;
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
    this.stateChangeListener = null;
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("pagehide", this.onPageHide);
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
