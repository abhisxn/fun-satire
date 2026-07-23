export type StateMachineConfig<S extends string, E extends string> = {
  initial: S;
  transitions: ReadonlyArray<readonly [S, E, S]>;
};

export class StateMachine<S extends string, E extends string> {
  private state: S;
  private readonly listeners = new Set<(from: S, to: S, event: E) => void>();
  private readonly cfg: StateMachineConfig<S, E>;

  constructor(cfg: StateMachineConfig<S, E>) {
    this.cfg = cfg;
    this.state = cfg.initial;
  }

  current(): S {
    return this.state;
  }

  send(event: E): S {
    const from = this.state;
    const next = this.cfg.transitions.find(
      (t) => t[0] === from && t[1] === event,
    );
    if (!next) {
      throw new Error(
        `StateMachine: no transition from "${from}" on event "${event}"`,
      );
    }
    this.state = next[2];
    for (const l of this.listeners) l(from, this.state, event);
    return this.state;
  }

  onTransition(fn: (from: S, to: S, event: E) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  reset(state?: S): void {
    this.state = state ?? this.cfg.initial;
  }
}
