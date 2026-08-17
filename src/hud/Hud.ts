import "./hud.css";
import type { CreatureMode } from "../creatures/creatureTypes";
import { snapToGrid, clampToViewport } from "../creatures/snapGrid";
import { updateSnapGuides, hideSnapGuides } from "../creatures/snapGuides";
import { playHudSelectTone } from "../audio/hudTones";

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

const SVG_PROTEST = `<svg class="hud-attack__label" viewBox="0 0 4781 750" fill="currentColor" aria-hidden="true" focusable="false">
  <path d="M191 735L36 735Q0 735 0 699L0 51Q0 15 36 15L342 15Q433 15 484.5 39.5Q536 64 557 108Q578 152 578 210L578 338Q578 396 557 440Q536 484 484.5 508.5Q433 533 342 533L227 533L227 699Q227 735 191 735M315 202L225 202L225 353L315 353Q344 353 353 338Q362 323 362 304L362 251Q362 231 353 216.5Q344 202 315 202M892 735L738 735Q702 735 702 699L702 51Q702 15 738 15L1071 15Q1146 15 1189 36Q1232 57 1250 94.5Q1268 132 1268 182L1268 228Q1268 270 1256 299Q1244 328 1212 342Q1267 348 1300 386Q1333 424 1333 487L1333 699Q1333 735 1297 735L1142 735Q1106 735 1106 699L1106 546Q1106 523 1097.5 513Q1089 503 1068 503L928 503L928 699Q928 735 892 735M1003 195L928 195L928 323L1003 323Q1029 323 1038 309.5Q1047 296 1047 276L1047 242Q1047 222 1038 208.5Q1029 195 1003 195M2070 205L2070 546Q2070 592 2056.5 629.5Q2043 667 2009 694Q1975 721 1914.5 735.5Q1854 750 1760 750Q1666 750 1605.5 735.5Q1545 721 1511 694Q1477 667 1463 629.5Q1449 592 1449 546L1449 205Q1449 159 1463 121.5Q1477 84 1511 57Q1545 30 1605.5 15Q1666 0 1760 0Q1854 0 1914.5 15Q1975 30 2009 57Q2043 84 2056.5 121.5Q2070 159 2070 205M1676 241L1676 510Q1676 530 1691 543.5Q1706 557 1760 557Q1815 557 1829.5 543.5Q1844 530 1844 510L1844 241Q1844 221 1829.5 208Q1815 195 1760 195Q1706 195 1691 208Q1676 221 1676 241M2552 735L2390 735Q2354 735 2354 699L2354 208L2207 208Q2171 208 2171 172L2171 51Q2171 15 2207 15L2735 15Q2771 15 2771 51L2771 172Q2771 208 2735 208L2588 208L2588 699Q2588 735 2552 735M3388 735L2924 735Q2888 735 2888 699L2888 51Q2888 15 2924 15L3388 15Q3424 15 3424 51L3424 168Q3424 204 3388 204L3112 204L3112 281L3307 281Q3343 281 3343 317L3343 424Q3343 460 3307 460L3112 460L3112 546L3388 546Q3424 546 3424 582L3424 699Q3424 735 3388 735M3896 735L3580 735Q3544 735 3544 699L3544 582Q3544 546 3580 546L3849 546Q3862 546 3868.5 537.5Q3875 529 3875 517Q3875 500 3868.5 492Q3862 484 3849 483L3699 462Q3629 451 3586.5 415.5Q3544 380 3544 296L3544 191Q3544 105 3599 60Q3654 15 3751 15L4031 15Q4067 15 4067 51L4067 170Q4067 206 4031 206L3798 206Q3771 206 3771 236Q3771 265 3798 268L3947 288Q3994 295 4029 312.5Q4064 330 4083.5 364Q4103 398 4103 454L4103 559Q4103 644 4048 689.5Q3993 735 3896 735M4562 735L4400 735Q4364 735 4364 699L4364 208L4217 208Q4181 208 4181 172L4181 51Q4181 15 4217 15L4745 15Q4781 15 4781 51L4781 172Q4781 208 4745 208L4598 208L4598 699Q4598 735 4562 735" />
</svg>`;

const SVG_CARET_DOWN = `<svg class="hud-mode-dropdown__caret" width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 7L0.669873 1L9.33013 1L5 7Z" fill="#2a1f1a"/>
</svg>`;

interface ModeBtnDef {
  readonly mode: CreatureMode;
  readonly cssClass: string;
  readonly tooltip: string;
  readonly ariaLabel: string;
  readonly title: string;
  readonly svg: string;
}

