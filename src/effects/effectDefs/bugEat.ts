import { PALETTE } from "../../config/tokens";
import type { EffectDef } from "../EffectSystem";
import { EASE_IN, EASE_OUT, EASE_PROTEST, EASE_LINEAR } from "../EffectSystem";

export const BUG_EAT = Object.freeze({
  chomp1Ms: 80,
  chomp2Ms: 80,
  chomp3Ms: 60,
  digestMs: 80,
  totalDurationMs: 300,
  respawnMinMs: 2000,
  respawnMaxMs: 5000,
  sageMinCount: 3,
  sageMaxCount: 6,
  chomp1Ease: EASE_OUT,
  chomp2Ease: EASE_IN,
  chomp3Ease: EASE_PROTEST,
  digestEase: EASE_LINEAR,
} as const);

export const bugEatEffect: EffectDef = {
  id: "bugEat",
  stages: [
    {
      durationMs: BUG_EAT.chomp1Ms,
      easing: BUG_EAT.chomp1Ease,
      cue: "bugEat.start",
      visual: {
        archetype: "bite",
        color: "#2a2a2a",
        opacity: 1,
      },
      update: (ctx, t) => {
        ctx.entity.physics.scale = 1 - t * 0.15;
      },
    },
    {
      durationMs: BUG_EAT.chomp2Ms,
      easing: BUG_EAT.chomp2Ease,
      update: (ctx, t) => {
        ctx.entity.physics.scale = 0.85 - t * 0.15;
      },
    },
    {
      durationMs: BUG_EAT.chomp3Ms,
      easing: BUG_EAT.chomp3Ease,
      onStart: (ctx) => {
        ctx.world.markDying(ctx.entity.id);
      },
      update: (ctx, t) => {
        ctx.entity.physics.scale = 0.7 * (1 - t);
      },
    },
    {
      durationMs: BUG_EAT.digestMs,
      easing: BUG_EAT.digestEase,
      cue: "bugEat.dissolve",
      onStart: (ctx) => {
        const sageCount = ctx.rng.rangeInt(BUG_EAT.sageMinCount, BUG_EAT.sageMaxCount);
        for (let i = 0; i < sageCount; i++) {
          const angle = ctx.rng.float() * Math.PI * 2;
          const speed = ctx.rng.range(30, 80);
          ctx.particles.spawn({
            x: ctx.target.x,
            y: ctx.target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifeMs: ctx.rng.range(400, 800),
            startSize: ctx.rng.range(2, 5),
            endSize: 0,
            color: PALETTE.sage,
            rotation: ctx.rng.float() * Math.PI,
            rotationSpeed: ctx.rng.range(-2, 2),
            spin: 0,
          });
        }
        const delayMs = ctx.rng.rangeInt(BUG_EAT.respawnMinMs, BUG_EAT.respawnMaxMs);
        ctx.world.startRespawn(ctx.entity.id, delayMs);
      },
      update: (_ctx, _t) => {
        // digest stage — entity is gone
      },
    },
  ],
};
