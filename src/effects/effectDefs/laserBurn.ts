import { PALETTE, type PaletteKey } from "../../config/tokens";
import type { EffectDef } from "../EffectSystem";
import { EASE_PROTEST, EASE_OUT, EASE_IN } from "../EffectSystem";

export const LASER_BURN = Object.freeze({
  chargeThresholdMs: 550,
  totalDurationMs: 720,
  glowMs: 80,
  lineMs: 100,
  shrinkMs: 100,
  dissolveMs: 120,
  beamMs: 120,
  impactGlowMs: 200,
  ashCount: 28,
  ashMaxR: 120,
  ashMinR: 50,
  shrinkEase: EASE_IN,
  lineEase: EASE_OUT,
  glowEase: EASE_PROTEST,
  dissolveEase: EASE_PROTEST,
  subjectRespawnMinMs: 1000,
  subjectRespawnMaxMs: 2000,
  eyeRespawnMinMs: 3000,
  eyeRespawnMaxMs: 6000,
} as const);

export const laserBurnEffect: EffectDef = {
  id: "laserBurn",
  stages: [
    {
      durationMs: LASER_BURN.glowMs,
      easing: LASER_BURN.glowEase,
      update: (ctx, t) => {
        ctx.entity.physics.scale = (1 - t * 0.18);
      },
    },
    {
      durationMs: LASER_BURN.lineMs,
      easing: LASER_BURN.lineEase,
      update: (ctx, t) => {
        ctx.entity.physics.scale = (1 - 0.18 - t * 0.18);
      },
    },
    {
      durationMs: LASER_BURN.shrinkMs,
      easing: LASER_BURN.shrinkEase,
      onStart: (ctx) => {
        ctx.world.markDying(ctx.entity.id);
      },
      update: (ctx, t) => {
        ctx.entity.physics.scale = (1 - 0.36) * (1 - t);
      },
    },
    {
      durationMs: LASER_BURN.dissolveMs,
      easing: LASER_BURN.dissolveEase,
      onStart: (ctx) => {
        const palette = ctx.entity.content.palette;
        const irisKey = palette?.iris as PaletteKey | undefined;
        const iris = irisKey && irisKey in PALETTE ? PALETTE[irisKey] : PALETTE.slate;
        const ink = PALETTE.ink;
        for (let i = 0; i < LASER_BURN.ashCount; i++) {
          const angle = ctx.rng.float() * Math.PI * 2;
          const speed = ctx.rng.range(LASER_BURN.ashMinR, LASER_BURN.ashMaxR);
          ctx.particles.spawn({
            x: ctx.target.x,
            y: ctx.target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifeMs: ctx.rng.range(380, 700),
            startSize: ctx.rng.range(2, 6),
            endSize: 0,
            color: i % 3 === 0 ? ink : iris,
            rotation: ctx.rng.float() * Math.PI,
            rotationSpeed: ctx.rng.range(-2, 2),
            spin: 0,
          });
        }
        const isSubject = ctx.entity.content.renderType === "subject";
        const delayMs = isSubject
          ? ctx.rng.rangeInt(LASER_BURN.subjectRespawnMinMs, LASER_BURN.subjectRespawnMaxMs)
          : ctx.rng.rangeInt(LASER_BURN.eyeRespawnMinMs, LASER_BURN.eyeRespawnMaxMs);
        ctx.world.startRespawn(ctx.entity.id, delayMs);
      },
      update: (ctx, _t) => {
        ctx.entity.physics.scale = 0;
      },
    },
    {
      id: "beam",
      durationMs: LASER_BURN.beamMs,
      easing: EASE_OUT,
      visual: {
        beamWidth: 8,
        beamColor: PALETTE.coral,
        beamOpacity: 0.9,
      },
      update: (_ctx, _t) => {
        // Beam fades out over duration — rendered by Renderer
      },
    },
    {
      id: "glow",
      durationMs: LASER_BURN.impactGlowMs,
      easing: EASE_OUT,
      visual: {
        glowRadius: 40,
        glowColor: PALETTE.coral,
        glowOpacity: 0.6,
      },
      update: (_ctx, _t) => {
        // Glow expands and fades — rendered by Renderer
      },
    },
  ],
};

export type LaserBurnProgress = {
  stage: "glow" | "line" | "shrink" | "dissolve" | "beam" | "impactGlow" | "done";
  glow: number;
  line: number;
  shrink: number;
  dissolve: number;
  beam: number;
  glowFade: number;
};

export function laserBurnProgressAt(elapsedMs: number): LaserBurnProgress {
  if (elapsedMs < 0) elapsedMs = 0;
  const glow = Math.min(1, elapsedMs / LASER_BURN.glowMs);
  const lineT = (elapsedMs - LASER_BURN.glowMs) / LASER_BURN.lineMs;
  const line = lineT > 0 ? Math.min(1, lineT) : 0;
  const shrinkT = (elapsedMs - LASER_BURN.glowMs - LASER_BURN.lineMs) / LASER_BURN.shrinkMs;
  const shrink = shrinkT > 0 ? Math.min(1, shrinkT) : 0;
  const dissolveT = (elapsedMs - LASER_BURN.glowMs - LASER_BURN.lineMs - LASER_BURN.shrinkMs) /
    LASER_BURN.dissolveMs;
  const dissolve = dissolveT > 0 ? Math.min(1, dissolveT) : 0;
  const beamT = (elapsedMs - LASER_BURN.glowMs - LASER_BURN.lineMs - LASER_BURN.shrinkMs - LASER_BURN.dissolveMs) /
    LASER_BURN.beamMs;
  const beam = beamT > 0 ? Math.min(1, beamT) : 0;
  const glowFadeT = (elapsedMs - LASER_BURN.glowMs - LASER_BURN.lineMs - LASER_BURN.shrinkMs - LASER_BURN.dissolveMs - LASER_BURN.beamMs) /
    LASER_BURN.impactGlowMs;
  const glowFade = glowFadeT > 0 ? Math.min(1, glowFadeT) : 0;

  let stage: LaserBurnProgress["stage"];
  if (elapsedMs < LASER_BURN.glowMs) stage = "glow";
  else if (elapsedMs < LASER_BURN.glowMs + LASER_BURN.lineMs) stage = "line";
  else if (elapsedMs < LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs) stage = "shrink";
  else if (elapsedMs < LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs + LASER_BURN.dissolveMs) stage = "dissolve";
  else if (elapsedMs < LASER_BURN.glowMs + LASER_BURN.lineMs + LASER_BURN.shrinkMs + LASER_BURN.dissolveMs + LASER_BURN.beamMs) stage = "beam";
  else if (elapsedMs < LASER_BURN.totalDurationMs) stage = "impactGlow";
  else stage = "done";
  return { stage, glow, line, shrink, dissolve, beam, glowFade };
}
