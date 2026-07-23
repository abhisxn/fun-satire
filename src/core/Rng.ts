export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  if (s === 0) s = 0x9E3779B9;
  return function randInt(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

export class Rng {
  private readonly randInt: () => number;

  constructor(seed: number) {
    this.randInt = mulberry32(seed);
  }

  next(): number {
    return this.randInt();
  }

  float(): number {
    return this.randInt() / 0x100000000;
  }

  range(lo: number, hi: number): number {
    return lo + this.float() * (hi - lo);
  }

  rangeInt(lo: number, hiExclusive: number): number {
    return lo + Math.floor(this.float() * (hiExclusive - lo));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Rng.pick: empty list");
    }
    return items[this.rangeInt(0, items.length)]!;
  }

  static default(): Rng {
    return new Rng((Date.now() & 0xFFFFFFFF) >>> 0);
  }

  static fromQueryString(qs: string, fallback: number): Rng {
    const params = new URLSearchParams(qs.startsWith("?") ? qs : `?${qs}`);
    const raw = params.get("seed");
    const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
    const seed = Number.isFinite(parsed) ? parsed : fallback;
    return new Rng(seed);
  }
}
