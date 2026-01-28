const CACHE_NAME = 'emotionwave-v3'
const STATIC_CACHE_NAME = 'emotionwave-static-v3'

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
  `${basePath}/apple-touch-icon-180x180.png`
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
              // Extract _nuxt asset URLs from HTML - match full paths including baseURL
              // Match both relative paths (_nuxt/...) and absolute paths (/EmotionWave/_nuxt/...)
              const nuxtAssetRegex = /(?:href|src)=["']([^"']*\/_nuxt\/[^"']+\.(js|css))["']/gi
              const matches = [...new Set(Array.from(html.matchAll(nuxtAssetRegex), m => m[1]))]

              // Normalize paths - ensure they're absolute URLs
              const nuxtUrls = matches.map(path => {
                try {
                  // If path is already absolute (starts with http or /), use it directly
                  if (path.startsWith('http://') || path.startsWith('https://')) {
                    return path
                  }
                  // If path starts with /, it's absolute from root
                  if (path.startsWith('/')) {
                    // For subdirectory deployments, we need to prepend basePath
                    if (basePath && basePath !== '/') {
                      return `${basePath}${path}`
                    }
                    return path
                  }
                  // Relative path - prepend basePath
                  return `${basePath}/${path}`
                } catch (error) {
                  console.warn('Error normalizing path:', path, error)
                  return null
                }
              }).filter(url => url !== null)
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
  // Only handle GET requests
  if (event.request.method !== 'GET') return

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
      // This provides instant loading with background updates
      if (url.pathname.includes('/_nuxt/') ||
        event.request.destination === 'script' ||
        event.request.destination === 'style' ||
        event.request.destination === 'image' ||
        event.request.destination === 'font') {
        // Return cached version immediately if available (stale-while-revalidate)
        if (cachedResponse) {
          // Update cache in background (non-blocking)
          fetch(event.request)
            .then((response) => {
              if (response.ok && response.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response.clone())
                })
              }
            })
            .catch(() => {
              // Ignore fetch errors in background update - cached version is fine
            })
          return cachedResponse
        }

        // If not cached, fetch and cache (network-first with cache fallback)
        try {
          const response = await fetch(event.request)
          if (response.ok && response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        } catch (error) {
          // If network fails and no cache, return error
          console.warn('Failed to fetch and no cache available:', event.request.url)
          return new Response('Resource not available offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          })
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