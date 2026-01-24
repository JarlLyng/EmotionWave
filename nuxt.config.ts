// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    // Private keys (server-side only)
    newsApiKey: process.env.NEWS_API_KEY,
    huggingFaceKey: process.env.HUGGINGFACE_API_KEY,
    // Public config (accessible on client)
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/', '/manifest.json', '/robots.txt', '/sitemap.xml']
    }
  },
  app: {
    // Use environment variable, default to / for production (Vercel) or /EmotionWave/ for GitHub Pages
    // GitHub Pages workflow sets NUXT_PUBLIC_BASE_URL=/EmotionWave/
    // Vercel should set NUXT_PUBLIC_BASE_URL=/
    baseURL: process.env.NUXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production' ? '/EmotionWave/' : '/'),
    buildAssetsDir: '_nuxt/',
    head: {
      title: 'EmotionWave - A Living Website That Reacts to the World\'s Mood',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no' },
        { name: 'description', content: 'EmotionWave is an interactive web experience that visualizes global sentiment in real-time. Watch as the world\'s mood changes through dynamic visuals and ambient sound, powered by live news analysis from GDELT, NewsAPI, and Reddit.' },
        { name: 'keywords', content: 'sentiment analysis, global mood, real-time data visualization, news sentiment, interactive web, data art, emotion visualization, world mood tracker' },
        { name: 'author', content: 'Jarl Lyng' },
        { name: 'theme-color', content: '#000000' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'EmotionWave' },
        // Open Graph tags
        { property: 'og:title', content: 'EmotionWave - A Living Website That Reacts to the World\'s Mood' },
        { property: 'og:description', content: 'An interactive web experience that visualizes global sentiment in real-time through dynamic visuals and ambient sound.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: process.env.NUXT_PUBLIC_SITE_URL || 'https://jarllyng.github.io/EmotionWave/' },
        { property: 'og:image', content: (() => {
          const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://jarllyng.github.io/EmotionWave/'
          const baseURL = process.env.NUXT_PUBLIC_BASE_URL || '/'
          const imagePath = baseURL.endsWith('/') ? `${baseURL}og-image.png` : `${baseURL}/og-image.png`
          return siteUrl.endsWith('/') ? `${siteUrl}${imagePath.replace(/^\//, '')}` : `${siteUrl}${imagePath}`
        })() },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'EmotionWave - Real-time global sentiment visualization' },
        { property: 'og:site_name', content: 'EmotionWave' },
        { property: 'og:locale', content: 'en_US' },
        // Twitter Card tags
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'EmotionWave - A Living Website That Reacts to the World\'s Mood' },
        { name: 'twitter:description', content: 'An interactive web experience that visualizes global sentiment in real-time through dynamic visuals and ambient sound.' },
        { name: 'twitter:image', content: (() => {
          const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://jarllyng.github.io/EmotionWave/'
          const baseURL = process.env.NUXT_PUBLIC_BASE_URL || '/'
          const imagePath = baseURL.endsWith('/') ? `${baseURL}og-image.png` : `${baseURL}/og-image.png`
          return siteUrl.endsWith('/') ? `${siteUrl}${imagePath.replace(/^\//, '')}` : `${siteUrl}${imagePath}`
        })() },
        { name: 'twitter:image:alt', content: 'EmotionWave - Real-time global sentiment visualization' }
      ],
      link: (() => {
        // Generate links directly in config for SSR output
        // This ensures they're present in static HTML for SEO
        const baseURL = process.env.NUXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production' ? '/EmotionWave/' : '/')
        const joinURL = (path: string) => {
          // Handle both relative and absolute baseURLs
          if (baseURL.startsWith('http://') || baseURL.startsWith('https://')) {
            try {
              return new URL(path, baseURL).toString()
            } catch {
              // Fallback if URL constructor fails
              const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
              const p = path.startsWith('/') ? path : `/${path}`
              return `${base}${p}`
            }
          }
          // Relative path
          const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
          const p = path.startsWith('/') ? path : `/${path}`
          return `${base}${p}`
        }
        
        const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://jarllyng.github.io/EmotionWave/'
        
        return [
          // Standard favicon (ICO format - contains 16x16 and 32x32)
          { rel: 'icon', type: 'image/x-icon', href: joinURL('favicon.ico'), sizes: '32x32' },
          // Modern browsers - SVG favicon (optional but recommended)
          // { rel: 'icon', type: 'image/svg+xml', href: joinURL('icon.svg') },
          // Apple Touch Icon (iOS home screen)
          { rel: 'apple-touch-icon', href: joinURL('apple-touch-icon.png'), sizes: '180x180' },
          // PWA icons
          { rel: 'icon', type: 'image/png', href: joinURL('icon-192.png'), sizes: '192x192' },
          { rel: 'icon', type: 'image/png', href: joinURL('icon-512.png'), sizes: '512x512' },
          // Manifest
          { rel: 'manifest', href: joinURL('manifest.json') },
          // Canonical URL
          { rel: 'canonical', href: siteUrl }
        ]
      })(),
      script: [
        {
          src: 'https://umami-iamjarl.vercel.app/script.js',
          defer: true,
          'data-website-id': 'd85d4bee-9f37-4812-9337-58a3cca2cc6f'
        }
      ]
    }
  }
})
