// Build version for the caching rules. Bump CACHE_VERSION whenever the rules or
// the precache set change: activation deletes every older `j2-adventures-*`
// cache, so a deploy that changes this file starts from a clean slate.
const CACHE_VERSION = "v4";
const CACHE_NAME = `j2-adventures-cache-${CACHE_VERSION}`;
const STATIC_ASSET_EXTENSION_PATTERN =
  /\.(css|js|woff2?|png|jpe?g|gif|svg|webp|ico)$/i;

// Never touch these at all (API, admin, auth, and authenticated account pages).
const NEVER_CACHE_PATH_PREFIXES = [
  "/api/",
  "/admin",
  "/auth",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/account",
  "/bookmarks",
];

// HTML that changes on every publish is not worth an offline copy; a stale
// article is worse than the offline fallback.
const UNCACHED_HTML_PATH_PREFIXES = ["/posts/"];

// Assets to cache immediately on install (only stored when the response is
// actually cacheable — the current HTML shell is served `no-store`).
const PRECACHE_ASSETS = ["/"];

function isStaticAssetPath(pathname) {
  return STATIC_ASSET_EXTENSION_PATTERN.test(pathname);
}

function isServiceWorkerCacheablePath(pathname) {
  if (pathname.startsWith("/_next/")) {
    return false;
  }

  return isStaticAssetPath(pathname);
}

function isNeverCacheablePath(pathname) {
  return NEVER_CACHE_PATH_PREFIXES.some((prefix) =>
    prefix.endsWith("/")
      ? pathname === prefix || pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isUncachedHtmlPath(pathname) {
  return UNCACHED_HTML_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Cache API will happily store private responses; refuse them explicitly.
function isCacheableResponse(response) {
  if (!response || !response.ok || response.type === "opaque") {
    return false;
  }

  const cacheControl = response.headers.get("cache-control") || "";
  if (/\bno-store\b/i.test(cacheControl) || /\bprivate\b/i.test(cacheControl)) {
    return false;
  }

  return true;
}

async function precache() {
  try {
    const cache = await caches.open(CACHE_NAME);

    await Promise.all(
      PRECACHE_ASSETS.map(async (asset) => {
        const pathname = new URL(asset, self.location.origin).pathname;
        if (isNeverCacheablePath(pathname) || isUncachedHtmlPath(pathname)) {
          return;
        }

        const response = await fetch(asset, { cache: "reload" });
        if (isCacheableResponse(response)) {
          await cache.put(asset, response);
        }
      }),
    );
  } catch (err) {
    // Ignore precache errors so it doesn't fail install
    console.warn("Precache failed:", err);
  }
}

async function handleNavigation(request, pathname) {
  try {
    const response = await fetch(request);

    if (
      !isNeverCacheablePath(pathname) &&
      !isUncachedHtmlPath(pathname) &&
      isCacheableResponse(response)
    ) {
      // Clone before returning, and never let a cache failure break navigation.
      const responseToCache = response.clone();
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.put(request, responseToCache))
        .catch(() => {});
    }

    return response;
  } catch {
    // If network fails, try to return from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If not in cache, fallback to generic root or offline page if cached
    const fallback = await caches.match("/");
    if (fallback) return fallback;

    return new Response(
      "<html><body><h1>Offline</h1><p>You are offline and this page is not cached.</p></body></html>",
      { headers: { "Content-Type": "text/html" } },
    );
  }
}

async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Stale-while-revalidate: return cache immediately, update cache in background
    fetch(request)
      .then((networkResponse) => {
        if (isCacheableResponse(networkResponse)) {
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, networkResponse))
            .catch(() => {});
        }
      })
      .catch(() => {}); // Ignore background fetch errors

    return cachedResponse;
  }

  // Not in cache, fetch from network and cache it
  try {
    const networkResponse = await fetch(request);

    if (isCacheableResponse(networkResponse)) {
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.put(request, networkResponse.clone()))
        .catch(() => {});
    }

    return networkResponse;
  } catch {
    // Fallback for images if needed
    return new Response("");
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  // Clean up old caches
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith("j2-adventures-") && name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Cache API only supports http/https — skip chrome-extension://, data:, etc.
  if (!url.protocol.startsWith("http")) return;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Don't intercept cross-origin requests — avoids CSP connect-src issues
  // (Cloudinary and other CDNs already have their own edge caching)
  if (url.origin !== self.location.origin) return;

  // Don't cache API routes, admin routes, auth routes, or account/bookmark pages
  if (isNeverCacheablePath(url.pathname)) {
    return;
  }

  // HTML navigation requests (pages)
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url.pathname));
    return;
  }

  // Static assets (CSS, JS, Fonts, Images)
  if (isServiceWorkerCacheablePath(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
  }
});

if (typeof module !== "undefined") {
  module.exports = {
    isCacheableResponse,
    isNeverCacheablePath,
    isServiceWorkerCacheablePath,
    isUncachedHtmlPath,
  };
}
