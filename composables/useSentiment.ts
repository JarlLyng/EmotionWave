import { ref } from 'vue'
import { fetchGDELTSentiment } from './useGDELT'
import { getDynamicFallbackData, isDemoPayload } from '../utils/sentiment'
import type { BaseSentimentData, DataMode, EmotionState } from '../utils/sentiment'

// Bounds for client fetch attempts (issue #71). The server responds within
// its own 8s deadline, so a longer wait means the request itself is stuck.
const SERVER_ATTEMPT_TIMEOUT_MS = 12000
const GDELT_ATTEMPT_TIMEOUT_MS = 25000

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

type SentimentPayload = BaseSentimentData & { articles?: ArticleEntry[]; emotion?: EmotionState; apiSources?: string[] }

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
  // Timestamp of the measurement currently on screen. Not advanced by demo
  // payloads, and kept during stale mode so the UI can show the reading's age.
  const lastUpdated = ref<number | null>(null)
  // Providers that contributed to the current reading (issue #75)
  const providers = ref<string[]>([])
  let lastGoodPayload: SentimentPayload | null = null

  let intervalId: ReturnType<typeof setInterval> | null = null
  let animationFrameId: number | null = null

  // Cancellation state (issue #71): stopPolling aborts the in-flight request,
  // and the generation counter invalidates responses that settle afterwards
  let activeController: AbortController | null = null
  let fetchGeneration = 0
  let disposed = false

  /** Run one bounded attempt whose signal stopPolling can abort */
  async function boundedAttempt<T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController()
    activeController = controller
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await run(controller.signal)
    } finally {
      clearTimeout(timeoutId)
      if (activeController === controller) activeController = null
    }
  }

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
      lastUpdated.value = data.timestamp ?? Date.now()
      // Server payloads carry apiSources; the client GDELT path implies GDELT
      providers.value = data.apiSources ?? ['GDELT']
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
    providers.value = []
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
    const generation = ++fetchGeneration

    try {
      const config = useRuntimeConfig()
      const baseURL = config.app.baseURL || '/'
      const baseUrlObj = new URL(baseURL, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      const apiUrl = new URL('api/advanced-sentiment', baseUrlObj).toString()

      let data: SentimentPayload
      try {
        data = await boundedAttempt(SERVER_ATTEMPT_TIMEOUT_MS, async (signal) => {
          const response = await fetch(apiUrl, { signal })
          if (!response.ok) throw new Error(`API returned ${response.status}`)
          return await response.json() as SentimentPayload
        })
      } catch {
        // A deliberate stop must not cascade into new fallback requests
        if (disposed) return

        // Server failed — fall back to client-side GDELT. Fetched lazily so a
        // healthy server API doesn't cost every visitor an extra GDELT request
        // per poll whose result would just be discarded. Note: this resolves
        // with a demo-marked payload on failure; ingest() sorts live from demo.
        try {
          data = await boundedAttempt(GDELT_ATTEMPT_TIMEOUT_MS, (signal) => fetchGDELTSentiment(signal))
        } catch {
          // Both paths threw — synthesize an explicitly demo-marked payload
          data = getDynamicFallbackData()
        }
      }

      // A response that settles after stop/unmount — or after a newer fetch
      // superseded this one — must not restart animation on disposed state
      if (disposed || generation !== fetchGeneration) return

      ingest(data)
    } finally {
      isLoading.value = false
      inFlight = false
    }
  }

  let visibilityHandler: (() => void) | null = null

  function startPolling() {
    disposed = false
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
    disposed = true
    // Abort the in-flight request and invalidate any late completion
    fetchGeneration++
    if (activeController) {
      activeController.abort()
      activeController = null
    }
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
    lastUpdated,
    providers,
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
