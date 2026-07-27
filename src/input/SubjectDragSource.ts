import type { SubjectSkin } from "../hud/subjectSkinRegistry";
import type { Vec2 } from "../entities/Entity";

export type SubjectDragSourceOptions = {
  dropTarget: HTMLElement;
};

export type SubjectDropResult = {
  skin: SubjectSkin;
  canvasPos: Vec2 | null;
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
 * shared state. On drop, emits the skin and a canvas-relative position
 * (or null if dropped outside / from a touch tap).
 */
export class SubjectDragSource {
  private readonly dropTarget: HTMLElement;
  private dropCb: ((result: SubjectDropResult) => void) | null = null;

  constructor(opts: SubjectDragSourceOptions) {
    this.dropTarget = opts.dropTarget;
  }

  onDrop(cb: (result: SubjectDropResult) => void): void {
    this.dropCb = cb;
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
      this.dropCb?.({ skin: getSkin(), canvasPos: null });
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
        const skin = getSkin();
        if (overTarget) {
          this.dropCb?.({ skin, canvasPos: { x: e.clientX - rect.left, y: e.clientY - rect.top } });
        } else {
          this.dropCb?.({ skin, canvasPos: null });
        }
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
