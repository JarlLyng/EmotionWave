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
    },
    hooks: {
      'prerender:route'(ctx) {
        // Generate manifest.json dynamically
        if (ctx.route === '/manifest.json') {
          const baseURL = process.env.NUXT_PUBLIC_BASE_URL || 
                          (process.env.NODE_ENV === 'production' ? '/EmotionWave/' : '/')
          const joinURL = (path: string) => {
            const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
            const p = path.startsWith('/') ? path : `/${path}`
            return `${base}${p}`
          }
          
          ctx.body = JSON.stringify({
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
                src: joinURL('favicon.ico'),
                sizes: '16x16 32x32',
                type: 'image/x-icon'
              },
              {
                src: joinURL('apple-touch-icon.png'),
                sizes: '180x180',
                type: 'image/png'
              }
            ],
            categories: ['entertainment', 'art', 'music'],
            lang: 'en',
            dir: 'ltr'
          }, null, 2)
        }
        
        // Generate robots.txt dynamically
        if (ctx.route === '/robots.txt') {
          const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://jarllyng.github.io/EmotionWave/'
          const baseURL = new URL(siteUrl)
          const domain = baseURL.origin + baseURL.pathname.replace(/\/$/, '')
          
          ctx.body = `User-agent: *
Allow: /

Sitemap: ${domain}/sitemap.xml`
        }
        
        // Generate sitemap.xml dynamically
        if (ctx.route === '/sitemap.xml') {
          const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://jarllyng.github.io/EmotionWave/'
          const baseURL = new URL(siteUrl)
          const domain = baseURL.origin + baseURL.pathname.replace(/\/$/, '')
          const today = new Date().toISOString().split('T')[0]
          
          ctx.body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${domain}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
        }
      }
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
      link: []
    }
  },
  hooks: {
    'app:created'(app) {
      // Dynamically set head links based on baseURL
      const baseURL = app.config.app.baseURL
      const joinURL = (path: string) => {
        const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
        const p = path.startsWith('/') ? path : `/${path}`
        return `${base}${p}`
      }
      
      app.head.link = [
        { rel: 'icon', type: 'image/x-icon', href: joinURL('favicon.ico') },
        { rel: 'apple-touch-icon', href: joinURL('apple-touch-icon.png') },
        { rel: 'manifest', href: joinURL('manifest.json') }
      ]
    }
  }
})
