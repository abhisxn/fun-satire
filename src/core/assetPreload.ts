/**
 * Preloads an array of image URLs into the browser cache.
 * Returns a Promise that resolves when all images have completed loading
 * or errored (non-blocking).
 */
export function preloadImages(urls: readonly (string | undefined | null)[]): Promise<void> {
  const validUrls = urls.filter((url): url is string => typeof url === "string" && url.length > 0);
  if (validUrls.length === 0) return Promise.resolve();

  const promises = validUrls.map((url) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      const onComplete = () => {
        img.onload = null;
        img.onerror = null;
        resolve();
      };
      img.onload = onComplete;
      img.onerror = onComplete;
      img.src = url;
    });
  });

  return Promise.all(promises).then(() => undefined);
}
