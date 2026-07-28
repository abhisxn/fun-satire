import { describe, expect, it } from 'vitest';
import type { Creature, CreatureMode, CreatureGrid } from '../../src/creatures/creatureTypes';

const createMockElement = (): HTMLElement => {
  return {} as HTMLElement;
};

describe('creatureTypes', () => {
  describe('Creature interface', () => {
    it('accepts a valid creature object', () => {
      const creature: Creature = {
        el: createMockElement(),
        hx: 100,
        hy: 200,
        x: 150,
        y: 250,
        vx: 10,
        vy: -5,
        scale: 1.5,
        w: 64,
        h: 64,
      };

      expect(creature.el).toBeDefined();
      expect(creature.hx).toBe(100);
      expect(creature.hy).toBe(200);
      expect(creature.x).toBe(150);
      expect(creature.y).toBe(250);
      expect(creature.vx).toBe(10);
      expect(creature.vy).toBe(-5);
      expect(creature.scale).toBe(1.5);
      expect(creature.w).toBe(64);
      expect(creature.h).toBe(64);
    });

    it('supports negative coordinates', () => {
      const creature: Creature = {
        el: createMockElement(),
        hx: -100,
        hy: -200,
        x: -50,
        y: -75,
        vx: 0,
        vy: 0,
        scale: 1,
        w: 32,
        h: 32,
      };

      expect(creature.hx).toBe(-100);
      expect(creature.hy).toBe(-200);
      expect(creature.x).toBe(-50);
      expect(creature.y).toBe(-75);
    });

    it('supports fractional scale values', () => {
      const creature: Creature = {
        el: createMockElement(),
        hx: 0,
        hy: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        scale: 0.5,
        w: 100,
        h: 100,
      };

      expect(creature.scale).toBe(0.5);
    });
  });

  describe('CreatureMode type', () => {
    it('accepts all valid mode values', () => {
      const modes: CreatureMode[] = ['eyes', 'bugs', 'pointedFinger', 'cockroach'];

      expect(modes).toContain('eyes');
      expect(modes).toContain('bugs');
      expect(modes).toContain('pointedFinger');
      expect(modes).toContain('cockroach');
      expect(modes).toHaveLength(4);
    });

    it('each mode is a distinct string', () => {
      const modes: CreatureMode[] = ['eyes', 'bugs', 'pointedFinger', 'cockroach'];
      const uniqueModes = new Set(modes);

      expect(uniqueModes.size).toBe(4);
    });
  });

  describe('CreatureGrid interface', () => {
    it('accepts a valid grid object', () => {
      const grid: CreatureGrid = {
        creatures: [],
        mode: 'eyes',
        cols: 10,
        rows: 8,
      };

      expect(grid.creatures).toEqual([]);
      expect(grid.mode).toBe('eyes');
      expect(grid.cols).toBe(10);
      expect(grid.rows).toBe(8);
    });

    it('accepts a grid with creatures', () => {
      const creature1: Creature = {
        el: createMockElement(),
        hx: 0,
        hy: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        scale: 1,
        w: 32,
        h: 32,
      };

      const creature2: Creature = {
        el: createMockElement(),
        hx: 100,
        hy: 100,
        x: 100,
        y: 100,
        vx: 5,
        vy: 5,
        scale: 1,
        w: 32,
        h: 32,
      };

      const grid: CreatureGrid = {
        creatures: [creature1, creature2],
        mode: 'bugs',
        cols: 5,
        rows: 5,
      };

      expect(grid.creatures).toHaveLength(2);
      expect(grid.creatures[0]).toBe(creature1);
      expect(grid.creatures[1]).toBe(creature2);
      expect(grid.mode).toBe('bugs');
    });

    it('supports all creature modes', () => {
      const grids: CreatureGrid[] = [
        { creatures: [], mode: 'eyes', cols: 1, rows: 1 },
        { creatures: [], mode: 'bugs', cols: 2, rows: 2 },
        { creatures: [], mode: 'pointedFinger', cols: 3, rows: 3 },
        { creatures: [], mode: 'cockroach', cols: 4, rows: 4 },
      ];

      expect(grids[0].mode).toBe('eyes');
      expect(grids[1].mode).toBe('bugs');
      expect(grids[2].mode).toBe('pointedFinger');
      expect(grids[3].mode).toBe('cockroach');
    });
  });
});
