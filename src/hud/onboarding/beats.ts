export interface OnboardingBeat {
  readonly lines: readonly [string, string];
}

export const BEATS: readonly OnboardingBeat[] = [
  {
    lines: [
      "You called us cockroaches. Gutter generation.",
      "We picked the names up. We're still wearing them.",
    ],
  },
  {
    lines: [
      "Different states. Different faiths. Same square.",
      "That's not a mob. That's all of us.",
    ],
  },
  {
    lines: [
      "Drop them in. Watch the crowd close in around them.",
      "That's why we call this Gutter Generation.",
    ],
  },
  {
    lines: [
      "Every promise. Every price. Every quiet lie.",
      "You forgot we were watching. We didn't.",
    ],
  },
  {
    lines: [
      "You hit hard. We laughed back — memes, reels, dance.",
      "One of you stepped down. We didn't go home.",
    ],
  },
  {
    lines: [
      "No leader to arrest. No face to blame.",
      "Just thousands of us. Move.",
    ],
  },
] as const;
