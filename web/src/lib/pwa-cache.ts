const STATIC_ASSET_EXTENSION_PATTERN = /\.(css|js|woff2?|png|jpe?g|gif|svg|webp|ico)$/i;

export function isServiceWorkerCacheablePath(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) {
    return false;
  }

  return STATIC_ASSET_EXTENSION_PATTERN.test(pathname);
}
