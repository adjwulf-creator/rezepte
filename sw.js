const CACHE_NAME = 'recipe-book-v65';
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

// Specialized Cache for Images to isolate them from HTML/JS updates
const IMAGE_CACHE_NAME = 'recipe-images-cache-v1';

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. SUPABASE IMAGES (CACHE-FIRST)
    // If it's a request to our Supabase storage bucket, we want to NEVER talk to the internet if we already have it.
    if (event.request.method === 'GET' && url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/recipe-images')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // Return the lightning-fast cached version immediately if it exists
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // If it doesn't exist, fetch it ONCE from the internet, and save it forever
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(IMAGE_CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(err => {
                    console.error("Image Fetch Failed (offline?):", err);
                    throw err;
                });
            })
        );
        return;
    }

    // 2. SUPABASE DB CALLS (API) - DO NOT CACHE
    if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/')) {
        // Let normal browser logic handle API requests
        return;
    }

    // 3. ONLY MANAGE OUR OWN APP ASSETS WITH NETWORK-FIRST
    if (event.request.method !== 'GET') {
        return;
    }

    // Network-First Strategy for HTML, CSS, JS, and Navigation
    // This ensures the PWA ALWAYS gets the latest App Shell version if online, bypassing stubborn iOS caches
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
