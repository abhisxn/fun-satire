import "./audioWidget.css";

/**
 * Structural interface the widget depends on instead of the concrete
 * AudioManager class, so it can be unit tested with a lightweight fake
 * instead of a real <audio> element / AudioContext.
 */
export interface SoundBedControl {
  play(): Promise<void>;
  pause(): void;
  isPlaying(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** Absent or true means "assume volume UI is usable" (see AudioManager). */
  isVolumeControlSupported?(): boolean;
  /** Optional hook so the icon can follow state the widget did not trigger. */
  setStateChangeListener?(listener: (() => void) | null): void;
}

const SVG_SPEAKER_ON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 9V15H8L13 19V5L8 9H4Z" stroke="#2a1f1a" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16.5 8.5C17.5 9.5 18 10.7 18 12C18 13.3 17.5 14.5 16.5 15.5" stroke="#2a1f1a" stroke-linecap="round"/>
  <path d="M19 6C20.5 7.5 21.3 9.6 21.3 12C21.3 14.4 20.5 16.5 19 18" stroke="#2a1f1a" stroke-linecap="round"/>
</svg>`;

const SVG_SPEAKER_OFF = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 9V15H8L13 19V5L8 9H4Z" stroke="#2a1f1a" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M17 9L21 15" stroke="#2a1f1a" stroke-linecap="round"/>
  <path d="M21 9L17 15" stroke="#2a1f1a" stroke-linecap="round"/>
</svg>`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

/**
 * Small floating mute/unmute + volume widget for the background sound bed.
 * It doubles as the play control: attemptAutoplay() tries playback on
 * mount, and if the browser's autoplay policy blocks it, the very next
 * pointer/touch interaction anywhere on the page (including a click on
 * this widget's own toggle) retries it. The toggle icon always re-reads
 * the real playing/muted state before rendering, so it never lies about
 * whether sound is actually coming out of the speakers.
 */
export class AudioWidget {
  private readonly root: HTMLElement;
  private readonly toggleBtn: HTMLButtonElement;
  private readonly volumeInput: HTMLInputElement | null;
  private readonly control: SoundBedControl;
  private gestureRetryArmed = false;
  private boundGestureRetry: (() => void) | null = null;

  constructor(control: SoundBedControl) {
    this.control = control;

    const root = el("div", "audio-widget");
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Background sound");
    this.root = root;

    const toggle = el("button", "audio-widget__toggle");
    toggle.type = "button";
    // Stop this button's own pointerdown/touchstart from bubbling to the
    // window-level gesture-retry listener (armGestureRetry below): without
    // this, clicking the toggle as the very first page interaction fires
    // BOTH the retry's play() (on pointerdown) AND handleToggleClick's own
    // play()-or-mute logic (on click) for the same gesture. The retry wins
    // the race and starts playback first, so handleToggleClick then reads
    // isPlaying()===true and immediately mutes it back off — the button
    // looks completely dead on its first press.
    toggle.addEventListener("pointerdown", (e) => e.stopPropagation());
    toggle.addEventListener("touchstart", (e) => e.stopPropagation());
    toggle.addEventListener("click", () => {
      void this.handleToggleClick();
    });
    this.toggleBtn = toggle;

    // iOS keeps the audio level under the user's physical control, so a
    // slider there would be dead UI: it would move and change nothing. On
    // those platforms the widget is mute-only and the hardware volume keys
    // do the rest.
    const volumeUsable = control.isVolumeControlSupported?.() ?? true;

    if (!volumeUsable) {
      this.volumeInput = null;
      root.classList.add("audio-widget--no-volume");
      root.append(toggle);
    } else {
      const volume = el("input", "audio-widget__volume") as HTMLInputElement;
      volume.type = "range";
      volume.min = "0";
      volume.max = "1";
      volume.step = "0.05";
      volume.value = String(control.getVolume());
      volume.setAttribute("aria-label", "Sound bed volume");
      volume.addEventListener("input", () => {
        const value = Number.parseFloat(volume.value);
        this.control.setVolume(value);
        this.updateVolumeFill(value);
      });
      this.volumeInput = volume;
      this.updateVolumeFill(control.getVolume());

      // Collapsed to a bare circular mute/unmute button by default; hovering
      // (or focusing, for keyboard users) the widget expands this wrapper to
      // reveal the vertical slider. See audioWidget.css for the transition.
      const volumeWrap = el("div", "audio-widget__volume-wrap");
      volumeWrap.append(volume);
      root.append(toggle, volumeWrap);
    }

    // The control can pause itself (backgrounding), so the icon has to follow
    // state this widget never asked for.
    this.control.setStateChangeListener?.(() => this.syncIcon());

    this.syncIcon();
  }

  attachTo(host: HTMLElement): void {
    host.appendChild(this.root);
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  getToggleButton(): HTMLButtonElement {
    return this.toggleBtn;
  }

  /**
   * Attempts playback immediately (call once on app mount). If the
   * browser's autoplay policy blocks it, arms a one-shot retry on the very
   * next pointer/touch interaction anywhere on the page.
   */
  async attemptAutoplay(): Promise<void> {
    try {
      await this.control.play();
    } catch {
      this.armGestureRetry();
    } finally {
      this.syncIcon();
    }
  }

  destroy(): void {
    this.disarmGestureRetry();
    this.control.setStateChangeListener?.(null);
    this.root.remove();
  }

  private armGestureRetry(): void {
    if (this.gestureRetryArmed) return;
    this.gestureRetryArmed = true;

    const retry = (): void => {
      this.disarmGestureRetry();
      this.control
        .play()
        .catch(() => {
          // Still blocked; the toggle button remains a manual fallback and
          // syncIcon() below reflects reality either way.
        })
        .finally(() => this.syncIcon());
    };

    this.boundGestureRetry = retry;
    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("touchstart", retry, { once: true, passive: true });
  }

  private disarmGestureRetry(): void {
    if (this.boundGestureRetry) {
      window.removeEventListener("pointerdown", this.boundGestureRetry);
      window.removeEventListener("touchstart", this.boundGestureRetry);
      this.boundGestureRetry = null;
    }
    this.gestureRetryArmed = false;
  }

  private async handleToggleClick(): Promise<void> {
    const audiblyOn = this.control.isPlaying() && !this.control.isMuted();
    if (audiblyOn) {
      this.control.setMuted(true);
    } else {
      if (!this.control.isPlaying()) {
        try {
          await this.control.play();
        } catch {
          // Still blocked; syncIcon() below reflects the real state.
        }
      }
      this.control.setMuted(false);
    }
    this.syncIcon();
  }

  /**
   * Re-reads the control's actual playing/muted state and updates the
   * icon — never optimistic.
   */
  private syncIcon(): void {
    const audiblyOn = this.control.isPlaying() && !this.control.isMuted();
    this.toggleBtn.innerHTML = audiblyOn ? SVG_SPEAKER_ON : SVG_SPEAKER_OFF;
    this.toggleBtn.setAttribute("aria-pressed", String(audiblyOn));
    this.toggleBtn.setAttribute("aria-label", audiblyOn ? "Mute background sound" : "Unmute background sound");
  }

  private updateVolumeFill(value: number): void {
    if (!this.volumeInput) return;
    const pct = Math.max(0, Math.min(1, value)) * 100;
    this.volumeInput.style.setProperty("--audio-widget-volume-fill", `${pct}%`);
  }
}
