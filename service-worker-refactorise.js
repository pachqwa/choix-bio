/* ============================================================
   🧩 SERVICE WORKER — Mode hors ligne intelligent (v2.6)
   ------------------------------------------------------------
   - Mise à jour automatique des fichiers (CSS/JS/HTML)
   - Stratégie "stale-while-revalidate"
   - Fallback offline + nettoyage cache
   ============================================================ */

   const CACHE_VERSION = 'v2.6';
   const CACHE_NAME = `pwa-tube-cache-${CACHE_VERSION}`;
   
   const STATIC_ASSETS = [
     './',
     './index.html',
     './style_cleaned.css',
     './app_refactorise_v2_3.js',
     './Liste-analyse-correspondance.json',
     './manifest.json',
     './offline.html',
   ];
   
   /* 📦 INSTALLATION */
   self.addEventListener('install', (event) => {
     console.log(`📦 [SW ${CACHE_VERSION}] Installation...`);
     event.waitUntil(
       caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
     );
     self.skipWaiting();
   });
   
   /* 🧹 ACTIVATION — Nettoyage anciens caches */
   self.addEventListener('activate', (event) => {
     console.log(`🧹 [SW ${CACHE_VERSION}] Activation & nettoyage...`);
     event.waitUntil(
       caches.keys().then((keys) =>
         Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
       )
     );
     self.clients.claim();
   });
   
   /* 🌐 FETCH — Stratégie stale-while-revalidate */
   self.addEventListener('fetch', (event) => {
     // On ne gère que les requêtes HTTP/HTTPS
     if (!event.request.url.startsWith('http')) return;
   
     event.respondWith(
       caches.open(CACHE_NAME).then(async (cache) => {
         const cached = await cache.match(event.request);
         const networkFetch = fetch(event.request)
           .then((networkResponse) => {
             if (networkResponse && networkResponse.status === 200) {
               cache.put(event.request, networkResponse.clone());
               console.log(`🔄 [SW] Mise à jour du cache : ${event.request.url}`);
             }
             return networkResponse;
           })
           .catch(() => {
             if (cached) return cached;
             if (event.request.mode === 'navigate') {
               return cache.match('./offline.html');
             }
           });
   
         // Sert d’abord le cache si dispo, sinon le réseau
         return cached || networkFetch;
       })
     );
     /* ============================================================
   🔔 NOTIFICATION VISUELLE — Nouvelle version disponible
   ============================================================ */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

   });
   