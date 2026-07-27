import { PALETTE, type PaletteKey } from "../../config/tokens";
import type { EffectDef } from "../EffectSystem";
import { EASE_PROTEST, EASE_OUT, EASE_IN } from "../EffectSystem";

export const ELECTRIC_BURN = Object.freeze({
  chargeThresholdMs: 550,
  totalDurationMs: 340,
  crackleMs: 60,
  flashMs: 40,
  shrinkMs: 120,
  sootMs: 120,
  sparkCount: 16,
  sootCount: 20,
  sparkMaxR: 140,
  sparkMinR: 60,
  sootMaxR: 100,
  sootMinR: 40,
  shrinkEase: EASE_IN,
  flashEase: EASE_OUT,
  crackleEase: EASE_PROTEST,
  sootEase: EASE_PROTEST,
  subjectRespawnMinMs: 3000,
  subjectRespawnMaxMs: 6000,
  eyeRespawnMinMs: 3000,
  eyeRespawnMaxMs: 6000,
} as const);

export const electricBurnEffect: EffectDef = {
  id: "electricBurn",
  stages: [
    {
      durationMs: ELECTRIC_BURN.crackleMs,
      easing: ELECTRIC_BURN.crackleEase,
      cue: "electricBurn.start",
      update: (ctx, t) => {
        ctx.entity.behavior.data.electricArc = t;
      },
    },
    {
      durationMs: ELECTRIC_BURN.flashMs,
      easing: ELECTRIC_BURN.flashEase,
      visual: {
        archetype: "arc",
        color: "#4de3ff",
        opacity: 0.8,
        jitterPx: 6,
      },
      update: (ctx, t) => {
        ctx.entity.behavior.data.flashIntensity = t;
      },
    },
    {
      durationMs: ELECTRIC_BURN.shrinkMs,
      easing: ELECTRIC_BURN.shrinkEase,
      onStart: (ctx) => {
        ctx.world.markDying(ctx.entity.id);
        const palette = ctx.entity.content.palette;
        const irisKey = palette?.iris as PaletteKey | undefined;
        const iris = irisKey && irisKey in PALETTE ? PALETTE[irisKey] : PALETTE.coral;
        for (let i = 0; i < ELECTRIC_BURN.sparkCount; i++) {
          const angle = ctx.rng.float() * Math.PI * 2;
          const speed = ctx.rng.range(ELECTRIC_BURN.sparkMinR, ELECTRIC_BURN.sparkMaxR);
          ctx.particles.spawn({
            x: ctx.target.x,
            y: ctx.target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifeMs: ctx.rng.range(300, 600),
            startSize: ctx.rng.range(2, 5),
            endSize: 0,
            color: iris,
            rotation: ctx.rng.float() * Math.PI,
            rotationSpeed: ctx.rng.range(-3, 3),
            spin: 0,
          });
        }
      },
      update: (ctx, t) => {
        ctx.entity.physics.scale = (1 - t) * 0.64;
      },
    },
    {
      durationMs: ELECTRIC_BURN.sootMs,
      easing: ELECTRIC_BURN.sootEase,
      cue: "electricBurn.dissolve",
      onStart: (ctx) => {
        const sootColor = "#3A3028";
        for (let i = 0; i < ELECTRIC_BURN.sootCount; i++) {
          const angle = ctx.rng.float() * Math.PI * 2;
          const speed = ctx.rng.range(ELECTRIC_BURN.sootMinR, ELECTRIC_BURN.sootMaxR);
          ctx.particles.spawn({
            x: ctx.target.x,
            y: ctx.target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 20,
            lifeMs: ctx.rng.range(400, 800),
            startSize: ctx.rng.range(3, 7),
            endSize: 0,
            color: i % 2 === 0 ? PALETTE.ink : sootColor,
            rotation: ctx.rng.float() * Math.PI,
            rotationSpeed: ctx.rng.range(-1.5, 1.5),
            spin: 0,
          });
        }
        const isSubject = ctx.entity.content.renderType === "subject";
        const delayMs = isSubject
          ? ctx.rng.rangeInt(ELECTRIC_BURN.subjectRespawnMinMs, ELECTRIC_BURN.subjectRespawnMaxMs)
          : ctx.rng.rangeInt(ELECTRIC_BURN.eyeRespawnMinMs, ELECTRIC_BURN.eyeRespawnMaxMs);
        ctx.world.startRespawn(ctx.entity.id, delayMs);
      },
      update: (ctx, _t) => {
        ctx.entity.physics.scale = 0;
      },
    },
  ],
};

export type ElectricBurnProgress = {
  stage: "crackle" | "flash" | "shrink" | "soot" | "done";
  crackle: number;
  flash: number;
  shrink: number;
  soot: number;
  overallProgress: number;
};

export function electricBurnProgressAt(elapsedMs: number): ElectricBurnProgress {
  if (elapsedMs < 0) elapsedMs = 0;
  const crackle = Math.min(1, elapsedMs / ELECTRIC_BURN.crackleMs);
  const flashT = (elapsedMs - ELECTRIC_BURN.crackleMs) / ELECTRIC_BURN.flashMs;
  const flash = flashT > 0 ? Math.min(1, flashT) : 0;
  const shrinkT = (elapsedMs - ELECTRIC_BURN.crackleMs - ELECTRIC_BURN.flashMs) / ELECTRIC_BURN.shrinkMs;
  const shrink = shrinkT > 0 ? Math.min(1, shrinkT) : 0;
  const sootT = (elapsedMs - ELECTRIC_BURN.crackleMs - ELECTRIC_BURN.flashMs - ELECTRIC_BURN.shrinkMs) /
    ELECTRIC_BURN.sootMs;
  const soot = sootT > 0 ? Math.min(1, sootT) : 0;
  const overallProgress = Math.min(1, elapsedMs / ELECTRIC_BURN.totalDurationMs);

  let stage: ElectricBurnProgress["stage"];
  if (elapsedMs < ELECTRIC_BURN.crackleMs) stage = "crackle";
  else if (elapsedMs < ELECTRIC_BURN.crackleMs + ELECTRIC_BURN.flashMs) stage = "flash";
  else if (elapsedMs < ELECTRIC_BURN.crackleMs + ELECTRIC_BURN.flashMs + ELECTRIC_BURN.shrinkMs) stage = "shrink";
  else if (elapsedMs < ELECTRIC_BURN.totalDurationMs) stage = "soot";
  else stage = "done";
  return { stage, crackle, flash, shrink, soot, overallProgress };
}
