import { PALETTE } from "../config/tokens";
import { hudIcons, HUD_TEAR_PATH, type HudMode, type HudPower } from "./hudIcons";

export class Hud {
  private placard: HTMLElement;
  private label: HTMLElement;
  private powerLabel: HTMLElement;
  private modeIconHost: HTMLElement;
  private powerIconHost: HTMLElement;
  private chargeRing: HTMLElement;
  private mode: HudMode = "eyes";
  private power: HudPower = "laserBurn";

  constructor(root: HTMLElement) {
    root.dataset.layer = "hud";
    root.innerHTML = "";
    this.placard = document.createElement("div");
    this.placard.className = "hud-placard";
    this.placard.dataset.mode = this.mode;
    this.placard.dataset.power = this.power;
    this.placard.setAttribute("aria-label", "Mode and active power");
    this.placard.setAttribute("role", "status");
    this.placard.innerHTML = `
      <svg class="hud-placard__tear" viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="${HUD_TEAR_PATH}" fill="${PALETTE.cream}" stroke="${PALETTE.ink}" stroke-width="1"/>
      </svg>
      <div class="hud-placard__inner">
        <span class="hud-placard__mode-icon" aria-hidden="true"></span>
        <span class="hud-placard__mode-label">eyes</span>
        <span class="hud-placard__divider" aria-hidden="true"></span>
        <span class="hud-placard__power-icon" aria-hidden="true"></span>
        <span class="hud-placard__power-label">laser burn</span>
        <span class="hud-placard__charge" aria-hidden="true"></span>
      </div>
    `;
    root.appendChild(this.placard);
    this.label = this.placard.querySelector<HTMLElement>(".hud-placard__mode-label")!;
    this.powerLabel = this.placard.querySelector<HTMLElement>(".hud-placard__power-label")!;
    this.modeIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__mode-icon")!;
    this.powerIconHost = this.placard.querySelector<HTMLElement>(".hud-placard__power-icon")!;
    this.chargeRing = this.placard.querySelector<HTMLElement>(".hud-placard__charge")!;
    this.refreshIcons();
    requestAnimationFrame(() => this.placard.classList.add("hud-placard--ready"));
  }

  private refreshIcons(): void {
    this.modeIconHost.innerHTML = hudIcons.modeIcon[this.mode];
    this.powerIconHost.innerHTML = hudIcons.powerIcon[this.power];
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
    this.powerLabel.textContent = power === "laserBurn" ? "laser burn" : power;
    this.refreshIcons();
  }

  setCharge(progress: number, visible: boolean): void {
    const p = Math.max(0, Math.min(1, progress));
    this.chargeRing.style.setProperty("--charge", p.toFixed(3));
    this.chargeRing.dataset.visible = visible ? "true" : "false";
  }
}
