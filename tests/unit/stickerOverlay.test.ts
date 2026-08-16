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

  // Squeeze/inflate transform lives on the wrapper (s.el), not the image — moving it
  // there keeps the resize handle and el's own hit-tested/dragged box scaling along
  // with the sticker instead of staying pinned to its pre-scale corner.
  it('lockSqueeze pops the sticker down to its minimum scale', () => {
    const s = new StickerOverlay('/avatars/a.png');
    expect(s.el.style.transform).toBe('');

    s.lockSqueeze();
    expect(s.el.style.transform).toBe('scale(0.55)');
  });

  it('setScaleForRaidSize maps the raid unit count linearly onto [1, MAX_SCALE]', () => {
    const s = new StickerOverlay('/avatars/a.png');

    s.setScaleForRaidSize(0, 40);
    expect(s.el.style.transform).toBe('scale(1)');

    s.setScaleForRaidSize(40, 40);
    expect(s.el.style.transform).toBe('scale(2)'); // MAX_SCALE

    s.setScaleForRaidSize(20, 40);
    expect(s.el.style.transform).toBe('scale(1.5)'); // halfway

    // Out-of-range counts clamp rather than overshoot.
    s.setScaleForRaidSize(999, 40);
    expect(s.el.style.transform).toBe('scale(2)');
  });

  it('setScaleForRaidSize overwrites lockSqueeze — neither is a permanent lock', () => {
    const s = new StickerOverlay('/avatars/a.png');

    s.lockSqueeze();
    expect(s.el.style.transform).toBe('scale(0.55)');

    s.setScaleForRaidSize(10, 40);
    expect(s.el.style.transform).toBe('scale(1.25)');

    s.lockSqueeze();
    expect(s.el.style.transform).toBe('scale(0.55)');
  });

  it('getWidth() reflects the current squeeze/inflate scale, not just the underlying CSS width', () => {
    const s = new StickerOverlay('/avatars/a.png');
    expect(s.getWidth()).toBe(160); // DEFAULT_WIDTH

    s.setScaleForRaidSize(40, 40); // MAX_SCALE = 2
    expect(s.getWidth()).toBe(320);

    s.lockSqueeze(); // 0.55
    expect(s.getWidth()).toBe(88);
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

  it('resize handle drag divides the physical pointer delta by the current squeeze scale', () => {
    const s = new StickerOverlay('/avatars/ethanol.png', 100, 100);
    const handle = s.el.querySelector<HTMLElement>('.sticker-overlay-resize')!;

    s.setScaleForRaidSize(40, 40); // MAX_SCALE = 2 — visually twice as big
    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, bubbles: true })); // +100 screen px
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    // A 100px physical drag on a 2x-scaled sticker should only grow the underlying
    // (pre-scale) width by 50px — otherwise the resize would visually happen twice
    // as fast as the same drag on a normal-scale sticker.
    const widthPx = parseFloat(s.el.querySelector('img')!.style.width);
    expect(widthPx).toBeCloseTo(210); // 160 + 100/2
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

  it('scales via two-finger pinch, clamped within bounds', () => {
    const s = new StickerOverlay('/avatars/ethanol.png', 100, 100);

    s.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: s.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: s.el, clientX: 100, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: s.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: s.el, clientX: 200, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    // Default width is 160; pinch factor 2 -> 320, within [48, 480].
    expect(parseFloat(s.el.querySelector('img')!.style.width)).toBeCloseTo(320);
  });

  it('clamps pinch scaling within MIN_WIDTH/MAX_WIDTH bounds', () => {
    const s = new StickerOverlay('/avatars/ethanol.png', 100, 100);

    s.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: s.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: s.el, clientX: 100, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: s.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: s.el, clientX: 10000, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    expect(parseFloat(s.el.querySelector('img')!.style.width)).toBeLessThanOrEqual(480);
  });

  it('shows the resize handle by default on touch devices instead of relying on hover', () => {
    Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true });
    const s = new StickerOverlay('/avatars/ethanol.png');
    const handle = s.el.querySelector<HTMLElement>('.sticker-overlay-resize')!;
    expect(handle.style.opacity).toBe('1');
    Reflect.deleteProperty(window, 'ontouchstart');
  });

  it('ignores pinch-zoom while a corner-handle resize is already in progress', () => {
    const s = new StickerOverlay('/avatars/ethanol.png', 100, 100);
    const handle = s.el.querySelector<HTMLElement>('.sticker-overlay-resize')!;

    // Start a corner-handle resize with one finger on the handle.
    handle.dispatchEvent(new TouchEvent('touchstart', {
      touches: [new Touch({ identifier: 0, target: handle, clientX: 100, clientY: 100 })],
      bubbles: true,
      cancelable: true,
    }));

    // A second finger lands elsewhere on the overlay while the handle-drag
    // is still active — this must NOT start a competing pinch resize.
    s.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: handle, clientX: 100, clientY: 100 }),
        new Touch({ identifier: 1, target: s.el, clientX: 300, clientY: 100 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: handle, clientX: 100, clientY: 100 }),
        new Touch({ identifier: 1, target: s.el, clientX: 5000, clientY: 100 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    // Once a second finger is down, the corner-handle's own move-tracking
    // also defers (single-finger only, mirroring makeDraggable.ts), so
    // width should be untouched by both mechanisms — still the default
    // (160), not driven toward MAX_WIDTH by the pinch formula.
    expect(parseFloat(s.el.querySelector('img')!.style.width)).toBeCloseTo(160);
  });

  it('swaps to dragSrc while dragging and back to src when the drag ends', () => {
    const s = new StickerOverlay(
      '/avatars/grin/grin_gutter.png',
      100,
      100,
      undefined,
      undefined,
      undefined,
      false,
      '/avatars/normal/gutter.png',
    );
    document.body.appendChild(s.el);
    const img = s.el.querySelector('img')!;
    expect(img.src).toContain('/avatars/grin/grin_gutter.png');

    s.el.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }));
    expect(img.src).toContain('/avatars/normal/gutter.png');

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(img.src).toContain('/avatars/grin/grin_gutter.png');
  });

  it('does not swap the image on drag when no dragSrc was provided', () => {
    const s = new StickerOverlay('/avatars/gutter.png', 100, 100);
    document.body.appendChild(s.el);
    const img = s.el.querySelector('img')!;

    s.el.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }));
    expect(img.src).toContain('/avatars/gutter.png');
  });

  it('lockSqueeze swaps to the "weird" dragSrc face alongside the shrink', () => {
    const s = new StickerOverlay(
      '/avatars/grin/grin_gutter.png',
      100,
      100,
      undefined,
      undefined,
      undefined,
      false,
      '/avatars/normal/gutter.png',
    );
    const img = s.el.querySelector('img')!;
    expect(img.src).toContain('/avatars/grin/grin_gutter.png');

    s.lockSqueeze();
    expect(img.src).toContain('/avatars/normal/gutter.png');
    expect(s.el.style.transform).toBe('scale(0.55)');
  });

  it('lockSqueeze does not touch the image when no dragSrc was provided', () => {
    const s = new StickerOverlay('/avatars/gutter.png', 100, 100);
    const img = s.el.querySelector('img')!;

    s.lockSqueeze();
    expect(img.src).toContain('/avatars/gutter.png');
  });

  it('setScaleForRaidSize reverts the face back to src once a new raid settles', () => {
    const s = new StickerOverlay(
      '/avatars/grin/grin_gutter.png',
      100,
      100,
      undefined,
      undefined,
      undefined,
      false,
      '/avatars/normal/gutter.png',
    );
    const img = s.el.querySelector('img')!;

    s.lockSqueeze();
    expect(img.src).toContain('/avatars/normal/gutter.png');

    s.setScaleForRaidSize(10, 40);
    expect(img.src).toContain('/avatars/grin/grin_gutter.png');
  });

  it('shows a drag-hint tooltip that mentions both drag and shake', () => {
    const sticker = new StickerOverlay(
      '/some.png',
      100,
      100,
      undefined,
      undefined,
      undefined,
      true, // showDragHint
    );
    document.body.appendChild(sticker.el);

    const hint = sticker.el.querySelector('.sticker-overlay-drag-hint');
    expect(hint?.textContent).toBe('Drag or Shake Me');
  });
});
