const CACHE_NAME = 'sarah-break-heart-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/constants.ts',
  '/sounds.ts',
  '/utils/soundManager.ts',
  '/components/GameBoard.tsx',
  '/components/GameInfo.tsx',
  '/components/GameOverModal.tsx',
  '/components/LevelSelectionScreen.tsx',
  '/components/PauseMenu.tsx',
  '/components/FloatingScores.tsx',
  '/components/SpecialEffects.tsx',
  '/components/ComboDisplay.tsx',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^18.2.0',
  'https://aistudiocdn.com/react-dom@^18.2.0/client',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            // Ne mettez en cache que les réponses valides
            if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // Si la récupération réseau échoue, vous pouvez renvoyer une page de secours hors ligne ici si vous en avez une.
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});