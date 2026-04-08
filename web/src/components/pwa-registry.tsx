'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistry() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    if (
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((error: unknown) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
