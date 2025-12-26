/* Improved SW: Runtime caching for images; Optimized precache */
const CACHE_NAME = "tarot-offline-v3-optimized";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./offline.html",
  "./service-worker.js",
  "./theme.css",
  "./theme_force.css",
  "./assets/js/tarot-data.js", // Data file
  "./assets/js/app.js",         // Logic file
  "./assets/icons/icon-192x192.png",
  "./assets/icons/icon-512x512.png",
  "./manifest.webmanifest"
];

// External assets (Tailwind CDN, Fonts)
const EXTERNAL_PRECACHE = [
  "https://cdn.tailwindcss.com"
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 只預先下載核心檔案，不下載所有圖片
    await cache.addAll(PRECACHE_URLS.concat(EXTERNAL_PRECACHE));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // 清理舊版本的 cache
    await Promise.all(keys.map(key => {
      if (key !== CACHE_NAME && key !== 'tarot-cards-cache' && key !== 'externals-cache') {
        return caches.delete(key);
      }
    }));
  })());
  self.clients.claim();
});

// Helper: Runtime cache for external assets
async function externalCacheHandler(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaque')) {
      cache.put(request, res.clone());
    } 
    return res;
  } catch (e) {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. 針對塔羅牌圖片的特殊策略 (Cache First, Runtime Caching)
  // 只有當使用者抽到那張牌時，才會下載並存入 cache
  if (url.pathname.includes('/assets/cards/')) {
    event.respondWith((async () => {
      const cache = await caches.open('tarot-cards-cache');
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const networkRes = await fetch(req);
        if (networkRes.ok) cache.put(req, networkRes.clone());
        return networkRes;
      } catch (e) {
        // 離線且沒圖片時，可以回傳一個預設圖 (如果有)
        return caches.match('./assets/cards/00.jpg'); 
      }
    })());
    return;
  }

  // 2. Handle External CDNs (Tailwind, Fonts)
  if (url.origin === "https://cdn.tailwindcss.com" || url.host.includes("fonts.googleapis") || url.host.includes("fonts.gstatic")) {
    event.respondWith(externalCacheHandler(req, 'externals-cache'));
    return;
  }

  // 3. Default: Cache First for App Shell, Network First for others
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      return res;
    } catch (e) {
      if (req.mode === 'navigate') {
        return await caches.match('./offline.html') || await caches.match('./index.html');
      }
      return new Response('Offline', { status: 503 });
    }
  })());
});
