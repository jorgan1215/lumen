/* LUMEN 图片缓存 Service Worker
 * 代理图 / 原图都是一次加载后不再变化的地址，适合 cache-first。
 * 只处理图片请求，不碰 API、JS、CSS，避免缓存到旧版本代码。
 */
const CACHE = 'lumen-images-v1';
const MAX_ENTRIES = 500;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('lumen-images-') && key !== CACHE)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const looksLikeImage = /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(url.pathname + url.search);
  if (request.destination !== 'image' && !looksLikeImage) return;

  event.respondWith(cacheFirst(request, event));
});

async function cacheFirst(request, event) {
  const cache = await caches.open(CACHE);

  const hit = await cache.match(request);
  if (hit && !(request.mode === 'cors' && hit.type === 'opaque')) return hit;

  try {
    const response = await fetch(request);
    // opaque 响应（跨域图片）也能缓存，并可以原样交给 <img>
    if (response && (response.ok || response.type === 'opaque')) {
      event.waitUntil(cache.put(request, response.clone()).then(() => scheduleTrim(cache)).catch(() => {}));
    }
    return response;
  } catch (err) {
    return hit && !(request.mode === 'cors' && hit.type === 'opaque') ? hit : Response.error();
  }
}

let trimming = null;
function scheduleTrim(cache) {
  if (!trimming) trimming = trim(cache).finally(() => { trimming = null; });
  return trimming;
}

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ENTRIES) return;
  const overflow = keys.length - MAX_ENTRIES;
  for (let i = 0; i < overflow; i += 1) {
    await cache.delete(keys[i]);
  }
}