const MODE_BTNS: readonly ModeBtnDef[] = [
  { mode: "eyes", cssClass: "hud-btn--eye", tooltip: "Eye Mode", ariaLabel: "Eye Mode", title: "Eyes", svg: SVG_EYE },
  { mode: "pointedFinger", cssClass: "hud-btn--hand", tooltip: "Point Mode", ariaLabel: "Point Mode", title: "Pointed Fingers", svg: SVG_HAND },
  { mode: "cockroach", cssClass: "hud-btn--bug", tooltip: "Cockroach Mode", ariaLabel: "Cockroach Mode", title: "Cockroaches", svg: SVG_COCKROACH },
  { mode: "placard", cssClass: "hud-btn--placard", tooltip: "Placard Mode", ariaLabel: "Placard Mode", title: "Placards", svg: SVG_PLACARD },
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly modeBtnEls = new Map<CreatureMode, HTMLButtonElement>();
  private readonly modeDropdownBtn: HTMLButtonElement;
  private readonly modePanel: HTMLElement;
  private readonly modeOptionEls = new Map<CreatureMode, HTMLElement>();
  private isPanelOpen = false;
  private placardSvg: string | null = null;

  private settingsBtn: HTMLButtonElement | null = null;
  private galleryBtn: HTMLButtonElement | null = null;
  private protestBtn: HTMLButtonElement | null = null;
  private protestAnchor: HTMLElement | null = null;
  private activeMode: CreatureMode = "cockroach";

  private modeChangeCb: ((mode: CreatureMode) => void) | null = null;

  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private boundOnPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundOnPointerUp: ((e: PointerEvent) => void) | null = null;
  private boundOnPanelDocClick: ((e: MouseEvent) => void) | null = null;
  private boundOnPanelKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundOnWindowResize: (() => void) | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    const root = el("div", "premium-hud");
    root.setAttribute("role", "toolbar");
    root.setAttribute("aria-label", "Game controls");
    this.root = root;

    root.appendChild(this.buildDragHandle());

    // Mobile dropdown button (replaces the mode button strip on narrow viewports)
    this.modeDropdownBtn = this.buildModeDropdownBtn();
    root.appendChild(this.modeDropdownBtn);

    // Desktop mode button group
    const modeGroup = el("div", "hud-mode-group");
    for (const def of MODE_BTNS) {
      const btn = this.buildModeBtn(def);
      this.modeBtnEls.set(def.mode, btn);
      modeGroup.appendChild(btn);
    }
    root.appendChild(modeGroup);

    root.appendChild(this.buildDivider());

    this.settingsBtn = this.buildUtilityBtn("hud-btn--settings", "Settings", SVG_SETTINGS);
    root.appendChild(this.settingsBtn);
    this.galleryBtn = this.buildUtilityBtn("hud-btn--gallery", "Grid View", SVG_GALLERY);
    root.appendChild(this.galleryBtn);

    this.protestAnchor = this.buildProtestBtn();
    root.appendChild(this.protestAnchor);

    this.modePanel = this.buildModePanel();

    this.setActiveMode("cockroach");

    // Fire-and-forget: swap the placard button's fallback markup for the
    // real static icon once it loads. If the fetch fails, the inline
    // SVG_PLACARD fallback rendered by buildModeBtn() stays in place.
    void this.loadPlacardIcon();
  }

  private async loadPlacardIcon(): Promise<void> {
    try {
      const svg = await loadPlacardSvg();
      this.placardSvg = svg;
      const btn = this.modeBtnEls.get("placard");
      if (btn) btn.innerHTML = svg;

      const placardItem = this.modeOptionEls.get("placard");
      const placardBadge = placardItem?.querySelector(".hud-mode-panel__icon-badge");
      if (placardBadge) placardBadge.innerHTML = svg;

      if (this.activeMode === "placard") {
        this.updateDropdownButton();
      }
    } catch {
      // keep the inline fallback SVG_PLACARD already rendered
    }
  }

  attachTo(container: HTMLElement): void {
    container.appendChild(this.root);
    document.body.appendChild(this.modePanel);
  }

  setActiveMode(mode: CreatureMode): void {
    this.activeMode = mode;
    for (const [m, btn] of this.modeBtnEls) {
      btn.classList.toggle("active", m === mode);
      btn.setAttribute("aria-pressed", String(m === mode));
    }
    for (const [m, item] of this.modeOptionEls) {
      const isActive = m === mode;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    }
    this.updateDropdownButton();
  }

  getActiveMode(): CreatureMode {
    return this.activeMode;
  }

  onModeChange(cb: (mode: CreatureMode) => void): void {
    this.modeChangeCb = cb;
  }

  destroy(): void {
    this.closeModePanel();
    this.detachDragListeners();
    this.modePanel.remove();
    this.root.remove();
  }

  hide(): void {
    this.closeModePanel();
    this.root.classList.add("hidden");
  }

  show(): void {
    this.root.classList.remove("hidden");
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  getModeDropdownButton(): HTMLElement {
    return this.modeDropdownBtn;
  }

  getModePanel(): HTMLElement {
    return this.modePanel;
  }

  isModePanelOpen(): boolean {
    return this.isPanelOpen;
  }

  openModePanel(): void {
    if (this.isPanelOpen) return;
    this.isPanelOpen = true;
    this.modeDropdownBtn.setAttribute("aria-expanded", "true");
    this.modePanel.classList.add("open");
    this.updateModePanelPosition();
    this.addPanelEventListeners();
  }

  closeModePanel(): void {
    if (!this.isPanelOpen) return;
    this.isPanelOpen = false;
    this.modeDropdownBtn.setAttribute("aria-expanded", "false");
    this.modePanel.classList.remove("open");
    this.removePanelEventListeners();
  }

  toggleModePanel(): void {
    if (this.isPanelOpen) {
      this.closeModePanel();
    } else {
      this.openModePanel();
    }
  }

  getSettingsButton(): HTMLElement {
    if (!this.settingsBtn) throw new Error("Settings button not initialized");
    return this.settingsBtn;
  }

  getGalleryButton(): HTMLElement {
    if (!this.galleryBtn) throw new Error("Gallery button not initialized");
    return this.galleryBtn;
  }

  getProtestButton(): HTMLElement {
    if (!this.protestBtn) throw new Error("Protest button not initialized");
    return this.protestBtn;
  }

  /** Non-overflow-hidden wrapper sized to exactly match the protest button — the button
   * itself (.hud-attack) clips its own content with `overflow: hidden` for its gradient
   * CTA look, which would silently clip anything absolutely positioned on top of it (e.g.
   * the "Press and hold" tooltip) if attached directly to the button instead of this anchor. */
  getProtestAnchor(): HTMLElement {
    if (!this.protestAnchor) throw new Error("Protest anchor not initialized");
    return this.protestAnchor;
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

  private buildModeDropdownBtn(): HTMLButtonElement {
    const btn = el("button", "hud-mode-dropdown-btn");
    btn.type = "button";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Creature mode menu");

    const iconWrap = el("span", "hud-mode-dropdown__icon");
    btn.appendChild(iconWrap);

    const caretWrap = el("span", "hud-mode-dropdown__caret-wrap");
    caretWrap.innerHTML = SVG_CARET_DOWN;
    btn.appendChild(caretWrap);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.audioContext) playHudSelectTone(this.audioContext);
      this.toggleModePanel();
    });

    return btn;
  }

  private buildModePanel(): HTMLElement {
    const panel = el("div", "hud-mode-panel");
    panel.setAttribute("role", "listbox");
    panel.setAttribute("aria-label", "Select creature mode");

    for (const def of MODE_BTNS) {
      const item = el("button", "hud-mode-panel__item");
      item.type = "button";
      item.setAttribute("role", "option");
      item.dataset.mode = def.mode;
      item.setAttribute("aria-label", def.title);

      const badge = el("span", "hud-mode-panel__icon-badge");
      badge.innerHTML = def.svg;
      item.appendChild(badge);

      const label = el("span", "hud-mode-panel__label");
      label.textContent = def.title;
      item.appendChild(label);

      const check = el("span", "hud-mode-panel__check");
      check.innerHTML = "✓";
      item.appendChild(check);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.audioContext) playHudSelectTone(this.audioContext);
        this.setActiveMode(def.mode);
        this.modeChangeCb?.(def.mode);
        this.closeModePanel();
      });

      this.modeOptionEls.set(def.mode, item);
      panel.appendChild(item);
    }

    return panel;
  }

  private updateDropdownButton(): void {
    if (!this.modeDropdownBtn) return;
    const def = MODE_BTNS.find((b) => b.mode === this.activeMode) ?? MODE_BTNS[0]!;
    this.modeDropdownBtn.className = `hud-mode-dropdown-btn active-${def.mode}`;
    this.modeDropdownBtn.setAttribute("aria-label", `Current mode: ${def.title}. Tap to change.`);

    const iconWrap = this.modeDropdownBtn.querySelector(".hud-mode-dropdown__icon");
    if (iconWrap) {
      iconWrap.innerHTML = def.mode === "placard" && this.placardSvg ? this.placardSvg : def.svg;
    }
  }

  private updateModePanelPosition(): void {
    if (!this.isPanelOpen || !this.modeDropdownBtn) return;
    const btnRect = this.modeDropdownBtn.getBoundingClientRect();
    const panelRect = this.modePanel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = btnRect.top - panelRect.height - 12;
    let left = btnRect.left + btnRect.width / 2 - panelRect.width / 2;

    if (top < 8) {
      top = btnRect.bottom + 8;
    }
    if (top + panelRect.height > vh - 8) {
      top = vh - panelRect.height - 8;
    }
    if (left < 8) {
      left = 8;
    }
    if (left + panelRect.width > vw - 8) {
      left = vw - panelRect.width - 8;
    }

    this.modePanel.style.top = `${top}px`;
    this.modePanel.style.left = `${left}px`;
  }

  private addPanelEventListeners(): void {
    this.boundOnPanelDocClick = (e: MouseEvent) => {
      if (
        !this.modePanel.contains(e.target as Node) &&
        !this.modeDropdownBtn.contains(e.target as Node)
      ) {
        this.closeModePanel();
      }
    };
    this.boundOnPanelKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.closeModePanel();
      }
    };
    this.boundOnWindowResize = () => {
      if (this.isPanelOpen) {
        this.updateModePanelPosition();
      }
    };
    document.addEventListener("click", this.boundOnPanelDocClick, true);
    document.addEventListener("keydown", this.boundOnPanelKeyDown);
    window.addEventListener("resize", this.boundOnWindowResize);
  }

  private removePanelEventListeners(): void {
    if (this.boundOnPanelDocClick) {
      document.removeEventListener("click", this.boundOnPanelDocClick, true);
      this.boundOnPanelDocClick = null;
    }
    if (this.boundOnPanelKeyDown) {
      document.removeEventListener("keydown", this.boundOnPanelKeyDown);
      this.boundOnPanelKeyDown = null;
    }
    if (this.boundOnWindowResize) {
      window.removeEventListener("resize", this.boundOnWindowResize);
      this.boundOnWindowResize = null;
    }
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

  private buildProtestBtn(): HTMLElement {
    const anchor = el("div", "hud-attack-anchor");
    // Tooltip attribute/class live on the anchor, not the button: .hud-attack
    // clips its own content with overflow:hidden (see the anchor's own CSS
    // comment), which silently clips a ::after tooltip pinned to the button
    // itself. The anchor has no such clipping, same reason the power meter
    // attaches there instead of to .hud-attack.
    anchor.dataset.tooltip = "Press and hold";

    const btn = el("button", "hud-attack");
    btn.type = "button";
    btn.setAttribute("aria-label", "Protest");
    btn.innerHTML = SVG_PROTEST;

    // Prevent mobile Safari / Chrome text selection callout or context menu on tap-and-hold
    btn.addEventListener("contextmenu", (e) => e.preventDefault());

    const hideTooltip = (): void => anchor.classList.remove("hud-attack--show-tooltip");

    btn.addEventListener("pointerdown", () => {
      if (this.audioContext) playHudSelectTone(this.audioContext);
      anchor.classList.add("hud-attack--show-tooltip");
    });
    btn.addEventListener("pointerup", hideTooltip);
    btn.addEventListener("pointerleave", hideTooltip);
    btn.addEventListener("pointercancel", hideTooltip);

    this.protestBtn = btn;
    anchor.appendChild(btn);
    return anchor;
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
    const rawX = e.clientX - this.dragOffsetX;
    const rawY = e.clientY - this.dragOffsetY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = this.root.getBoundingClientRect();
    const width = rect.width || this.root.offsetWidth || 0;
    const height = rect.height || this.root.offsetHeight || 0;
    const minX = Math.min(0, vw - width);
    const maxX = Math.max(0, vw - width);
    const minY = Math.min(0, vh - height);
    const maxY = Math.max(0, vh - height);
    const x = Math.max(minX, Math.min(maxX, rawX));
    const y = Math.max(minY, Math.min(maxY, rawY));
    this.root.style.left = `${x}px`;
    this.root.style.top = `${y}px`;
    updateSnapGuides(this.root);
  }

  private stopDrag(_e?: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    snapToGrid(this.root);
    clampToViewport(this.root);
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
