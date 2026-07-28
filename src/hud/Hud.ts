import type { SubjectDropResult } from "../input/SubjectDragSource";
import type { SubjectSkin } from "./subjectSkinRegistry";
import type { TextFontId } from "./textFontRegistry";
import { hudIcons, type HudMode, type HudPower } from "./hudIcons";
import { ControlBar, type ControlBarPanelTrigger, type ControlEvent } from "./ControlBar";
import { FilterPanel } from "./FilterPanel";
import { AvatarGallery, type AvatarEntry } from "./AvatarGallery";
import { OverlayLayout, type OverlayPanelId } from "./OverlayLayout";
import { AVATAR_ASSET_REGISTRY } from "./avatarAssetRegistry";
import type { ControlVariant } from "../render/responsiveScene";
import "./controlBar.css";
import "./filterPanel.css";
import "./avatarGallery.css";
import "./overlayLayout.css";

const QTY_MIN = 1;
const QTY_MAX = 60;

export class Hud {
  private visibilityToggleBtn: HTMLButtonElement;
  private readonly root: HTMLElement;
  private mode: HudMode = "eyes";
  private power: HudPower = "laserBurn";
  private quantity = 20;
  private subjectCount = 0;
  private lockedSubjectId: number | null = null;
  private activeSubjectSkin: SubjectSkin | null = null;
  private hidden_ = false;
  private currentSubjectId: number | null = null;
  private handToolActive = false;
  private chargeProgress = 0;
  private chargeVisible = false;
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
  private controlEventCb: ((event: ControlEvent) => void) | null = null;
  private subjectResizeCb: ((subjectId: number | null, scale: number) => void) | null = null;
  private subjectFontChangeCb: ((subjectId: number | null, fontId: TextFontId) => void) | null = null;
  private subjectAlignChangeCb: ((subjectId: number | null, align: "left" | "center" | "right") => void) | null = null;
  private subjectSkinChangeCb: ((subjectId: number | null, skin: SubjectSkin) => void) | null = null;
  private overlayAnchor: HTMLElement;
  private overlayPanels: HTMLElement;
  private controlBar: ControlBar | null = null;
  private filterPanel: FilterPanel | null = null;
  private avatarGallery: AvatarGallery | null = null;
  private overlay: OverlayLayout | null = null;
  private chargeEl: HTMLElement;

  constructor(root: HTMLElement, _canvasDropTarget?: HTMLElement) {
    this.root = root;
    root.dataset.layer = "hud";
    root.innerHTML = "";

    this.visibilityToggleBtn = document.createElement("button");
    this.visibilityToggleBtn.type = "button";
    this.visibilityToggleBtn.className = "hud-visibility-toggle";
    this.visibilityToggleBtn.setAttribute("aria-label", "Toggle HUD visibility");
    this.visibilityToggleBtn.setAttribute("title", "Show/hide HUD");
    this.visibilityToggleBtn.innerHTML = hudIcons.visibilityOn;
    root.appendChild(this.visibilityToggleBtn);

    this.overlayAnchor = document.createElement("div");
    this.overlayAnchor.className = "overlay-anchor";
    root.appendChild(this.overlayAnchor);
    this.overlayPanels = document.createElement("div");
    this.overlayPanels.className = "overlay-panels";
    root.appendChild(this.overlayPanels);

    this.chargeEl = document.createElement("span");
    this.chargeEl.className = "hud-charge";
    this.chargeEl.setAttribute("aria-hidden", "true");
    this.chargeEl.dataset.visible = "false";
    this.overlayAnchor.appendChild(this.chargeEl);

    this.installFocusedComponents();
    this.wireVisibilityToggle();
  }

