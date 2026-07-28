import { Clock } from "./Clock";
import { EventBus } from "./EventBus";

export type EngineEvents = {
  tick: { dt: number };
  start: void;
  stop: void;
};

export type EngineOptions = {
  now?: () => number;
  raf?: (cb: (t: number) => void) => number;
  caf?: (h: number) => void;
};

export class Engine {
  readonly clock: Clock;
  readonly events: EventBus<EngineEvents>;
  private raf: number | null = null;
  private readonly nowFn: () => number;
  private readonly rafFn: (cb: (t: number) => void) => number;
  private readonly cafFn: (h: number) => void;
  private readonly tickListeners = new Set<(dt: number) => void>();
  private running = false;

  constructor(opts: EngineOptions = {}) {
    this.clock = new Clock(opts.now?.() ?? performance.now());
    this.events = new EventBus<EngineEvents>();
    this.nowFn = opts.now ?? (() => performance.now());
    this.rafFn =
      opts.raf ??
      ((cb) => requestAnimationFrame((t) => cb(t)) as unknown as number);
    this.cafFn =
      opts.caf ?? ((h) => cancelAnimationFrame(h as unknown as number));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.events.emit("start", undefined);
    this.scheduleFrame();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.raf !== null) {
      this.cafFn(this.raf);
      this.raf = null;
    }
    this.events.emit("stop", undefined);
  }

  onTick(cb: (dt: number) => void): () => void {
    this.tickListeners.add(cb);
    return () => this.tickListeners.delete(cb);
  }

  getNow(): number {
    return this.clock.now();
  }

  elapsed(): number {
    return this.clock.elapsed();
  }

  private scheduleFrame(): void {
    if (!this.running) return;
    this.raf = this.rafFn((t) => this.frame(t)) as unknown as number;
  }

  private frame(timestamp: number): void {
    if (!this.running) return;
    const dt = this.clock.tick(timestamp > 0 ? timestamp : this.nowFn());
    for (const fn of [...this.tickListeners]) {
      try {
        fn(dt);
      } catch (err) {
        console.error(`Engine tick listener threw:`, err);
      }
    }
    this.events.emit("tick", { dt });
    this.scheduleFrame();
  }
}
