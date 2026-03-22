const CACHE_NAME = 'j2-adventures-cache-v2';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Ignore precache errors so it doesn't fail install
        console.warn('Precache failed:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('j2-adventures-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Cache API only supports http/https — skip chrome-extension://, data:, etc.
  if (!url.protocol.startsWith('http')) return;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Don't intercept cross-origin requests — avoids CSP connect-src issues
  // (Cloudinary and other CDNs already have their own edge caching)
  if (url.origin !== self.location.origin) return;

  // Don't cache API routes, admin routes, or auth routes
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/auth')
  ) {
    return;
  }

  // HTML navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response and save it to cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(async () => {
          // If network fails, try to return from cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache, fallback to generic root or offline page if cached
          const fallback = await caches.match('/');
          if (fallback) return fallback;
          
          return new Response(
            '<html><body><h1>Offline</h1><p>You are offline and this page is not cached.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Static assets (CSS, JS, Fonts, Images)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(css|js|woff2?|png|jpe?g|gif|svg|webp|ico)$/i);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-while-revalidate: return cache immediately, update cache in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          }).catch(() => {}); // Ignore background fetch errors
          
          return cachedResponse;
        }

        // Not in cache, fetch from network and cache it
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse; // Don't cache opaque or error responses
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Fallback for images if needed
          return new Response('');
        });
      })
    );
  }
});
