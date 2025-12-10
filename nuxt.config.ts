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
        // og:image removed - file doesn't exist, can be added later
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'EmotionWave' },
        { name: 'twitter:description', content: 'A living website that reacts to the world\'s mood' }
      ],
      link: (() => {
        // Generate links directly in config for SSR output
        const baseURL = process.env.NUXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production' ? '/EmotionWave/' : '/')
        const joinURL = (path: string) => {
          const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
          const p = path.startsWith('/') ? path : `/${path}`
          return `${base}${p}`
        }
        
        return [
          { rel: 'icon', type: 'image/x-icon', href: joinURL('favicon.ico') },
          { rel: 'apple-touch-icon', href: joinURL('apple-touch-icon.png') },
          { rel: 'manifest', href: joinURL('manifest.json') }
        ]
      })()
    }
  }
})
