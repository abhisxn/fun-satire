import { PALETTE } from "../config/tokens";
import { hudIcons, HUD_TEAR_PATH, type HudMode, type HudPower, type HudSkin } from "./hudIcons";

const MODE_CYCLE: readonly HudMode[] = ["eyes", "bugs", "pointedFinger"];
const SKIN_CYCLE: readonly HudSkin[] = ["figure", "lotus"];
const QTY_MIN = 1;
const QTY_MAX = 60;

export class Hud {
  private placard: HTMLElement;
  private label: HTMLElement;
  private powerLabel: HTMLElement;
  private skinLabel: HTMLElement;
  private qtyValue: HTMLElement;
  private modeIconHost: HTMLElement;
  private powerIconHost: HTMLElement;
  private skinIconHost: HTMLElement;
  private repelInput: HTMLInputElement;
  private chargeRing: HTMLElement;
  private mode: HudMode = "eyes";
  private power: HudPower = "laserBurn";
  private skin: HudSkin = "figure";
  private quantity = 20;
  private readonly powerLabels: Record<HudPower, string> = {
    laserBurn: "laser burn",
    electricBurn: "shock",
    bugEat: "eat",
  };
  private modeChangeCb: ((mode: HudMode) => void) | null = null;
  private skinChangeCb: ((skin: HudSkin) => void) | null = null;
  private quantityChangeCb: ((delta: number) => void) | null = null;
  private repelChangeCb: ((multiplier: number) => void) | null = null;

  constructor(root: HTMLElement) {
    root.dataset.layer = "hud";
    root.innerHTML = "";
    this.placard = document.createElement("div");
    this.placard.className = "hud-placard";
    this.placard.dataset.mode = this.mode;
    this.placard.dataset.power = this.power;
    this.placard.setAttribute("aria-label", "Mode, skin, and active power");
    this.placard.setAttribute("role", "status");
    this.placard.innerHTML = `
      <svg class="hud-placard__tear" viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="${HUD_TEAR_PATH}" fill="${PALETTE.cream}" stroke="${PALETTE.ink}" stroke-width="1"/>
      </svg>
      <div class="hud-placard__grain"></div>
      <div class="hud-placard__inner">
        <button type="button" class="hud-placard__mode-icon" aria-label="Cycle crowd mode"></button>
        <span class="hud-placard__mode-label">eyes</span>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <button type="button" class="hud-placard__skin-icon" aria-label="Cycle subject skin"></button>
        <span class="hud-placard__skin-label">figure</span>
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
        <div class="hud-placard__repel-track" role="group" aria-label="Repel strength">
          <label class="hud-placard__repel-label" for="hud-repel-input">repel</label>
          <input id="hud-repel-input" class="hud-placard__repel-input" type="range" min="0" max="2" step="0.05" value="1" />
        </div>
      </div>
    `;
    root.appendChild(this.placard);
    this.label = this.placard.querySelector<HTMLElement>(".hud-placard__mode-label")!;
    this.powerLabel = this.placard.querySelector<HTMLElement>(".hud-placard__power-label")!;
    this.skinLabel = this.placard.querySelector<HTMLElement>(".hud-placard__skin-label")!;
    this.qtyValue = this.placard.querySelector<HTMLElement>(".hud-placard__qty-value")!;
    this.modeIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__mode-icon")!;
    this.powerIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__power-icon")!;
    this.skinIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__skin-icon")!;
    this.repelInput = this.placard.querySelector<HTMLInputElement>(".hud-placard__repel-input")!;
    this.chargeRing = this.placard.querySelector<HTMLElement>(".hud-placard__charge")!;
    this.refreshIcons();
    this.wireControls();
    requestAnimationFrame(() => this.placard.classList.add("hud-placard--ready"));
  }

  private wireControls(): void {
    this.modeIconHost.addEventListener("click", () => {
      const idx = MODE_CYCLE.indexOf(this.mode);
      const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]!;
      this.setMode(next);
      this.modeChangeCb?.(next);
    });
    this.skinIconHost.addEventListener("click", () => {
      const idx = SKIN_CYCLE.indexOf(this.skin);
      const next = SKIN_CYCLE[(idx + 1) % SKIN_CYCLE.length]!;
      this.setSkin(next);
      this.skinChangeCb?.(next);
    });
    this.placard.querySelector<HTMLElement>(".hud-placard__qty-inc")!.addEventListener("click", () => {
      if (this.quantity >= QTY_MAX) return;
      this.setQuantity(this.quantity + 1);
      this.quantityChangeCb?.(1);
    });
    this.placard.querySelector<HTMLElement>(".hud-placard__qty-dec")!.addEventListener("click", () => {
      if (this.quantity <= QTY_MIN) return;
      this.setQuantity(this.quantity - 1);
      this.quantityChangeCb?.(-1);
    });
    this.repelInput.addEventListener("input", () => {
      const v = Math.max(0, Math.min(2, Number.parseFloat(this.repelInput.value)));
      this.repelChangeCb?.(v);
    });
  }

  private refreshIcons(): void {
    this.modeIconHost.innerHTML = hudIcons.modeIcon[this.mode];
    this.powerIconHost.innerHTML = hudIcons.powerIcon[this.power];
    this.skinIconHost.innerHTML = hudIcons.skinIcon[this.skin];
  }

  setMode(mode: HudMode): void {
    this.mode = mode;
    this.placard.dataset.mode = mode;
    this.label.textContent = mode;
    this.refreshIcons();
  }

  setSkin(skin: HudSkin): void {
    this.skin = skin;
    this.placard.dataset.skin = skin;
    this.skinLabel.textContent = skin;
    this.refreshIcons();
  }

  setPower(power: HudPower): void {
    this.power = power;
    this.placard.dataset.power = power;
    this.powerLabel.textContent = this.powerLabels[power];
    this.refreshIcons();
  }

  setQuantity(quantity: number): void {
    this.quantity = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(quantity)));
    this.qtyValue.textContent = String(this.quantity);
  }

  setCharge(progress: number, visible: boolean): void {
    const p = Math.max(0, Math.min(1, progress));
    this.chargeRing.style.setProperty("--charge", p.toFixed(3));
    this.chargeRing.dataset.visible = visible ? "true" : "false";
  }

  onModeChange(cb: (mode: HudMode) => void): void {
    this.modeChangeCb = cb;
  }

  onSkinChange(cb: (skin: HudSkin) => void): void {
    this.skinChangeCb = cb;
  }

  onQuantityChange(cb: (delta: number) => void): void {
    this.quantityChangeCb = cb;
  }

  onRepelChange(cb: (multiplier: number) => void): void {
    this.repelChangeCb = cb;
  }
}
