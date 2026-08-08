import "./hud.css";
import type { CreatureMode } from "../creatures/creatureTypes";
import { snapToGrid } from "../creatures/snapGrid";
import { updateSnapGuides, hideSnapGuides } from "../creatures/snapGuides";
import { playHudSelectTone, playHudPressTone } from "../audio/hudTones";

const SVG_DRAG_HANDLE = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M9.5 5C9.5 6.10455 8.60455 7 7.5 7C6.39545 7 5.5 6.10455 5.5 5C5.5 3.89543 6.39545 3 7.5 3C8.60455 3 9.5 3.89543 9.5 5ZM7.5 14C8.60455 14 9.5 13.1046 9.5 12C9.5 10.8954 8.60455 10 7.5 10C6.39545 10 5.5 10.8954 5.5 12C5.5 13.1046 6.39545 14 7.5 14ZM7.5 21C8.60455 21 9.5 20.1046 9.5 19C9.5 17.8954 8.60455 17 7.5 17C6.39545 17 5.5 17.8954 5.5 19C5.5 20.1046 6.39545 21 7.5 21Z" fill="#2a1f1a"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M18.5 5C18.5 6.10455 17.6046 7 16.5 7C15.3954 7 14.5 6.10455 14.5 5C14.5 3.89543 15.3954 3 16.5 3C17.6046 3 18.5 3.89543 18.5 5ZM16.5 14C17.6046 14 18.5 13.1046 18.5 12C18.5 10.8954 17.6046 10 16.5 10C15.3954 10 14.5 10.8954 14.5 12C14.5 13.1046 15.3954 14 16.5 14ZM16.5 21C17.6046 21 18.5 20.1046 18.5 19C18.5 17.8954 17.6046 17 16.5 17C15.3954 17 14.5 17.8954 14.5 19C14.5 20.1046 15.3954 21 16.5 21Z" fill="#2a1f1a"/>
</svg>`;

const SVG_EYE = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 7C8.33741 7 5.07932 8.95853 3 12C5.07932 15.0415 8.33741 17 12 17C15.6626 17 18.9207 15.0415 21 12C18.9207 8.95853 15.6626 7 12 7Z" stroke="#2a1f1a" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="3" stroke="#2a1f1a" stroke-linecap="round"/>
</svg>`;

const SVG_HAND = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 13.5V11.3333C16 10.597 16.6716 10 17.5 10C18.3284 10 19 10.597 19 11.3333V14.5" stroke="#2a1f1a" stroke-linecap="round"/>
  <path d="M10 12L10 9.09091C10 8.48842 10.6716 8 11.5 8C12.3284 8 13 8.48842 13 9.09091V12" stroke="#2a1f1a" stroke-linecap="round"/>
  <path d="M7 14L7 3.24138C7 2.55578 7.67157 2 8.5 2C9.32843 2 10 2.55578 10 3.24138V12.5" stroke="#2a1f1a" stroke-linecap="round"/>
  <path d="M16 13.5V10.3636C16 9.61052 15.3284 9 14.5 9C13.6716 9 13 9.61052 13 10.3636L13 12.5" stroke="#2a1f1a" stroke-linecap="round"/>
  <path d="M19 14.2767C19 18.6011 17.1943 22 11.7864 22C7.19799 22 5.56206 18.8789 4.25646 14.9425C3.777 13.4969 3.98603 13.0519 4.74791 12.4217C5.49493 11.8038 6.71372 11.9179 7.20517 12.4219" stroke="#2a1f1a"/>
</svg>`;

const SVG_COCKROACH = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 2C7.63612 2 10.0643 2.86783 12 4.32634M19 2C16.3639 2 13.9357 2.86783 12 4.32634M12 4.32634C9.29033 6.36796 7.54545 9.56698 7.54545 13.1632C7.54545 16.7594 9.29033 19.9584 12 22C14.7097 19.9584 16.4545 16.7594 16.4545 13.1632C16.4545 9.56698 14.7097 6.36796 12 4.32634Z" stroke="#2a1f1a" stroke-linecap="round"/>
<path d="M12 13C12 13 15 11.2091 15 9C15 6.79086 12 5 12 5C12 5 9 6.79086 9 9C9 11.2091 12 13 12 13ZM12 13V21.5" stroke="#2a1f1a" stroke-linecap="round"/>
</svg>`;

// Hand-drawn fallback, rendered immediately so the placard mode button never
// appears blank before loadPlacardSvg() resolves (or if it fails).
const SVG_PLACARD = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="4" width="16" height="10" rx="1" stroke="#2a1f1a" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 14V21" stroke="#2a1f1a" stroke-linecap="round"/>
  <path d="M8 21H16" stroke="#2a1f1a" stroke-linecap="round"/>
