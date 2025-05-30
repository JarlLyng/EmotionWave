// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },
  app: {
    baseURL: process.env.NODE_ENV === 'production' ? '/EmotionWave/' : '/',
    buildAssetsDir: '/_nuxt/',
    head: {
      title: 'EmotionWave',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'A living website that reacts to the world\'s mood' }
      ]
    }
  }
})