  private installFocusedComponents(): void {
    this.controlBar = new ControlBar(this.overlayAnchor, {
      initialMode: this.mode,
      initialPower: this.power,
      initialQuantity: this.quantity,
    });
    this.controlBar.getRoot().classList.add("hud-control-bar");
    this.controlBar.onModeChange((mode) => {
      this.mode = mode;
      this.modeChangeCb?.(mode);
    });
    this.controlBar.onQuantityChange((q) => {
      this.quantity = q;
      this.filterPanel?.setQuantity(q);
      this.quantityChangeCb?.(q);
    });
    this.controlBar.onControlEvent((event) => this.handleControlEvent(event));

    this.filterPanel = new FilterPanel(this.overlayPanels, {
      initialQuantity: this.quantity,
      initialRepel: 1,
    });
    this.filterPanel.onQuantityChange((q) => {
      this.setQuantity(q);
      this.quantityChangeCb?.(q);
    });
    this.filterPanel.onRepelChange((m) => this.repelChangeCb?.(m));

    this.avatarGallery = new AvatarGallery(this.overlayPanels, {
      avatars: avatarRegistryEntries(),
      cardCount: Math.max(10, AVATAR_ASSET_REGISTRY.length),
    });
    this.avatarGallery.onSelect((id) => {
      const asset = AVATAR_ASSET_REGISTRY.find((a) => a.id === id);
      if (!asset) return;
      this.activeSubjectSkin = { kind: "avatar", assetId: asset.id };
      this.subjectSkinChangeCb?.(this.lockedSubjectId, this.activeSubjectSkin);
      this.subjectDropCb?.({ skin: this.activeSubjectSkin, canvasPos: null });
    });

    this.overlay = new OverlayLayout();
    this.overlay.register("filter", this.filterPanel.getRoot());
    this.overlay.register("gallery", this.avatarGallery.getRoot());
    this.overlay.onClose(() => this.syncOverlayTriggers());
  }

  private wireVisibilityToggle(): void {
    this.visibilityToggleBtn.addEventListener("click", () => {
      this.setHidden(!this.hidden_);
      this.visibilityToggleCb?.(!this.hidden_);
      this.controlEventCb?.({ type: "visibility", visible: !this.hidden_ });
    });
  }

  setMode(mode: HudMode): void {
    this.mode = mode;
    this.controlBar?.setMode(mode);
  }

  setPower(power: HudPower): void {
    this.power = power;
    this.controlBar?.setPower(power);
  }

  setActiveSubjectSkin(subjectId: number | null, skin: SubjectSkin): void {
    this.activeSubjectSkin = skin;
    if (subjectId !== null) this.lockedSubjectId = subjectId;
    if (skin.kind === "avatar") {
      this.avatarGallery?.setSelected(skin.assetId);
    }
  }

  setSubjectCount(n: number): void {
    this.subjectCount = Math.max(0, Math.round(n));
    this.root.dataset.subjectCount = String(this.subjectCount);
  }

  getSubjectCount(): number {
    return this.subjectCount;
  }

  setLockedSubjectId(id: number | null): void {
    this.lockedSubjectId = id;
    if (id === null) {
      this.activeSubjectSkin = null;
    }
  }

  getLockedSubjectId(): number | null {
    return this.lockedSubjectId;
  }

