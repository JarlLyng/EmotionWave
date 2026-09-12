import { ref } from 'vue'
import { fetchGDELTSentiment } from './useGDELT'
import { getDynamicFallbackData, isDemoPayload } from '~/utils/sentiment'
import type { BaseSentimentData, DataMode, EmotionState } from '~/utils/sentiment'

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

type SentimentPayload = BaseSentimentData & { articles?: ArticleEntry[]; emotion?: EmotionState }

/**
 * Composable for managing sentiment data
 */
export function useSentiment() {
  const sentimentScore = ref(0)
  const targetScore = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isUsingFallback = ref(false)
  const sources = ref<Record<string, number>>({})
  const articles = ref<Array<{ title: string; url: string; source: string; sentiment: number }>>([])
  // World-emotion state from the server (issue #30); null when unavailable.
  // Components lerp their own visuals, so no client-side animation needed here.
  const emotion = ref<EmotionState | null>(null)
  // Honest data provenance (issue #67): live, stale (retained snapshot during
  // an outage) or demo (synthetic — nothing real was ever received)
  const dataMode = ref<DataMode>('live')
  let lastGoodPayload: SentimentPayload | null = null

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

  function applyData(data: SentimentPayload) {
    targetScore.value = data.score
    emotion.value = data.emotion ?? null

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

  /**
   * Route every payload — server, client GDELT or synthetic — through one
   * honest decision (issue #67): real data is applied and snapshotted; a
   * synthetic payload either freezes the last good snapshot (stale) or, when
   * none exists, applies demo data clearly labeled as such.
   */
  function ingest(data: SentimentPayload) {
    if (!isDemoPayload(data)) {
      lastGoodPayload = data
      dataMode.value = 'live'
      isUsingFallback.value = false
      error.value = null
      applyData(data)
      return
    }

    isUsingFallback.value = true

    if (lastGoodPayload) {
      // Outage with history: keep showing the last real mood, marked stale.
      // Deliberately no applyData — the demo payload must not overwrite
      // real headlines or repaint the artwork with synthetic feelings.
      dataMode.value = 'stale'
      error.value = 'Live feed unavailable — showing last known mood'
      return
    }

    // Outage with no history: honest demo mode
    dataMode.value = 'demo'
    error.value = 'Using demo data (API unavailable)'
    const withHeadline: SentimentPayload = {
      ...data,
      articles: data.articles && data.articles.length > 0 ? data.articles : [{
        title: 'Live news feed unavailable — running in demo mode',
        url: '',
        source: 'EmotionWave',
        sentiment: 0,
      }],
    }
    applyData(withHeadline)
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

      let data: SentimentPayload
      try {
        const response = await fetch(apiUrl)
        if (!response.ok) throw new Error(`API returned ${response.status}`)
        data = await response.json() as SentimentPayload
      } catch {
        // Server failed — fall back to client-side GDELT. Fetched lazily so a
        // healthy server API doesn't cost every visitor an extra GDELT request
        // per poll whose result would just be discarded. Note: this resolves
        // with a demo-marked payload on failure; ingest() sorts live from demo.
        try {
          data = await fetchGDELTSentiment()
        } catch {
          // Both paths threw — synthesize an explicitly demo-marked payload
          data = getDynamicFallbackData()
        }
      }

      ingest(data)
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
    emotion,
    dataMode,
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
