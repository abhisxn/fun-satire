import { PALETTE } from "../config/tokens";
import { hudIcons, HUD_TEAR_PATH, type HudMode, type HudPower } from "./hudIcons";
import { SubjectDrawer } from "./SubjectDrawer";
import { SubjectDragSource, type SubjectDropResult } from "../input/SubjectDragSource";
import type { SubjectSkin } from "./subjectSkinRegistry";
import type { TextFontId } from "./textFontRegistry";

const MODE_CYCLE: readonly HudMode[] = ["eyes", "bugs", "pointedFinger"];
const QTY_MIN = 1;
const QTY_MAX = 60;

export class Hud {
  private placard: HTMLElement;
  private visibilityToggleBtn: HTMLButtonElement;
  private label: HTMLElement;
  private powerLabel: HTMLElement;
  private qtyValue: HTMLElement;
  private modeIconHost: HTMLElement;
  private powerIconHost: HTMLElement;
  private subjectToggle: HTMLElement;
  private repelInput: HTMLInputElement;
  private chargeRing: HTMLElement;
  private subjectCountEl: HTMLElement;
  private handToolBtn: HTMLElement;
  private textToolBtn: HTMLElement;
  private gridToolBtn: HTMLElement;
  private attackBtn: HTMLElement;
  private attackIconHost: HTMLElement;
  private fixtureFilterPanel: HTMLElement | null = null;
  private readonly root: HTMLElement;
  private readonly drawer: SubjectDrawer;
  private readonly dragSource: SubjectDragSource;
  private mode: HudMode = "eyes";
  private power: HudPower = "laserBurn";
  private quantity = 20;
  private subjectCount = 0;
  private lockedSubjectId: number | null = null;
  private activeSubjectSkin: SubjectSkin | null = null;
  private readonly powerLabels: Record<HudPower, string> = {
    laserBurn: "laser burn",
    electricBurn: "shock",
    bugEat: "eat",
  };
  private hidden_ = false;
  private currentSubjectId: number | null = null;
  private handToolActive = false;
  private isDraggingPlacard = false;
  private placardOffset = { x: 0, y: 0 };
  private dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
  private modeChangeCb: ((mode: HudMode) => void) | null = null;
  private subjectDropCb: ((result: SubjectDropResult) => void) | null = null;
  private quantityChangeCb: ((quantity: number) => void) | null = null;
  private repelChangeCb: ((multiplier: number) => void) | null = null;
  private attackPressCb: ((subjectId: number | null) => void) | null = null;
  private attackReleaseCb: (() => void) | null = null;
  private handToolToggleCb: ((active: boolean) => void) | null = null;
  private textToolCb: (() => void) | null = null;
  private gridToolCb: (() => void) | null = null;
  private visibilityToggleCb: ((visible: boolean) => void) | null = null;
  private entranceFrame: number | null = null;

