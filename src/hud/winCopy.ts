export interface WinCopyVariant {
  readonly title: string;
  readonly copy: string;
}

export const WIN_COPY_VARIANTS: readonly WinCopyVariant[] = [
  {
    title: "Can't arrest a crowd",
    copy: "No leader to grab, no face to jail. Just thousands of us, and we're not going anywhere.",
  },
  {
    title: "Strength in numbers",
    copy: "One eye watching is easy to ignore. A thousand isn't. That's the whole trick.",
  },
  {
    title: "This is what winning looks like",
    copy: "You didn't wait for permission. You showed up, and up, and up — until they had no move left.",
  },
  {
    title: "Heard. Loud.",
    copy: "Every voice you add pushes further than the last. Nobody's whispering into a raid this size.",
  },
  {
    title: "Accountability, delivered",
    copy: "They don't answer to statements. They answer to pressure. You just applied it.",
  },
  {
    title: "Keep them in check",
    copy: "Every raid they send, every sticker they slap on — the crowd just gets bigger. That's the deal now.",
  },
  {
    title: "They ran",
    copy: "One more sticker down. Every one you send in makes it easier for the next. That's not luck — that's numbers.",
  },
  {
    title: "We don't stop",
    copy: "This one's cleared. There's always another. Bring the next one in.",
  },
];

export function pickWinCopy(rng: () => number = Math.random): WinCopyVariant {
  const index = Math.floor(rng() * WIN_COPY_VARIANTS.length);
  return WIN_COPY_VARIANTS[index]!;
}
