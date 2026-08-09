export const DRAG_SCRATCH_SRC = "/audio/freesound_community-writing-78068.mp3";
const DRAG_SCRATCH_VOLUME = 0.35;
/** How long pixel movement can stop before the sound pauses — like easing off a scrubbed slider. */
const IDLE_PAUSE_MS = 120;

/**
 * "Writing/scratch" sound scrubbed by a sticker/text drag, like a play
 * slider: it only sounds while pixels are actively shifting under the
 * pointer. Call onMove() on every drag-move tick — it starts playback (or
 * resumes it) and resets a short idle timer that pauses the instant
 * movement stops, even mid-drag (pointer held still). stop() forces an
 * immediate stop and rewind when the drag itself ends.
 */
export class DragScratchSound {
  private readonly audio: HTMLAudioElement;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(src: string = DRAG_SCRATCH_SRC) {
    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.volume = DRAG_SCRATCH_VOLUME;
  }

  onMove(): void {
    if (this.audio.paused) void this.audio.play().catch(() => {});
    if (this.idleTimer !== null) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.pauseFromIdle(), IDLE_PAUSE_MS);
  }

  private pauseFromIdle(): void {
    this.idleTimer = null;
    this.audio.pause();
  }

  stop(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  destroy(): void {
    this.stop();
    this.audio.removeAttribute("src");
  }
}
