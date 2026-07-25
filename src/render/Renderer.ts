import { EntityStore } from "../entities/EntityStore";
import { ParticleSystem } from "../effects/ParticleSystem";
import { EffectSystem } from "../effects/EffectSystem";
import { drawEye } from "./drawers/drawEye";
import { drawCursor, computeCursorState } from "./drawers/drawCursor";
import { computeFieldLines, drawFieldLines } from "./drawers/drawFieldLines";
import { computeGazeLines } from "./drawers/drawGazeLines";
import { drawSubject } from "./drawers/drawSubject";
import { computePupilOffset } from "./pupilTrack";
import type { EyeBehavior, EyeBlinkTimer } from "../entities/behaviors/EyeBehavior";
import { PALETTE } from "../config/tokens";
import type { Rng } from "../core/Rng";
import type { SubjectColors } from "../content/schema";

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
  subject?: {
    id: number;
    pos: { x: number; y: number };
    sizePx: number;
    colors: SubjectColors;
    scale: number;
    subjectSkin?: import("../content/schema").SubjectSkin;
  } | null;
  chargeT?: number;
  assistRadiusPx?: number;
};

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

  const drawnIds = new Set<number>();
  const eyePositions: Array<{ id: number; pos: { x: number; y: number } }> = [];
  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    drawnIds.add(e.id);
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

    drawEye(ctx, {
      pos: e.physics.pos,
      sizePx: ((data.baseSizePx as number) ?? 56) * (e.physics.scale || 1),
      shapeVariant,
      colors,
      blinkScaleY,
      pupilOffset: { x: offset.x, y: offset.y },
    });
  });

  if (opts.subject) {
    const gazeLines = computeGazeLines({
      eyes: eyePositions,
      subjectPos: opts.subject.pos,
      assistRadiusPx: opts.assistRadiusPx ?? 0,
      chargeT: opts.chargeT ?? 0,
    });
    drawFieldLines(ctx, gazeLines, { stroke: PALETTE.coral, ink: PALETTE.ink });
    drawSubject(ctx, {
      pos: opts.subject.pos,
      sizePx: opts.subject.sizePx,
      colors: opts.subject.colors,
      scale: opts.subject.scale,
    });
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
