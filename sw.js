const STATIC_CACHE = 'adaa-clean-static-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './src/styles.css', './src/pwa.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== STATIC_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin || request.url.includes('/api/')) return;
  event.respondWith(fetch(request).then(response => {
    const copy = response.clone();
    caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
    return response;
  }).catch(() => caches.match(request).then(cached => cached || caches.match('./index.html'))));
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch {}
  const title = payload.title || 'تقييم يحتاج إلى مراجعة';
  const options = {
    body: payload.body || 'تم تسجيل تقييم أقل من 70٪. افتح التطبيق لمراجعة الإنذار.',
    icon: new URL('icons/app-192.png', self.registration.scope).href,
    badge: new URL('icons/app-192.png', self.registration.scope).href,
    tag: payload.tag || 'adaa-low-evaluation',
    renotify: false,
    data: { url: self.registration.scope }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = self.registration.scope;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope)) {
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
