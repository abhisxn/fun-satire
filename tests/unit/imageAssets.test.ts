// tests/unit/imageAssets.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ImageMockState = {
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
};

const makeImageCtorMock = () => {
  const created: ImageMockState[] = [];
  const ctor = function (this: ImageMockState) {
    this.src = "";
    this.onload = null;
    this.onerror = null;
    created.push(this);
  } as unknown as new () => HTMLImageElement;
  return { ctor, created };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("ImageAssetCache", () => {
  let originalImage: typeof Image;
  let created: ImageMockState[];
  let ctor: new () => HTMLImageElement;

  beforeEach(() => {
    originalImage = (globalThis as { Image?: typeof Image }).Image;
    const mock = makeImageCtorMock();
    created = mock.created;
    ctor = mock.ctor;
    (globalThis as { Image?: typeof Image }).Image = ctor;
    vi.resetModules();
  });

  afterEach(() => {
    (globalThis as { Image?: typeof Image }).Image = originalImage;
  });

  it("returns loading on first call and kicks off an Image() load", async () => {
    const { ImageAssetCache } = await import("../../src/render/imageAssets");
    const cache = new ImageAssetCache();
    const entry = cache.get("/avatars/sticker-1.png");
    expect(entry.status).toBe("loading");
    expect(entry.image).toBeUndefined();
    expect(created).toHaveLength(1);
    expect(created[0]?.src).toBe("/avatars/sticker-1.png");
  });

  it("returns ready after the underlying image fires onload, and the same image instance is reused", async () => {
    const { ImageAssetCache } = await import("../../src/render/imageAssets");
    const cache = new ImageAssetCache();
    cache.get("/avatars/sticker-1.png");
    const img = created[0]!;
    img.onload?.();
    await flushMicrotasks();
    const entry = cache.get("/avatars/sticker-1.png");
    expect(entry.status).toBe("ready");
    expect(entry.image).toBe(img as unknown as HTMLImageElement);
    expect(created).toHaveLength(1);
  });

  it("returns error after the underlying image fires onerror", async () => {
    const { ImageAssetCache } = await import("../../src/render/imageAssets");
    const cache = new ImageAssetCache();
    cache.get("/avatars/sticker-1.png");
    const img = created[0]!;
    img.onerror?.();
    await flushMicrotasks();
    const entry = cache.get("/avatars/sticker-1.png");
    expect(entry.status).toBe("error");
    expect(entry.image).toBeUndefined();
  });

  it("preload warms a set of urls without duplicating in-flight loads", async () => {
    const { ImageAssetCache } = await import("../../src/render/imageAssets");
    const cache = new ImageAssetCache();
    cache.preload(["/avatars/a.png", "/avatars/b.png", "/avatars/a.png"]);
    expect(created).toHaveLength(2);
    expect(created.map((c) => c.src).sort()).toEqual([
      "/avatars/a.png",
      "/avatars/b.png",
    ]);
  });
});
