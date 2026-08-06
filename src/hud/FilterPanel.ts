import "./filterPanel.css";

const QTY_MIN = 10;
const QTY_MAX = 500;
const QTY_STEP = 10;
const REPEL_MIN = 0;
const REPEL_MAX = 2;
const REPEL_STEP = 0.05;

export class FilterPanel {
  private readonly root: HTMLElement;
  private readonly qtyValue: HTMLElement;
  private readonly qtyInput: HTMLInputElement;
  private readonly repelInput: HTMLInputElement;
  private readonly bugModeInput: HTMLInputElement;
  private quantity: number;
  private repel: number;
  private anchorButton: HTMLElement | null = null;
  private isOpen = false;

  private quantityChangeCb: ((quantity: number) => void) | null = null;
  private repelChangeCb: ((multiplier: number) => void) | null = null;
  private bugModeChangeCb: ((active: boolean) => void) | null = null;

  private boundOnDocumentClick: ((e: MouseEvent) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor(initialQuantity = 300, initialRepel = 1) {
    this.quantity = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(initialQuantity / QTY_STEP) * QTY_STEP));
    this.repel = Math.max(REPEL_MIN, Math.min(REPEL_MAX, initialRepel));

    const root = document.createElement("div");
    root.className = "filter-panel-popover";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Crowd filters");
    root.style.position = "fixed";
    root.style.display = "none";
    this.root = root;

    const numbers = document.createElement("div");
    numbers.className = "filter-panel__section";
    numbers.dataset.filterSection = "numbers";
    const numbersHeader = document.createElement("div");
    numbersHeader.className = "filter-panel__header-row";
    const numbersLabel = document.createElement("label");
    numbersLabel.className = "filter-panel__label";
    numbersLabel.textContent = "Numbers";
    const value = document.createElement("output");
    value.className = "filter-panel__qty-value";
    value.dataset.filterQtyValue = "";
    value.textContent = String(this.quantity);
    numbersHeader.append(numbersLabel, value);
    const qtyRange = document.createElement("input");
    qtyRange.type = "range";
    qtyRange.className = "filter-panel__slider";
    qtyRange.dataset.filterQty = "";
    qtyRange.min = String(QTY_MIN);
    qtyRange.max = String(QTY_MAX);
    qtyRange.step = String(QTY_STEP);
    qtyRange.value = String(this.quantity);
    qtyRange.id = "filter-qty";
    numbersLabel.htmlFor = qtyRange.id;
    qtyRange.addEventListener("input", () => {
      const v = Math.max(QTY_MIN, Math.min(QTY_MAX, Number.parseInt(qtyRange.value, 10)));
      this.setQuantity(v);
      this.quantityChangeCb?.(this.quantity);
    });
    numbers.append(numbersHeader, qtyRange);
    this.qtyValue = value;
    this.qtyInput = qtyRange;
    this.updateQtyFill(this.quantity);
    root.appendChild(numbers);

    const divider = document.createElement("hr");
    divider.className = "filter-panel__divider";
    root.appendChild(divider);

    const repel = document.createElement("div");
    repel.className = "filter-panel__section";
    repel.dataset.filterSection = "repel";
    const repelLabel = document.createElement("label");
    repelLabel.className = "filter-panel__label";
    repelLabel.textContent = "Repel";
    const range = document.createElement("input");
    range.type = "range";
    range.className = "filter-panel__slider";
    range.dataset.filterRepel = "";
    range.min = String(REPEL_MIN);
    range.max = String(REPEL_MAX);
    range.step = String(REPEL_STEP);
    range.value = String(this.repel);
    range.id = "filter-repel";
    repelLabel.htmlFor = range.id;
    range.addEventListener("input", () => {
      const v = Math.max(REPEL_MIN, Math.min(REPEL_MAX, Number.parseFloat(range.value)));
      this.repel = v;
      this.updateRepelFill(v);
      this.repelChangeCb?.(v);
    });
    repel.append(repelLabel, range);
    this.repelInput = range;
    this.updateRepelFill(this.repel);
    root.appendChild(repel);

    const bugModeDivider = document.createElement("hr");
    bugModeDivider.className = "filter-panel__divider";
    root.appendChild(bugModeDivider);

