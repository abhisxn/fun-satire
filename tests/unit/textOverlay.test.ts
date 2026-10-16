// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TextOverlay, TEXT_Z_INDEX, MAX_CHARS } from '../../src/creatures/TextOverlay';

describe('TextOverlay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('creates a wrapper div with editor and resize handle at z-index 400', () => {
    const t = new TextOverlay('"Fraunces", serif', 30, 40);
    expect(t.el.className).toBe('text-overlay');
    expect(t.el.style.zIndex).toBe(String(TEXT_Z_INDEX));
    expect(t.el.style.left).toBe('30px');
    expect(t.el.style.top).toBe('40px');
    const editor = t.el.querySelector('.text-overlay-editor');
    expect(editor).not.toBeNull();
    const handle = t.el.querySelector('.text-overlay-resize');
    expect(handle).not.toBeNull();
  });

  it('uses the provided font and starts editable', () => {
    const t = new TextOverlay('"Anton", sans-serif');
    const editor = t.getEditor();
    expect(editor.contentEditable).toBe('true');
    expect(editor.style.fontFamily).toContain('Anton');
    // Empty (not real text) so the CSS `:empty::before` placeholder shows
    // "Type here" until the user types — no click-and-delete needed.
    expect(editor.textContent).toBe('');
    expect(editor.dataset.placeholder).toBe('Type here');
  });

  it('updates font via setFont', () => {
    const t = new TextOverlay('"Anton", sans-serif');
    t.setFont('"Caveat", cursive');
    expect(t.getFont()).toBe('"Caveat", cursive');
    expect(t.getEditor().style.fontFamily).toContain('Caveat');
  });

  it('resize handle updates font-size without moving the element', () => {
    const t = new TextOverlay('"Anton", sans-serif', 100, 100);
    const handle = t.el.querySelector<HTMLElement>('.text-overlay-resize')!;
    const beforeLeft = t.el.style.left;
    const beforeTop = t.el.style.top;

    handle.dispatchEvent(new MouseEvent('mousedown', { clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 200, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    const sizePx = parseFloat(t.getEditor().style.fontSize);
    expect(sizePx).toBeGreaterThan(56);
    expect(sizePx).toBeLessThanOrEqual(240);
    expect(t.el.style.left).toBe(beforeLeft);
    expect(t.el.style.top).toBe(beforeTop);
  });

  it('resize handle clamps font-size within bounds', () => {
    const t = new TextOverlay('"Anton", sans-serif', 100, 100);
    const handle = t.el.querySelector<HTMLElement>('.text-overlay-resize')!;
    handle.dispatchEvent(new MouseEvent('mousedown', { clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 10000, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(parseFloat(t.getEditor().style.fontSize)).toBeLessThanOrEqual(240);
  });

  it('destroy removes the element', () => {
    const t = new TextOverlay('"Anton", sans-serif');
    document.body.appendChild(t.el);
    t.destroy();
    expect(document.querySelector('.text-overlay')).toBeNull();
  });

  it('renders as a light placard tint with a stick and a character counter', () => {
    const t = new TextOverlay('"Anton", sans-serif');
    const editor = t.getEditor();
    // Random light gradient on white (placard palette), dark lettering.
    expect(editor.style.background).toContain('linear-gradient');
    expect(editor.style.color).toMatch(/#1b1b1b|rgb\(27,\s*27,\s*27\)/);

    const stick = t.el.querySelector<HTMLImageElement>('.text-overlay-stick');
    expect(stick).not.toBeNull();
    expect(stick?.getAttribute('src')).toContain('/creatures/placard_stick.webp');

    const counter = t.el.querySelector<HTMLElement>('.text-overlay-count');
    expect(counter).not.toBeNull();
    expect(counter?.textContent).toBe(`0/${MAX_CHARS}`);
  });

  it('clamps typed text to MAX_CHARS on input', () => {
    const t = new TextOverlay('"Anton", sans-serif');
    const editor = t.getEditor();
    editor.textContent = 'x'.repeat(MAX_CHARS + 5);
    editor.dispatchEvent(new Event('input'));

    expect(t.getCharCount()).toBe(MAX_CHARS);
    expect(t.el.querySelector<HTMLElement>('.text-overlay-count')?.textContent)
      .toBe(`${MAX_CHARS}/${MAX_CHARS}`);
  });

  it('counts line breaks toward MAX_CHARS', () => {
    const t = new TextOverlay('"Anton", sans-serif');
    t.getEditor().innerHTML = 'ab<br>cd';
    expect(t.getCharCount()).toBe(5);
  });

  it('preserves line breaks when clamping to MAX_CHARS', () => {
    const t = new TextOverlay('"Anton", sans-serif');
    const editor = t.getEditor();
    editor.innerHTML = `${'a'.repeat(20)}<br>${'b'.repeat(25)}`;
    editor.dispatchEvent(new Event('input'));

    expect(t.getCharCount()).toBe(MAX_CHARS);
    expect(editor.querySelector('br')).not.toBeNull();
  });

  it('prevents the keystroke that would exceed MAX_CHARS when already full', () => {
    const t = new TextOverlay('"Anton", sans-serif');
    const editor = t.getEditor();
    editor.textContent = 'x'.repeat(MAX_CHARS);

    const over = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: 'y',
      bubbles: true,
      cancelable: true,
    });
    editor.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
  });

  it('scales font size via two-finger pinch, clamped within bounds', () => {
    const t = new TextOverlay('"Anton", sans-serif', 100, 100);

    t.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: t.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: t.el, clientX: 100, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: t.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: t.el, clientX: 200, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    // Default font size is 36; pinch factor 2 -> 72, within [16, 240].
    expect(parseFloat(t.getEditor().style.fontSize)).toBeCloseTo(72);
  });

  it('clamps pinch scaling within MIN_FONT_SIZE/MAX_FONT_SIZE bounds', () => {
    const t = new TextOverlay('"Anton", sans-serif', 100, 100);

    t.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: t.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: t.el, clientX: 100, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: t.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: t.el, clientX: 10000, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    expect(parseFloat(t.getEditor().style.fontSize)).toBeLessThanOrEqual(240);
  });

  it('shows the resize handle by default on touch devices instead of relying on hover', () => {
    Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true });
    const t = new TextOverlay('"Anton", sans-serif');
    const handle = t.el.querySelector<HTMLElement>('.text-overlay-resize')!;
    expect(handle.style.opacity).toBe('1');
    Reflect.deleteProperty(window, 'ontouchstart');
  });

  it('ignores pinch-zoom while a corner-handle resize is already in progress', () => {
    const t = new TextOverlay('"Anton", sans-serif', 100, 100);
    const handle = t.el.querySelector<HTMLElement>('.text-overlay-resize')!;

    // Start a corner-handle resize with one finger on the handle.
    handle.dispatchEvent(new TouchEvent('touchstart', {
      touches: [new Touch({ identifier: 0, target: handle, clientX: 100, clientY: 100 })],
      bubbles: true,
      cancelable: true,
    }));

    // A second finger lands elsewhere on the overlay while the handle-drag
    // is still active — this must NOT start a competing pinch resize.
    t.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: handle, clientX: 100, clientY: 100 }),
        new Touch({ identifier: 1, target: t.el, clientX: 300, clientY: 100 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: handle, clientX: 100, clientY: 100 }),
        new Touch({ identifier: 1, target: t.el, clientX: 5000, clientY: 100 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    // Once a second finger is down, the corner-handle's own move-tracking
    // also defers (single-finger only, mirroring makeDraggable.ts), so font
    // size should be untouched by both mechanisms — still the default (36),
    // not driven toward MAX_FONT_SIZE by the pinch formula.
    expect(parseFloat(t.getEditor().style.fontSize)).toBeCloseTo(36);
  });
});
