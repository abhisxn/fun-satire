import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";

export class DraggableAvatar {
  readonly el: HTMLImageElement;
  private readonly drag: DragHandle;

  constructor(initialX: number, initialY: number, onMove?: (x: number, y: number) => void) {
    this.el = document.createElement('img');
    this.el.id = 'draggable';
    this.el.src = '/avatars/normal/tax-tai.webp';
    this.el.alt = 'Tax Tai';
    this.el.style.width = '140px';
    this.el.style.cursor = 'grab';
    this.el.style.userSelect = 'none';
    this.el.style.webkitUserSelect = 'none';
    this.el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.18))';
    this.el.style.transition = 'filter 0.15s';
    // Below #stage (z-index:500) so bugs and the eye/finger/creature grid render above it.
    this.el.style.zIndex = '100';

    this.drag = attachDrag(this.el, { x: initialX, y: initialY }, onMove);
  }

  attach(): void {
    this.drag.attach();
  }

  detach(): void {
    this.drag.detach();
  }

  getPosition(): { x: number; y: number } {
    return this.drag.getPosition();
  }

  getCenter(): { x: number; y: number } {
    const pos = this.drag.getPosition();
    return { x: pos.x + 70, y: pos.y + 70 };
  }

  isDragging(): boolean {
    return this.drag.isDragging();
  }
}
