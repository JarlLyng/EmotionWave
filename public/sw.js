// Cache version auto-updates when sw.js content changes (triggering re-install)
// Bump this string on each deploy or meaningful change:
const CACHE_VERSION = 'v4'
const CACHE_NAME = `emotionwave-${CACHE_VERSION}`
const STATIC_CACHE_NAME = `emotionwave-static-${CACHE_VERSION}`

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
          return cache.addAll(staticUrlsToCache).catch((error) => {
            console.warn('Static cache addAll failed:', error)
          })
        }),
      // Precache _nuxt assets by fetching them
      caches.open(CACHE_NAME)
        .then(async (cache) => {
          try {
            const response = await fetch(`${basePath}/`)
            if (response.ok) {
              const html = await response.text()
              const nuxtAssetRegex = /(?:href|src)=["']([^"']*\/_nuxt\/[^"']+\.(js|css))["']/gi
              const matches = [...new Set(Array.from(html.matchAll(nuxtAssetRegex), m => m[1]))]

              const nuxtUrls = matches.map(path => {
                try {
                  if (path.startsWith('http://') || path.startsWith('https://')) return path
                  if (path.startsWith('/')) {
                    if (basePath && basePath !== '/') return `${basePath}${path}`
                    return path
                  }
                  return `${basePath}/${path}`
                } catch (error) {
                  console.warn('Error normalizing path:', path, error)
                  return null
                }
              }).filter(url => url !== null)

              if (nuxtUrls.length > 0) {
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
  self.skipWaiting()
})

// Fetch event - cache strategy: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) return

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request)

      // Static assets: stale-while-revalidate
      if (url.pathname.includes('/_nuxt/') ||
        event.request.destination === 'script' ||
        event.request.destination === 'style' ||
        event.request.destination === 'image' ||
        event.request.destination === 'font') {
        if (cachedResponse) {
          fetch(event.request)
            .then((response) => {
              if (response.ok && response.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response.clone())
                })
              }
            })
            .catch(() => {})
          return cachedResponse
        }

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
          return new Response('Resource not available offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          })
        }
      }

      // API requests: network-first
      if (url.pathname.includes('/api/')) {
        try {
          return await fetch(event.request)
        } catch (error) {
          if (cachedResponse) return cachedResponse
          return new Response('', { status: 503 })
        }
      }

      // Navigation: network-first with offline fallback
      if (event.request.destination === 'document') {
        try {
          return await fetch(event.request)
        } catch (error) {
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
  return self.clients.claim()
})
