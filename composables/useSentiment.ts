import { ref } from 'vue'
import { fetchGDELTSentiment } from './useGDELT'
import type { BaseSentimentData } from '~/utils/sentiment'

interface SentimentData {
  score: number
  details: {
    positive: number
    negative: number
    neutral: number
  }
  articles?: Array<{
    title: string
    url: string
    source: string
    sentiment: number
  }>
}

interface SourceEntry {
  name: string
  score: number
}

interface ArticleEntry {
  title?: string
  url?: string
  source?: string
  sentiment?: number
}

/**
 * Composable for managing sentiment data
 */
export function useSentiment() {
  const sentimentScore = ref(0)
  const targetScore = ref(0)
  const sentimentDetails = ref<SentimentData['details']>({
    positive: 0,
    negative: 0,
    neutral: 0,
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isUsingFallback = ref(false)
  const sources = ref<Record<string, number>>({})
  const articles = ref<Array<{ title: string; url: string; source: string; sentiment: number }>>([])

  let intervalId: ReturnType<typeof setInterval> | null = null
  let animationFrameId: number | null = null

  const animateTransition = () => {
    const diff = targetScore.value - sentimentScore.value

    if (Math.abs(diff) < 0.001) {
      sentimentScore.value = targetScore.value
      animationFrameId = null
      return
    }

    sentimentScore.value += diff * 0.1
    animationFrameId = requestAnimationFrame(animateTransition)
  }

  function applyData(data: BaseSentimentData & { articles?: ArticleEntry[] }) {
    targetScore.value = data.score

    if (data.sources) {
      sources.value = data.sources.reduce((acc: Record<string, number>, source: SourceEntry) => {
        acc[source.name] = source.score
        return acc
      }, {})
    }

    if (data.articles && Array.isArray(data.articles)) {
      articles.value = data.articles.map((article: ArticleEntry) => ({
        title: article.title || '',
        url: article.url || '',
        source: article.source || 'Unknown',
        sentiment: article.sentiment || 0,
      }))
    }

    if (!animationFrameId) {
      animateTransition()
    }
  }

  let inFlight = false

  async function fetchSentiment() {
    if (inFlight) return
    inFlight = true
    isLoading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const baseURL = config.app.baseURL || '/'
      const baseUrlObj = new URL(baseURL, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      const apiUrl = new URL('api/advanced-sentiment', baseUrlObj).toString()

      // Try server API and GDELT client-side in parallel — use whichever succeeds first
      const serverPromise = fetch(apiUrl).then(async (response) => {
        if (!response.ok) throw new Error(`API returned ${response.status}`)
        return await response.json() as BaseSentimentData & { articles?: ArticleEntry[] }
      })

      const gdeltPromise = fetchGDELTSentiment()

      // Race: prefer server API (has more sources), but accept GDELT if server fails
      let data: BaseSentimentData & { articles?: ArticleEntry[] }
      try {
        data = await serverPromise
        isUsingFallback.value = false
      } catch {
        // Server failed — use GDELT client-side result
        try {
          data = await gdeltPromise
          isUsingFallback.value = false
        } catch {
          // Both failed — use time-based fallback
          isUsingFallback.value = true
          error.value = 'Using demo data (API unavailable)'

          const now = Date.now()
          const hour = new Date(now).getHours()
          const minute = new Date(now).getMinutes()
          const timeBasedSeed = (hour * 60 + minute) % 1440
          const baseScore = 0.3 + (Math.sin(timeBasedSeed * 0.1) * 0.4)
          const seconds = new Date(now).getSeconds()
          const variation = (seconds % 30) / 100

          data = {
            score: Math.max(-1, Math.min(1, baseScore + variation)),
            timestamp: now,
            sources: [],
          }
        }
      }

      applyData(data)
    } finally {
      isLoading.value = false
      inFlight = false
    }
  }

  let visibilityHandler: (() => void) | null = null

  function startPolling() {
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(() => {
      // Don't fetch if tab is not visible
      if (typeof document !== 'undefined' && document.hidden) return
      fetchSentiment()
    }, 30000)

    // Fetch immediately when user returns to tab
    if (typeof document !== 'undefined' && !visibilityHandler) {
      visibilityHandler = () => {
        if (!document.hidden) {
          fetchSentiment()
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)
    }
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    if (typeof document !== 'undefined' && visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  return {
    sentimentScore,
    sentimentDetails,
    isLoading,
    error,
    isUsingFallback,
    sources,
    articles,
    fetchSentiment,
    startPolling,
    stopPolling,
  }
}
