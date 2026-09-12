import { type Article, getDateRange, keywordBasedSentiment } from '~/utils/sentiment'
import { retryWithBackoff } from './retry'
import { NewsAPIResponseSchema } from './schemas'

export async function fetchNewsAPINews(apiKey: string | null, signal?: AbortSignal): Promise<Article[]> {
  if (!apiKey) return []

  const dateRange = getDateRange()
  const query = '(politics OR technology OR society OR economy OR climate OR health) NOT (sport OR entertainment OR celebrity)'
  const allArticles: Article[] = []
  const languages = ['en', 'da']

  for (const lang of languages) {
    try {
      if (signal?.aborted) break
      const rawArticles = await retryWithBackoff(async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        const abortListener = () => controller.abort()
        signal?.addEventListener('abort', abortListener, { once: true })

        try {
          const response = await fetch(
            `https://newsapi.org/v2/everything?` +
            `q=${encodeURIComponent(query)}&language=${lang}&` +
            `from=${dateRange.isoStart.split('T')[0]}&to=${dateRange.isoEnd.split('T')[0]}&` +
            `sortBy=relevancy&pageSize=15&apiKey=${apiKey}`,
            {
              signal: controller.signal,
              headers: { 'User-Agent': 'EmotionWave/1.0' },
            }
          )

          if (!response.ok) throw new Error(`NewsAPI error: ${response.status}`)

          const data = await response.json()
          const parsed = NewsAPIResponseSchema.safeParse(data)
          if (!parsed.success) {
            console.warn('NewsAPI valideringsfejl:', parsed.error.message)
            return []
          }
          return (parsed.data.status === 'ok' && parsed.data.articles) ? parsed.data.articles : []
        } finally {
          clearTimeout(timeoutId)
          signal?.removeEventListener('abort', abortListener)
        }
      }, 3, 1000, signal)

      // Use keyword sentiment for all articles initially
      for (const article of rawArticles) {
        const text = `${article.title || ''} ${article.description || ''}`.trim()
        if (!text) continue

        allArticles.push({
          sentiment: Math.max(-10, Math.min(10, keywordBasedSentiment(text))),
          url: article.url || '',
          title: article.title || '',
          source: article.source?.name || 'Unknown',
          publishedAt: article.publishedAt || undefined,
        })
      }
    } catch (error) {
      console.warn(`NewsAPI fetch failed for language ${lang}:`, error)
    }
  }

  return allArticles
}
