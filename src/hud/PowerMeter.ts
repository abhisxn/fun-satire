import "./powerMeter.css";

export class PowerMeter {
  readonly root: HTMLElement;
  private readonly marker: HTMLElement;
  private fraction = 0;

  constructor() {
    const root = document.createElement("div");
    root.className = "power-meter";
    root.setAttribute("role", "meter");
    root.setAttribute("aria-label", "Protest strength");
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", "100");
    this.root = root;

    const weakLabel = document.createElement("span");
    weakLabel.className = "power-meter__label";
    weakLabel.textContent = "Weak";
    root.appendChild(weakLabel);

    const track = document.createElement("div");
    track.className = "power-meter__track";
    root.appendChild(track);

    const marker = document.createElement("div");
    marker.className = "power-meter__marker";
    track.appendChild(marker);
    this.marker = marker;

    const highLabel = document.createElement("span");
    highLabel.className = "power-meter__label";
    highLabel.textContent = "High";
    root.appendChild(highLabel);

    this.setFraction(0);
  }

  attachTo(container: HTMLElement): void {
    container.appendChild(this.root);
  }

  setFraction(fraction: number): void {
    this.fraction = Math.max(0, Math.min(1, fraction));
    const pct = this.fraction * 100;
    this.marker.style.left = `${pct}%`;
    this.root.setAttribute("aria-valuenow", String(Math.round(pct)));
  }

  getFraction(): number {
    return this.fraction;
  }

  destroy(): void {
    this.root.remove();
  }
}
