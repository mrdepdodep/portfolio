const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withScope = path => `${SCOPE_PATH}${path}`;
const CACHE_VERSION = 'v10';
const CORE_ASSETS = [
  withScope('/'),
  withScope('/about/'),
  withScope('/work/'),
  withScope('/projects/'),
  withScope('/projects/detail/'),
  withScope('/offline.html'),
  withScope('/src/res/about.html'),
  withScope('/src/res/work.html'),
  withScope('/src/css/main.css'),
  withScope('/src/css/about.css'),
  withScope('/src/css/work.css'),
  withScope('/src/css/projects.css'),
  withScope('/src/css/project-detail.css'),
  withScope('/src/js/main.js'),
  withScope('/src/js/work.js'),
  withScope('/src/js/projects.js'),
  withScope('/src/js/project-detail.js'),
  withScope('/src/translations/en.json'),
  withScope('/src/translations/uk.json'),
  withScope('/src/translations/ru.json'),
  withScope('/src/data/projects.json'),
  withScope('/src/images/favicon.ico')
];
const CACHE_NAME = `portfolio-static-${CACHE_VERSION}`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(error => {
      console.error('[SW] Install failed:', error);
      throw error;
    })
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
  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  if (!isSameOrigin) return;

  const isNavigation = event.request.mode === 'navigate';
  const pathname = requestUrl.pathname;
  const isNetworkFirstAsset = /\.(?:css|js|json|html)$/i.test(pathname);

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

          const offlinePage = await cache.match(withScope('/offline.html'));
          if (offlinePage) return offlinePage;

          const fallbackHome = await cache.match(withScope('/'));
          if (fallbackHome) return fallbackHome;

          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        }
      }

      if (isNetworkFirstAsset) {
        try {
          const networkResponse = await fetch(event.request, { cache: 'no-store' });
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (_) {
          const cachedAsset = await cache.match(event.request);
          if (cachedAsset) return cachedAsset;
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
