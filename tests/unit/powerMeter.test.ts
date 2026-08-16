// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { PowerMeter } from '../../src/hud/PowerMeter';

describe('PowerMeter', () => {
  it('renders Weak and High labels and a track with a marker', () => {
    const meter = new PowerMeter();
    const labels = meter.root.querySelectorAll('.power-meter__label');
    expect(labels).toHaveLength(2);
    expect(labels[0]!.textContent).toBe('Weak');
    expect(labels[1]!.textContent).toBe('High');
    expect(meter.root.querySelector('.power-meter__track')).not.toBeNull();
    expect(meter.root.querySelector('.power-meter__marker')).not.toBeNull();
  });

  it('attachTo appends its root to the given container', () => {
    const meter = new PowerMeter();
    const container = document.createElement('div');
    meter.attachTo(container);
    expect(container.contains(meter.root)).toBe(true);
  });

  it('setFraction(0) places the marker at the left edge', () => {
    const meter = new PowerMeter();
    meter.setFraction(0);
    const marker = meter.root.querySelector('.power-meter__marker') as HTMLElement;
    expect(marker.style.left).toBe('0%');
  });

  it('setFraction(1) places the marker at the right edge', () => {
    const meter = new PowerMeter();
    meter.setFraction(1);
    const marker = meter.root.querySelector('.power-meter__marker') as HTMLElement;
    expect(marker.style.left).toBe('100%');
  });

  it('setFraction(0.5) places the marker at the midpoint', () => {
    const meter = new PowerMeter();
    meter.setFraction(0.5);
    const marker = meter.root.querySelector('.power-meter__marker') as HTMLElement;
    expect(marker.style.left).toBe('50%');
  });

  it('clamps fraction to [0,1]', () => {
    const meter = new PowerMeter();
    meter.setFraction(1.5);
    expect(meter.getFraction()).toBe(1);
    meter.setFraction(-1);
    expect(meter.getFraction()).toBe(0);
  });
});
