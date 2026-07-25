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
