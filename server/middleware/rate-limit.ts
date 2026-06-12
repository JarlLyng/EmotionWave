// Per-IP fixed-window rate limiter for the public API endpoints.
// In-memory and therefore per-instance on serverless platforms — this is an
// abuse brake protecting upstream API quotas, not a hard global guarantee.
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 30
const MAX_TRACKED_IPS = 10_000

const buckets = new Map<string, { count: number, resetAt: number }>()

export default defineEventHandler((event) => {
  if (!event.path?.startsWith('/api/')) return

  const forwardedFor = getRequestHeader(event, 'x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim()
    || event.node.req.socket.remoteAddress
    || 'unknown'

  const now = Date.now()
  const bucket = buckets.get(ip)

  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_TRACKED_IPS) {
      for (const [key, b] of buckets) {
        if (now >= b.resetAt) buckets.delete(key)
      }
    }
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  bucket.count++
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    setResponseHeader(event, 'Retry-After', Math.ceil((bucket.resetAt - now) / 1000))
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })
  }
})
