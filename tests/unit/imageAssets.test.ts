// tests/unit/imageAssets.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageAssetCache } from "../../src/render/imageAssets";

type ImageMockState = {
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  decode?: () => Promise<void>;
};

const makeImageCtorMock = (decode?: () => Promise<void>) => {
  const created: ImageMockState[] = [];
  const ctor = function (this: ImageMockState) {
    this.src = "";
    this.onload = null;
    this.onerror = null;
    if (decode) this.decode = decode;
    created.push(this);
  } as unknown as new () => HTMLImageElement;
  return { ctor, created };
};

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe("ImageAssetCache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps synchronous get compatible for drawers", () => {
    const { ctor, created } = makeImageCtorMock();
    const cache = new ImageAssetCache(ctor);

    const entry = cache.get("/avatars/sticker-1.png");

    expect(entry).toEqual({ status: "loading" });
    expect(created).toHaveLength(1);
    expect(created[0]?.src).toBe("/avatars/sticker-1.png");
  });

  it("waits for decode before reporting an image ready", async () => {
    const decodeState = deferred();
    const decode = vi.fn(() => decodeState.promise);
    const { ctor, created } = makeImageCtorMock(decode);
    const cache = new ImageAssetCache(ctor);

    const pending = cache.load("/assets/figma/eyes/eye-01.svg");
    created[0]!.onload?.();
    await Promise.resolve();

    expect(decode).toHaveBeenCalledTimes(1);
    expect(cache.get("/assets/figma/eyes/eye-01.svg")).toEqual({ status: "loading" });

    decodeState.resolve();
    await expect(pending).resolves.toMatchObject({
      url: "/assets/figma/eyes/eye-01.svg",
      status: "ready",
      image: created[0],
    });
    expect(cache.get("/assets/figma/eyes/eye-01.svg")).toMatchObject({
      status: "ready",
      image: created[0],
    });
  });

  it("deduplicates concurrent loads for the same URL", async () => {
    const { ctor, created } = makeImageCtorMock();
    const cache = new ImageAssetCache(ctor);

    const first = cache.load("/assets/figma/eyes/eye-01.svg");
    const second = cache.load("/assets/figma/eyes/eye-01.svg");

    expect(second).toBe(first);
    expect(created).toHaveLength(1);
    created[0]!.onload?.();
    await expect(first).resolves.toMatchObject({ status: "ready" });
  });

  it("aggregates preload results in input order without rejecting", async () => {
    const { ctor, created } = makeImageCtorMock();
    const cache = new ImageAssetCache(ctor);

    const pending = cache.preload(["/a.svg", "/missing.svg", "/a.svg"]);
    expect(created.map((image) => image.src)).toEqual(["/a.svg", "/missing.svg"]);

    created[0]!.onload?.();
    created[1]!.onerror?.();

    await expect(pending).resolves.toMatchObject([
      { url: "/a.svg", status: "ready" },
      { url: "/missing.svg", status: "error" },
      { url: "/a.svg", status: "ready" },
    ]);
  });

  it("emits one diagnostic per failed URL and exposes hasFailure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { ctor, created } = makeImageCtorMock();
    const cache = new ImageAssetCache(ctor);

    const first = cache.load("/missing.svg");
    created[0]!.onerror?.();
    await expect(first).resolves.toMatchObject({
      url: "/missing.svg",
      status: "error",
      error: expect.any(Error),
    });

    await cache.load("/missing.svg");
    cache.get("/missing.svg");

    expect(cache.hasFailure("/missing.svg")).toBe(true);
    expect(cache.hasFailure("/not-requested.svg")).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("/missing.svg"),
      expect.any(Error),
    );
  });

  it("reports decode failures without rejecting", async () => {
    const decodeState = deferred();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { ctor, created } = makeImageCtorMock(() => decodeState.promise);
    const cache = new ImageAssetCache(ctor);

    const pending = cache.load("/invalid.svg");
    created[0]!.onload?.();
    decodeState.reject(new Error("invalid image payload"));

    await expect(pending).resolves.toMatchObject({
      url: "/invalid.svg",
      status: "error",
      error: expect.objectContaining({ message: "invalid image payload" }),
    });
    expect(cache.get("/invalid.svg")).toEqual({ status: "error" });
    expect(cache.hasFailure("/invalid.svg")).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("falls back to load readiness when decode is unavailable", async () => {
    const { ctor, created } = makeImageCtorMock();
    const cache = new ImageAssetCache(ctor);

    const pending = cache.load("/legacy-browser.png");
    created[0]!.onload?.();

    await expect(pending).resolves.toMatchObject({
      url: "/legacy-browser.png",
      status: "ready",
      image: created[0],
    });
  });
});
