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
    compatibilityDate: '2025-06-04',
    prerender: {
      crawlLinks: false,
      routes: [
        '/',
        '/200.html',
        '/404.html'
      ]
    },
    routeRules: {
      '/**': { prerender: false }
    }
  },
  // Build optimeringer
  build: {
    transpile: ['three', 'tone']
  },
  // Vite optimeringer
  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'three': ['three'],
            'tone': ['tone'],
            'vendor': ['vue', 'vue-router']
          }
        }
      }
    },
    optimizeDeps: {
      include: ['three', 'tone']
    }
  },
  // Performance optimeringer
  experimental: {
    payloadExtraction: false
  },
  app: {
    baseURL: process.env.NODE_ENV === 'production' ? '/EmotionWave/' : '/',
    buildAssetsDir: process.env.NODE_ENV === 'production' ? '/EmotionWave/_nuxt/' : '/_nuxt/',
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
        { property: 'og:image', content: '/EmotionWave/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'EmotionWave' },
        { name: 'twitter:description', content: 'A living website that reacts to the world\'s mood' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/EmotionWave/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/EmotionWave/apple-touch-icon.png' },
        { rel: 'manifest', href: '/EmotionWave/manifest.json' }
      ]
    }
  }
})
