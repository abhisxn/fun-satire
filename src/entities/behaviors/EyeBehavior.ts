import { type Rng } from "../../core/Rng";
import type { StateMachine } from "./StateMachine";

export type EyeLifecycle = "alive" | "dying";
export type EyeLocomotion = "idle" | "flee" | "dragged";
export type EyeBlink = "open" | "closing" | "closed" | "opening";

export type EyeStateEvents = {
  die: void;
  respawn: void;
  drag: void;
  release: void;
};

export class EyeBlinkTimer {
  blink: EyeBlink = "open";
  private nextBlinkAtMs = 0;
  private closeEndsAtMs = 0;
  private openEndsAtMs = 0;
  private blinkScale = 1;
  private readonly blinkIntervalMinMs: number;
  private readonly blinkIntervalMaxMs: number;
  private readonly blinkDurationMs: number;

  constructor(
    rng: Rng,
    cfg: { blinkIntervalMinMs: number; blinkIntervalMaxMs: number; blinkDurationMs: number },
    nowMs: number,
  ) {
    this.blinkIntervalMinMs = cfg.blinkIntervalMinMs;
    this.blinkIntervalMaxMs = cfg.blinkIntervalMaxMs;
    this.blinkDurationMs = cfg.blinkDurationMs;
    this.scheduleNextBlink(rng, nowMs);
  }

  private scheduleNextBlink(rng: Rng, nowMs: number): void {
    const span = this.blinkIntervalMaxMs - this.blinkIntervalMinMs;
    const offset = span > 0 ? rng.range(0, span) : 0;
    this.nextBlinkAtMs = nowMs + this.blinkIntervalMinMs + offset;
  }

  tick(rng: Rng, nowMs: number): void {
    if (this.blink === "open" && nowMs >= this.nextBlinkAtMs) {
      this.blink = "closing";
      this.openEndsAtMs = nowMs + this.blinkDurationMs * 0.5;
      this.closeEndsAtMs = nowMs + this.blinkDurationMs;
    } else if (this.blink === "closing" && nowMs >= this.openEndsAtMs) {
      this.blink = "closed";
    } else if (this.blink === "closed" && nowMs >= this.closeEndsAtMs) {
      this.blink = "opening";
      this.openEndsAtMs = nowMs + this.blinkDurationMs * 0.5;
    } else if (this.blink === "opening" && nowMs >= this.openEndsAtMs) {
      this.blink = "open";
      this.scheduleNextBlink(rng, nowMs);
    }

    const half = this.blinkDurationMs * 0.5;
    const t = nowMs;
    switch (this.blink) {
      case "open":
        this.blinkScale = 1;
        break;
      case "closing": {
        const p = Math.min(1, (t - (this.nextBlinkAtMs)) / half);
        this.blinkScale = 1 - p;
        break;
      }
      case "closed":
        this.blinkScale = 0;
        break;
      case "opening": {
        const p = Math.min(1, (t - (this.closeEndsAtMs)) / half);
        this.blinkScale = p;
        break;
      }
    }
  }

  scaleY(): number {
    return this.blinkScale;
  }
}

export class EyeBehavior {
  private readonly blinkTimer: EyeBlinkTimer;
  private readonly locomotionState: StateMachine<EyeLocomotion, keyof EyeStateEvents>;
  private readonly lifecycleState: StateMachine<EyeLifecycle, keyof EyeStateEvents>;

  constructor(
    rng: Rng,
    cfg: { blinkIntervalMinMs: number; blinkIntervalMaxMs: number; blinkDurationMs: number },
    lifecycleState: StateMachine<EyeLifecycle, keyof EyeStateEvents>,
    locomotionState: StateMachine<EyeLocomotion, keyof EyeStateEvents>,
    nowMs: number,
  ) {
    this.blinkTimer = new EyeBlinkTimer(rng, cfg, nowMs);
    this.locomotionState = locomotionState;
    this.lifecycleState = lifecycleState;
  }

  tick(rng: Rng, nowMs: number): void {
    this.blinkTimer.tick(rng, nowMs);
  }

  blinkScaleY(): number {
    return this.blinkTimer.scaleY();
  }

  setDragged(dragging: boolean): void {
    const cur = this.locomotionState.current();
    if (dragging && cur !== "dragged") {
      try {
        this.locomotionState.send("drag");
      } catch {
        return;
      }
    } else if (!dragging && cur === "dragged") {
      this.locomotionState.send("release");
    }
  }

  setDying(dying: boolean): void {
    if (dying) this.lifecycleState.send("die");
    else this.lifecycleState.send("respawn");
  }
}
