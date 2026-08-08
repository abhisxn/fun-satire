export const CLICK_SRC = "/audio/click.mp3";
const CLICK_VOLUME = 0.5;

/**
 * One-shot "pickup" click played when a sticker/text overlay is grabbed to
 * be dragged. Reuses a single <audio> element and rewinds it on every
 * trigger so rapid successive pickups aren't silently dropped mid-playback.
 */
export class ClickSound {
  private readonly audio: HTMLAudioElement;

  constructor(src: string = CLICK_SRC, volume: number = CLICK_VOLUME) {
    this.audio = new Audio(src);
    this.audio.volume = volume;
  }

  play(): void {
    this.audio.currentTime = 0;
    void this.audio.play().catch(() => {});
  }

  destroy(): void {
    this.audio.pause();
    this.audio.removeAttribute("src");
  }
}
