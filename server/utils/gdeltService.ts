import {
  type Article,
  getDateRange,
  normalizeGDELTArticle,
  extractArticlesFromGDELT,
  GDELT_QUERY,
} from '~/utils/sentiment'
import { retryWithBackoff } from './retry'
import { GDELTResponseSchema } from './schemas'

export async function fetchGDELTNews(signal?: AbortSignal): Promise<Article[]> {
  const dateRange = getDateRange()

  // Total worst case must stay under the endpoint's 8s aggregation deadline
  // (2 attempts × 3.5s timeout + 0.5s backoff ≈ 7.5s), so a hanging GDELT
  // still leaves room to serve partial data from the other sources. The
  // caller's signal cancels outstanding work when the source phase closes.
  return retryWithBackoff(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)
    const abortListener = () => controller.abort()
    signal?.addEventListener('abort', abortListener, { once: true })

    try {
      const response = await fetch(
        'https://api.gdeltproject.org/api/v2/doc/doc?' +
        `query=${encodeURIComponent(GDELT_QUERY)}` +
        '&mode=artlist&format=json&maxrecords=30&sort=hybridrel' +
        `&startdatetime=${dateRange.start}&enddatetime=${dateRange.end}`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'EmotionWave/1.0' },
        }
      )

      if (!response.ok) throw new Error(`GDELT API error: ${response.status}`)

      const rawData = await response.json()
      const parsed = GDELTResponseSchema.safeParse(rawData)
      if (!parsed.success) {
        console.warn('GDELT valideringsfejl, forsøger fallback:', parsed.error.message)
      }
      
      const data = parsed.success ? parsed.data : rawData
      const rawArticles = extractArticlesFromGDELT(data)
      if (!rawArticles) return []

      return rawArticles.map(normalizeGDELTArticle)
    } finally {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortListener)
    }
  }, 2, 500, signal)
}
