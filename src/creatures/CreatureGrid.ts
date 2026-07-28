import type { Creature, CreatureMode } from "./creatureTypes";
import type { EyeCreature } from "./EyeCreature";
import type { PhysicsParams } from "./creaturePhysics";
import { updateCreature } from "./creaturePhysics";
import { createEyeCreature, updateEyePupil, updateEyeBlink, loadEyeSvg } from "./EyeCreature";
import { createBugCreature, getBugRotation } from "./BugCreature";
import { createFingerCreature, getFingerRotation } from "./FingerCreature";
import { createCockroachCreature, getCockroachRotation } from "./CockroachCreature";

export interface CreatureGridConfig {
  container: HTMLElement;
  cols: number;
  rows: number;
  mode: CreatureMode;
}

export class CreatureGrid {
  private creatures: Creature[] = [];
  private eyeCreatures: EyeCreature[] = [];
  private container: HTMLElement;
  private cols: number;
  private rows: number;
  private mode: CreatureMode;
  private svgMarkup: string = '';
  private physicsParams: PhysicsParams = {
    repelRadius: 180,
    repelStrength: 120,
    springStrength: 0.02,
    damping: 0.88,
  };

  constructor(config: CreatureGridConfig) {
    this.container = config.container;
    this.cols = config.cols;
    this.rows = config.rows;
    this.mode = config.mode;
  }

  async init(): Promise<void> {
    if (this.mode === 'eyes') {
      this.svgMarkup = await loadEyeSvg();
    }
    this.spawn(this.mode);
  }

  spawn(mode: CreatureMode): void {
    this.clear();
    this.mode = mode;

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const cellW = vw / this.cols;
    const cellH = vh / this.rows;

    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const hx = (c + 0.5) * cellW;
        const hy = (r + 0.5) * cellH;
        const scale = 0.08 + Math.pow(Math.random(), 1.5) * 0.35;
        const uid = `${c}_${r}`;

        let creature: Creature;
        switch (mode) {
          case 'eyes': {
            const eye = createEyeCreature(hx, hy, scale, this.svgMarkup, uid);
            this.eyeCreatures.push(eye);
            creature = eye;
            break;
          }
          case 'bugs':
            creature = createBugCreature(hx, hy, scale);
            break;
          case 'pointedFinger':
            creature = createFingerCreature(hx, hy, scale);
            break;
          case 'cockroach':
            creature = createCockroachCreature(hx, hy, scale);
            break;
        }
        this.creatures.push(creature);
        this.container.appendChild(creature.el);
      }
    }
  }

  switchMode(mode: CreatureMode): void {
    if (mode === this.mode) return;
    this.spawn(mode);
  }

  setQuantity(targetCount: number): void {
    const current = this.creatures.length;
    if (targetCount === current) return;

    if (targetCount > current) {
      const vw = this.container.clientWidth || window.innerWidth;
      const vh = this.container.clientHeight || window.innerHeight;
      const toAdd = targetCount - current;
      for (let i = 0; i < toAdd; i++) {
        const hx = Math.random() * vw;
        const hy = Math.random() * vh;
        const scale = 0.08 + Math.pow(Math.random(), 1.5) * 0.35;
        const uid = `extra_${current + i}`;

        let creature: Creature;
        switch (this.mode) {
          case 'eyes': {
            const eye = createEyeCreature(hx, hy, scale, this.svgMarkup, uid);
            this.eyeCreatures.push(eye);
            creature = eye;
            break;
          }
          case 'bugs':
            creature = createBugCreature(hx, hy, scale);
            break;
          case 'pointedFinger':
            creature = createFingerCreature(hx, hy, scale);
            break;
          case 'cockroach':
            creature = createCockroachCreature(hx, hy, scale);
            break;
        }
        this.creatures.push(creature);
        this.container.appendChild(creature.el);
      }
    } else {
      const toRemove = current - targetCount;
      const removed = this.creatures.splice(0, toRemove);
      for (const c of removed) {
        c.el.remove();
        const eyeIdx = this.eyeCreatures.indexOf(c as EyeCreature);
        if (eyeIdx >= 0) this.eyeCreatures.splice(eyeIdx, 1);
      }
    }
  }

  update(avatarX: number, avatarY: number): void {
    const avatar = { x: avatarX, y: avatarY };

    for (const c of this.creatures) {
      updateCreature(c, avatar, this.physicsParams);
    }

    if (this.mode === 'eyes') {
      for (const eye of this.eyeCreatures) {
        updateEyePupil(eye, avatarX, avatarY);
        const scaleY = updateEyeBlink(eye);
        const dx = avatarX - eye.x;
        const dy = avatarY - eye.y;
        const angleRad = Math.atan2(dy, dx);
        const fullAngle = angleRad * (180 / Math.PI);
        const rotation = fullAngle * eye.rotFactor;
        eye.el.style.transform = `translate(${eye.x - eye.w / 2}px,${eye.y - eye.h / 2}px) rotate(${rotation}deg) scaleY(${scaleY})`;
      }
    } else {
      for (const c of this.creatures) {
        let angle: number;
        switch (this.mode) {
          case 'bugs':
            angle = getBugRotation(c, avatarX, avatarY);
            break;
          case 'pointedFinger':
            angle = getFingerRotation(c, avatarX, avatarY);
            break;
          case 'cockroach':
            angle = getCockroachRotation(c, avatarX, avatarY);
            break;
          default:
            angle = 0;
        }
        c.el.style.transform = `translate(${c.x - c.w * c.scale * 0.5}px,${c.y - c.h * c.scale * 0.5}px) scale(${c.scale}) rotate(${angle}deg)`;
      }
    }
  }

  setRepelMultiplier(multiplier: number): void {
    this.physicsParams.repelStrength = 120 * multiplier;
  }

  getCreatureCount(): number {
    return this.creatures.length;
  }

  setCols(cols: number): void {
    this.cols = cols;
  }

  setRows(rows: number): void {
    this.rows = rows;
  }

  respawn(): void {
    this.spawn(this.mode);
  }

  getMode(): CreatureMode {
    return this.mode;
  }

  private clear(): void {
    for (const c of this.creatures) {
      c.el.remove();
    }
    this.creatures = [];
    this.eyeCreatures = [];
  }
}
