const CACHE_NAME = 'emotionwave-v2'
const STATIC_CACHE_NAME = 'emotionwave-static-v2'

// Get base path from service worker scope
const getBasePath = () => {
  const scope = self.registration?.scope || self.location.pathname.replace(/sw\.js$/, '')
  return scope.endsWith('/') ? scope.slice(0, -1) : scope
}

const basePath = getBasePath()

// Static assets to cache on install
const staticUrlsToCache = [
  `${basePath}/`,
  `${basePath}/favicon.ico`,
  `${basePath}/manifest.json`,
  `${basePath}/apple-touch-icon.png`
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets:', staticUrlsToCache)
        return cache.addAll(staticUrlsToCache)
      })
      .catch((error) => {
        console.warn('Cache addAll failed:', error)
        // Continue even if caching fails
      })
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Fetch event - cache strategy: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }
  
  // Cache strategy for different asset types
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // For _nuxt assets (JS/CSS), prefer cache for offline support
        if (url.pathname.includes('/_nuxt/')) {
          return cachedResponse || fetch(event.request).then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone)
              })
            }
            return response
          })
        }
        
        // For other requests, network first
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response.ok && (event.request.destination === 'script' || 
                               event.request.destination === 'style' ||
                               event.request.destination === 'image')) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone)
              })
            }
            return response
          })
          .catch(() => {
            // Fallback to cache if network fails
            if (cachedResponse) {
              return cachedResponse
            }
            // Fallback to index for navigation requests
            if (event.request.destination === 'document') {
              return caches.match(`${basePath}/`)
            }
            return new Response('', { status: 404 })
          })
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Take control of all pages immediately
  return self.clients.claim()
}) 