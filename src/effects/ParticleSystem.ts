import { type Rng } from "../core/Rng";

export type Particle = {
  id: number;
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ageMs: number;
  lifeMs: number;
  startSize: number;
  endSize: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  spin: number;
};

export type ParticleSpawn = Omit<Particle, "id" | "alive" | "ageMs">;

export class ParticleSystem {
  private pool: Particle[] = [];
  private nextId = 1;
  private readonly rng: Rng;

  constructor(rng: Rng, capacity: number) {
    this.rng = rng;
    for (let i = 0; i < capacity; i++) {
      this.pool.push({
        id: 0,
        alive: false,
        x: 0, y: 0, vx: 0, vy: 0,
        ageMs: 0, lifeMs: 0,
        startSize: 0, endSize: 0,
        color: "",
        rotation: 0, rotationSpeed: 0, spin: 0,
      });
    }
  }

  get capacity(): number {
    return this.pool.length;
  }

  get liveCount(): number {
    let n = 0;
    for (const p of this.pool) if (p.alive) n++;
    return n;
  }

  spawn(spec: ParticleSpawn): Particle | null {
    const target = this.pool.find((p) => !p.alive);
    if (!target) return null;
    target.id = this.nextId++;
    target.alive = true;
    target.x = spec.x;
    target.y = spec.y;
    target.vx = spec.vx;
    target.vy = spec.vy;
    target.ageMs = 0;
    target.lifeMs = spec.lifeMs;
    target.startSize = spec.startSize;
    target.endSize = spec.endSize;
    target.color = spec.color;
    target.rotation = spec.rotation;
    target.rotationSpeed = spec.rotationSpeed;
    target.spin = spec.spin;
    return target;
  }

  burst(spec: { count: number; perParticle: () => Omit<ParticleSpawn, "x" | "y"> } & { x: () => number; y: () => number }): number {
    let n = 0;
    for (let i = 0; i < spec.count; i++) {
      const result = this.spawn({
        x: spec.x(),
        y: spec.y(),
        ...spec.perParticle(),
      });
      if (!result) break;
      n++;
    }
    return n;
  }

  update(dtMs: number): void {
    if (!Number.isFinite(dtMs) || dtMs <= 0) return;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.ageMs += dtMs;
      if (p.ageMs >= p.lifeMs) {
        p.alive = false;
        continue;
      }
      p.vy += 4 * (dtMs / 1000);
      p.x += p.vx * (dtMs / 1000);
      p.y += p.vy * (dtMs / 1000);
      p.rotation += p.rotationSpeed * (dtMs / 1000);
      p.rotationSpeed += p.spin * (dtMs / 1000);
    }
  }

  cull(): number {
    let n = 0;
    for (const p of this.pool) {
      if (p.alive && p.ageMs >= p.lifeMs) {
        p.alive = false;
        n++;
      }
    }
    return n;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      const t = p.ageMs / p.lifeMs;
      const size = p.startSize + (p.endSize - p.startSize) * t;
      const alpha = 1 - t;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, size / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  reset(): void {
    for (const p of this.pool) p.alive = false;
    this.nextId = 1;
  }

  rngNow(): Rng {
    return this.rng;
  }
}