  constructor(root: HTMLElement, canvasDropTarget?: HTMLElement) {
    this.root = root;
    root.dataset.layer = "hud";
    root.innerHTML = "";
    this.placard = document.createElement("div");
    this.placard.className = "hud-placard";
    this.placard.dataset.mode = this.mode;
    this.placard.dataset.power = this.power;
    this.placard.setAttribute("aria-label", "Mode, subject browser, and active power");
    this.placard.setAttribute("role", "status");
    this.placard.innerHTML = `
      <svg class="hud-placard__tear" viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="${HUD_TEAR_PATH}" fill="${PALETTE.cream}" stroke="${PALETTE.ink}" stroke-width="1"/>
      </svg>
      <div class="hud-placard__grain"></div>
      <div class="hud-placard__inner">
        <button type="button" class="hud-placard__drag-handle" aria-label="Reposition HUD" title="Drag to reposition">${hudIcons.dragHandle}</button>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <div class="hud-placard__chrome" role="group" aria-label="HUD tools">
          <button type="button" class="hud-placard__tool hud-placard__tool--hand" aria-label="Hand tool" aria-pressed="false" title="Hand tool">${hudIcons.hand}</button>
          <button type="button" class="hud-placard__tool hud-placard__tool--text" aria-label="Text subject" title="Quick text subject">${hudIcons.textBox}</button>
          <button type="button" class="hud-placard__tool hud-placard__tool--grid" aria-label="Browse subjects" title="Browse subjects">${hudIcons.grid}</button>
        </div>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <button type="button" class="hud-placard__attack" aria-label="Attack" title="Hold to attack">
          <span class="hud-placard__attack-icon" aria-hidden="true">${hudIcons.attack}</span>
          <span class="hud-placard__attack-label">attack</span>
        </button>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <button type="button" class="hud-placard__mode-icon" aria-label="Cycle crowd mode"></button>
        <span class="hud-placard__mode-label">eyes</span>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <button type="button" class="hud-placard__subject-toggle" aria-label="Browse subjects"></button>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <span class="hud-placard__power-icon" aria-hidden="true"></span>
        <span class="hud-placard__power-label">laser burn</span>
        <span class="hud-placard__charge" aria-hidden="true"></span>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <div class="hud-placard__qty" role="group" aria-label="Crowd quantity">
          <button type="button" class="hud-placard__qty-dec" aria-label="Decrease quantity">-</button>
          <span class="hud-placard__qty-value">20</span>
          <button type="button" class="hud-placard__qty-inc" aria-label="Increase quantity">+</button>
        </div>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <span class="hud-placard__subject-count" aria-label="Subject count">0</span>
        <div class="hud-placard__repel-track" role="group" aria-label="Repel strength">
          <label class="hud-placard__repel-label" for="hud-repel-input">repel</label>
          <input id="hud-repel-input" class="hud-placard__repel-input" type="range" min="0" max="2" step="0.05" value="1" />
        </div>
      </div>
    `;
    root.appendChild(this.placard);
    this.visibilityToggleBtn = document.createElement("button");
    this.visibilityToggleBtn.type = "button";
    this.visibilityToggleBtn.className = "hud-visibility-toggle";
    this.visibilityToggleBtn.setAttribute("aria-label", "Toggle HUD visibility");
    this.visibilityToggleBtn.setAttribute("title", "Show/hide HUD");
    this.visibilityToggleBtn.innerHTML = hudIcons.visibilityOn;
    root.appendChild(this.visibilityToggleBtn);
    this.label = this.placard.querySelector<HTMLElement>(".hud-placard__mode-label")!;
    this.powerLabel = this.placard.querySelector<HTMLElement>(".hud-placard__power-label")!;
    this.qtyValue = this.placard.querySelector<HTMLElement>(".hud-placard__qty-value")!;
    this.modeIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__mode-icon")!;
    this.powerIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__power-icon")!;
    this.subjectToggle = this.placard.querySelector<HTMLElement>(".hud-placard__subject-toggle")!;
    this.repelInput = this.placard.querySelector<HTMLInputElement>(".hud-placard__repel-input")!;
    this.chargeRing = this.placard.querySelector<HTMLElement>(".hud-placard__charge")!;
    this.subjectCountEl = this.placard.querySelector<HTMLElement>(".hud-placard__subject-count")!;
    this.handToolBtn = this.placard.querySelector<HTMLElement>(".hud-placard__tool--hand")!;
    this.textToolBtn = this.placard.querySelector<HTMLElement>(".hud-placard__tool--text")!;
    this.gridToolBtn = this.placard.querySelector<HTMLElement>(".hud-placard__tool--grid")!;
    this.attackBtn = this.placard.querySelector<HTMLElement>(".hud-placard__attack")!;
    this.attackIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__attack-icon")!;
    this.subjectToggle.innerHTML = hudIcons.subjectToggleIcon;
    this.drawer = new SubjectDrawer(root, { anchor: "right" });
    this.dragSource = new SubjectDragSource({ dropTarget: canvasDropTarget ?? root });
    for (const { skin, el } of this.drawer.getCardElements()) {
      this.dragSource.attachCard(el, () => skin);
    }
    const preview = this.drawer.getComposePreviewCard();
    this.dragSource.attachCard(preview.el, preview.getSkin);
    this.dragSource.onDrop((result) => {
      this.drawer.close();
      this.subjectDropCb?.(result);
    });
    this.refreshIcons();
    this.wireControls();
    this.attackBtn.dataset.disabled = this.currentSubjectId === null ? "true" : "false";
    this.entranceFrame = requestAnimationFrame(() => {
      this.entranceFrame = null;
      this.placard.classList.add("hud-placard--ready");
    });
  }

  private wireControls(): void {
    this.modeIconHost.addEventListener("click", () => {
      const idx = MODE_CYCLE.indexOf(this.mode);
      const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]!;
      this.setMode(next);
      this.modeChangeCb?.(next);
    });
    this.subjectToggle.addEventListener("click", () => {
      this.drawer.toggle();
    });
    this.placard.querySelector<HTMLElement>(".hud-placard__qty-inc")!.addEventListener("click", () => {
      if (this.quantity >= QTY_MAX) return;
      this.setQuantity(this.quantity + 1);
      this.quantityChangeCb?.(this.quantity);
    });
    this.placard.querySelector<HTMLElement>(".hud-placard__qty-dec")!.addEventListener("click", () => {
      if (this.quantity <= QTY_MIN) return;
      this.setQuantity(this.quantity - 1);
      this.quantityChangeCb?.(this.quantity);
    });
    this.repelInput.addEventListener("input", () => {
      const v = Math.max(0, Math.min(2, Number.parseFloat(this.repelInput.value)));
      this.repelChangeCb?.(v);
    });

