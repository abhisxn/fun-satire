import { EntityStore } from "../entities/EntityStore";
import { ParticleSystem } from "../effects/ParticleSystem";
import { EffectSystem } from "../effects/EffectSystem";
import { drawEye } from "./drawers/drawEye";
import { drawBug } from "./drawers/drawBug";
import { drawPointedFinger } from "./drawers/drawPointedFinger";
import { drawCursor, computeCursorState } from "./drawers/drawCursor";
import { computeFieldLines, drawFieldLines } from "./drawers/drawFieldLines";
import { computeGazeLines } from "./drawers/drawGazeLines";
import { drawCollectiveEffectVisual } from "./drawers/drawCollectiveEffectVisual";
import { selectCollectiveContributors } from "../effects/collectiveContributors";
import { drawSubject } from "./drawers/drawSubject";
import { drawLockIndicator } from "./drawers/drawLockIndicator";
import { computePupilOffset } from "./pupilTrack";
import type { EyeBehavior, EyeBlinkTimer } from "../entities/behaviors/EyeBehavior";
import { PALETTE } from "../config/tokens";
import type { Rng } from "../core/Rng";
import type { SubjectColors } from "../content/schema";
import type { SubjectSkin } from "../hud/subjectSkinRegistry";
import type { HudMode } from "../hud/hudIcons";
import type { Entity, EntityId, Vec2 } from "../entities/Entity";
import type { ImageAssetCache } from "./imageAssets";

export type SubjectRenderInfo = {
  id: EntityId;
  pos: Vec2;
  sizePx: number;
  colors: SubjectColors;
  scale: number;
  subjectSkin?: SubjectSkin;
  locked: boolean;
};

export type RenderEntitiesOptions = {
  store: EntityStore;
  particles: ParticleSystem;
  effects: EffectSystem;
  cursor: { x: number; y: number; active: boolean };
  rng: Rng;
  width: number;
  height: number;
  behaviors: Map<number, EyeBehavior>;
  blinkTimers: Map<number, EyeBlinkTimer>;
  pupilOffsets: Map<number, { x: number; y: number }>;
};

export type RenderFrameOptions = RenderEntitiesOptions & {
  ctx: CanvasRenderingContext2D;
  cursorRingRadius: number;
  cursorRingOpacity: number;
  chargeTargetId: number | null;
  hoverEntityId: number | null;
  reducedMotion: boolean;
  nowMs: number;
  hudMode: HudMode;
  quantity: number;
  repelMultiplier: number;
  subjects: readonly SubjectRenderInfo[];
  lockedSubjectId?: number | null;
  chargeT?: number;
  assistRadiusPx?: number;
  imageCache?: ImageAssetCache;
};

export type CrowdDrawOrderMember = { id: number; pos: { x: number; y: number } };

export function computeCrowdDrawOrder<T extends CrowdDrawOrderMember>(members: readonly T[]): T[] {
  return [...members].sort((a, b) => a.pos.y - b.pos.y);
}

export const SHADOW_INTENSITY = Object.freeze({
  baselineQuantity: 20,
  baselineRepel: 1,
  perQuantityUnit: 0.012,
  perRepelUnit: -0.25,
  min: 0.4,
  max: 1.8,
} as const);

export type ShadowIntensityInput = { quantity: number; repelMultiplier: number };

export function computeShadowIntensity(input: ShadowIntensityInput): number {
  const { baselineQuantity, baselineRepel, perQuantityUnit, perRepelUnit, min, max } = SHADOW_INTENSITY;
  const raw =
    1 +
    (input.quantity - baselineQuantity) * perQuantityUnit +
    (input.repelMultiplier - baselineRepel) * perRepelUnit;
  return Math.max(min, Math.min(max, raw));
}

const FIELD_MAX_LENGTH = 240;

