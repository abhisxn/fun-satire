import { UI_TOKENS } from "../config/visualTokens";
import { hudIcons, type HudMode, type HudPower } from "./hudIcons";

export type ControlBarOptions = {
  initialMode: HudMode;
  initialPower: HudPower;
  initialQuantity: number;
};

export type ControlBarPanelTrigger = "filter" | "gallery" | "text";

const QTY_MIN = 1;
const QTY_MAX = 60;
const POWER_LABELS: Record<HudPower, string> = {
  laserBurn: "laser burn",
  electricBurn: "shock",
  bugEat: "eat",
};

function controlIconSvg(mode: HudMode): string {
  switch (mode) {
    case "eyes":
      return hudIcons.eye;
    case "bugs":
      return hudIcons.bug;
    case "pointedFinger":
      return hudIcons.hand;
  }
}

export class ControlBar {
  private readonly root: HTMLElement;
  private mode: HudMode;
  private power: HudPower;
  private quantity: number;
  private currentSubjectId: number | null = null;
  private hidden_ = false;

  private readonly modeButtons: Record<HudMode, HTMLButtonElement>;
  private readonly powerLabel: HTMLElement;
  private readonly qtyValue: HTMLElement;
  private readonly attackBtn: HTMLButtonElement;
  private readonly triggers: Record<ControlBarPanelTrigger, HTMLButtonElement>;

  private modeChangeCb: ((mode: HudMode) => void) | null = null;
  private quantityChangeCb: ((quantity: number) => void) | null = null;
  private attackPressCb: ((subjectId: number | null) => void) | null = null;
  private attackReleaseCb: (() => void) | null = null;
  private handToolToggleCb: ((active: boolean) => void) | null = null;
  private triggerCb: ((which: ControlBarPanelTrigger) => void) | null = null;
  private handActive = false;

