// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatureGrid, FADE_PICK_COUNT, FADE_OUT_MS, REPOP_COUNT } from '../../src/creatures/CreatureGrid';
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
        fadeStartMs: 0,
        waitingRespawn: false,
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
    const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean; fadeStartMs: number; waitingRespawn: boolean }> }).creatures;
    const creature = creatures[0];
    creature.spawnPopAtMs = Date.now() - 10000;
    grid.update(creature.hx, creature.hy);
    expect(creature.spawnDone).toBe(true);

    // Isolate from the random pick machinery so it doesn't fade this
    // creature out and alter its opacity.
    (grid as unknown as { lastFadePickMs: number; lastRepopPickMs: number }).lastFadePickMs = Date.now();
    (grid as unknown as { lastRepopPickMs: number }).lastRepopPickMs = Date.now();
    creature.fadeStartMs = 0;
    creature.waitingRespawn = false;
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

  it('does not randomly fade or re-pop while the initial wave is still appearing', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean; fadeStartMs: number; waitingRespawn: boolean }> }).creatures;
    for (const c of creatures) {
      c.spawnDone = false;
      c.spawnPopAtMs = Date.now() + 60000;
    }

    grid.update(400, 300);

    expect(creatures.every((c) => !c.spawnDone && c.fadeStartMs === 0 && !c.waitingRespawn)).toBe(true);
  });

  it('randomly marks settled creatures for fade-out', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean; fadeStartMs: number }> }).creatures;
    for (const c of creatures) {
      c.spawnDone = true;
      c.spawnPopAtMs = 1;
    }
    const before = Date.now();

    grid.update(400, 300);

    const fading = creatures.filter((c) => c.fadeStartMs > 0);
    expect(fading.length).toBe(FADE_PICK_COUNT);
    expect(creatures.every((c) => c.spawnDone)).toBe(true);
    for (const c of fading) {
      expect(c.fadeStartMs).toBeGreaterThanOrEqual(before);
    }
  });

  it('starts random fade-outs while the initial wave is still appearing', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean; fadeStartMs: number }> }).creatures;
    for (const c of creatures) {
      c.spawnDone = true;
      c.spawnPopAtMs = 1;
    }
    // Half the crowd is still mid-pop-in; the other half has settled.
    for (let i = 0; i < creatures.length / 2; i++) {
      creatures[i].spawnDone = false;
      creatures[i].spawnPopAtMs = Date.now() + 60000;
    }

    grid.update(400, 300);

    const fading = creatures.filter((c) => c.fadeStartMs > 0);
    expect(fading.length).toBe(FADE_PICK_COUNT);
    for (const c of fading) {
      expect(c.spawnDone).toBe(true);
    }
  });

  it('fades a creature out and leaves it invisible until re-picked', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean; fadeStartMs: number; waitingRespawn: boolean }> }).creatures;
    for (const c of creatures) {
      c.spawnDone = true;
      c.spawnPopAtMs = 1;
    }
    (grid as unknown as { lastFadePickMs: number; lastRepopPickMs: number }).lastFadePickMs = Date.now();
    (grid as unknown as { lastRepopPickMs: number }).lastRepopPickMs = Date.now();
    const target = creatures[0];

    target.fadeStartMs = Date.now() - FADE_OUT_MS / 2;
    grid.update(400, 300);

    const midOpacity = Number(target.el.style.opacity);
    expect(target.spawnDone).toBe(true);
    expect(target.fadeStartMs).toBeGreaterThan(0);
    expect(midOpacity).toBeGreaterThan(0);
    expect(midOpacity).toBeLessThan(1);

    target.fadeStartMs = Date.now() - FADE_OUT_MS - 50;
    grid.update(400, 300);

    expect(target.fadeStartMs).toBe(0);
    expect(target.waitingRespawn).toBe(true);
    expect(target.spawnDone).toBe(false);
    expect(target.el.style.opacity).toBe('0');
  });

  it('randomly re-pops invisible creatures via a separate pick', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean; fadeStartMs: number; waitingRespawn: boolean }> }).creatures;
    for (const c of creatures) {
      c.spawnDone = true;
      c.spawnPopAtMs = 1;
    }
    for (let i = 0; i < 20; i++) {
      creatures[i].spawnDone = false;
      creatures[i].fadeStartMs = 0;
      creatures[i].waitingRespawn = true;
    }
    const before = Date.now();

    grid.update(400, 300);

    const repopped = creatures.filter((c) => !c.waitingRespawn && !c.spawnDone && c.spawnPopAtMs >= before);
    expect(repopped.length).toBe(REPOP_COUNT);
    expect(repopped.every((c) => c.fadeStartMs === 0)).toBe(true);
  });
});
