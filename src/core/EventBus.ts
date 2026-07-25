type Listener<T> = (payload: T) => void;
type Events = Record<string, unknown>;

export class EventBus<E extends Events> {
  private readonly listeners: { [K in keyof E]?: Set<Listener<E[K]>> } = {};

  on<K extends keyof E>(event: K, listener: Listener<E[K]>): () => void {
    const set = (this.listeners[event] ??= new Set<Listener<E[K]>>());
    set.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof E>(event: K, listener: Listener<E[K]>): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.listeners[event];
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`EventBus listener for "${String(event)}" threw:`, err);
      }
    }
  }

  listenerCount<K extends keyof E>(event: K): number {
    return this.listeners[event]?.size ?? 0;
  }

  clear<K extends keyof E>(event: K): void {
    this.listeners[event]?.clear();
  }
}
