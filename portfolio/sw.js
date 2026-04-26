const CACHE_NAME = 'portfolio-static-v3';
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withScope = path => `${SCOPE_PATH}${path}`;
const ASSETS = [
  withScope('/'),
  withScope('/about/'),
  withScope('/work/'),
  withScope('/src/css/main.css'),
  withScope('/src/css/about.css'),
  withScope('/src/css/work.css'),
  withScope('/src/js/main.js'),
  withScope('/src/js/about.js'),
  withScope('/src/js/work.js'),
  withScope('/src/images/dodep-coder.png')
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (isNavigation) {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (_) {
          const cachedPage = await cache.match(event.request);
          if (cachedPage) return cachedPage;

          const fallbackHome = await cache.match(withScope('/'));
          if (fallbackHome) return fallbackHome;

          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        }
      }

      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (_) {
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      }
    })()
  );
});
