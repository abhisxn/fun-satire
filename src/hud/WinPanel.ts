// src/hud/WinPanel.ts
import "./winPanel.css";
import { pickWinCopy, type WinCopyVariant } from "./winCopy";

const SVG_CLOSE = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

export class WinPanel {
  private readonly overlay: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly copyEl: HTMLElement;
  private isOpen = false;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "win-panel-overlay";

    this.panel = document.createElement("div");
    this.panel.className = "win-panel";
    this.overlay.appendChild(this.panel);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "win-panel-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = SVG_CLOSE;
    closeBtn.addEventListener("click", () => this.hide());
    this.panel.appendChild(closeBtn);

    this.titleEl = document.createElement("h2");
    this.titleEl.className = "win-panel-title";
    this.panel.appendChild(this.titleEl);

    this.copyEl = document.createElement("p");
    this.copyEl.className = "win-panel-copy";
    this.panel.appendChild(this.copyEl);
  }

  attachTo(container: HTMLElement): void {
    container.appendChild(this.overlay);
  }

  show(variant: WinCopyVariant = pickWinCopy()): void {
    this.titleEl.textContent = variant.title;
    this.copyEl.textContent = variant.copy;
    this.isOpen = true;
    this.overlay.classList.add("open");
  }

  hide(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove("open");
  }

  isPanelOpen(): boolean {
    return this.isOpen;
  }

  getRoot(): HTMLElement {
    return this.overlay;
  }

  destroy(): void {
    this.overlay.remove();
  }
}
