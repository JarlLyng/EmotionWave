import { defineEventHandler } from 'h3'

/**
 * Dynamic manifest.json route
 * Generates PWA manifest with correct baseURL
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const baseURL = config.app?.baseURL || process.env.NUXT_PUBLIC_BASE_URL || 
                  (process.env.NODE_ENV === 'production' ? '/EmotionWave/' : '/')
  const siteUrl = config.public?.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || 
                  'https://jarllyng.github.io/EmotionWave/'
  
  // Build absolute URLs for icons to ensure they work correctly
  const buildAbsoluteURL = (path: string) => {
    const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    const p = path.startsWith('/') ? path : `/${path}`
    const relativePath = `${base}${p}`
    
    // Convert to absolute URL if siteUrl is available
    if (siteUrl && siteUrl.startsWith('http')) {
      try {
        return new URL(relativePath, siteUrl).toString()
      } catch {
        return relativePath
      }
    }
    return relativePath
  }
  
  const manifest = {
    name: 'EmotionWave',
    short_name: 'EmotionWave',
    description: 'A living website that reacts to the world\'s mood',
    start_url: baseURL,
    display: 'fullscreen',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    icons: [
      {
        src: buildAbsoluteURL('favicon.ico'),
        sizes: '16x16 32x32',
        type: 'image/x-icon'
      },
      {
        src: buildAbsoluteURL('apple-touch-icon.png'),
        sizes: '180x180',
        type: 'image/png'
      }
    ],
    categories: ['entertainment', 'art', 'music'],
    lang: 'en',
    dir: 'ltr'
  }
  
  event.node.res.setHeader('Content-Type', 'application/manifest+json')
  return manifest
})

