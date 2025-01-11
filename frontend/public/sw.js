const CACHE_NAME = 'game-images-cache-v1';
const IMAGE_URL_PATTERN = /\/storage\/v1\/.*\.(png|jpg|jpeg|gif|svg)$/;

// Install event - cache images during installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - intercept image requests and serve from cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.destination === 'image' && IMAGE_URL_PATTERN.test(request.url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          // Optionally return a fallback image
          return caches.match('/fallback-image.png');
        });
      })
    );
  }
});