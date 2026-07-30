const CACHE_NAME = 'aqua-billing-v28';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './index_v5.js',
  './invoice_utils_v5.js',
  './manifest.json',
  './lord_ganesha.jpg',
  './lord_venkateswara.jpg',
  './lord_hanuman.jpg',
  './rallis_logo.png'
];

// Install Event - Precache App Shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache First Strategy for instant loading
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      return caches.match('./index.html', { ignoreSearch: true });
    })
  );
});
