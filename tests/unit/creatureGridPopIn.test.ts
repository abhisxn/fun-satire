// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatureGrid } from '../../src/creatures/CreatureGrid';
import type { CreatureGridConfig } from '../../src/creatures/CreatureGrid';

const TEST_SVG = `<svg viewBox="0 0 115 57"><circle cx="40.25" cy="28.75" r="10"/></svg>`;

vi.mock('../../src/creatures/EyeCreature', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/creatures/EyeCreature')>();
  return {
    ...actual,
    loadEyeSvg: vi.fn(() => Promise.resolve(TEST_SVG)),
    createEyeCreature: (hx: number, hy: number, scale: number, _svgMarkup: string, _uid: string) => {
      const el = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '40.25');
      circle.setAttribute('cy', '28.75');
      circle.setAttribute('r', '10');
      svg.appendChild(circle);
      el.appendChild(svg);
      return {
        el,
        pupil: circle,
        hx,
        hy,
        x: hx,
        y: hy,
        vx: 0,
        vy: 0,
        scale,
        w: 115 * scale,
        h: 57 * scale,
        spawnPopAtMs: 0,
        spawnDone: false,
        nextBlink: Date.now() + 10000,
        blinking: false,
        blinkStart: 0,
        rotFactor: 0.1,
      };
    },
  };
});

describe('CreatureGrid update — pop-in visuals', () => {
  let container: HTMLElement;
  let config: CreatureGridConfig;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
    config = { container, mode: 'cockroach' };
  });

  it('renders a not-yet-appeared creature as invisible and unscaled', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
    const creature = creatures[0];
    creature.spawnPopAtMs = Date.now() + 5000;
    creature.spawnDone = false;

    grid.update(creature.hx, creature.hy);

    expect(creature.el.style.opacity).toBe('0');
    expect(creature.el.style.transform).toContain('scale(0)');
  });

  it('renders a fully-appeared creature at full scale and opacity, and marks it done', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
    const creature = creatures[0];
    creature.spawnPopAtMs = Date.now() - 10000;
    creature.spawnDone = false;

    grid.update(creature.hx, creature.hy);

    expect(creature.el.style.opacity).toBe('1');
    expect(creature.el.style.transform).toContain('scale(1)');
    expect(creature.spawnDone).toBe(true);
  });

  it('does not recompute the animation once a creature is marked done', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
    const creature = creatures[0];
    creature.spawnPopAtMs = Date.now() - 10000;
    grid.update(creature.hx, creature.hy);
    expect(creature.spawnDone).toBe(true);

    creature.spawnPopAtMs = Date.now() + 10000;
    grid.update(creature.hx, creature.hy);

    expect(creature.el.style.opacity).toBe('1');
  });

  it('composes pop-in scale with blink scaleY for eyes mode', () => {
    const grid = new CreatureGrid({ ...config, mode: 'eyes' });
    grid.spawn('eyes');
    const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
    const creature = creatures[0];
    creature.spawnPopAtMs = Date.now() - 10000;
    creature.spawnDone = false;

    grid.update(creature.hx, creature.hy);

    expect(creature.el.style.transform).toMatch(/scale\(1\).*scaleY\(/);
  });
});
