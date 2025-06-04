// Service Worker para Four One Solutions
// Manejo de caché y funcionalidad offline

const CACHE_NAME = 'four-one-v1';
const STATIC_CACHE_NAME = 'four-one-static-v1';
const API_CACHE_NAME = 'four-one-api-v1';

// Recursos estáticos para cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Rutas de API que se pueden cachear
const CACHEABLE_API_ROUTES = [
  '/api/user',
  '/api/companies/current',
  '/api/products',
  '/api/customers',
  '/api/dashboard/metrics'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cachear recursos estáticos
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/'));
      }),
      // Forzar activación inmediata
      self.skipWaiting()
    ])
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar cachés antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control inmediato
      self.clients.claim()
    ])
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar peticiones del mismo origen
  if (url.origin !== location.origin) {
    return;
  }

  // Estrategia para API calls
  if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Estrategia para navegación (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
});

// Verificar si es una petición de API
function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Manejar peticiones de API - Network First con fallback a caché
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Intentar obtener de la red primero
    const response = await fetch(request);
    
    if (response.ok) {
      // Solo cachear peticiones GET exitosas
      if (request.method === 'GET' && isCacheableApiRoute(request)) {
        cache.put(request, response.clone());
      }
      return response;
    }
    
    // Si la respuesta no es exitosa, intentar caché
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    return response;
    
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Si hay error de red, usar caché para GET
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        // Agregar header para indicar que viene de caché
        const headers = new Headers(cachedResponse.headers);
        headers.set('X-Cache-Status', 'offline');
        
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers
        });
      }
    }
    
    // Para métodos que modifican datos, devolver error específico
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      return new Response(
        JSON.stringify({
          error: 'No hay conexión disponible',
          message: 'Esta operación se ejecutará cuando se restaure la conexión',
          offline: true
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

// Verificar si la ruta de API es cacheable
function isCacheableApiRoute(request) {
  const url = new URL(request.url);
  return CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route));
}

// Manejar navegación - App Shell
async function handleNavigation(request) {
  try {
    // Intentar obtener de la red
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Si falla la red, devolver app shell desde caché
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match('/index.html');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback final
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Four One Solutions - Offline</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: #f5f5f5;
          }
          .offline-message {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="offline-message">
          <h1>Four One Solutions</h1>
          <p>Sin conexión a internet</p>
          <p>Por favor verifica tu conexión y recarga la página.</p>
          <button onclick="window.location.reload()">Reintentar</button>
        </div>
      </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

console.log('Service Worker loaded for Four One Solutions');