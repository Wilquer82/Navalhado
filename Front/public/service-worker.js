const CACHE = 'navalhado-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
  e.waitUntil(caches.keys().then(chaves => Promise.all(
    chaves.filter(chave => chave !== CACHE).map(chave => caches.delete(chave))
  )));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.pathname.includes('/api/')) {
    return;
  }
  if (url.pathname.includes('/api/')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
