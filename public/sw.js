const CACHE_NAME = 'emotionwave-v1'
const urlsToCache = [
  '/EmotionWave/',
  '/EmotionWave/favicon.ico',
  '/EmotionWave/manifest.json'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        // Cache kun de filer vi ved eksisterer
        return cache.addAll(urlsToCache.filter(url => {
          // Undgå at cache dynamiske filer med hash
          return !url.includes('_nuxt/') || url.includes('entry.') || url.includes('favicon.ico') || url.includes('manifest.json')
        }))
      })
      .catch((error) => {
        console.log('Cache addAll failed:', error)
        // Hvis addAll fejler, cache kun de grundlæggende filer
        return caches.open(CACHE_NAME).then(cache => {
          return cache.add('/EmotionWave/')
        })
      })
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
      .catch(() => {
        // Hvis både cache og fetch fejler, return en fallback
        if (event.request.destination === 'document') {
          return caches.match('/EmotionWave/')
        }
        return new Response('', { status: 404 })
      })
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
}) 