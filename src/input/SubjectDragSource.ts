import type { SubjectSkin } from "../hud/subjectSkinRegistry";

export type SubjectDragSourceOptions = {
  dropTarget: HTMLElement;
};

type DragState = {
  getSkin: () => SubjectSkin;
  ghost: HTMLElement;
  onMove: (e: PointerEvent) => void;
  onUp: (e: PointerEvent) => void;
  onCancel: () => void;
};

/**
 * Panel-to-canvas drag source for the subject browser. Deliberately separate
 * from src/input/DragController.ts (entity-level canvas repositioning) — no
 * shared state, and swapping subjectSkin on drop is the only effect.
 */
export class SubjectDragSource {
  private readonly dropTarget: HTMLElement;
  private swapCb: ((skin: SubjectSkin) => void) | null = null;

  constructor(opts: SubjectDragSourceOptions) {
    this.dropTarget = opts.dropTarget;
  }

  onSwap(cb: (skin: SubjectSkin) => void): void {
    this.swapCb = cb;
  }

  attachCard(card: HTMLElement, getSkin: () => SubjectSkin): void {
    card.addEventListener("pointerdown", (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerType === "touch") return;
      pe.preventDefault();
      this.startDrag(getSkin, pe.clientX, pe.clientY, card);
    });
    card.addEventListener("pointerup", (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerType !== "touch") return;
      this.swapCb?.(getSkin());
    });
  }

  private startDrag(getSkin: () => SubjectSkin, startX: number, startY: number, card: HTMLElement): void {
    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "9999";
    ghost.style.opacity = "0.85";
    ghost.style.left = `${startX - 24}px`;
    ghost.style.top = `${startY - 24}px`;
    document.body.appendChild(ghost);

    const state: DragState = {
      getSkin,
      ghost,
      onMove: (e) => {
        ghost.style.left = `${e.clientX - 24}px`;
        ghost.style.top = `${e.clientY - 24}px`;
      },
      onUp: (e) => {
        ghost.remove();
        window.removeEventListener("pointermove", state.onMove);
        window.removeEventListener("pointerup", state.onUp);
        window.removeEventListener("pointercancel", state.onCancel);
        const rect = this.dropTarget.getBoundingClientRect();
        const overTarget =
          e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (overTarget) this.swapCb?.(getSkin());
      },
      onCancel: () => {
        ghost.remove();
        window.removeEventListener("pointermove", state.onMove);
        window.removeEventListener("pointerup", state.onUp);
        window.removeEventListener("pointercancel", state.onCancel);
      },
    };
    window.addEventListener("pointermove", state.onMove);
    window.addEventListener("pointerup", state.onUp);
    window.addEventListener("pointercancel", state.onCancel);
  }
}
