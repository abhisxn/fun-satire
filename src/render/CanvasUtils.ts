export function applyDpr(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number, dpr: number): void {
  const safeDpr = Math.max(1, Math.min(dpr || 1, 3));
  const widthPx = Math.max(1, Math.floor(cssWidth * safeDpr));
  const heightPx = Math.max(1, Math.floor(cssHeight * safeDpr));
  if (canvas.width !== widthPx || canvas.height !== heightPx) {
    canvas.width = widthPx;
    canvas.height = heightPx;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(safeDpr, safeDpr);
}

export function clampViewportSize(cssWidth: number, cssHeight: number): { width: number; height: number } {
  return {
    width: Math.max(1, Math.floor(cssWidth)),
    height: Math.max(1, Math.floor(cssHeight)),
  };
}

export type ViewportState = {
  width: number;
  height: number;
  dpr: number;
};

export function createViewport(canvas: HTMLCanvasElement): {
  state: ViewportState;
  refresh(): ViewportState;
  onChange(fn: (s: ViewportState) => void): () => void;
} {
  const listeners = new Set<(s: ViewportState) => void>();
  const state: ViewportState = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, 3)),
  };
  applyDpr(canvas, state.width, state.height, state.dpr);

  const refresh = () => {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    applyDpr(canvas, state.width, state.height, state.dpr);
    return state;
  };

  const handleResize = () => {
    refresh();
    listeners.forEach((fn) => fn(state));
  };

  window.addEventListener("resize", handleResize);

  return {
    state,
    refresh,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
