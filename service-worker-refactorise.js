/* ============================================================
   🧩 SERVICE WORKER — Mode hors ligne intelligent (v2.7)
   ------------------------------------------------------------
   - Stratégie "stale-while-revalidate"
   - Nettoyage automatique des anciens caches
   - Mise à jour silencieuse en mode PWA installée
   - Toast visible en mode navigateur (via app_refactorise)
   ============================================================ */

   const CACHE_VERSION = 'v2.8';
   const CACHE_NAME = `pwa-tube-cache-${CACHE_VERSION}`;
   
   /* 🗂️ Liste des fichiers à mettre en cache au premier chargement */
   const STATIC_ASSETS = [
     './',
     './index.html',
     './style_cleaned.css',
     './app_refactorise_v2_3.js',
     './Liste-analyse-correspondance.json',
     './manifest.json',
     './offline.html',
   ];
   
   /* ============================================================
      📦 INSTALLATION — Pré-cache des fichiers de base
      ============================================================ */
   self.addEventListener('install', (event) => {
     console.log(`📦 [SW ${CACHE_VERSION}] Installation…`);
     event.waitUntil(
       caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
     );
     self.skipWaiting();
   });
   
   /* ============================================================
      🧹 ACTIVATION — Suppression des anciens caches
      ============================================================ */
   self.addEventListener('activate', (event) => {
     console.log(`🧹 [SW ${CACHE_VERSION}] Activation & nettoyage…`);
     event.waitUntil(
       caches.keys().then((keys) =>
         Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
       )
     );
     self.clients.claim();
   });
   
   /* ============================================================
      🌐 FETCH — Stratégie “Stale-While-Revalidate”
      ============================================================ */
   self.addEventListener('fetch', (event) => {
     if (!event.request.url.startsWith('http')) return;
   
     event.respondWith(
       caches.open(CACHE_NAME).then(async (cache) => {
         const cachedResponse = await cache.match(event.request);
         const fetchPromise = fetch(event.request)
           .then((networkResponse) => {
             if (networkResponse && networkResponse.status === 200) {
               cache.put(event.request, networkResponse.clone());
               console.log(`🔄 [SW] Cache mis à jour : ${event.request.url}`);
             }
             return networkResponse;
           })
           .catch(() => {
             if (cachedResponse) return cachedResponse;
             if (event.request.mode === 'navigate') {
               return cache.match('./offline.html');
             }
           });
   
         return cachedResponse || fetchPromise;
       })
     );
   });
   
   /* ============================================================
      🔔 MESSAGE — Activation immédiate du nouveau SW
      ============================================================ */
   self.addEventListener('message', (event) => {
     if (event.data && event.data.type === 'SKIP_WAITING') {
       console.log('⚡ [SW] Skip waiting activé — passage à la nouvelle version');
       self.skipWaiting();
     }
   });
   