  constructor(host: HTMLElement, opts: ControlBarOptions) {
    this.mode = opts.initialMode;
    this.power = opts.initialPower;
    this.quantity = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(opts.initialQuantity)));

    const root = document.createElement("div");
    root.className = "control-bar";
    root.setAttribute("role", "toolbar");
    root.setAttribute("aria-label", "Crowd controls");
    root.dataset.geometry = "desktop";
    root.dataset.targetWidth = String(UI_TOKENS.control.bar.width);
    root.dataset.targetHeight = String(UI_TOKENS.control.bar.height);
    root.dataset.mode = this.mode;
    root.dataset.power = this.power;
    this.root = root;

    const modeGroup = document.createElement("div");
    modeGroup.className = "control-bar__mode-group";
    modeGroup.setAttribute("role", "group");
    modeGroup.setAttribute("aria-label", "Crowd mode");
    this.modeButtons = {} as Record<HudMode, HTMLButtonElement>;
    for (const mode of ["eyes", "bugs", "pointedFinger"] as HudMode[]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "control-bar__mode-btn";
      btn.dataset.controlMode = mode;
      btn.setAttribute("aria-pressed", this.mode === mode ? "true" : "false");
      btn.setAttribute("aria-label", `Mode: ${mode}`);
      btn.innerHTML = `<span class="control-bar__mode-icon" aria-hidden="true">${controlIconSvg(mode)}</span>`;
      btn.addEventListener("click", () => this.setMode(mode));
      modeGroup.appendChild(btn);
      this.modeButtons[mode] = btn;
    }
    root.appendChild(modeGroup);

    const stepper = document.createElement("div");
    stepper.className = "control-bar__stepper";
    stepper.dataset.controlStepper = "";
    stepper.setAttribute("role", "group");
    stepper.setAttribute("aria-label", "Crowd quantity");
    const dec = document.createElement("button");
    dec.type = "button";
    dec.className = "control-bar__qty-btn";
    dec.dataset.controlQty = "dec";
    dec.setAttribute("aria-label", "Decrease quantity");
    dec.textContent = "−";
    const value = document.createElement("output");
    value.className = "control-bar__qty-value";
    value.dataset.controlQtyValue = "";
    value.textContent = String(this.quantity);
    const inc = document.createElement("button");
    inc.type = "button";
    inc.className = "control-bar__qty-btn";
    inc.dataset.controlQty = "inc";
    inc.setAttribute("aria-label", "Increase quantity");
    inc.textContent = "+";
    dec.addEventListener("click", () => this.stepQuantity(-1));
    inc.addEventListener("click", () => this.stepQuantity(1));
    stepper.append(dec, value, inc);
    this.qtyValue = value;
    root.appendChild(stepper);

    this.triggers = {} as Record<ControlBarPanelTrigger, HTMLButtonElement>;
    const triggerGroup = document.createElement("div");
    triggerGroup.className = "control-bar__triggers";
    triggerGroup.setAttribute("role", "group");
    triggerGroup.setAttribute("aria-label", "Panels");
    const triggerDefs: Array<{ which: ControlBarPanelTrigger; label: string; icon: string; controls: string }> = [
      { which: "filter", label: "Filter", icon: hudIcons.filterLines ?? hudIcons.subjectToggleIcon, controls: "filter-panel" },
      { which: "text", label: "Text subject", icon: hudIcons.textBox, controls: "text-panel" },
      { which: "gallery", label: "Avatar gallery", icon: hudIcons.grid, controls: "avatar-gallery" },
    ];
    for (const def of triggerDefs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "control-bar__trigger";
      btn.dataset.controlTrigger = def.which;
      btn.setAttribute("aria-label", def.label);
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", def.controls);
      btn.innerHTML = `<span class="control-bar__trigger-icon" aria-hidden="true">${def.icon}</span>`;
      btn.addEventListener("click", () => this.handleTrigger(def.which));
      this.triggers[def.which] = btn;
      triggerGroup.appendChild(btn);
    }
    root.appendChild(triggerGroup);

    const attack = document.createElement("button");
    attack.type = "button";
    attack.className = "control-bar__attack";
    attack.dataset.controlAttack = "";
    attack.setAttribute("aria-label", "Attack");
    attack.disabled = this.currentSubjectId === null;
    const attackLabel = document.createElement("span");
    attackLabel.className = "control-bar__attack-label";
    attackLabel.textContent = "ATTACK";
    attack.append(attackLabel);
    this.attackBtn = attack;
    this.wireAttack(attack);
    root.appendChild(attack);

    const powerLabel = document.createElement("span");
    powerLabel.className = "control-bar__power-label";
    powerLabel.dataset.controlPowerLabel = "";
    powerLabel.textContent = POWER_LABELS[this.power];
    this.powerLabel = powerLabel;
    root.appendChild(powerLabel);

    const handBtn = document.createElement("button");
    handBtn.type = "button";
    handBtn.className = "control-bar__hand";
    handBtn.dataset.controlHand = "";
    handBtn.setAttribute("aria-label", "Hand tool");
    handBtn.setAttribute("aria-pressed", "false");
    handBtn.innerHTML = `<span class="control-bar__hand-icon" aria-hidden="true">${hudIcons.hand}</span>`;
    handBtn.addEventListener("click", () => {
      this.handActive = !this.handActive;
      handBtn.setAttribute("aria-pressed", this.handActive ? "true" : "false");
      this.handToolToggleCb?.(this.handActive);
    });
    root.appendChild(handBtn);

    host.appendChild(root);
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  setMode(mode: HudMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.root.dataset.mode = mode;
    for (const [m, btn] of Object.entries(this.modeButtons) as [HudMode, HTMLButtonElement][]) {
      btn.setAttribute("aria-pressed", m === mode ? "true" : "false");
    }
    this.modeChangeCb?.(mode);
  }

  getMode(): HudMode {
    return this.mode;
  }

  setPower(power: HudPower): void {
    this.power = power;
    this.root.dataset.power = power;
    this.powerLabel.textContent = POWER_LABELS[power];
  }

  getPower(): HudPower {
    return this.power;
  }

  setQuantity(quantity: number): void {
    const clamped = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(quantity)));
    this.quantity = clamped;
    this.qtyValue.textContent = String(clamped);
  }

  getQuantity(): number {
    return this.quantity;
  }

  private stepQuantity(delta: number): void {
    const next = this.quantity + delta;
    if (next < QTY_MIN || next > QTY_MAX) return;
    this.setQuantity(next);
    this.quantityChangeCb?.(this.quantity);
  }

  setCurrentSubjectId(id: number | null): void {
    this.currentSubjectId = id;
    this.attackBtn.disabled = id === null;
  }

  setHandToolActive(active: boolean): void {
    this.handActive = active;
    this.root.querySelector<HTMLButtonElement>("[data-control-hand]")?.setAttribute(
      "aria-pressed",
      active ? "true" : "false",
    );
  }

  setHidden(hidden: boolean): void {
    this.hidden_ = hidden;
    this.root.dataset.hidden = hidden ? "true" : "false";
  }

  isHidden(): boolean {
    return this.hidden_;
  }

  setTriggerExpanded(which: ControlBarPanelTrigger, expanded: boolean): void {
    this.triggers[which]?.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  private handleTrigger(which: ControlBarPanelTrigger): void {
    this.triggerCb?.(which);
  }

  private wireAttack(btn: HTMLButtonElement): void {
    const press = (e: Event): void => {
      e.preventDefault();
      if (btn.disabled) return;
      this.attackPressCb?.(this.currentSubjectId);
    };
    const release = (e: Event): void => {
      e.preventDefault();
      this.attackReleaseCb?.();
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        press(e);
      }
    });
    btn.addEventListener("keyup", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        release(e);
      }
    });
  }

  onModeChange(cb: (mode: HudMode) => void): void { this.modeChangeCb = cb; }
  onQuantityChange(cb: (quantity: number) => void): void { this.quantityChangeCb = cb; }
  onAttackPress(cb: (subjectId: number | null) => void): void { this.attackPressCb = cb; }
  onAttackRelease(cb: () => void): void { this.attackReleaseCb = cb; }
  onHandToolToggle(cb: (active: boolean) => void): void { this.handToolToggleCb = cb; }
  onPanelTrigger(cb: (which: ControlBarPanelTrigger) => void): void { this.triggerCb = cb; }

  destroy(): void {
    this.root.remove();
  }
}
