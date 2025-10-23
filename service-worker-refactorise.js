/* ============================================================
   🧩 SERVICE WORKER — Mode hors ligne intelligent (v2.8)
   ------------------------------------------------------------
   - Stratégie "stale-while-revalidate"
   - Nettoyage automatique des anciens caches
   - Mise à jour silencieuse en mode PWA installée
   - Toast visible en mode navigateur (via app_refactorise)
   ============================================================ */

   const CACHE_VERSION = 'v2.9.3';
   const CACHE_NAME = `pwa-tube-cache-${CACHE_VERSION}`;
   
   /* 🗂️ Liste des fichiers à mettre en cache au premier chargement */
   const STATIC_ASSETS = [
     './',
     './index.html',
     './style_cleaned_v2_6_8.css',
     './app_refactorise_v3_0.js',
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
   🔔 COMMUNICATION & MESSAGERIE SERVICE WORKER
   ------------------------------------------------------------
   - Gère SKIP_WAITING, CLEAR_CACHES et GET_VERSION
   - Envoie la version actuelle à toutes les pages contrôlées
   ============================================================ */
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // ⚡ Passage immédiat à la nouvelle version
  if (event.data.type === 'SKIP_WAITING') {
    console.log('⚡ [SW] Skip waiting activé — passage à la nouvelle version');
    self.skipWaiting();
  }

  // 🧹 Vider tous les caches
  if (event.data.type === 'CLEAR_CACHES') {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
    event.source?.postMessage({ type: 'CACHE_CLEARED' });
  }

  // 🧠 Répondre à la demande de version SW
  if (event.data.type === 'GET_VERSION') {
    console.log(`📢 [SW] Envoi version SW : ${CACHE_VERSION}`);
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'VERSION',
          version: CACHE_VERSION
        });
      });
    });
  }
});
