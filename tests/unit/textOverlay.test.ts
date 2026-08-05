// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TextOverlay, TEXT_Z_INDEX } from '../../src/creatures/TextOverlay';

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
    expect(editor.textContent).toBe('Type here');
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
});
