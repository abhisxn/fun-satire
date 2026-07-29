export interface Creature {
  el: HTMLElement;
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  w: number;
  h: number;
}

export type CreatureMode = 'eyes' | 'bugs' | 'pointedFinger' | 'cockroach';

export interface CreatureGrid {
  creatures: Creature[];
  mode: CreatureMode;
  cols: number;
  rows: number;
}
