// Self-unregistering Service Worker to purge stale PWA caches (e.g., Cyber Clash)
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => caches.delete(key)));
        }).then(() => {
            return self.registration.unregister();
        }).then(() => {
            return self.clients.claim();
        }).then(() => {
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    if (client.url && 'navigate' in client) {
                        client.navigate(client.url);
                    }
                });
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Network first / pass-through to ensure fresh game code
    event.respondWith(fetch(event.request));
});