    const bugMode = document.createElement("div");
    bugMode.className = "filter-panel__section";
    bugMode.dataset.filterSection = "bug-mode";
    const bugModeLabel = document.createElement("span");
    bugModeLabel.className = "filter-panel__label";
    bugModeLabel.textContent = "Bug Mode";
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "filter-panel__toggle";
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.className = "filter-panel__toggle-input";
    toggleInput.dataset.filterBugMode = "";
    toggleInput.setAttribute("aria-label", "Bug Mode");
    const toggleTrack = document.createElement("span");
    toggleTrack.className = "filter-panel__toggle-track";
    toggleTrack.setAttribute("aria-hidden", "true");
    toggleInput.addEventListener("change", () => {
      this.bugModeChangeCb?.(toggleInput.checked);
    });
    toggleLabel.append(toggleInput, toggleTrack);
    bugMode.append(bugModeLabel, toggleLabel);
    this.bugModeInput = toggleInput;
    root.appendChild(bugMode);
  }

  attachTo(settingsButton: HTMLElement): void {
    this.anchorButton = settingsButton;
    document.body.appendChild(this.root);
  }

  open(): void {
    if (this.isOpen || !this.anchorButton) return;
    this.isOpen = true;
    this.root.style.display = "flex";
    this.updatePosition();
    this.addEventListeners();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.style.display = "none";
    this.removeEventListeners();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  setQuantity(quantity: number): void {
    const clamped = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(quantity / QTY_STEP) * QTY_STEP));
    this.quantity = clamped;
    this.qtyValue.textContent = String(clamped);
    this.qtyInput.value = String(clamped);
    this.updateQtyFill(clamped);
  }

  getQuantity(): number {
    return this.quantity;
  }

  setRepel(multiplier: number): void {
    const clamped = Math.max(REPEL_MIN, Math.min(REPEL_MAX, multiplier));
    this.repel = clamped;
    this.repelInput.value = String(clamped);
    this.updateRepelFill(clamped);
  }

  getRepel(): number {
    return this.repel;
  }

  private updateRepelFill(value: number): void {
    const pct = ((value - REPEL_MIN) / (REPEL_MAX - REPEL_MIN)) * 100;
    this.repelInput.style.setProperty("--filter-slider-fill", `${pct}%`);
  }

  private updateQtyFill(value: number): void {
    const pct = ((value - QTY_MIN) / (QTY_MAX - QTY_MIN)) * 100;
    this.qtyInput.style.setProperty("--filter-slider-fill", `${pct}%`);
  }

  onQuantityChange(cb: (quantity: number) => void): void {
    this.quantityChangeCb = cb;
  }

  onRepelChange(cb: (multiplier: number) => void): void {
    this.repelChangeCb = cb;
  }

  onBugModeToggle(cb: (active: boolean) => void): void {
    this.bugModeChangeCb = cb;
  }

  isBugModeActive(): boolean {
    return this.bugModeInput.checked;
  }

  private updatePosition(): void {
    if (!this.anchorButton) return;

    const buttonRect = this.anchorButton.getBoundingClientRect();
    const panelRect = this.root.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = buttonRect.top - panelRect.height - 16;
    let left = buttonRect.left + buttonRect.width / 2 - panelRect.width / 2;

    if (top < 8) {
      top = buttonRect.bottom + 8;
    }

    if (top + panelRect.height > viewportHeight - 8) {
      top = viewportHeight - panelRect.height - 8;
    }

    if (left < 8) {
      left = 8;
    }

    if (left + panelRect.width > viewportWidth - 8) {
      left = viewportWidth - panelRect.width - 8;
    }

    this.root.style.top = `${top}px`;
    this.root.style.left = `${left}px`;
  }

  private addEventListeners(): void {
    this.boundOnDocumentClick = (e: MouseEvent) => {
      if (!this.root.contains(e.target as Node) && !this.anchorButton?.contains(e.target as Node)) {
        this.close();
      }
    };

    this.boundOnKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.close();
      }
    };

    document.addEventListener("click", this.boundOnDocumentClick, true);
    document.addEventListener("keydown", this.boundOnKeyDown);
  }

  private removeEventListeners(): void {
    if (this.boundOnDocumentClick) {
      document.removeEventListener("click", this.boundOnDocumentClick, true);
      this.boundOnDocumentClick = null;
    }
    if (this.boundOnKeyDown) {
      document.removeEventListener("keydown", this.boundOnKeyDown);
      this.boundOnKeyDown = null;
    }
  }

  destroy(): void {
    this.close();
    this.root.remove();
  }
}
