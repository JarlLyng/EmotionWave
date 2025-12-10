import { defineEventHandler } from 'h3'

/**
 * Dynamic sitemap.xml route
 * Generates sitemap with correct domain and current date
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteUrl = config.public?.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || 
                  'https://jarllyng.github.io/EmotionWave/'
  
  const baseURL = new URL(siteUrl)
  const domain = baseURL.origin + baseURL.pathname.replace(/\/$/, '')
  const today = new Date().toISOString().split('T')[0]
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${domain}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
  
  event.node.res.setHeader('Content-Type', 'application/xml')
  return sitemap
})

