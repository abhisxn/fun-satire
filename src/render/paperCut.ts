// src/render/paperCut.ts
export type PaperCutEdgeOpts = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  seed: number;
  segments?: number;
  jitterFraction?: number;
};

const PAPER_CUT = Object.freeze({
  defaultSegments: 14,
  defaultJitterFraction: 0.06,
} as const);

function pseudoRandom(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function paperCutEdgePath(ctx: CanvasRenderingContext2D, opts: PaperCutEdgeOpts): void {
  const segments = opts.segments ?? PAPER_CUT.defaultSegments;
  const jitterFraction = opts.jitterFraction ?? PAPER_CUT.defaultJitterFraction;
  const jitterX = opts.rx * jitterFraction;
  const jitterY = opts.ry * jitterFraction;

  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const j = pseudoRandom(opts.seed * 1000 + i);
    const wobble = (j - 0.5) * 2;
    const x = opts.cx + Math.cos(t) * (opts.rx + wobble * jitterX);
    const y = opts.cy + Math.sin(t) * (opts.ry + wobble * jitterY);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function withPaperCutShadow(ctx: CanvasRenderingContext2D, draw: () => void, intensity: number = 1): void {
  ctx.save();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3 * intensity;
  ctx.shadowBlur = 6 * intensity;
  ctx.shadowColor = "rgba(42, 36, 32, 0.22)";
  draw();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.restore();
}
