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
 * Wraps a single looping <audio> element for the background sound bed and
 * owns the one shared AudioContext used by the hover tones in
 * src/audio/hoverTones.ts. A single shared context avoids allocating a new
 * AudioContext per hover — browsers rate-limit context creation and it is
 * wasteful to construct one repeatedly for short one-shot blips.
 */
export class AudioManager {
  private readonly audio: HTMLAudioElement;
  private context: AudioContext | null = null;

  constructor(options: AudioManagerOptions = {}) {
    this.audio = new Audio(options.src ?? AUDIO_BED_SRC);
    this.audio.loop = true;
    this.audio.volume = clampVolume(options.volume ?? 0.5);
  }

  play(): Promise<void> {
    return this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  /** Reflects the element's real playback state — never an optimistic flag. */
  isPlaying(): boolean {
    return !this.audio.paused;
  }

  setVolume(volume: number): void {
    this.audio.volume = clampVolume(volume);
  }

  getVolume(): number {
    return this.audio.volume;
  }

  setMuted(muted: boolean): void {
    this.audio.muted = muted;
  }

  isMuted(): boolean {
    return this.audio.muted;
  }

  /**
   * Lazily creates (once) the shared AudioContext used for hover tones, and
   * best-effort resumes it if an autoplay policy left it suspended. Returns
   * null in environments with no Web Audio support at all.
   */
  getAudioContext(): AudioContext | null {
    if (!this.context) {
      const Ctor = resolveAudioContextConstructor();
      if (!Ctor) return null;
      this.context = new Ctor();
    }
    if (this.context.state === "suspended") {
      void this.context.resume().catch(() => {});
    }
    return this.context;
  }

  destroy(): void {
    this.audio.pause();
    this.audio.removeAttribute("src");
    if (this.context) {
      void this.context.close().catch(() => {});
      this.context = null;
    }
  }
}