</svg>`;

// Mirrors EyeCreature.ts's loadEyeSvg() pattern: fetch the real static asset
// at runtime instead of hand-drawing it inline.
export function loadPlacardSvg(): Promise<string> {
  return fetch("/creatures/placard_icon.svg").then((r) => r.text());
}

const SVG_GALLERY = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 7C5 5.89543 5.89543 5 7 5H11V9C11 10.1046 10.1046 11 9 11H5V7Z" stroke="#2a1f1a" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13 5H17C18.1046 5 19 5.89543 19 7V11H15C13.8954 11 13 10.1046 13 9V5Z" stroke="#2a1f1a" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13 15C13 13.8954 13.8954 13 15 13H19V17C19 18.1046 18.1046 19 17 19H13V15Z" stroke="#2a1f1a" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M5 13H9C10.1046 13 11 13.8954 11 15V19H7C5.89543 19 5 18.1046 5 17V13Z" stroke="#2a1f1a" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SVG_SETTINGS = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 12L21 12" stroke="#2a1f1a" stroke-linecap="round"/>
  <path d="M3 6L21 6" stroke="#2a1f1a" stroke-linecap="round"/>
  <path d="M3 18L21 18" stroke="#2a1f1a" stroke-linecap="round"/>
  <circle cx="7" cy="12" r="2" fill="white" stroke="#2a1f1a" stroke-linecap="round"/>
  <circle cx="16" cy="6" r="2" fill="white" stroke="#2a1f1a" stroke-linecap="round"/>
  <circle cx="13" cy="18" r="2" fill="white" stroke="#2a1f1a" stroke-linecap="round"/>
</svg>`;

interface ModeBtnDef {
  readonly mode: CreatureMode;
  readonly cssClass: string;
  readonly tooltip: string;
  readonly ariaLabel: string;
  readonly svg: string;
}