export function renderFrame(opts: RenderFrameOptions): void {
  const { ctx, store, cursor } = opts;
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(0, 0, opts.width, opts.height);

  const lines = computeFieldLines({
    cursor,
    origin: { x: opts.width / 2, y: opts.height / 2 },
    maxLength: FIELD_MAX_LENGTH,
    maxLines: 18,
    target: opts.chargeTargetId,
    chargeT: opts.cursorRingOpacity > 0 ? (1 - opts.cursorRingOpacity) : 0,
  });
  drawFieldLines(ctx, lines, { stroke: PALETTE.slate, ink: PALETTE.ink });

  const shadowIntensity = computeShadowIntensity({ quantity: opts.quantity, repelMultiplier: opts.repelMultiplier });
  const eyePositions: Array<{ id: number; pos: { x: number; y: number } }> = [];
  const crowdMembers: Entity[] = [];
  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    crowdMembers.push(e);
  });

  const sortedCrowd = computeCrowdDrawOrder(
    crowdMembers.map((e) => ({ id: e.id, pos: e.physics.pos, entity: e })),
  );

  for (const { entity: e } of sortedCrowd) {
    eyePositions.push({ id: e.id, pos: e.physics.pos });
    const data = e.behavior.data as Record<string, unknown>;
    const shapeVariant = (data.shapeVariant ?? "almond") as Parameters<typeof drawEye>[1]["shapeVariant"];
    const colors = (data.colors ?? {
      sclera: "cream", iris: "slate", pupil: "ink", highlight: "coral", outline: "ink",
    }) as Parameters<typeof drawEye>[1]["colors"];
    const blinkTimer = opts.blinkTimers.get(e.id);
    const blinkScaleY = blinkTimer?.scaleY() ?? 1;
    const easedPrev = opts.pupilOffsets.get(e.id) ?? { x: 0, y: 0 };
    const offset = computePupilOffset({
      eyePos: e.physics.pos,
      cursor,
      socketRx: (e.physics.scale || 1) * 24,
      socketRy: (e.physics.scale || 1) * 18,
      easedPrev,
    });
    opts.pupilOffsets.set(e.id, { x: offset.x, y: offset.y });

    const rotation = e.physics.rotation ?? 0;
    const sizePx = ((data.baseSizePx as number) ?? 56) * (e.physics.scale || 1);

    switch (opts.hudMode) {
      case "eyes": {
        ctx.save();
        ctx.translate(e.physics.pos.x, e.physics.pos.y);
        ctx.rotate(rotation);
        ctx.translate(-e.physics.pos.x, -e.physics.pos.y);
        drawEye(ctx, {
          pos: e.physics.pos,
          sizePx,
          shapeVariant,
          colors,
          blinkScaleY,
          pupilOffset: { x: offset.x, y: offset.y },
        });
        ctx.restore();
        break;
      }
      case "bugs":
        drawBug(ctx, {
          pos: e.physics.pos,
          sizePx,
          colors,
          timeMs: opts.nowMs,
          id: e.id,
          rotation,
          shadowIntensity,
        });
        break;
      case "pointedFinger": {
        const fingerColors: SubjectColors = {
          outline: colors.outline,
          shirt: colors.sclera,
          suit: colors.iris === "cream" ? "slate" : colors.iris,
        };
        drawPointedFinger(ctx, {
          pos: e.physics.pos,
          sizePx,
          colors: fingerColors,
          timeMs: opts.nowMs,
          id: e.id,
          rotation,
          shadowIntensity,
        });
        break;
      }
      default:
        throw new Error(`renderFrame: unknown hudMode "${opts.hudMode as string}"`);
    }
  }

  if (opts.subjects.length > 0) {
    const gazeLines = computeGazeLines({
      eyes: eyePositions,
      subjects: opts.subjects,
      lockedSubjectId: opts.lockedSubjectId ?? null,
      assistRadiusPx: opts.assistRadiusPx ?? 0,
      chargeT: opts.chargeT ?? 0,
    });
    drawFieldLines(ctx, gazeLines, { stroke: PALETTE.coral, ink: PALETTE.ink });
    for (const s of opts.subjects) {
      drawSubject(ctx, {
        pos: s.pos,
        sizePx: s.sizePx,
        colors: s.colors,
        scale: s.scale,
        subjectSkin: s.subjectSkin,
        shadowIntensity,
        imageCache: opts.imageCache,
      });
      if (s.locked) {
        drawLockIndicator(ctx, { pos: s.pos, sizePx: s.sizePx });
      }
    }
  }

  if (cursor.active) {
    ctx.save();
    ctx.globalAlpha = opts.cursorRingOpacity * 0.4;
    ctx.fillStyle = PALETTE.coral;
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, opts.cursorRingRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  opts.particles.draw(ctx);

  const effects = opts.effects;
  if (effects) {
    const collectiveCrowd = crowdMembers.map((e) => ({ id: e.id, pos: e.physics.pos }));
    for (const effect of effects.liveEffects()) {
      const def = effects.getDef(effect.defId);
      if (!def) continue;
      const stage = def.stages[effect.stageIndex];
      if (!stage?.visual) continue;
      const elapsed = opts.nowMs - effect.stageStartedAtMs;
      const progress = stage.durationMs <= 0 ? 1 : Math.min(1, elapsed / stage.durationMs);
      const contributors = selectCollectiveContributors({
        crowd: collectiveCrowd,
        targetPos: effect.target,
        archetype: stage.visual.archetype,
        maxContributors: 16,
        assistRadiusPx: opts.assistRadiusPx ?? 0,
      });
      const origin = stage.visual.archetype === "beam"
        ? { x: opts.width / 2, y: 0 }
        : undefined;
      drawCollectiveEffectVisual(ctx, {
        archetype: stage.visual.archetype,
        visual: stage.visual,
        contributors,
        target: effect.target,
        progress,
        origin,
        nowMs: opts.nowMs,
        stageIndex: effect.stageIndex,
      });
    }
  }

  if (cursor.active) {
    const chargeT = opts.cursorRingOpacity > 0 ? 1 - opts.cursorRingOpacity : 0;
    const state = computeCursorState({
      x: cursor.x,
      y: cursor.y,
      chargeT,
      hover: opts.hoverEntityId !== null,
      reducedMotion: opts.reducedMotion,
      timeMs: opts.nowMs,
    });
    drawCursor(ctx, state);
  }
}
