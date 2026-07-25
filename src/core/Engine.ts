import { Clock } from "./Clock";
import { EventBus } from "./EventBus";

export type EnginePhase = "pre-physics" | "post-physics" | "render";

export type EngineEvents = {
  tick: { phase: EnginePhase; dt: number };
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
  private readonly phases: Record<EnginePhase, Set<(dt: number) => void>> = {
    "pre-physics": new Set(),
    "post-physics": new Set(),
    render: new Set(),
  };
  private cursorX = 0;
  private cursorY = 0;
  private hasCursor = false;
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

  onTick(phase: EnginePhase, cb: (dt: number) => void): () => void {
    const set = this.phases[phase];
    set.add(cb);
    return () => set.delete(cb);
  }

  setCursor(x: number, y: number): void {
    this.cursorX = x;
    this.cursorY = y;
    this.hasCursor = true;
  }

  clearCursor(): void {
    this.hasCursor = false;
  }

  cursor(): { x: number; y: number; active: boolean } {
    return { x: this.cursorX, y: this.cursorY, active: this.hasCursor };
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
    const phases: EnginePhase[] = ["pre-physics", "post-physics", "render"];
    for (const phase of phases) {
      const set = this.phases[phase];
      for (const fn of [...set]) {
        try {
          fn(dt);
        } catch (err) {
          console.error(`Engine phase "${phase}" listener threw:`, err);
        }
      }
      this.events.emit("tick", { phase, dt });
    }
    this.scheduleFrame();
  }
}
