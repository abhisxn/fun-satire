// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { PowerMeter } from '../../src/hud/PowerMeter';

describe('PowerMeter', () => {
  it('renders a vertical track of 15 segments', () => {
    const meter = new PowerMeter();
    expect(meter.root.querySelector('.power-meter__track')).not.toBeNull();
    expect(meter.root.querySelectorAll('.power-meter__segment')).toHaveLength(15);
  });

  it('attachTo appends its root to the given host', () => {
    const meter = new PowerMeter();
    meter.attachTo(document.body);
    expect(document.body.contains(meter.root)).toBe(true);
  });

  it('show() reveals the root and hide() hides it — positioning is pure CSS (powerMeter.css), not JS-computed', () => {
    const meter = new PowerMeter();
    meter.attachTo(document.body);
    expect(meter.root.classList.contains('power-meter--hidden')).toBe(true);
    meter.show();
    expect(meter.root.classList.contains('power-meter--hidden')).toBe(false);
    meter.hide();
    expect(meter.root.classList.contains('power-meter--hidden')).toBe(true);
  });

  it('setFraction(0) leaves every segment unfilled', () => {
    const meter = new PowerMeter();
    meter.setFraction(0);
    const segments = meter.root.querySelectorAll<HTMLElement>('.power-meter__segment');
    for (const seg of Array.from(segments)) {
      expect(seg.style.background).toBe('#d0c5be');
    }
  });

  it('setFraction(1) fills every segment with a distinct color', () => {
    const meter = new PowerMeter();
    meter.setFraction(1);
    const segments = meter.root.querySelectorAll<HTMLElement>('.power-meter__segment');
    // Segment 0 is the lowest/weakest (yellow start stop), the last is the
    // highest/strongest (red-orange end stop) — see PowerMeter.ts's comment
    // on why index order stays bottom-up regardless of visual stacking.
    expect(segments[0]!.style.background).toBe('rgb(223, 195, 12)');
    expect(segments[14]!.style.background).toBe('rgb(188, 71, 36)');
  });

  it('setFraction(0.5) fills roughly half the segments, starting from index 0', () => {
    const meter = new PowerMeter();
    meter.setFraction(0.5);
    const segments = meter.root.querySelectorAll<HTMLElement>('.power-meter__segment');
    const filled = Array.from(segments).filter((s) => s.style.background !== '#d0c5be');
    expect(filled).toHaveLength(8); // round(0.5 * 15)
    expect(segments[0]!.style.background).not.toBe('#d0c5be');
    expect(segments[14]!.style.background).toBe('#d0c5be');
  });

  it('clamps fraction to [0,1]', () => {
    const meter = new PowerMeter();
    meter.setFraction(1.5);
    expect(meter.getFraction()).toBe(1);
    meter.setFraction(-1);
    expect(meter.getFraction()).toBe(0);
  });
});
