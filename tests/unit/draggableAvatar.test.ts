// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraggableAvatar } from '../../src/creatures/DraggableAvatar';

describe('DraggableAvatar', () => {
  let avatar: DraggableAvatar;

  beforeEach(() => {
    vi.clearAllMocks();
    avatar = new DraggableAvatar(100, 200);
  });

  describe('constructor', () => {
    it('creates img element with correct src', () => {
      expect(avatar.el.tagName).toBe('IMG');
      expect(avatar.el.src).toContain('/avatars/tax-tai.png');
    });

    it('sets correct alt text', () => {
      expect(avatar.el.alt).toBe('Tax Tai');
    });

    it('sets correct id', () => {
      expect(avatar.el.id).toBe('draggable');
    });

    it('sets position styles correctly', () => {
      expect(avatar.el.style.position).toBe('absolute');
      expect(avatar.el.style.left).toBe('100px');
      expect(avatar.el.style.top).toBe('200px');
    });

    it('sets size and appearance styles', () => {
      expect(avatar.el.style.width).toBe('140px');
      expect(avatar.el.style.cursor).toBe('grab');
      expect(avatar.el.style.userSelect).toBe('none');
      expect(avatar.el.style.zIndex).toBe('500');
    });

    it('sets filter and transition', () => {
      expect(avatar.el.style.filter).toBe('drop-shadow(0 1px 2px rgba(0,0,0,0.18))');
      expect(avatar.el.style.transition).toBe('filter 0.15s');
    });
  });

  describe('getPosition', () => {
    it('returns initial position', () => {
      const pos = avatar.getPosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });
  });

  describe('getCenter', () => {
    it('returns center position (x+70, y+70)', () => {
      const center = avatar.getCenter();
      expect(center.x).toBe(170);
      expect(center.y).toBe(270);
    });
  });

  describe('isDragging', () => {
    it('returns false initially', () => {
      expect(avatar.isDragging()).toBe(false);
    });
  });

  describe('attach', () => {
    it('adds event listeners to element and document', () => {
      const addEventListenerSpy = vi.spyOn(avatar.el, 'addEventListener');
      const docAddEventListenerSpy = vi.spyOn(document, 'addEventListener');

      avatar.attach();

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(docAddEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(docAddEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(docAddEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
      expect(docAddEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    });
  });

  describe('detach', () => {
    it('removes event listeners from element and document', () => {
      const removeEventListenerSpy = vi.spyOn(avatar.el, 'removeEventListener');
      const docRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      avatar.detach();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(docRemoveEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(docRemoveEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(docRemoveEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(docRemoveEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    });
  });

  describe('mouse drag', () => {
    it('updates position during drag', () => {
      const onMove = vi.fn();
      const dragAvatar = new DraggableAvatar(100, 200, onMove);

      dragAvatar.attach();

      const mockRect = { left: 100, top: 200, right: 240, bottom: 340, width: 140, height: 140, x: 100, y: 200, toJSON: () => ({}) };
      vi.spyOn(dragAvatar.el, 'getBoundingClientRect').mockReturnValue(mockRect);

      const mousedownEvent = new MouseEvent('mousedown', { clientX: 120, clientY: 220, bubbles: true });
      dragAvatar.el.dispatchEvent(mousedownEvent);

      expect(dragAvatar.isDragging()).toBe(true);
      expect(dragAvatar.el.classList.contains('dragging')).toBe(true);

      const mousemoveEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 250, bubbles: true });
      document.dispatchEvent(mousemoveEvent);

      const pos = dragAvatar.getPosition();
      expect(pos.x).toBe(130);
      expect(pos.y).toBe(230);
      expect(onMove).toHaveBeenCalledWith(130, 230);

      const mouseupEvent = new MouseEvent('mouseup', { bubbles: true });
      document.dispatchEvent(mouseupEvent);

      expect(dragAvatar.isDragging()).toBe(false);
      expect(dragAvatar.el.classList.contains('dragging')).toBe(false);

      dragAvatar.detach();
    });

    it('does not update position when not dragging', () => {
      const onMove = vi.fn();
      const dragAvatar = new DraggableAvatar(100, 200, onMove);

      dragAvatar.attach();

      const mousemoveEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 250, bubbles: true });
      document.dispatchEvent(mousemoveEvent);

      const pos = dragAvatar.getPosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
      expect(onMove).not.toHaveBeenCalled();

      dragAvatar.detach();
    });
  });

  describe('touch drag', () => {
    it('updates position during touch drag', () => {
      const onMove = vi.fn();
      const dragAvatar = new DraggableAvatar(100, 200, onMove);

      dragAvatar.attach();

      const mockRect = { left: 100, top: 200, right: 240, bottom: 340, width: 140, height: 140, x: 100, y: 200, toJSON: () => ({}) };
      vi.spyOn(dragAvatar.el, 'getBoundingClientRect').mockReturnValue(mockRect);

      const touchstartEvent = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: dragAvatar.el, clientX: 120, clientY: 220 })],
        bubbles: true,
        cancelable: true,
      });
      dragAvatar.el.dispatchEvent(touchstartEvent);

      expect(dragAvatar.isDragging()).toBe(true);
      expect(dragAvatar.el.classList.contains('dragging')).toBe(true);

      const touchmoveEvent = new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: dragAvatar.el, clientX: 150, clientY: 250 })],
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(touchmoveEvent);

      const pos = dragAvatar.getPosition();
      expect(pos.x).toBe(130);
      expect(pos.y).toBe(230);
      expect(onMove).toHaveBeenCalledWith(130, 230);

      const touchendEvent = new TouchEvent('touchend', { bubbles: true });
      document.dispatchEvent(touchendEvent);

      expect(dragAvatar.isDragging()).toBe(false);
      expect(dragAvatar.el.classList.contains('dragging')).toBe(false);

      dragAvatar.detach();
    });
  });
});