const MODE_BTNS: readonly ModeBtnDef[] = [
  { mode: "eyes", cssClass: "hud-btn--eye", tooltip: "Eye Mode", ariaLabel: "Eye Mode", svg: SVG_EYE },
  { mode: "pointedFinger", cssClass: "hud-btn--hand", tooltip: "Point Mode", ariaLabel: "Point Mode", svg: SVG_HAND },
  { mode: "cockroach", cssClass: "hud-btn--bug", tooltip: "Cockroach Mode", ariaLabel: "Cockroach Mode", svg: SVG_COCKROACH },
  { mode: "placard", cssClass: "hud-btn--placard", tooltip: "Placard Mode", ariaLabel: "Placard Mode", svg: SVG_PLACARD },
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly modeBtnEls = new Map<CreatureMode, HTMLButtonElement>();
  private settingsBtn: HTMLButtonElement | null = null;
  private galleryBtn: HTMLButtonElement | null = null;
  private attackBtn: HTMLButtonElement | null = null;
  private activeMode: CreatureMode = "cockroach";

  private modeChangeCb: ((mode: CreatureMode) => void) | null = null;
  private attackPressCb: (() => void) | null = null;
  private attackReleaseCb: (() => void) | null = null;

  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private boundOnPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundOnPointerUp: ((e: PointerEvent) => void) | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    const root = el("div", "premium-hud");
    root.setAttribute("role", "toolbar");
    root.setAttribute("aria-label", "Game controls");
    this.root = root;

    root.appendChild(this.buildDragHandle());

    for (const def of MODE_BTNS) {
      const btn = this.buildModeBtn(def);
      this.modeBtnEls.set(def.mode, btn);
      root.appendChild(btn);
    }

    root.appendChild(this.buildDivider());

    this.settingsBtn = this.buildUtilityBtn("hud-btn--settings", "Settings", SVG_SETTINGS);
    root.appendChild(this.settingsBtn);
    this.galleryBtn = this.buildUtilityBtn("hud-btn--gallery", "Grid View", SVG_GALLERY);
    root.appendChild(this.galleryBtn);

    this.attackBtn = this.buildAttackBtn();
    root.appendChild(this.attackBtn);

    this.setActiveMode("cockroach");

    // Fire-and-forget: swap the placard button's fallback markup for the
    // real static icon once it loads. If the fetch fails, the inline
    // SVG_PLACARD fallback rendered by buildModeBtn() stays in place.
    void this.loadPlacardIcon();
  }

  private async loadPlacardIcon(): Promise<void> {
    try {
      const svg = await loadPlacardSvg();
      const btn = this.modeBtnEls.get("placard");
      if (btn) btn.innerHTML = svg;
    } catch {
      // keep the inline fallback SVG_PLACARD already rendered
    }
  }

  attachTo(container: HTMLElement): void {
    container.appendChild(this.root);
  }

  setActiveMode(mode: CreatureMode): void {
    this.activeMode = mode;
    for (const [m, btn] of this.modeBtnEls) {
      btn.classList.toggle("active", m === mode);
      btn.setAttribute("aria-pressed", String(m === mode));
    }
  }

  getActiveMode(): CreatureMode {
    return this.activeMode;
  }

  onModeChange(cb: (mode: CreatureMode) => void): void {
    this.modeChangeCb = cb;
  }

  onAttackPress(cb: () => void): void {
    this.attackPressCb = cb;
  }

  onAttackRelease(cb: () => void): void {
    this.attackReleaseCb = cb;
  }

  destroy(): void {
    this.detachDragListeners();
    this.root.remove();
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  getSettingsButton(): HTMLElement {
    if (!this.settingsBtn) throw new Error("Settings button not initialized");
    return this.settingsBtn;
  }

  getGalleryButton(): HTMLElement {
    if (!this.galleryBtn) throw new Error("Gallery button not initialized");
    return this.galleryBtn;
  }

  getAttackButton(): HTMLElement {
    if (!this.attackBtn) throw new Error("Attack button not initialized");
    return this.attackBtn;
  }

  /** Shared AudioContext used for the HUD's button-press blips; pass null to silence them. */
  setAudioContext(context: AudioContext | null): void {
    this.audioContext = context;
  }

  private buildDragHandle(): HTMLElement {
    const handle = el("div", "hud-drag-handle");
    handle.setAttribute("aria-label", "Drag to move");
    handle.setAttribute("role", "separator");
    handle.innerHTML = SVG_DRAG_HANDLE;

    handle.addEventListener("pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      this.startDrag(e);
    });

    return handle;
  }

  private buildModeBtn(def: ModeBtnDef): HTMLButtonElement {
    const btn = el("button", `hud-btn ${def.cssClass}`);
    btn.type = "button";
    btn.dataset.tooltip = def.tooltip;
    btn.setAttribute("aria-label", def.ariaLabel);
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = def.svg;

    btn.addEventListener("click", () => {
      if (this.audioContext) playHudSelectTone(this.audioContext);
      this.activeMode = def.mode;
      this.setActiveMode(def.mode);
      this.modeChangeCb?.(def.mode);
    });

    return btn;
  }

  private buildAttackBtn(): HTMLButtonElement {
    const btn = el("button", "hud-attack");
    btn.type = "button";
    btn.setAttribute("aria-label", "Attack");

    const span = el("span");
    span.textContent = "Protest";
    btn.appendChild(span);

    btn.addEventListener("pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      if (this.audioContext) playHudPressTone(this.audioContext);
      this.attackPressCb?.();
    });

    btn.addEventListener("pointerup", () => {
      this.attackReleaseCb?.();
    });

    btn.addEventListener("pointerleave", () => {
      if (this.attackPressCb) this.attackReleaseCb?.();
    });

    return btn;
  }

  private buildDivider(): HTMLElement {
    const divider = el("div", "hud-divider");
    divider.setAttribute("role", "separator");
    divider.setAttribute("aria-orientation", "vertical");
    return divider;
  }

  private buildUtilityBtn(cssClass: string, tooltip: string, svg: string): HTMLButtonElement {
    const btn = el("button", `hud-btn ${cssClass}`);
    btn.type = "button";
    btn.dataset.tooltip = tooltip;
    btn.setAttribute("aria-label", tooltip);
    btn.innerHTML = svg;
    btn.addEventListener("click", () => {
      if (this.audioContext) playHudSelectTone(this.audioContext);
    });
    return btn;
  }

  private startDrag(e: PointerEvent): void {
    e.stopPropagation();
    const rect = this.root.getBoundingClientRect();
    this.isDragging = true;
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;

    this.root.style.animation = "none";
    this.root.style.bottom = "auto";
    this.root.style.width = `${rect.width}px`;
    this.root.style.height = `${rect.height}px`;
    this.root.style.left = `${rect.left}px`;
    this.root.style.top = `${rect.top}px`;
    this.root.style.transform = "none";
    this.root.style.transition = "none";
    this.root.classList.add("hud--dragging");

    this.boundOnPointerMove = (ev: PointerEvent) => this.onPointerMove(ev);
    this.boundOnPointerUp = (ev: PointerEvent) => this.stopDrag(ev);
    document.addEventListener("pointermove", this.boundOnPointerMove);
    document.addEventListener("pointerup", this.boundOnPointerUp);
    document.addEventListener("pointercancel", this.boundOnPointerUp);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();
    const x = e.clientX - this.dragOffsetX;
    const y = e.clientY - this.dragOffsetY;
    this.root.style.left = `${x}px`;
    this.root.style.top = `${y}px`;
    updateSnapGuides(this.root);
  }

  private stopDrag(_e?: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    snapToGrid(this.root);
    hideSnapGuides();
    this.root.style.transition = "";
    this.root.classList.remove("hud--dragging");
    this.detachDragListeners();
  }

  private detachDragListeners(): void {
    if (this.boundOnPointerMove) {
      document.removeEventListener("pointermove", this.boundOnPointerMove);
      this.boundOnPointerMove = null;
    }
    if (this.boundOnPointerUp) {
      document.removeEventListener("pointerup", this.boundOnPointerUp);
      document.removeEventListener("pointercancel", this.boundOnPointerUp);
      this.boundOnPointerUp = null;
    }
  }
}
