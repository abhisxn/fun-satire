import { UI_TOKENS } from "../config/visualTokens";

export type FilterPanelOptions = {
  initialQuantity: number;
  initialRepel: number;
};

const QTY_MIN = 1;
const QTY_MAX = 60;
const REPEL_MIN = 0;
const REPEL_MAX = 2;
const REPEL_STEP = 0.05;

const SVG_MINUS = `<svg viewBox="0 0 14 14" aria-hidden="true"><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const SVG_PLUS = `<svg viewBox="0 0 14 14" aria-hidden="true"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

export class FilterPanel {
  private readonly root: HTMLElement;
  private readonly qtyValue: HTMLElement;
  private readonly repelInput: HTMLInputElement;
  private quantity: number;
  private repel: number;

  private quantityChangeCb: ((quantity: number) => void) | null = null;
  private repelChangeCb: ((multiplier: number) => void) | null = null;

  constructor(host: HTMLElement, opts: FilterPanelOptions) {
    this.quantity = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(opts.initialQuantity)));
    this.repel = Math.max(REPEL_MIN, Math.min(REPEL_MAX, opts.initialRepel));

    const root = document.createElement("section");
    root.className = "filter-panel";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Crowd filters");
    root.id = "filter-panel";
    root.dataset.targetWidth = String(UI_TOKENS.panel.filter.width);
    root.dataset.targetHeight = String(UI_TOKENS.panel.filter.height);
    root.hidden = true;
    root.inert = true;
    this.root = root;

    const numbers = document.createElement("div");
    numbers.className = "filter-panel__section";
    numbers.dataset.filterSection = "numbers";
    const numbersLabel = document.createElement("span");
    numbersLabel.className = "filter-panel__label";
    numbersLabel.textContent = "NUMBERS";
    const numbersRow = document.createElement("div");
    numbersRow.className = "filter-panel__stepper";
    const dec = document.createElement("button");
    dec.type = "button";
    dec.className = "filter-panel__qty-btn";
    dec.dataset.filterQty = "dec";
    dec.setAttribute("aria-label", "Decrease quantity");
    dec.innerHTML = SVG_MINUS;
    const value = document.createElement("output");
    value.className = "filter-panel__qty-value";
    value.dataset.filterQtyValue = "";
    value.textContent = String(this.quantity);
    const inc = document.createElement("button");
    inc.type = "button";
    inc.className = "filter-panel__qty-btn";
    inc.dataset.filterQty = "inc";
    inc.setAttribute("aria-label", "Increase quantity");
    inc.innerHTML = SVG_PLUS;
    dec.addEventListener("click", () => this.stepQuantity(-1));
    inc.addEventListener("click", () => this.stepQuantity(1));
    numbersRow.append(dec, value, inc);
    numbers.append(numbersLabel, numbersRow);
    this.qtyValue = value;
    root.appendChild(numbers);

    const divider = document.createElement("hr");
    divider.className = "filter-panel__divider";
    root.appendChild(divider);

    const repel = document.createElement("div");
    repel.className = "filter-panel__section";
    repel.dataset.filterSection = "repel";
    const repelLabel = document.createElement("label");
    repelLabel.className = "filter-panel__label";
    repelLabel.textContent = "REPEL";
    const range = document.createElement("input");
    range.type = "range";
    range.className = "filter-panel__repel";
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
      this.repelChangeCb?.(v);
    });
    repel.append(repelLabel, range);
    this.repelInput = range;
    root.appendChild(repel);

    host.appendChild(root);
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  setOpen(open: boolean): void {
    this.root.hidden = !open;
    if (open) this.root.inert = false;
    else this.root.inert = true;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  setQuantity(quantity: number): void {
    const clamped = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(quantity)));
    this.quantity = clamped;
    this.qtyValue.textContent = String(clamped);
  }

  getQuantity(): number {
    return this.quantity;
  }

  setRepel(multiplier: number): void {
    const clamped = Math.max(REPEL_MIN, Math.min(REPEL_MAX, multiplier));
    this.repel = clamped;
    this.repelInput.value = String(clamped);
  }

  getRepel(): number {
    return this.repel;
  }

  private stepQuantity(delta: number): void {
    const next = this.quantity + delta;
    if (next < QTY_MIN || next > QTY_MAX) return;
    this.setQuantity(next);
    this.quantityChangeCb?.(this.quantity);
  }

  onQuantityChange(cb: (quantity: number) => void): void { this.quantityChangeCb = cb; }
  onRepelChange(cb: (multiplier: number) => void): void { this.repelChangeCb = cb; }

  destroy(): void {
    this.root.remove();
  }
}
