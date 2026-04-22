import {
  type Article,
  getDateRange,
  normalizeGDELTArticle,
  extractArticlesFromGDELT,
  GDELT_QUERY,
} from '~/utils/sentiment'
import { retryWithBackoff } from './retry'
import { GDELTResponseSchema } from './schemas'

export async function fetchGDELTNews(): Promise<Article[]> {
  const dateRange = getDateRange()

  return retryWithBackoff(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

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

      clearTimeout(timeoutId)

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
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  })
}
