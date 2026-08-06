// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StickerOverlay, STICKER_Z_INDEX } from '../../src/creatures/StickerOverlay';

describe('StickerOverlay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('creates a wrapper div with an image and resize handle at the sticker z-index', () => {
    const s = new StickerOverlay('/avatars/ethanol.png', 50, 60);
    expect(s.el.tagName).toBe('DIV');
    expect(s.el.className).toBe('sticker-overlay');
    expect(s.el.style.zIndex).toBe(String(STICKER_Z_INDEX));
    expect(s.el.style.left).toBe('50px');
    expect(s.el.style.top).toBe('60px');
    expect(s.el.querySelector('img')).not.toBeNull();
    expect(s.el.querySelector('.sticker-overlay-resize')).not.toBeNull();
  });

  it('uses the provided src', () => {
    const s = new StickerOverlay('/avatars/petroleum.png');
    expect(s.el.querySelector('img')!.src).toContain('/avatars/petroleum.png');
    expect(s.getImage()).toBe('/avatars/petroleum.png');
  });

  it('centers horizontally and vertically by default', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    const s = new StickerOverlay('/avatars/gutter.png');
    expect(s.el.style.left).toBe('420px');
    expect(s.el.style.top).toBe('320px');
  });

  it('swaps the image via setImage', () => {
    const s = new StickerOverlay('/avatars/a.png');
    s.setImage('/avatars/b.png');
    expect(s.el.querySelector('img')!.src).toContain('/avatars/b.png');
    expect(s.getImage()).toBe('/avatars/b.png');
  });

  it('resize handle updates image width without moving the element', () => {
    const s = new StickerOverlay('/avatars/ethanol.png', 100, 100);
    const handle = s.el.querySelector<HTMLElement>('.sticker-overlay-resize')!;
    const beforeLeft = s.el.style.left;
    const beforeTop = s.el.style.top;

    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 160, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    const widthPx = parseFloat(s.el.querySelector('img')!.style.width);
    expect(widthPx).toBeGreaterThan(160);
    expect(widthPx).toBeLessThanOrEqual(480);
    expect(s.el.style.left).toBe(beforeLeft);
    expect(s.el.style.top).toBe(beforeTop);
  });

  it('resize handle clamps width within bounds', () => {
    const s = new StickerOverlay('/avatars/ethanol.png', 100, 100);
    const handle = s.el.querySelector<HTMLElement>('.sticker-overlay-resize')!;
    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100000, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(parseFloat(s.el.querySelector('img')!.style.width)).toBeLessThanOrEqual(480);
  });

  it('destroy removes the element from the DOM', () => {
    const s = new StickerOverlay('/avatars/ethanol.png');
    document.body.appendChild(s.el);
    s.destroy();
    expect(document.querySelector('.sticker-overlay')).toBeNull();
  });
});
