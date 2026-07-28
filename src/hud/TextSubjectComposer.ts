import { UI_TOKENS } from "../config/visualTokens";
import { TEXT_FONT_REGISTRY, type TextFontId } from "./textFontRegistry";

export type TextSubjectDraft = Readonly<{
  value: string;
  scale: 0.75 | 1 | 1.35;
  fontId: TextFontId;
  align: "left" | "center" | "right";
}>;

export type TextSubjectComposerOptions = {
  initial: TextSubjectDraft;
};

const SCALE_OPTIONS = [0.75, 1, 1.35] as const;
const ALIGN_OPTIONS = ["left", "center", "right"] as const;

function isScale(n: number): n is TextSubjectDraft["scale"] {
  return SCALE_OPTIONS.some((s) => s === n);
}

function isAlign(s: string): s is TextSubjectDraft["align"] {
  return ALIGN_OPTIONS.some((a) => a === s);
}

function isFontId(s: string): s is TextFontId {
  return TEXT_FONT_REGISTRY.some((f) => f.id === s);
}

export class TextSubjectComposer {
  private readonly root: HTMLElement;
  private readonly valueInput: HTMLTextAreaElement;
  private readonly fontSelect: HTMLSelectElement;
  private readonly scaleButtons: Map<TextSubjectDraft["scale"], HTMLButtonElement> = new Map();
  private readonly alignButtons: Map<TextSubjectDraft["align"], HTMLButtonElement> = new Map();
  private draft: TextSubjectDraft;

  private valueChangeCb: ((value: string) => void) | null = null;
  private scaleChangeCb: ((scale: TextSubjectDraft["scale"]) => void) | null = null;
  private fontChangeCb: ((fontId: TextFontId) => void) | null = null;
  private alignChangeCb: ((align: TextSubjectDraft["align"]) => void) | null = null;

  constructor(host: HTMLElement, opts: TextSubjectComposerOptions) {
    this.draft = { ...opts.initial };

    const root = document.createElement("section");
    root.className = "text-composer";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Text subject");
    root.id = "text-panel";
    root.dataset.targetWidth = String(UI_TOKENS.panel.gallery.width);
    root.hidden = true;
    root.inert = true;
    this.root = root;

    const heading = document.createElement("h2");
    heading.className = "text-composer__label";
    heading.textContent = "TEXT";
    root.appendChild(heading);

    const field = document.createElement("label");
    field.className = "text-composer__field";
    const fieldLabel = document.createElement("span");
    fieldLabel.className = "text-composer__field-label";
    fieldLabel.textContent = "Message";
    const input = document.createElement("textarea");
    input.className = "text-composer__value";
    input.dataset.textComposerValue = "";
    input.value = this.draft.value;
    input.rows = 2;
    input.setAttribute("aria-label", "Text subject message");
    input.addEventListener("input", () => {
      this.draft = { ...this.draft, value: input.value };
      this.valueChangeCb?.(input.value);
    });
    field.append(fieldLabel, input);
    this.valueInput = input;
    root.appendChild(field);

    const scaleRow = document.createElement("div");
    scaleRow.className = "text-composer__row";
    scaleRow.setAttribute("role", "group");
    scaleRow.setAttribute("aria-label", "Text size");
    const scaleLabel = document.createElement("span");
    scaleLabel.className = "text-composer__row-label";
    scaleLabel.textContent = "SIZE";
    scaleRow.appendChild(scaleLabel);
    for (const s of SCALE_OPTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "text-composer__scale-btn";
      btn.dataset.textComposerScale = String(s);
      btn.setAttribute("aria-pressed", this.draft.scale === s ? "true" : "false");
      btn.setAttribute("aria-label", `Size ${s}x`);
      btn.textContent = s === 1 ? "1×" : `${s}×`;
      btn.addEventListener("click", () => this.setScale(s));
      scaleRow.appendChild(btn);
      this.scaleButtons.set(s, btn);
    }
    root.appendChild(scaleRow);

    const fontRow = document.createElement("label");
    fontRow.className = "text-composer__row text-composer__row--font";
    const fontLabel = document.createElement("span");
    fontLabel.className = "text-composer__row-label";
    fontLabel.textContent = "FONT";
    const select = document.createElement("select");
    select.className = "text-composer__font";
    select.dataset.textComposerFont = "";
    select.setAttribute("aria-label", "Text font");
    for (const entry of TEXT_FONT_REGISTRY) {
      const opt = document.createElement("option");
      opt.value = entry.id;
      opt.textContent = entry.label;
      select.appendChild(opt);
    }
    select.value = this.draft.fontId;
    select.addEventListener("change", () => {
      if (isFontId(select.value)) {
        this.draft = { ...this.draft, fontId: select.value };
        this.fontChangeCb?.(select.value);
      }
    });
    fontRow.append(fontLabel, select);
    this.fontSelect = select;
    root.appendChild(fontRow);

    const alignRow = document.createElement("div");
    alignRow.className = "text-composer__row";
    alignRow.setAttribute("role", "group");
    alignRow.setAttribute("aria-label", "Text alignment");
    const alignLabel = document.createElement("span");
    alignLabel.className = "text-composer__row-label";
    alignLabel.textContent = "ALIGN";
    alignRow.appendChild(alignLabel);
    for (const a of ALIGN_OPTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "text-composer__align-btn";
      btn.dataset.textComposerAlign = a;
      btn.setAttribute("aria-pressed", this.draft.align === a ? "true" : "false");
      btn.setAttribute("aria-label", `Align ${a}`);
      btn.textContent = a.charAt(0).toUpperCase() + a.slice(1);
      btn.addEventListener("click", () => this.setAlign(a));
      alignRow.appendChild(btn);
      this.alignButtons.set(a, btn);
    }
    root.appendChild(alignRow);

    host.appendChild(root);
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  setOpen(open: boolean): void {
    this.root.hidden = !open;
    this.root.inert = !open;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  getDraft(): TextSubjectDraft {
    return { ...this.draft };
  }

  setDraft(draft: TextSubjectDraft): void {
    this.draft = { ...draft };
    this.valueInput.value = draft.value;
    this.fontSelect.value = draft.fontId;
    this.setScale(draft.scale);
    this.setAlign(draft.align);
  }

  focusInitial(): void {
    this.valueInput.focus({ preventScroll: true });
  }

  onValueChange(cb: (value: string) => void): void { this.valueChangeCb = cb; }
  onScaleChange(cb: (scale: TextSubjectDraft["scale"]) => void): void { this.scaleChangeCb = cb; }
  onFontChange(cb: (fontId: TextFontId) => void): void { this.fontChangeCb = cb; }
  onAlignChange(cb: (align: TextSubjectDraft["align"]) => void): void { this.alignChangeCb = cb; }

  private setScale(s: TextSubjectDraft["scale"]): void {
    if (!isScale(s)) return;
    this.draft = { ...this.draft, scale: s };
    for (const [scale, btn] of this.scaleButtons) {
      btn.setAttribute("aria-pressed", scale === s ? "true" : "false");
    }
    this.scaleChangeCb?.(s);
  }

  private setAlign(a: TextSubjectDraft["align"]): void {
    if (!isAlign(a)) return;
    this.draft = { ...this.draft, align: a };
    for (const [align, btn] of this.alignButtons) {
      btn.setAttribute("aria-pressed", align === a ? "true" : "false");
    }
    this.alignChangeCb?.(a);
  }

  destroy(): void {
    this.root.remove();
  }
}
