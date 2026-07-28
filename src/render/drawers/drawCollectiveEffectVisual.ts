import type { EffectVisual } from "../../effects/EffectSystem";
import type { CollectiveArchetype, Contributor } from "../../effects/collectiveContributors";

export const COLLECTIVE_EFFECT_VISUAL = Object.freeze({
  beam: {
    outerColor: "#ff3d7f",
    outerAlpha: 0.35,
    outerWidthPx: 10,
    middleColor: "#ff6b9d",
    middleAlpha: 0.65,
    middleWidthPx: 5,
    innerColor: "#ffffff",
    innerAlpha: 1,
    innerWidthPx: 1.5,
    sharedGlowColor: "#ff3d7f",
    sharedGlowAlpha: 0.25,
    sharedGlowRadiusPx: 24,
  },
  arc: {
    cyanColor: "#4de3ff",
    cyanAlpha: 0.7,
    cyanWidthPx: 3,
    violetColor: "#a78bfa",
    violetAlpha: 0.95,
    violetWidthPx: 1.5,
    jitterSegments: 6,
    jitterTimeQuantizeMs: 40,
  },
  bite: {
    inkColor: "#2a2a2a",
    inkAlpha: 1,
    inkWidthPx: 2,
    coralColor: "#ff6b6b",
    coralAlpha: 0.9,
    coralWidthPx: 1.2,
    teethSpacingPx: 4,
    teethArcRadiusPx: 8,
  },
  glow: {
    coreColor: "#ffffff",
    coreAlpha: 0.95,
    coreRadiusPx: 8,
    coronaColor: "#ff3d7f",
    coronaAlpha: 0.5,
    coronaRadiusPx: 32,
    coronaRings: 3,
  },
} as const);

export type DrawCollectiveEffectVisualInput = {
  archetype: CollectiveArchetype;
  visual: EffectVisual;
  contributors: readonly Contributor[];
  target: { x: number; y: number };
  progress: number;
  origin?: { x: number; y: number };
  nowMs: number;
  stageIndex?: number;
  reducedMotion?: boolean;
};

export function jitterHash(id: string, stageIndex: number, quantizedTimeMs: number): number {
  let h = 0;
  const s = `${id}:${stageIndex}:${quantizedTimeMs}`;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 0xffffffff;
}

