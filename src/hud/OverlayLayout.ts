export type OverlayPanelId = "filter" | "gallery" | "text";

export type OverlayLayoutOptions = {
  closeOnEscape?: boolean;
};

export type OverlayVariant = "desktop-panel" | "portrait-sheet" | "landscape-tray";

export function resolveOverlayVariant(input: {
  width: number;
  height: number;
  panelFits: boolean;
}): OverlayVariant {
  if (input.panelFits) return "desktop-panel";
  if (input.height >= input.width) return "portrait-sheet";
  return "landscape-tray";
}

export class OverlayLayout {
  private readonly panels: Map<OverlayPanelId, HTMLElement> = new Map();
  private activeId: OverlayPanelId | null = null;
  private lastTrigger: HTMLElement | null = null;
  private readonly closeOnEscape: boolean;
  private closeCb: ((which: OverlayPanelId) => void) | null = null;
  private variant: OverlayVariant = "desktop-panel";
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== "Escape") return;
    if (this.activeId === null) return;
    const id = this.activeId;
    this.close();
    this.closeCb?.(id);
  };

  constructor(opts: OverlayLayoutOptions = {}) {
    this.closeOnEscape = opts.closeOnEscape ?? true;
    if (this.closeOnEscape && typeof document !== "undefined") {
      document.addEventListener("keydown", this.onKeyDown);
    }
  }

  register(id: OverlayPanelId, el: HTMLElement): void {
    this.panels.set(id, el);
    el.hidden = true;
    el.inert = true;
    el.dataset.variant = this.variant;
  }

  setVariant(variant: OverlayVariant): void {
    this.variant = variant;
    for (const el of this.panels.values()) {
      el.dataset.variant = variant;
    }
  }

  getVariant(): OverlayVariant {
    return this.variant;
  }

  open(id: OverlayPanelId, trigger: HTMLElement | null = null): void {
    if (this.activeId && this.activeId !== id) {
      const prev = this.panels.get(this.activeId);
      if (prev) {
        prev.hidden = true;
        prev.inert = true;
      }
    }
    const target = this.panels.get(id);
    if (!target) return;
    if (this.activeId === id) {
      this.close();
      return;
    }
    target.hidden = false;
    target.inert = false;
    this.activeId = id;
    if (trigger) this.lastTrigger = trigger;
  }

  close(): void {
    if (this.activeId === null) return;
    const id = this.activeId;
    const target = this.panels.get(id);
    if (target) {
      target.hidden = true;
      target.inert = true;
    }
    this.activeId = null;
    if (this.lastTrigger && typeof this.lastTrigger.focus === "function") {
      try {
        this.lastTrigger.focus({ preventScroll: true });
      } catch {
        this.lastTrigger.focus();
      }
    }
  }

  getActive(): OverlayPanelId | "none" {
    return this.activeId ?? "none";
  }

  isOpen(id: OverlayPanelId): boolean {
    return this.activeId === id;
  }

  onClose(cb: (which: OverlayPanelId) => void): void { this.closeCb = cb; }

  destroy(): void {
    if (this.closeOnEscape && typeof document !== "undefined") {
      document.removeEventListener("keydown", this.onKeyDown);
    }
    this.panels.clear();
  }
}
