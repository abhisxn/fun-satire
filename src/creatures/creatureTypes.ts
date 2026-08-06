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
  spawnPopAtMs: number;
  spawnDone: boolean;
  fadeStartMs: number;
}

export type CreatureMode = 'eyes' | 'pointedFinger' | 'cockroach' | 'placard';

export interface CreatureGrid {
  creatures: Creature[];
  mode: CreatureMode;
  cols: number;
  rows: number;
}