    this.wireChrome();
    this.wireVisibilityToggle();
    this.wireDragHandle();
    this.wireAttack();
  }

  private wireChrome(): void {
    this.handToolBtn.addEventListener("click", () => {
      this.handToolActive = !this.handToolActive;
      this.handToolBtn.dataset.active = this.handToolActive ? "true" : "false";
      this.handToolBtn.setAttribute("aria-pressed", this.handToolActive ? "true" : "false");
      this.handToolToggleCb?.(this.handToolActive);
    });
    this.textToolBtn.addEventListener("click", () => {
      this.textToolCb?.();
    });
    this.gridToolBtn.addEventListener("click", () => {
      this.gridToolCb?.();
    });
  }

  private wireVisibilityToggle(): void {
    this.visibilityToggleBtn.addEventListener("click", () => {
      this.setHidden(!this.hidden_);
      this.visibilityToggleCb?.(!this.hidden_);
    });
  }

  private wireDragHandle(): void {
    const handle = this.placard.querySelector<HTMLElement>(".hud-placard__drag-handle")!;
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.isDraggingPlacard = true;
      this.dragStart = { x: e.clientX, y: e.clientY, ox: this.placardOffset.x, oy: this.placardOffset.y };
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!this.isDraggingPlacard) return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.placardOffset = { x: this.dragStart.ox + dx, y: this.dragStart.oy + dy };
      this.applyPlacardOffset();
    });
    const endDrag = (e: PointerEvent): void => {
      if (!this.isDraggingPlacard) return;
      this.isDraggingPlacard = false;
      try { handle.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    };
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  }

  private applyPlacardOffset(): void {
    this.placard.style.setProperty("--placard-x", `${this.placardOffset.x}px`);
    this.placard.style.setProperty("--placard-y", `${this.placardOffset.y}px`);
  }

  private wireAttack(): void {
    const press = (e: Event): void => {
      e.preventDefault();
      if (this.attackBtn.dataset.disabled === "true") return;
      this.attackBtn.dataset.pressed = "true";
      this.attackPressCb?.(this.currentSubjectId);
    };
    const release = (e: Event): void => {
      e.preventDefault();
      this.attackBtn.dataset.pressed = "false";
      this.attackReleaseCb?.();
    };
    this.attackBtn.addEventListener("pointerdown", press);
    this.attackBtn.addEventListener("pointerup", release);
    this.attackBtn.addEventListener("pointercancel", release);
    this.attackBtn.addEventListener("pointerleave", (e) => {
      if (this.attackBtn.dataset.pressed === "true") release(e);
    });
    this.attackBtn.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        press(e);
      }
    });
    this.attackBtn.addEventListener("keyup", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        release(e);
      }
    });
    this.attackBtn.addEventListener("blur", () => {
      if (this.attackBtn.dataset.pressed === "true") {
        this.attackBtn.dataset.pressed = "false";
        this.attackReleaseCb?.();
      }
    });
  }

  private refreshIcons(): void {
    this.modeIconHost.innerHTML = hudIcons.modeIcon[this.mode];
    this.powerIconHost.innerHTML = hudIcons.powerIcon[this.power];
    if (this.attackIconHost) this.attackIconHost.innerHTML = hudIcons.attack;
    this.visibilityToggleBtn.innerHTML = this.hidden_ ? hudIcons.visibilityOff : hudIcons.visibilityOn;
  }

  setMode(mode: HudMode): void {
    this.mode = mode;
    this.placard.dataset.mode = mode;
    this.label.textContent = mode;
    this.refreshIcons();
  }

  setPower(power: HudPower): void {
    this.power = power;
    this.placard.dataset.power = power;
    this.powerLabel.textContent = this.powerLabels[power];
    this.refreshIcons();
  }

  setActiveSubjectSkin(subjectId: number | null, skin: SubjectSkin): void {
    this.activeSubjectSkin = skin;
    this.drawer.setActiveSkin(subjectId, skin);
  }

  setSubjectCount(n: number): void {
    this.subjectCount = Math.max(0, Math.round(n));
    this.subjectCountEl.textContent = String(this.subjectCount);
  }

  setLockedSubjectId(id: number | null): void {
    this.lockedSubjectId = id;
    if (id === null) {
      this.drawer.setActiveSkin(null, null);
      return;
    }
    if (this.activeSubjectSkin) {
      this.drawer.setActiveSkin(id, this.activeSubjectSkin);
    }
  }

  getLockedSubjectId(): number | null {
    return this.lockedSubjectId;
  }

  setQuantity(quantity: number): void {
    this.quantity = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(quantity)));
    this.qtyValue.textContent = String(this.quantity);
    const fixtureQuantity = this.fixtureFilterPanel?.querySelector<HTMLOutputElement>("[data-fixture-quantity]");
    if (fixtureQuantity) fixtureQuantity.value = String(this.quantity);
  }

  setVisualFixturePanel(panel: "none" | "filter" | "gallery"): void {
    const fixtureFilterPanel = this.ensureFixtureFilterPanel();
    const filterOpen = panel === "filter";
    fixtureFilterPanel.hidden = !filterOpen;
    fixtureFilterPanel.setAttribute("aria-hidden", filterOpen ? "false" : "true");
    if (panel === "gallery") this.drawer.open();
    else this.drawer.close();
    this.subjectToggle.setAttribute("aria-expanded", panel === "gallery" ? "true" : "false");
  }

  private ensureFixtureFilterPanel(): HTMLElement {
    if (this.fixtureFilterPanel) return this.fixtureFilterPanel;
    const panel = document.createElement("section");
    panel.className = "hud-fixture-filter-panel";
    panel.dataset.visualFixturePanel = "filter";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Crowd filters");
    panel.setAttribute("aria-hidden", "true");
    panel.hidden = true;
    panel.innerHTML = `
      <strong>Filter crowd</strong>
      <span>quantity <output data-fixture-quantity>${this.quantity}</output></span>
      <span>repel <output data-fixture-repel>1</output></span>
    `;
    this.root.appendChild(panel);
    this.fixtureFilterPanel = panel;
    return panel;
  }

  setVisualFixtureAttackState(input: Readonly<{
    targetId: number;
    skin: SubjectSkin;
    progress: number;
  }>): void {
    this.setCurrentSubjectId(input.targetId);
    this.setActiveSubjectSkin(input.targetId, input.skin);
    this.setLockedSubjectId(input.targetId);
    this.setCharge(input.progress, true);
  }

  async finishEntranceTransitions(): Promise<void> {
    if (this.entranceFrame !== null) {
      cancelAnimationFrame(this.entranceFrame);
      this.entranceFrame = null;
    }
    this.placard.classList.add("hud-placard--ready");
    this.drawer.finishEntranceTransitions();
    await Promise.resolve();
  }

  setCharge(progress: number, visible: boolean): void {
    const p = Math.max(0, Math.min(1, progress));
    this.chargeRing.style.setProperty("--charge", p.toFixed(3));
    this.chargeRing.dataset.visible = visible ? "true" : "false";
  }

  setHidden(hidden: boolean): void {
    this.hidden_ = hidden;
    this.placard.dataset.hidden = hidden ? "true" : "false";
    this.refreshIcons();
  }

  isHidden(): boolean {
    return this.hidden_;
  }

  setCurrentSubjectId(id: number | null): void {
    this.currentSubjectId = id;
    if (this.attackBtn) {
      this.attackBtn.dataset.disabled = id === null ? "true" : "false";
    }
  }

  getCurrentSubjectId(): number | null {
    return this.currentSubjectId;
  }

  setHandToolActive(active: boolean): void {
    this.handToolActive = active;
    if (this.handToolBtn) {
      this.handToolBtn.dataset.active = active ? "true" : "false";
      this.handToolBtn.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  onModeChange(cb: (mode: HudMode) => void): void {
    this.modeChangeCb = cb;
  }

  onSubjectDrop(cb: (result: SubjectDropResult) => void): void {
    this.subjectDropCb = cb;
  }

  onSubjectResize(cb: (subjectId: number | null, scale: number) => void): void {
    this.drawer.onResize(cb);
  }

  onSubjectFontChange(cb: (subjectId: number | null, fontId: TextFontId) => void): void {
    this.drawer.onFontChange(cb);
  }

  onSubjectAlignChange(cb: (subjectId: number | null, align: "left" | "center" | "right") => void): void {
    this.drawer.onAlignChange(cb);
  }

  onSubjectSkinChange(cb: (subjectId: number | null, skin: SubjectSkin) => void): void {
    this.drawer.onSkinChange(cb);
  }

  onQuantityChange(cb: (quantity: number) => void): void {
    this.quantityChangeCb = cb;
  }

  onRepelChange(cb: (multiplier: number) => void): void {
    this.repelChangeCb = cb;
  }

  onAttackPress(cb: (subjectId: number | null) => void): void {
    this.attackPressCb = cb;
  }

  onAttackRelease(cb: () => void): void {
    this.attackReleaseCb = cb;
  }

  onHandToolToggle(cb: (active: boolean) => void): void {
    this.handToolToggleCb = cb;
  }

  onTextTool(cb: () => void): void {
    this.textToolCb = cb;
  }

  onGridTool(cb: () => void): void {
    this.gridToolCb = cb;
  }

  onVisibilityToggle(cb: (visible: boolean) => void): void {
    this.visibilityToggleCb = cb;
  }
}
