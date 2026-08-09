import { CANVAS_ART, UI_TOKENS } from "./visualTokens";

export { CANVAS_ART, UI_TOKENS } from "./visualTokens";

export const PALETTE = CANVAS_ART;

export type PaletteKey = keyof typeof PALETTE;

export const COLOR_HEX: Readonly<Record<PaletteKey, string>> = PALETTE;

export function isPaletteKey(value: string): value is PaletteKey {
  return Object.prototype.hasOwnProperty.call(PALETTE, value);
}

export function assertPaletteKey(value: string): asserts value is PaletteKey {
  if (!isPaletteKey(value)) {
    throw new Error(
      `Unknown palette key "${value}". Accepted: ${listAcceptedPaletteKeys().join(", ")}.`
    );
  }
}

export function listAcceptedPaletteKeys(): readonly PaletteKey[] {
  return Object.keys(PALETTE) as PaletteKey[];
}

export const FONT = Object.freeze({
  display: UI_TOKENS.typography.displayFamily,
  mono: UI_TOKENS.typography.monoFamily,
} as const);

export const EASE = Object.freeze(UI_TOKENS.motion.ease);

export const DURATION = Object.freeze(UI_TOKENS.motion.duration);

export const MOTION = Object.freeze({
  multiplier: UI_TOKENS.motion.multiplier,
  reducedMultiplier: UI_TOKENS.motion.reducedMultiplier,
} as const);

export function motionScale(matchesReducedMotion: boolean): number {
  return matchesReducedMotion ? MOTION.reducedMultiplier : MOTION.multiplier;
}

// Shared creature-quantity bounds and default, so the slider (FilterPanel),
// the live grid (CreatureGrid), and startup (main.ts) all agree on one
// source of truth instead of duplicating literals.
export const QTY_MIN = 10;
export const QTY_MAX = 900;
export const DEFAULT_CREATURE_QUANTITY = 300;
