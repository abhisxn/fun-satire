export class DraggableAvatar {
  readonly el: HTMLImageElement;
  private x: number;
  private y: number;
  private dragging = false;
  private offsetX = 0;
  private offsetY = 0;
  private readonly onMove: (x: number, y: number) => void;

  private readonly handleMouseDown: (e: MouseEvent) => void;
  private readonly handleMouseMove: (e: MouseEvent) => void;
  private readonly handleMouseUp: () => void;
  private readonly handleTouchStart: (e: TouchEvent) => void;
  private readonly handleTouchMove: (e: TouchEvent) => void;
  private readonly handleTouchEnd: () => void;

  constructor(initialX: number, initialY: number, onMove?: (x: number, y: number) => void) {
    this.x = initialX;
    this.y = initialY;
    this.onMove = onMove ?? (() => {});

    this.el = document.createElement('img');
    this.el.id = 'draggable';
    this.el.src = '/avatars/tax-tai.png';
    this.el.alt = 'Tax Tai';
    this.el.style.position = 'absolute';
    this.el.style.width = '140px';
    this.el.style.cursor = 'grab';
    this.el.style.userSelect = 'none';
    this.el.style.webkitUserSelect = 'none';
    this.el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.18))';
    this.el.style.transition = 'filter 0.15s';
    this.el.style.left = `${initialX}px`;
    this.el.style.top = `${initialY}px`;
    this.el.style.zIndex = '500';

    this.handleMouseDown = (e: MouseEvent) => {
      this.dragging = true;
      this.el.classList.add('dragging');
      const rect = this.el.getBoundingClientRect();
      this.offsetX = e.clientX - rect.left;
      this.offsetY = e.clientY - rect.top;
      e.preventDefault();
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (!this.dragging) return;
      this.x = e.clientX - this.offsetX;
      this.y = e.clientY - this.offsetY;
      this.el.style.left = `${this.x}px`;
      this.el.style.top = `${this.y}px`;
      this.onMove(this.x, this.y);
    };

    this.handleMouseUp = () => {
      this.dragging = false;
      this.el.classList.remove('dragging');
    };

    this.handleTouchStart = (e: TouchEvent) => {
      this.dragging = true;
      this.el.classList.add('dragging');
      const rect = this.el.getBoundingClientRect();
      const t = e.touches[0];
      this.offsetX = t.clientX - rect.left;
      this.offsetY = t.clientY - rect.top;
      e.preventDefault();
    };

    this.handleTouchMove = (e: TouchEvent) => {
      if (!this.dragging) return;
      const t = e.touches[0];
      this.x = t.clientX - this.offsetX;
      this.y = t.clientY - this.offsetY;
      this.el.style.left = `${this.x}px`;
      this.el.style.top = `${this.y}px`;
      this.onMove(this.x, this.y);
    };

    this.handleTouchEnd = () => {
      this.dragging = false;
      this.el.classList.remove('dragging');
    };
  }

  attach(): void {
    this.el.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    this.el.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd);
  }

  detach(): void {
    this.el.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    this.el.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  getCenter(): { x: number; y: number } {
    return { x: this.x + 70, y: this.y + 70 };
  }

  isDragging(): boolean {
    return this.dragging;
  }
}
