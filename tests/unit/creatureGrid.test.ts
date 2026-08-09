// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatureGrid, SPAWN_WAVE_MS } from '../../src/creatures/CreatureGrid';
import type { CreatureGridConfig } from '../../src/creatures/CreatureGrid';
import type { CreatureMode } from '../../src/creatures/creatureTypes';

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
        nextBlink: Date.now() + 10000,
        blinking: false,
        blinkStart: 0,
        rotFactor: 0.1,
      };
    },
  };
});

describe('CreatureGrid', () => {
  let container: HTMLElement;
  let config: CreatureGridConfig;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);

    config = {
      container,
      mode: 'cockroach',
    };
  });

  describe('constructor', () => {
    it('stores config values', () => {
      const grid = new CreatureGrid(config);
      expect(grid.getCreatureCount()).toBe(0);
      expect(grid.getMode()).toBe('cockroach');
    });
  });

  describe('spawn', () => {
    it('creates creatures in grid (mode-specific cols * rows count)', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      expect(grid.getCreatureCount()).toBe(240);
    });

    it('appends creature elements to container', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      expect(container.children.length).toBe(240);
    });

    it('creates eyes mode creatures', () => {
      const grid = new CreatureGrid({ ...config, mode: 'eyes' });
      grid.spawn('eyes');
      expect(grid.getCreatureCount()).toBe(96);
      expect(grid.getMode()).toBe('eyes');
    });

    it('creates pointedFinger mode creatures', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('pointedFinger');
      expect(grid.getCreatureCount()).toBe(240);
      expect(grid.getMode()).toBe('pointedFinger');
    });

    it('creates cockroach mode creatures', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      expect(grid.getCreatureCount()).toBe(240);
      expect(grid.getMode()).toBe('cockroach');
    });

    it('creates placard mode creatures', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('placard');
      expect(grid.getCreatureCount()).toBe(240);
      expect(grid.getMode()).toBe('placard');
    });
  });

  describe('spawn — pop-in animation scheduling', () => {
    it('assigns every creature a spawnPopAtMs within the spawn wave window', () => {
      const grid = new CreatureGrid(config);
      const before = Date.now();
      grid.spawn('cockroach');
      const after = Date.now();

      const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      expect(creatures.length).toBeGreaterThan(0);
      for (const c of creatures) {
        expect(c.spawnPopAtMs).toBeGreaterThanOrEqual(before);
        expect(c.spawnPopAtMs).toBeLessThanOrEqual(after + SPAWN_WAVE_MS);
        expect(c.spawnDone).toBe(false);
      }
    });

    it('assigns randomized (non-identical) spawnPopAtMs across creatures', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number }> }).creatures;
      const uniqueTimes = new Set(creatures.map((c) => c.spawnPopAtMs));
      expect(uniqueTimes.size).toBeGreaterThan(1);
    });
  });

  describe('switchMode', () => {
    it('clears old creatures and creates new ones', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      expect(grid.getCreatureCount()).toBe(240);

      grid.switchMode('eyes');
      expect(grid.getMode()).toBe('eyes');
    });

    it('preserves the current creature count across a mode switch', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      grid.setQuantity(300);
      expect(grid.getCreatureCount()).toBe(300);

      grid.switchMode('eyes');
      expect(grid.getCreatureCount()).toBe(300);

      grid.switchMode('cockroach');
      expect(grid.getCreatureCount()).toBe(300);
    });

    it('does nothing when switching to same mode', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      const initialCount = grid.getCreatureCount();

      grid.switchMode('cockroach');
      expect(grid.getCreatureCount()).toBe(initialCount);
    });

    it('removes old creature elements from container', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      const firstChild = container.children[0];

      grid.switchMode('pointedFinger');
      expect(container.contains(firstChild)).toBe(false);
    });
  });

  describe('setQuantity', () => {
    it('adds creatures when target > current', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      expect(grid.getCreatureCount()).toBe(240);

      grid.setQuantity(250);
      expect(grid.getCreatureCount()).toBe(250);
    });

    it('removes creatures when target < current', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      expect(grid.getCreatureCount()).toBe(240);

      grid.setQuantity(200);
      expect(grid.getCreatureCount()).toBe(200);
    });

    it('does nothing when target === current', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      expect(grid.getCreatureCount()).toBe(240);

      grid.setQuantity(240);
      expect(grid.getCreatureCount()).toBe(240);
    });

    it('appends new creature elements to container when adding', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      const initialChildren = container.children.length;

      grid.setQuantity(250);
      expect(container.children.length).toBe(250);
      expect(container.children.length).toBeGreaterThan(initialChildren);
    });

    it('removes creature elements from container when removing', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      grid.setQuantity(200);
      expect(container.children.length).toBe(200);
    });

    it('gives newly added creatures a fresh spawn animation without resetting existing ones', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      for (const c of creatures) {
        c.spawnDone = true;
        c.spawnPopAtMs = 1;
      }
      const existingCount = creatures.length;

      const before = Date.now();
      grid.setQuantity(existingCount + 10);
      const after = Date.now();

      const updated = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      for (let i = 0; i < existingCount; i++) {
        expect(updated[i].spawnDone).toBe(true);
        expect(updated[i].spawnPopAtMs).toBe(1);
      }
      for (let i = existingCount; i < updated.length; i++) {
        expect(updated[i].spawnDone).toBe(false);
        expect(updated[i].spawnPopAtMs).toBeGreaterThanOrEqual(before);
        expect(updated[i].spawnPopAtMs).toBeLessThanOrEqual(after + SPAWN_WAVE_MS);
      }
    });

    it('clamps a target above QTY_MAX (900) down to 900', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      grid.setQuantity(9999);
      expect(grid.getCreatureCount()).toBe(900);
    });

    it('clamps a target below QTY_MIN (10) up to 10', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      grid.setQuantity(1);
      expect(grid.getCreatureCount()).toBe(10);
    });
  });

  describe('getCreatureCount', () => {
    it('returns 0 before spawn', () => {
      const grid = new CreatureGrid(config);
      expect(grid.getCreatureCount()).toBe(0);
    });

    it('returns correct count after spawn', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      expect(grid.getCreatureCount()).toBe(240);
    });

    it('returns correct count after setQuantity', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      grid.setQuantity(300);
      expect(grid.getCreatureCount()).toBe(300);
    });
  });

  describe('getMode', () => {
    it('returns initial mode from config', () => {
      const grid = new CreatureGrid(config);
      expect(grid.getMode()).toBe('cockroach');
    });

    it('returns updated mode after switchMode', () => {
      const grid = new CreatureGrid(config);
      grid.switchMode('eyes');
      expect(grid.getMode()).toBe('eyes');
    });

    it('returns all valid modes', () => {
      const modes: CreatureMode[] = ['eyes', 'pointedFinger', 'cockroach', 'placard'];
      const grid = new CreatureGrid(config);

      for (const mode of modes) {
        grid.switchMode(mode);
        expect(grid.getMode()).toBe(mode);
      }
    });
  });

  describe('update', () => {
    it('does not throw for eyes mode', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('eyes');
      expect(() => grid.update(400, 300)).not.toThrow();
    });

    it('does not throw for pointedFinger mode', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('pointedFinger');
      expect(() => grid.update(400, 300)).not.toThrow();
    });

    it('does not throw for cockroach mode', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      expect(() => grid.update(400, 300)).not.toThrow();
    });

    it('does not throw for placard mode', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('placard');
      expect(() => grid.update(400, 300)).not.toThrow();
    });

    it('updates creature positions', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      const creatures = (grid as unknown as { creatures: Array<{ x: number; y: number; hx: number; hy: number }> }).creatures;
      const creature = creatures[0];
      const initialX = creature.x;
      const initialY = creature.y;

      grid.update(creature.hx + 10, creature.hy);

      const hasMoved = creature.x !== initialX || creature.y !== initialY;
      expect(hasMoved).toBe(true);
    });
  });

  describe('setRepelMultiplier', () => {
    it('updates physics params', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      grid.setRepelMultiplier(2);

      const physicsParams = (grid as unknown as { physicsParams: { repelStrength: number } }).physicsParams;
      expect(physicsParams.repelStrength).toBe(240);
    });

    it('scales repel strength linearly', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      grid.setRepelMultiplier(0.5);
      const physicsParams = (grid as unknown as { physicsParams: { repelStrength: number } }).physicsParams;
      expect(physicsParams.repelStrength).toBe(60);
    });

    it('handles zero multiplier', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      grid.setRepelMultiplier(0);
      const physicsParams = (grid as unknown as { physicsParams: { repelStrength: number } }).physicsParams;
      expect(physicsParams.repelStrength).toBe(0);
    });
  });
});
