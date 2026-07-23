export const PALETTE = Object.freeze({
  cream: "#EDE7DD",
  slate: "#5B7A8C",
  sage: "#6D7A5E",
  ink: "#2A2420",
  coral: "#E8A9A0",
} as const);

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
  display: '"Fraunces Variable", "Fraunces", Georgia, serif',
  mono: '"Space Mono", ui-monospace, "SFMono-Regular", monospace',
} as const);

export const EASE = Object.freeze({
  protest: "cubic-bezier(0.22, 1, 0.36, 1)",
  charge: "cubic-bezier(0.32, 0.72, 0, 1)",
  fade: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const);

export const DURATION = Object.freeze({
  fast: 120,
  base: 200,
  slow: 360,
} as const);

export const MOTION = Object.freeze({
  multiplier: 1,
  reducedMultiplier: 0.4,
} as const);

export function motionScale(matchesReducedMotion: boolean): number {
  return matchesReducedMotion ? MOTION.reducedMultiplier : MOTION.multiplier;
}
