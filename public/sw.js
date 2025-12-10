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

// Install event - cache static assets and precache _nuxt assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME)
        .then((cache) => {
          console.log('Caching static assets:', staticUrlsToCache)
          return cache.addAll(staticUrlsToCache).catch((error) => {
            console.warn('Static cache addAll failed:', error)
          })
        }),
      // Precache _nuxt assets by fetching them
      caches.open(CACHE_NAME)
        .then(async (cache) => {
          try {
            // Fetch the main HTML to discover _nuxt assets
            const response = await fetch(`${basePath}/`)
            if (response.ok) {
              const html = await response.text()
              // Extract _nuxt asset URLs from HTML (simplified approach)
              const nuxtAssetRegex = /(_nuxt\/[^"'\s]+\.(js|css))/g
              const matches = [...new Set(html.match(nuxtAssetRegex) || [])]
              
              // Cache discovered _nuxt assets
              const nuxtUrls = matches.map(path => `${basePath}/${path}`)
              if (nuxtUrls.length > 0) {
                console.log('Precaching _nuxt assets:', nuxtUrls.length)
                await Promise.all(
                  nuxtUrls.map(url => 
                    fetch(url)
                      .then(res => res.ok ? cache.put(url, res.clone()) : null)
                      .catch(() => null)
                  )
                )
              }
            }
          } catch (error) {
            console.warn('Precache _nuxt assets failed:', error)
          }
        })
    ])
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
  
  // Cache strategy: stale-while-revalidate for static assets, network-first for API
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request)
      
      // For _nuxt assets and static files: stale-while-revalidate
      if (url.pathname.includes('/_nuxt/') || 
          event.request.destination === 'script' ||
          event.request.destination === 'style' ||
          event.request.destination === 'image') {
        // Return cached version immediately if available
        if (cachedResponse) {
          // Update cache in background
          fetch(event.request)
            .then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response.clone())
                })
              }
            })
            .catch(() => {}) // Ignore fetch errors in background update
          return cachedResponse
        }
        
        // If not cached, fetch and cache
        try {
          const response = await fetch(event.request)
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        } catch (error) {
          // Return 404 if fetch fails and no cache
          return new Response('', { status: 404 })
        }
      }
      
      // For API requests: network-first
      if (url.pathname.includes('/api/')) {
        try {
          const response = await fetch(event.request)
          return response
        } catch (error) {
          // Fallback to cache if network fails
          if (cachedResponse) {
            return cachedResponse
          }
          return new Response('', { status: 503 })
        }
      }
      
      // For navigation requests: network-first with offline fallback
      if (event.request.destination === 'document') {
        try {
          const response = await fetch(event.request)
          return response
        } catch (error) {
          // Fallback to cached index
          return cachedResponse || caches.match(`${basePath}/`) || new Response('', { status: 503 })
        }
      }
      
      // Default: network-first
      try {
        return await fetch(event.request)
      } catch (error) {
        return cachedResponse || new Response('', { status: 404 })
      }
    })()
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