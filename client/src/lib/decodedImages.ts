/** Small decoded-image LRU: keep the current photograph and its neighbours ready to paint. */
const decoded = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<void>>();
const LIMIT = 4;
const PIXEL_BUDGET = 48_000_000;
export function decodedImage(url: string) { return decoded.get(url); }
export function warmImage(url: string): Promise<void> {
  if (!url) return Promise.resolve();
  const cached = decoded.get(url);
  if (cached) { decoded.delete(url); decoded.set(url,cached); return Promise.resolve(); }
  if (pending.has(url)) return pending.get(url)!;
  const image = new Image(); image.decoding = 'async'; image.fetchPriority = 'low';
  const job = (async () => {
    try {
      image.src = url;
      await image.decode();
      decoded.set(url,image);
      let pixels = [...decoded.values()].reduce((sum,img) => sum + img.naturalWidth * img.naturalHeight, 0);
      while (decoded.size > LIMIT || (pixels > PIXEL_BUDGET && decoded.size > 1)) {
        const oldest = decoded.keys().next().value!;
        const img = decoded.get(oldest)!; pixels -= img.naturalWidth * img.naturalHeight;
        decoded.delete(oldest);
      }
    } catch {} finally { pending.delete(url); }
  })();
  pending.set(url,job); return job;
}
