import inventory from "./visualTokens.json";

type DeepReadonly<T> = T extends object
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T;

function deepFreeze<T extends object>(value: T): DeepReadonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === "object") deepFreeze(child);
  }
  return Object.freeze(value) as DeepReadonly<T>;
}

export const UI_TOKENS = deepFreeze(inventory.ui);

export const CANVAS_ART = deepFreeze(inventory.canvasArt);

export const PALETTE = CANVAS_ART;
