const CACHE_NAME = 'recipe-book-v10';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.main.css',
    './app.js',
    './translations.js',
    './app_icon_192.png',
    './app_icon_512.png',
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Lora:ital,wght@0,400;0,500;1,400&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Pass non-GET requests and Supabase requests through normally
    if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
        return;
    }

    // Network-First Strategy for HTML, CSS, JS, and Navigation
    // This ensures the PWA ALWAYS gets the latest version if online, bypassing stubborn iOS caches
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Return network response if valid, and update the cache in the background
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // If offline or network fails, fallback to the cache
                return caches.match(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Take control of all pages immediately
    const cacheAllowlist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheAllowlist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