  setQuantity(quantity: number): void {
    this.quantity = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(quantity)));
    this.controlBar?.setQuantity(this.quantity);
    this.filterPanel?.setQuantity(this.quantity);
  }

  setVisualFixturePanel(panel: "none" | "filter" | "gallery"): void {
    if (panel === "none") {
      this.overlay?.close();
    } else if (!this.overlay?.isOpen(panel)) {
      this.overlay?.open(panel, this.controlBar?.getRoot() ?? null);
    }
    this.syncOverlayTriggers();
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

  setControlVariant(variant: ControlVariant): void {
    this.root.dataset.controlVariant = variant;
  }

  async finishEntranceTransitions(): Promise<void> {
    this.controlBar?.getRoot().classList.add("hud-control-bar--ready");
    await Promise.resolve();
  }

  setCharge(progress: number, visible: boolean): void {
    this.chargeProgress = Math.max(0, Math.min(1, progress));
    this.chargeVisible = visible;
    this.chargeEl.style.setProperty("--charge", this.chargeProgress.toFixed(3));
    this.chargeEl.dataset.visible = visible ? "true" : "false";
  }

  getCharge(): { progress: number; visible: boolean } {
    return { progress: this.chargeProgress, visible: this.chargeVisible };
  }

  setHidden(hidden: boolean): void {
    this.hidden_ = hidden;
    this.controlBar?.setHidden(hidden);
    this.visibilityToggleBtn.innerHTML = hidden ? hudIcons.visibilityOff : hudIcons.visibilityOn;
  }

  isHidden(): boolean {
    return this.hidden_;
  }

  setCurrentSubjectId(id: number | null): void {
    this.currentSubjectId = id;
    this.controlBar?.setCurrentSubjectId(id);
  }

  getCurrentSubjectId(): number | null {
    return this.currentSubjectId;
  }

  setHandToolActive(active: boolean): void {
    this.handToolActive = active;
    this.controlBar?.setHandToolActive(active);
  }

  isHandToolActive(): boolean {
    return this.handToolActive;
  }

  onModeChange(cb: (mode: HudMode) => void): void {
    this.modeChangeCb = cb;
  }

  onSubjectDrop(cb: (result: SubjectDropResult) => void): void {
    this.subjectDropCb = cb;
  }

  onSubjectResize(cb: (subjectId: number | null, scale: number) => void): void {
    this.subjectResizeCb = cb;
    void this.subjectResizeCb;
  }

  onSubjectFontChange(cb: (subjectId: number | null, fontId: TextFontId) => void): void {
    this.subjectFontChangeCb = cb;
    void this.subjectFontChangeCb;
  }

  onSubjectAlignChange(cb: (subjectId: number | null, align: "left" | "center" | "right") => void): void {
    this.subjectAlignChangeCb = cb;
    void this.subjectAlignChangeCb;
  }

  onSubjectSkinChange(cb: (subjectId: number | null, skin: SubjectSkin) => void): void {
    this.subjectSkinChangeCb = cb;
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

  onControlEvent(cb: (event: ControlEvent) => void): void {
    this.controlEventCb = cb;
  }

  private syncOverlayTriggers(): void {
    if (!this.controlBar || !this.overlay) return;
    const active = this.overlay.getActive();
    this.controlBar.setTriggerExpanded("filter", active === "filter");
    this.controlBar.setTriggerExpanded("gallery", active === "gallery");
    this.controlBar.setTriggerExpanded("text", active === "text");
  }

  private handleControlEvent(event: ControlEvent): void {
    this.controlEventCb?.(event);
    switch (event.type) {
      case "mode":
        this.mode = event.mode;
        this.power = event.power;
        this.controlBar?.setPower(event.power);
        this.modeChangeCb?.(event.mode);
        return;
      case "panel":
        this.routePanelTrigger(event.panel);
        return;
      case "hand":
        this.handToolActive = event.active;
        this.handToolToggleCb?.(event.active);
        return;
      case "visibility":
        return;
      case "attack-press":
        this.attackPressCb?.(event.subjectId);
        return;
      case "attack-release":
        this.attackReleaseCb?.();
        return;
    }
  }

  private routePanelTrigger(which: ControlBarPanelTrigger): void {
    if (!this.overlay || !this.controlBar) return;
    const map: Record<ControlBarPanelTrigger, OverlayPanelId> = {
      filter: "filter",
      gallery: "gallery",
      text: "text",
    };
    const id = map[which];
    if (id === "text") {
      this.textToolCb?.();
      this.controlBar.setTriggerExpanded("text", false);
      return;
    }
    if (id === "gallery") {
      this.gridToolCb?.();
    }
    const root = id === "filter" ? this.filterPanel?.getRoot() : this.avatarGallery?.getRoot();
    this.overlay.open(id, root ?? this.controlBar.getRoot());
    this.syncOverlayTriggers();
  }
}

function avatarRegistryEntries(): readonly AvatarEntry[] {
  return AVATAR_ASSET_REGISTRY.map((entry) => ({
    id: entry.id,
    label: entry.label,
    url: entry.url,
  }));
}
