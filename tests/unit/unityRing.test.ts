// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  UnityRing,
  computeRingStyle,
  RING_MIN_DIAMETER_PX,
  RING_VISIBLE_FROM_UNITY,
} from '../../src/hud/UnityRing';

describe('computeRingStyle', () => {
  const c = { x: 300, y: 200 };

  it('is hidden with no crowd or very low unity', () => {
    expect(computeRingStyle(0.9, null, 100).visible).toBe(false);
    expect(computeRingStyle(RING_VISIBLE_FROM_UNITY - 0.01, c, 100).visible).toBe(false);
  });

  it('gets more opaque and thicker as unity rises', () => {
    const lo = computeRingStyle(0.2, c, 150);
    const hi = computeRingStyle(0.9, c, 150);
    expect(hi.opacity).toBeGreaterThan(lo.opacity);
    expect(hi.borderWidth).toBeGreaterThan(lo.borderWidth);
  });

  it('never goes below the minimum diameter and grows with spread', () => {
    expect(computeRingStyle(0.5, c, 10).diameter).toBe(RING_MIN_DIAMETER_PX);
    expect(computeRingStyle(0.5, c, 400).diameter).toBeGreaterThan(computeRingStyle(0.5, c, 200).diameter);
  });

  it('is centred on the centroid', () => {
    const s = computeRingStyle(0.5, c, 100);
    expect(s.x).toBe(300);
    expect(s.y).toBe(200);
  });
});

describe('UnityRing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('starts hidden, is aria-hidden and non-interactive', () => {
    const ring = new UnityRing();
    ring.attachTo(document.body);
    expect(ring.el.classList.contains('unity-ring--hidden')).toBe(true);
    expect(ring.el.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows and positions itself around the centroid once unity is high enough', () => {
    const ring = new UnityRing();
    ring.attachTo(document.body);
    ring.update(0.6, { x: 400, y: 300 }, 100, false);
    expect(ring.el.classList.contains('unity-ring--hidden')).toBe(false);
    expect(ring.el.style.width).toBe(`${Math.max(RING_MIN_DIAMETER_PX, 240)}px`);
    expect(ring.el.style.transform).toContain('translate3d(');
  });

  it('marks the broken state only while visible, and hides again when unity falls', () => {
    const ring = new UnityRing();
    ring.attachTo(document.body);
    ring.update(0.95, { x: 400, y: 300 }, 100, true);
    expect(ring.el.classList.contains('unity-ring--broken')).toBe(true);
    ring.update(0.01, { x: 400, y: 300 }, 100, true);
    expect(ring.el.classList.contains('unity-ring--hidden')).toBe(true);
    expect(ring.el.classList.contains('unity-ring--broken')).toBe(false);
  });

  it('destroy removes the element', () => {
    const ring = new UnityRing();
    ring.attachTo(document.body);
    ring.destroy();
    expect(document.querySelector('.unity-ring')).toBeNull();
  });
});
