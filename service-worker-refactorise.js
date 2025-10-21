/* ============================================================
   🧩 SERVICE WORKER — Mode hors ligne intelligent (v2.0)
   ------------------------------------------------------------
   - Mise en cache statique + dynamique
   - Gestion offline automatique
   - Notification de mise à jour
   ============================================================ */

   const CACHE_NAME = 'pwa-tube-cache-v2';
   const STATIC_ASSETS = [
     './',
     './index.html',
     './style_cleaned.css',
     './app_refactorise_v2_3.js',
     './Liste-analyse-correspondance.json',
     './manifest.json',
     './offline.html',
   ];
   
   // 🧱 Installation du SW → mise en cache initiale
   self.addEventListener('install', (event) => {
     console.log('📦 [SW] Installation...');
     event.waitUntil(
       caches.open(CACHE_NAME).then((cache) => {
         return cache.addAll(STATIC_ASSETS);
       })
     );
     self.skipWaiting();
   });
   
   // 🔁 Activation → nettoyage des anciens caches
   self.addEventListener('activate', (event) => {
     console.log('🧹 [SW] Activation et nettoyage...');
     event.waitUntil(
       caches.keys().then((keys) =>
         Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
       )
     );
     self.clients.claim();
   });
   
   // 🌐 Fetch intelligent
   self.addEventListener('fetch', (event) => {
     event.respondWith(
       caches.match(event.request).then((cachedResponse) => {
         if (cachedResponse) return cachedResponse; // trouvé dans le cache
         return fetch(event.request)
           .then((networkResponse) => {
             // Mettre à jour le cache dynamique
             return caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, networkResponse.clone());
               return networkResponse;
             });
           })
           .catch(() => {
             // En cas d’échec réseau, afficher la page offline si dispo
             if (event.request.mode === 'navigate') {
               return caches.match('./offline.html');
             }
           });
       })
     );
   });
   