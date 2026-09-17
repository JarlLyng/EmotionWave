import { z } from 'zod'
import { type Article, keywordBasedSentiment } from '../../utils/sentiment'
import { retryWithBackoff } from './retry'

// The Guardian Open Platform: a genuinely free developer tier (hundreds to
// thousands of calls/day) — register at https://open-platform.theguardian.com/access/
// Optional like the other keyed sources; inactive without GUARDIAN_API_KEY.

const GuardianResponseSchema = z.object({
  response: z.object({
    status: z.string(),
    results: z.array(z.object({
      webTitle: z.string(),
      webUrl: z.string(),
      webPublicationDate: z.string().optional(),
    })).catch([]),
  }),
})

export async function fetchGuardianNews(apiKey: string | null, signal?: AbortSignal): Promise<Article[]> {
  if (!apiKey) return []

  return retryWithBackoff(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)
    const abortListener = () => controller.abort()
    signal?.addEventListener('abort', abortListener, { once: true })

    try {
      const response = await fetch(
        'https://content.guardianapis.com/search?section=world&order-by=newest&page-size=25&api-key=' +
        encodeURIComponent(apiKey),
        { signal: controller.signal, headers: { 'User-Agent': 'EmotionWave/1.0' } }
      )
      if (!response.ok) throw new Error(`Guardian API error: ${response.status}`)

      const parsed = GuardianResponseSchema.safeParse(await response.json())
      if (!parsed.success || parsed.data.response.status !== 'ok') return []

      return parsed.data.response.results.map(item => ({
        sentiment: Math.max(-10, Math.min(10, keywordBasedSentiment(item.webTitle))),
        url: item.webUrl,
        title: item.webTitle,
        source: 'The Guardian',
        publishedAt: item.webPublicationDate,
      }))
    } finally {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortListener)
    }
  }, 2, 500, signal)
}
