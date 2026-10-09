/* Service Worker — Contrôle Atelier Narbonne Accessoires */
const CACHE = 'controle-atelier-v41';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // les envois POST vers Apps Script passent direct au réseau

  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate'
    || req.destination === 'document'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('index.html');

  if (isHTML) {
    // NETWORK-FIRST : on prend toujours la dernière version en ligne,
    // le cache ne sert que de secours hors connexion.
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => { try { c.put(req, copy); } catch (_) {} });
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // AUTRES RESSOURCES : cache d'abord, mise à jour en arrière-plan.
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => { try { c.put(req, copy); } catch (_) {} });
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
