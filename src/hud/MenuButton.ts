import "./menuButton.css";
import { playHudSelectTone } from "../audio/hudTones";

const SVG_HAMBURGER = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="6.667" width="24" height="2.667" rx="1.333" fill="#2a1f1a"/>
  <rect x="4" y="14.667" width="24" height="2.667" rx="1.333" fill="#2a1f1a"/>
  <rect x="4" y="22.667" width="24" height="2.667" rx="1.333" fill="#2a1f1a"/>
</svg>`;

export class MenuButton {
  private readonly button: HTMLButtonElement;
  private audioContext: AudioContext | null = null;

  constructor() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hud-menu-btn";
    button.setAttribute("aria-label", "Menu");
    button.innerHTML = SVG_HAMBURGER;

    button.addEventListener("click", () => {
      if (this.audioContext) playHudSelectTone(this.audioContext);
    });

    this.button = button;
  }

  attachTo(container: HTMLElement): void {
    container.appendChild(this.button);
  }

  getButton(): HTMLElement {
    return this.button;
  }

  setAudioContext(context: AudioContext | null): void {
    this.audioContext = context;
  }

  hide(): void {
    this.button.classList.add("hidden");
  }

  show(): void {
    this.button.classList.remove("hidden");
  }
}
