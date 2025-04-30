const CACHE_VERSION = 'bingo-cache-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js',
        './manifest.json',
        './icon-192.png',
        './icon-512.png'
      ]);
    }).then(() => {
      return self.skipWaiting(); // Activate new service worker immediately
    })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old cache versions
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control of all clients
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Network-first strategy for CSS and JS files
    /\.(css|js)$/.test(event.request.url) 
      ? fetchWithFallback(event.request)
      : cacheWithFallback(event.request)
  );
});

// Network-first strategy
function fetchWithFallback(request) {
  return fetch(request)
    .then(response => {
      // Clone the response before using it
      const responseToCache = response.clone();
      
      caches.open(CACHE_VERSION).then(cache => {
        cache.put(request, responseToCache);
      });
      
      return response;
    })
    .catch(() => {
      return caches.match(request);
    });
}

// Cache-first strategy
function cacheWithFallback(request) {
  return caches.match(request)
    .then(cachedResponse => {
      return cachedResponse || fetch(request)
        .then(response => {
          // Clone the response before using it
          const responseToCache = response.clone();
          
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(request, responseToCache);
          });
          
          return response;
        });
    });
}
