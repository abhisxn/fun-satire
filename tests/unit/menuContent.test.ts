import { describe, it, expect } from "vitest";
import {
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  shuffleVideos,
  HERO_VIDEO,
  GALLERY_ENTRIES,
  type VideoEntry,
} from "../../src/hud/menuContent";

describe("hud/menuContent", () => {
  it("builds a YouTube thumbnail URL from a video id", () => {
    expect(buildYouTubeThumbnailUrl("abc123")).toBe(
      "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    );
  });

  it("builds a YouTube watch URL from a video id", () => {
    expect(buildYouTubeWatchUrl("abc123")).toBe("https://www.youtube.com/watch?v=abc123");
  });

  it("exposes a hero video entry", () => {
    expect(HERO_VIDEO.kind).toBe("video");
    expect(HERO_VIDEO.videoId.length).toBeGreaterThan(0);
    expect(HERO_VIDEO.title.length).toBeGreaterThan(0);
    expect(HERO_VIDEO.channel.length).toBeGreaterThan(0);
  });

  it("exposes gallery entries mixing video and source kinds", () => {
    expect(GALLERY_ENTRIES.length).toBeGreaterThan(0);
    const kinds = new Set(GALLERY_ENTRIES.map((e) => e.kind));
    expect(kinds.has("video")).toBe(true);
    expect(kinds.has("source")).toBe(true);
    for (const entry of GALLERY_ENTRIES) {
      if (entry.kind === "video") {
        expect(entry.videoId.length).toBeGreaterThan(0);
        expect(entry.title.length).toBeGreaterThan(0);
        expect(entry.channel.length).toBeGreaterThan(0);
      } else {
        expect(entry.href.startsWith("https://")).toBe(true);
        expect(entry.label.length).toBeGreaterThan(0);
        expect(entry.icon.length).toBeGreaterThan(0);
      }
    }
  });

  describe("shuffleVideos", () => {
    const A: VideoEntry = { kind: "video", videoId: "aaa", title: "A", channel: "Chan A" };
    const B: VideoEntry = { kind: "video", videoId: "bbb", title: "B", channel: "Chan B" };
    const C: VideoEntry = { kind: "video", videoId: "ccc", title: "C", channel: "Chan C" };
    const entries: VideoEntry[] = [A, B, C];

    it("returns a permutation of the input without mutating it", () => {
      const original = [...entries];
      const result = shuffleVideos(entries, () => 0);

      expect(result).not.toBe(entries);
      expect(entries).toEqual(original);
      const byId = (x: VideoEntry, y: VideoEntry) => x.videoId.localeCompare(y.videoId);
      expect([...result].sort(byId)).toEqual([...entries].sort(byId));
    });

    it("shuffles deterministically for a given rng (Fisher-Yates)", () => {
      const result = shuffleVideos(entries, () => 0);
      expect(result).toEqual([B, C, A]);
    });
  });
});