function drawBeam(
  ctx: CanvasRenderingContext2D,
  visual: EffectVisual,
  contributors: readonly Contributor[],
  target: { x: number; y: number },
  origin: { x: number; y: number } | undefined,
  progress: number,
): void {
  const cfg = COLLECTIVE_EFFECT_VISUAL.beam;
  const baseOpacity = visual.opacity * (1 - progress);
  if (baseOpacity <= 0) return;

  ctx.save();
  ctx.lineCap = "round";

  ctx.globalAlpha = baseOpacity * cfg.sharedGlowAlpha;
  ctx.fillStyle = cfg.sharedGlowColor;
  ctx.beginPath();
  ctx.arc(target.x, target.y, cfg.sharedGlowRadiusPx, 0, Math.PI * 2);
  ctx.fill();

  for (const c of contributors) {
    const from = origin ?? c.pos;
    const to = origin ? c.pos : target;

    ctx.globalAlpha = baseOpacity * cfg.outerAlpha;
    ctx.strokeStyle = cfg.outerColor;
    ctx.lineWidth = cfg.outerWidthPx;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.globalAlpha = baseOpacity * cfg.middleAlpha;
    ctx.strokeStyle = cfg.middleColor;
    ctx.lineWidth = cfg.middleWidthPx;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.globalAlpha = baseOpacity * cfg.innerAlpha;
    ctx.strokeStyle = cfg.innerColor;
    ctx.lineWidth = cfg.innerWidthPx;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawArc(
  ctx: CanvasRenderingContext2D,
  visual: EffectVisual,
  contributors: readonly Contributor[],
  target: { x: number; y: number },
  progress: number,
  nowMs: number,
  stageIndex: number,
  reducedMotion: boolean,
): void {
  const cfg = COLLECTIVE_EFFECT_VISUAL.arc;
  const baseOpacity = visual.opacity * (1 - progress);
  if (baseOpacity <= 0 || contributors.length === 0) return;
  const baseAmp = visual.jitterPx ?? 6;
  const amp = reducedMotion ? 0 : baseAmp;
  const quantized = Math.floor(nowMs / cfg.jitterTimeQuantizeMs) * cfg.jitterTimeQuantizeMs;

  ctx.save();
  ctx.lineCap = "round";

  for (const c of contributors) {
    const seed = jitterHash(String(c.id), stageIndex, quantized);
    const dx = target.x - c.pos.x;
    const dy = target.y - c.pos.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / dist;
    const ny = dx / dist;
    const segments = Math.max(2, cfg.jitterSegments);

    ctx.globalAlpha = baseOpacity * cfg.cyanAlpha;
    ctx.strokeStyle = cfg.cyanColor;
    ctx.lineWidth = cfg.cyanWidthPx;
    ctx.beginPath();
    ctx.moveTo(c.pos.x, c.pos.y);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const wob = ((Math.sin(seed * 31 + i * 7) * 0.5 + 0.5) * 2 - 1) * amp;
      const px = c.pos.x + dx * t + nx * wob;
      const py = c.pos.y + dy * t + ny * wob;
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.globalAlpha = baseOpacity * cfg.violetAlpha;
    ctx.strokeStyle = cfg.violetColor;
    ctx.lineWidth = cfg.violetWidthPx;
    ctx.beginPath();
    ctx.moveTo(c.pos.x, c.pos.y);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const wob = ((Math.sin(seed * 17 + i * 11) * 0.5 + 0.5) * 2 - 1) * amp * 0.5;
      const px = c.pos.x + dx * t + nx * wob;
      const py = c.pos.y + dy * t + ny * wob;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawBite(
  ctx: CanvasRenderingContext2D,
  visual: EffectVisual,
  contributors: readonly Contributor[],
  target: { x: number; y: number },
  progress: number,
): void {
  const cfg = COLLECTIVE_EFFECT_VISUAL.bite;
  const baseOpacity = visual.opacity * (1 - progress);
  if (baseOpacity <= 0) return;
  const entityPos = { x: target.x, y: target.y };
  const r = cfg.teethArcRadiusPx;

  ctx.save();
  ctx.lineCap = "round";

  for (const c of contributors) {
    const dx = entityPos.x - c.pos.x;
    const dy = entityPos.y - c.pos.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / dist;
    const uy = dy / dist;
    const px = entityPos.x - ux * r;
    const py = entityPos.y - uy * r;

    ctx.globalAlpha = baseOpacity * cfg.inkAlpha;
    ctx.strokeStyle = visual.color || cfg.inkColor;
    ctx.lineWidth = cfg.inkWidthPx;
    for (let i = -2; i <= 2; i++) {
      const offX = -uy * i * cfg.teethSpacingPx;
      const offY = ux * i * cfg.teethSpacingPx;
      ctx.beginPath();
      ctx.moveTo(px + offX, py + offY);
      ctx.lineTo(entityPos.x + offX, entityPos.y + offY);
      ctx.stroke();
    }

    ctx.globalAlpha = baseOpacity * cfg.coralAlpha;
    ctx.strokeStyle = cfg.coralColor;
    ctx.lineWidth = cfg.coralWidthPx;
    for (let i = -1; i <= 1; i += 2) {
      const offX = -uy * i * cfg.teethSpacingPx;
      const offY = ux * i * cfg.teethSpacingPx;
      ctx.beginPath();
      ctx.moveTo(px + offX, py + offY);
      ctx.lineTo(entityPos.x + offX, entityPos.y + offY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  visual: EffectVisual,
  target: { x: number; y: number },
  progress: number,
): void {
  const cfg = COLLECTIVE_EFFECT_VISUAL.glow;
  const baseOpacity = visual.opacity * (1 - progress);
  if (baseOpacity <= 0) return;
  const grow = (visual.radiusPx ?? cfg.coronaRadiusPx) - cfg.coronaRadiusPx;
  const baseRadius = visual.radiusPx ?? cfg.coronaRadiusPx;
  const coreR = cfg.coreRadiusPx * (1 + progress * 0.3) * 0.25;
  const coronaR0 = baseRadius * (1 + progress * 0.2);
  const coronaRStep = (grow >= 0 ? grow : 0) + (coronaR0 - baseRadius) / cfg.coronaRings + 6;

  ctx.save();
  for (let i = cfg.coronaRings - 1; i >= 0; i--) {
    const ringR = coronaR0 + i * coronaRStep;
    const ringAlpha = cfg.coronaAlpha * (1 - i / cfg.coronaRings);
    ctx.globalAlpha = baseOpacity * ringAlpha;
    ctx.fillStyle = cfg.coronaColor;
    ctx.beginPath();
    ctx.arc(target.x, target.y, ringR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = baseOpacity * cfg.coreAlpha;
  ctx.fillStyle = cfg.coreColor;
  ctx.beginPath();
  ctx.arc(target.x, target.y, coreR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCollectiveEffectVisual(
  ctx: CanvasRenderingContext2D,
  input: DrawCollectiveEffectVisualInput,
): void {
  const { archetype, visual, contributors, target, progress, origin, nowMs } = input;
  const stageIndex = input.stageIndex ?? 0;
  const reducedMotion = input.reducedMotion ?? false;
  switch (archetype) {
    case "beam":
      drawBeam(ctx, visual, contributors, target, origin, progress);
      return;
    case "arc":
      drawArc(ctx, visual, contributors, target, progress, nowMs, stageIndex, reducedMotion);
      return;
    case "bite":
      drawBite(ctx, visual, contributors, target, progress);
      return;
    case "glow":
      drawGlow(ctx, visual, target, progress);
      return;
    default: {
      const _exhaustive: never = archetype;
      void _exhaustive;
    }
  }
}
