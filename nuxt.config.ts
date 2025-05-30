// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/tailwindcss'],
  pages: false,
  app: {
    baseURL: '/EmotionWave/',
    head: {
      title: 'EmotionWave - Verdens Stemning i Realtid',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          name: 'description', 
          content: 'Et levende kunstværk der viser verdens stemning i realtid gennem visuelle effekter og lyd. Se hvordan verden har det lige nu.' 
        },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'theme-color', content: '#000000' },
        // Open Graph / Facebook
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'EmotionWave - Verdens Stemning i Realtid' },
        { property: 'og:description', content: 'Et levende kunstværk der viser verdens stemning i realtid gennem visuelle effekter og lyd.' },
        { property: 'og:image', content: '/og-image.jpg' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'EmotionWave - Verdens Stemning i Realtid' },
        { name: 'twitter:description', content: 'Et levende kunstværk der viser verdens stemning i realtid gennem visuelle effekter og lyd.' },
        { name: 'twitter:image', content: '/og-image.jpg' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },
  ssr: true,
  nitro: {
    prerender: {
      routes: ['/']
    }
  }
})
