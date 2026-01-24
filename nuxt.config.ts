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
      title: 'EmotionWave',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no' },
        { name: 'description', content: 'A living website that reacts to the world\'s mood' },
        { name: 'theme-color', content: '#000000' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'EmotionWave' },
        { property: 'og:title', content: 'EmotionWave' },
        { property: 'og:description', content: 'A living website that reacts to the world\'s mood' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: process.env.NUXT_PUBLIC_SITE_URL || 'https://jarllyng.github.io/EmotionWave/' },
        // og:image removed - file doesn't exist, can be added later
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'EmotionWave' },
        { name: 'twitter:description', content: 'A living website that reacts to the world\'s mood' }
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
        
        return [
          { rel: 'icon', type: 'image/x-icon', href: joinURL('favicon.ico') },
          { rel: 'apple-touch-icon', href: joinURL('apple-touch-icon.png') },
          { rel: 'manifest', href: joinURL('manifest.json') }
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
