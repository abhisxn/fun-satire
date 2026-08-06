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
): DragHandle {
  const target = targetEl ?? el;
  let x = initial.x;
  let y = initial.y;
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  const moveCb = onMove ?? (() => {});

  target.style.position = 'absolute';
  target.style.left = `${x}px`;
  target.style.top = `${y}px`;

  const handleMouseDown = (e: MouseEvent): void => {
    dragging = true;
    target.classList.add('dragging');
    const rect = target.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!dragging) return;
    x = e.clientX - offsetX;
    y = e.clientY - offsetY;
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    moveCb(x, y);
  };

  const handleMouseUp = (): void => {
    dragging = false;
    target.classList.remove('dragging');
  };

  const handleTouchStart = (e: TouchEvent): void => {
    dragging = true;
    target.classList.add('dragging');
    const rect = target.getBoundingClientRect();
    const t = e.touches[0];
    offsetX = t.clientX - rect.left;
    offsetY = t.clientY - rect.top;
    e.preventDefault();
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (!dragging) return;
    const t = e.touches[0];
    x = t.clientX - offsetX;
    y = t.clientY - offsetY;
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    moveCb(x, y);
  };

  const handleTouchEnd = (): void => {
    dragging = false;
    target.classList.remove('dragging');
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
