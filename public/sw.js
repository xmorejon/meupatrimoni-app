const CACHE_NAME = "meu-patrimoni-cache-v4"; // Increment cache version to force update
const urlsToCache = ["/", "/manifest.json"];

// Chunk files should never be cached since they are content-hashed
const CHUNK_FILE_PATTERNS = [/_next\/static\/chunks\//, /\.js$/];

const isChunkFile = (url) => {
  return CHUNK_FILE_PATTERNS.some((pattern) => pattern.test(url));
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  // Use a "Network First, falling back to Cache" strategy for navigation requests.
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Try to fetch from the network first.
          const networkResponse = await fetch(event.request);

          // If successful, clone the response and update the cache.
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());

          return networkResponse;
        } catch (error) {
          // If the network fails (e.g., offline), serve from the cache.
          console.log("Network request failed, serving from cache.");
          return caches.match(event.request);
        }
      })(),
    );
    return;
  }

  // For other requests (like images, manifest), use a "Cache First" strategy.
  // This is good for static assets that don't change often.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    }),
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
