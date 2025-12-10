import { defineEventHandler } from 'h3'

/**
 * Dynamic robots.txt route
 * Generates robots.txt with correct sitemap URL
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteUrl = config.public?.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || 
                  'https://jarllyng.github.io/EmotionWave/'
  
  const baseURL = new URL(siteUrl)
  const domain = baseURL.origin + baseURL.pathname.replace(/\/$/, '')
  
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${domain}/sitemap.xml`
  
  event.node.res.setHeader('Content-Type', 'text/plain')
  return robotsTxt
})

