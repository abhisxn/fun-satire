// src/hud/textFontRegistry.ts
export type TextFontId =
  | "spaceMono"
  | "fraunces"
  | "barriecito"
  | "nabla"
  | "bungeeTint"
  | "unbounded"
  | "spaceGrotesk"
  | "bricolageGrotesque"
  | "tektur"
  | "orbitron"
  | "syneMono"
  | "pixelifySans"
  | "doto";

export type TextFontEntry = {
  id: TextFontId;
  label: string;
  cssFontFamily: string;
};

export const TEXT_FONT_REGISTRY: readonly TextFontEntry[] = Object.freeze([
  { id: "spaceMono", label: "Space Mono", cssFontFamily: '"Space Mono"' },
  { id: "fraunces", label: "Fraunces", cssFontFamily: '"Fraunces Variable", "Fraunces"' },
  { id: "barriecito", label: "Barriecito", cssFontFamily: '"Barriecito"' },
  { id: "nabla", label: "Nabla", cssFontFamily: '"Nabla"' },
  { id: "bungeeTint", label: "Bungee Tint", cssFontFamily: '"Bungee Tint"' },
  { id: "unbounded", label: "Unbounded", cssFontFamily: '"Unbounded"' },
  { id: "spaceGrotesk", label: "Space Grotesk", cssFontFamily: '"Space Grotesk"' },
  { id: "bricolageGrotesque", label: "Bricolage Grotesque", cssFontFamily: '"Bricolage Grotesque"' },
  { id: "tektur", label: "Tektur", cssFontFamily: '"Tektur"' },
  { id: "orbitron", label: "Orbitron", cssFontFamily: '"Orbitron"' },
  { id: "syneMono", label: "Syne Mono", cssFontFamily: '"Syne Mono"' },
  { id: "pixelifySans", label: "Pixelify Sans", cssFontFamily: '"Pixelify Sans"' },
  { id: "doto", label: "Doto", cssFontFamily: '"Doto"' },
]);

const REGISTRY_MAP: ReadonlyMap<TextFontId, TextFontEntry> = new Map(
  TEXT_FONT_REGISTRY.map((e) => [e.id, e]),
);

export function getTextFontEntry(id: TextFontId | string | undefined): TextFontEntry {
  if (id && REGISTRY_MAP.has(id as TextFontId)) {
    return REGISTRY_MAP.get(id as TextFontId)!;
  }
  return REGISTRY_MAP.get("spaceMono")!;
}
