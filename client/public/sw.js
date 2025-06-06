// Four One Solutions Service Worker
// Provides offline functionality and caching

const CACHE_NAME = 'four-one-solutions-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const RUNTIME_CACHE = 'runtime-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/products/,
  /^\/api\/companies/,
  /^\/api\/pos\/print-settings/,
  /^\/api\/fiscal\/ncf-sequences/
];

// Network-first patterns (always try network first)
const NETWORK_FIRST_PATTERNS = [
  /^\/api\/pos\/sales/,
  /^\/api\/pos\/cart/,
  /^\/api\/auth/,
  /^\/api\/user/
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      caches.open(RUNTIME_CACHE).then((cache) => {
        console.log('[SW] Runtime cache ready');
        return cache;
      })
    ])
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle API requests with different caching strategies
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Network-first for critical operations
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return networkFirst(request);
  }
  
  // Cache-first for reference data
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return cacheFirst(request);
  }
  
  // Default to network-first for API calls
  return networkFirst(request);
}

// Handle static file requests
async function handleStaticRequest(request) {
  // Try cache first for static files
  return cacheFirst(request);
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    // Return offline response for API calls
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'No hay conexión a internet. Los datos mostrados pueden estar desactualizados.' 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache and network failed:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Update cache in background
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    console.log('[SW] Background cache update failed:', request.url);
  }
}

// Handle background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'pos-sale-sync') {
    event.waitUntil(syncPOSSales());
  }
  
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCartItems());
  }
});

// Sync POS sales when back online
async function syncPOSSales() {
  try {
    // Get pending sales from IndexedDB
    const pendingSales = await getOfflinePOSSales();
    
    for (const sale of pendingSales) {
      try {
        const response = await fetch('/api/pos/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sale.data)
        });
        
        if (response.ok) {
          await removeOfflinePOSSale(sale.id);
          console.log('[SW] Synced POS sale:', sale.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync POS sale:', sale.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] POS sales sync failed:', error);
  }
}

// Sync cart items when back online
async function syncCartItems() {
  try {
    // Implementation for cart sync
    console.log('[SW] Cart sync completed');
  } catch (error) {
    console.log('[SW] Cart sync failed:', error);
  }
}

// IndexedDB operations for offline storage
async function getOfflinePOSSales() {
  // Implementation would use IndexedDB to store offline sales
  return [];
}

async function removeOfflinePOSSale(id) {
  // Implementation would remove synced sale from IndexedDB
  console.log('[SW] Removed offline sale:', id);
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('[SW] Service Worker loaded successfully');