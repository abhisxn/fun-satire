import { snapToGrid, clampToViewport } from "./snapGrid";
import { updateSnapGuides, hideSnapGuides } from "./snapGuides";

export interface DragHandle {
  attach(): void;
  detach(): void;
  getPosition(): { x: number; y: number };
  isDragging(): boolean;
}

export function attachDrag(
  el: HTMLElement,
  initial: { x: number; y: number },
  onMove?: (x: number, y: number) => void,
  targetEl?: HTMLElement,
  onDragStart?: () => void,
  onDragEnd?: () => void,
): DragHandle {
  const target = targetEl ?? el;
  let x = initial.x;
  let y = initial.y;
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let deltaX = 0;
  let deltaY = 0;
  let targetWidth = 0;
  let targetHeight = 0;
  const moveCb = onMove ?? (() => {});
  const dragStartCb = onDragStart ?? (() => {});
  const dragEndCb = onDragEnd ?? (() => {});

  target.style.position = 'absolute';
  target.style.left = `${x}px`;
  target.style.top = `${y}px`;

  const clampAndApply = (clientX: number, clientY: number): void => {
    const rawRectLeft = clientX - offsetX;
    const rawRectTop = clientY - offsetY;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const minLeft = Math.min(0, vw - targetWidth);
    const maxLeft = Math.max(0, vw - targetWidth);
    const minTop = Math.min(0, vh - targetHeight);
    const maxTop = Math.max(0, vh - targetHeight);

    const clampedRectLeft = Math.max(minLeft, Math.min(maxLeft, rawRectLeft));
    const clampedRectTop = Math.max(minTop, Math.min(maxTop, rawRectTop));

    x = clampedRectLeft - deltaX;
    y = clampedRectTop - deltaY;
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    updateSnapGuides(target);
    moveCb(x, y);
  };

  const finalize = (): void => {
    dragging = false;
    target.classList.remove('dragging');
    snapToGrid(target);
    clampToViewport(target);
    hideSnapGuides();
    const styleLeft = parseFloat(target.style.left);
    const styleTop = parseFloat(target.style.top);
    const rect = target.getBoundingClientRect();
    x = isNaN(styleLeft) ? rect.left : styleLeft;
    y = isNaN(styleTop) ? rect.top : styleTop;
    dragEndCb();
  };

  const startDrag = (clientX: number, clientY: number): void => {
    dragging = true;
    target.classList.add('dragging');
    const rect = target.getBoundingClientRect();
    const styleLeft = parseFloat(target.style.left);
    const styleTop = parseFloat(target.style.top);
    const curStyleLeft = isNaN(styleLeft) ? x : styleLeft;
    const curStyleTop = isNaN(styleTop) ? y : styleTop;

    deltaX = rect.left - curStyleLeft;
    deltaY = rect.top - curStyleTop;
    targetWidth = rect.width || target.offsetWidth || parseFloat(target.style.width) || 0;
    targetHeight = rect.height || target.offsetHeight || parseFloat(target.style.height) || 0;

    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    dragStartCb();
  };

  const handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!dragging) return;
    clampAndApply(e.clientX, e.clientY);
  };

  const handleMouseUp = (): void => {
    if (!dragging) return;
    finalize();
  };

  const handleTouchStart = (e: TouchEvent): void => {
    // A second finger means the user is pinching (see pinchZoom.ts), not
    // dragging — leave multi-touch starts alone.
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (!t) return;
    e.preventDefault();
    startDrag(t.clientX, t.clientY);
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (!dragging) return;
    // A second finger joined mid-drag: hand off to the pinch gesture
    // instead of silently tracking only touches[0].
    if (e.touches.length !== 1) {
      finalize();
      return;
    }
    const t = e.touches[0];
    if (!t) return;
    clampAndApply(t.clientX, t.clientY);
  };

  const handleTouchEnd = (): void => {
    if (!dragging) return;
    finalize();
  };

  return {
    attach(): void {
      el.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      el.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    },
    detach(): void {
      el.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    },
    getPosition(): { x: number; y: number } {
      return { x, y };
    },
    isDragging(): boolean {
      return dragging;
    },
  };
}
