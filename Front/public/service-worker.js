const CACHE = 'navalhado-v3';

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

self.addEventListener('push', e => {
  if (!e.data) return;
  const mensagem = e.data.json();
  e.waitUntil(self.registration.showNotification(mensagem.title, {
    body: mensagem.body,
    icon: '/Logo.webp',
    badge: '/Logo.webp',
    data: { url: mensagem.url || '/' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(janelas => {
    const existente = janelas.find(janela => janela.url === destino);
    if (existente) return existente.focus();
    return clients.openWindow(destino);
  }));
});
