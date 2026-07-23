import { Clock } from "./Clock";
import { EventBus } from "./EventBus";

export type EnginePhase = "pre-physics" | "post-physics" | "render";

export type EngineEvents = {
  tick: { phase: EnginePhase; dt: number };
  start: void;
  stop: void;
  resize: { width: number; height: number; dpr: number };
};

type RafHandle = number;

export class Engine {
  readonly clock: Clock;
  readonly events: EventBus<EngineEvents>;
  private raf: RafHandle | null = null;
  private phaseListeners: Record<EnginePhase, Set<(dt: number) => void>> = {
    "pre-physics": new Set(),
    "post-physics": new Set(),
    render: new Set(),
  };
  private cursorX = 0;
  private cursorY = 0;
  private hasCursor = false;
  private running = false;
  private rafFn: (cb: FrameRequestCallback) => number;

  constructor(opts?: { rafFn?: (cb: FrameRequestCallback) => number }) {
    this.clock = new Clock();
    this.events = new EventBus<EngineEvents>();
    this.rafFn =
      opts?.rafFn ??
      ((cb) => requestAnimationFrame(cb) as unknown as number);
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
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.events.emit("stop", undefined);
  }

  onTick(phase: EnginePhase, cb: (dt: number) => void): () => void {
    const set = this.phaseListeners[phase];
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

  now(): number {
    return this.clock.now();
  }

  elapsed(): number {
    return this.clock.elapsed();
  }

  private scheduleFrame(): void {
    if (!this.running) return;
    this.raf = this.rafFn(() => this.frame()) as unknown as RafHandle;
  }

  private frame(): void {
    const dt = this.clock.tick();
    const phases: EnginePhase[] = ["pre-physics", "post-physics", "render"];
    for (const phase of phases) {
      const set = this.phaseListeners[phase];
      if (set.size === 0) {
        this.events.emit("tick", { phase, dt });
        continue;
      }
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
