import inventory from "./visualTokens.json";

type DeepReadonly<T> = T extends object
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T;

export const UI_TOKENS = Object.freeze(inventory) as DeepReadonly<typeof inventory>;

export const CANVAS_ART = Object.freeze({
  cream: "#EDE7DD",
  slate: "#5B7A8C",
  sage: "#6D7A5E",
  ink: "#2A2420",
  coral: "#E8A9A0",
} as const);

export const PALETTE = CANVAS_ART;
