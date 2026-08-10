// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachDrag } from '../../src/creatures/makeDraggable';

describe('makeDraggable/attachDrag', () => {
  let el: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  describe('initial state', () => {
    it('positions the element at the initial coordinates', () => {
      attachDrag(el, { x: 42, y: 84 });

      expect(el.style.position).toBe('absolute');
      expect(el.style.left).toBe('42px');
      expect(el.style.top).toBe('84px');
    });

    it('reports initial position and not dragging', () => {
      const handle = attachDrag(el, { x: 10, y: 20 });

      expect(handle.getPosition()).toEqual({ x: 10, y: 20 });
      expect(handle.isDragging()).toBe(false);
    });
  });

  describe('attach', () => {
    it('registers mouse and touch listeners on element and document', () => {
      const elSpy = vi.spyOn(el, 'addEventListener');
      const docSpy = vi.spyOn(document, 'addEventListener');
      const handle = attachDrag(el, { x: 0, y: 0 });

      handle.attach();

      expect(elSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(elSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(docSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(docSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(docSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
      expect(docSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    });
  });

  describe('detach', () => {
    it('removes all registered listeners', () => {
      const elSpy = vi.spyOn(el, 'removeEventListener');
      const docSpy = vi.spyOn(document, 'removeEventListener');
      const handle = attachDrag(el, { x: 0, y: 0 });

      handle.detach();

      expect(elSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(elSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(docSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(docSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(docSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(docSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    });

    it('stops moving the element after detach', () => {
      const onMove = vi.fn();
      const handle = attachDrag(el, { x: 0, y: 0 }, onMove);
      handle.attach();
      handle.detach();

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 99, clientY: 99, bubbles: true }));

      expect(onMove).not.toHaveBeenCalled();
      expect(handle.getPosition()).toEqual({ x: 0, y: 0 });
    });
  });

  describe('mouse drag', () => {
    it('moves the element by the pointer delta and fires onMove', () => {
      const onMove = vi.fn();
      const handle = attachDrag(el, { x: 100, y: 200 }, onMove);
      handle.attach();

      const mockRect = { left: 100, top: 200, right: 240, bottom: 340, width: 140, height: 140, x: 100, y: 200, toJSON: () => ({}) };
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect);

      el.dispatchEvent(new MouseEvent('mousedown', { clientX: 120, clientY: 220, bubbles: true }));
      expect(handle.isDragging()).toBe(true);
      expect(el.classList.contains('dragging')).toBe(true);

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 250, bubbles: true }));

      expect(handle.getPosition()).toEqual({ x: 130, y: 230 });
      expect(el.style.left).toBe('130px');
      expect(el.style.top).toBe('230px');
      expect(onMove).toHaveBeenCalledWith(130, 230);

      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(handle.isDragging()).toBe(false);
      expect(el.classList.contains('dragging')).toBe(false);

      handle.detach();
    });

    it('ignores mousemove while not dragging', () => {
      const onMove = vi.fn();
      const handle = attachDrag(el, { x: 100, y: 200 }, onMove);
      handle.attach();

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 250, bubbles: true }));

      expect(handle.getPosition()).toEqual({ x: 100, y: 200 });
      expect(onMove).not.toHaveBeenCalled();

      handle.detach();
    });
  });

  describe('touch drag', () => {
    it('moves the element by the touch delta and fires onMove', () => {
      const onMove = vi.fn();
      const handle = attachDrag(el, { x: 100, y: 200 }, onMove);
      handle.attach();

      const mockRect = { left: 100, top: 200, right: 240, bottom: 340, width: 140, height: 140, x: 100, y: 200, toJSON: () => ({}) };
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect);

      el.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: el, clientX: 120, clientY: 220 })],
        bubbles: true,
        cancelable: true,
      }));
      expect(handle.isDragging()).toBe(true);

      document.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: el, clientX: 150, clientY: 250 })],
        bubbles: true,
        cancelable: true,
      }));

      expect(handle.getPosition()).toEqual({ x: 130, y: 230 });
      expect(onMove).toHaveBeenCalledWith(130, 230);

      document.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
      expect(handle.isDragging()).toBe(false);

      handle.detach();
    });

    it('cancels the drag when a second finger touches down mid-drag', () => {
      const onMove = vi.fn();
      const handle = attachDrag(el, { x: 100, y: 200 }, onMove);
      handle.attach();

      const mockRect = { left: 100, top: 200, right: 240, bottom: 340, width: 140, height: 140, x: 100, y: 200, toJSON: () => ({}) };
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect);

      el.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: el, clientX: 120, clientY: 220 })],
        bubbles: true,
        cancelable: true,
      }));
      expect(handle.isDragging()).toBe(true);

      // A second finger joins: drag must cancel, not silently keep tracking touches[0].
      document.dispatchEvent(new TouchEvent('touchmove', {
        touches: [
          new Touch({ identifier: 0, target: el, clientX: 150, clientY: 250 }),
          new Touch({ identifier: 1, target: el, clientX: 300, clientY: 250 }),
        ],
        bubbles: true,
        cancelable: true,
      }));

      expect(handle.isDragging()).toBe(false);
      expect(el.classList.contains('dragging')).toBe(false);

      handle.detach();
    });

    it('ignores touchstart when two fingers land at once', () => {
      const handle = attachDrag(el, { x: 0, y: 0 });
      handle.attach();

      el.dispatchEvent(new TouchEvent('touchstart', {
        touches: [
          new Touch({ identifier: 0, target: el, clientX: 0, clientY: 0 }),
          new Touch({ identifier: 1, target: el, clientX: 100, clientY: 0 }),
        ],
        bubbles: true,
        cancelable: true,
      }));

      expect(handle.isDragging()).toBe(false);
      handle.detach();
    });
  });
});
