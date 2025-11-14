const CACHE_NAME = 'food-inventory-cache-v12'; // Versione 5 (include modal conferma)

// Lista delle risorse fondamentali da mettere in cache
const urlsToCache = [
    '/', // Root dell'app
    'index.html',
    'app.js',
    'sw.js',
    'manifest.json',
    'images/icon-192x192.png',
    'images/icon-512x512.png',
    'images/placeholder.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js'
];

// Installazione del Service Worker
self.addEventListener('install', event => {
    console.log('SW: Installazione...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Caching file di base');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                self.skipWaiting(); // Forza l'attivazione immediata
                console.log('SW: Installazione completata, skipWaiting.');
            })
            .catch(error => {
                console.error('SW: Errore durante il caching iniziale:', error);
            })
    );
});

// Attivazione del Service Worker (pulizia vecchie cache)
self.addEventListener('activate', event => {
    console.log('SW: Attivazione...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Pulizia vecchia cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim(); // Prende il controllo della pagina immediatamente
        })
    );
});

// Intercettazione delle richieste (Fetch) - Cache-First
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se la risorsa è in cache, la restituisce
                if (response) {
                    return response;
                }

                // Altrimenti, prova a fetcharla dalla rete
                return fetch(event.request).then(
                    response => {
                        // Se la risposta non è valida o è un tipo di risorsa che non vogliamo
                        // (es. estensioni, richieste non 'basic'), la restituisce senza cache.
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // NOTA: Non mettiamo in cache dinamicamente le risorse CDN
                        // perché sono già state pre-caching all'installazione.
                        return response;
                    }
                );
            })
    );
});

// Gestione del messaggio 'SKIP_WAITING' dall'app.js
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('SW: Ricevuto messaggio SKIP_WAITING.');
        self.skipWaiting();
    }

});




