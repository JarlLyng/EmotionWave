import {
  type Article,
  type BaseSentimentData,
  type EmotionState,
  getDynamicFallbackData as getBaseFallbackData,
  calculateWeightedSentiment,
  aggregateEmotionVectors,
  dedupeByUrl,
  roundRobinByKey,
} from '../../utils/sentiment'
import { fetchGDELTNews } from './gdeltService'
import { fetchNewsAPINews } from './newsApiService'
import { fetchRedditSentiment } from './redditService'
import { fetchRssHeadlines } from './rssService'
import { fetchGuardianNews } from './guardianService'
import { batchAnalyzeWithHuggingFace, batchAnalyzeEmotions } from './huggingFaceService'

export interface ServerSentimentData extends BaseSentimentData {
  apiSources: string[]
  articles?: Article[]
  /** World-emotion state (issue #30); absent when HF is unavailable */
  emotion?: EmotionState
}

// Time budget (issue #68). The endpoint's outer deadline is a last-resort
// backstop; this inner budget is what actually shapes the response. A slow
// source loses its seat, it does not empty the bus: whatever completed by
// the phase deadline is served, and stragglers are cancelled.
const TOTAL_BUDGET_MS = 7000
const SOURCE_PHASE_MS = 5000
// Once any source has delivered articles, stragglers get this much longer.
// Without it a hanging source (GDELT from Vercel's network) held the phase
// open for the full 5s, leaving HF ~1.8s — too little for its ~2-4s, so the
// emotion reading was silently dropped on every production request.
const SOURCE_GRACE_MS = 1500
const HF_MIN_BUDGET_MS = 1000
const HF_SAFETY_MARGIN_MS = 200

// Explicit sampling limits (issue #70)
const HF_SAMPLE_SIZE = 10       // articles sent to each HF model per cycle
const REDDIT_MAX_ARTICLES = 20  // spread across subreddits, not first-come
const MAX_RETURNED_ARTICLES = 50

// Retained last-good snapshot: when every upstream fails (GDELT rate limits,
// NewsAPI quota, Reddit blocking cloud IPs — all observed in production),
// serving the last real reading marked 'stale' beats synthetic demo data.
// Module memory only, so it helps warm serverless instances.
const RETAINED_MAX_AGE_MS = 6 * 60 * 60 * 1000
let retainedSnapshot: ServerSentimentData | null = null

/** The last good aggregation, marked stale — or null if too old/absent */
export function getRetainedSnapshot(): ServerSentimentData | null {
  if (!retainedSnapshot) return null
  if (Date.now() - retainedSnapshot.timestamp > RETAINED_MAX_AGE_MS) return null
  return { ...retainedSnapshot, dataMode: 'stale' }
}

/** Test hook */
export function clearRetainedSnapshot(): void {
  retainedSnapshot = null
}

// Cancellable sleep: the pending timer must be cleared once the race is
// decided, so it never holds a serverless function open past the response
function budgetTimer(ms: number): { promise: Promise<null>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const promise = new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), ms) })
  return { promise, cancel: () => { if (timer) clearTimeout(timer) } }
}

export async function aggregateSentiment(
  newsApiKey: string | null,
  huggingFaceKey: string | null,
  guardianApiKey: string | null = null
): Promise<ServerSentimentData> {
  const startedAt = Date.now()
  const apiSources: string[] = []
  const allArticles: Article[] = []

  // ── Source phase: collect whatever finishes within the phase budget ──
  const sourceController = new AbortController()
  const collected: { gdelt?: Article[]; news?: Article[]; reddit?: Article[]; rss?: Article[]; guardian?: Article[] } = {}

  // The grace window opens on the first non-empty delivery; an empty result
  // (missing key, blocked source) must not start it
  const grace: { timer: ReturnType<typeof budgetTimer> | null } = { timer: null }
  let resolveGrace: () => void = () => {}
  const graceElapsed = new Promise<null>(resolve => { resolveGrace = () => resolve(null) })

  const collect = (key: keyof typeof collected, work: Promise<Article[]>) =>
    work
      .then((articles) => {
        collected[key] = articles
        if (articles.length > 0 && !grace.timer) {
          grace.timer = budgetTimer(SOURCE_GRACE_MS)
          void grace.timer.promise.then(resolveGrace)
        }
      })
      .catch(() => {})

  const sourceWork = Promise.all([
    collect('gdelt', fetchGDELTNews(sourceController.signal)),
    collect('news', fetchNewsAPINews(newsApiKey, sourceController.signal)),
    collect('reddit', fetchRedditSentiment(sourceController.signal)),
    collect('rss', fetchRssHeadlines(sourceController.signal)),
    collect('guardian', fetchGuardianNews(guardianApiKey, sourceController.signal)),
  ])

  const sourcePhase = budgetTimer(SOURCE_PHASE_MS)
  await Promise.race([sourceWork, sourcePhase.promise, graceElapsed])
  sourcePhase.cancel()
  grace.timer?.cancel()
  // Phase closed: cancel stragglers (a no-op when everything already settled).
  // Their retries and pending requests stop instead of running past the response.
  sourceController.abort()

  if (collected.gdelt && collected.gdelt.length > 0) {
    allArticles.push(...collected.gdelt)
    apiSources.push('GDELT')
  }
  if (collected.news && collected.news.length > 0) {
    allArticles.push(...collected.news)
    apiSources.push('NewsAPI')
  }
  if (collected.rss && collected.rss.length > 0) {
    allArticles.push(...collected.rss)
    apiSources.push('RSS')
  }
  if (collected.guardian && collected.guardian.length > 0) {
    allArticles.push(...collected.guardian)
    apiSources.push('Guardian')
  }
  if (collected.reddit && collected.reddit.length > 0) {
    // Round-robin across subreddits (each has its own source name), so the
    // quota is spread over all configured communities instead of whichever
    // subreddits happened to come first in the fetch order (issue #70)
    allArticles.push(...roundRobinByKey(collected.reddit, a => a.source, REDDIT_MAX_ARTICLES))
    apiSources.push('Reddit')
  }

  // The same story syndicated through two feeds must only count once
  const uniqueArticles = dedupeByUrl(allArticles)
  allArticles.length = 0
  allArticles.push(...uniqueArticles)

  // Nothing real arrived: prefer the retained last-good reading (marked
  // stale) over synthetic demo data — real headlines from an hour ago tell
  // the truth better than a sine wave (issue #67)
  if (allArticles.length === 0) {
    const retained = getRetainedSnapshot()
    if (retained) return retained
    const fallback = getBaseFallbackData()
    return { ...fallback, apiSources: ['Fallback'], articles: [], dataMode: 'demo' }
  }

  // ── Enrichment phase: HF gets whatever budget remains, and is optional ──
  let emotion: EmotionState | undefined

  if (huggingFaceKey) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt) - HF_SAFETY_MARGIN_MS
    if (remaining >= HF_MIN_BUDGET_MS) {
      try {
        // Sample of HF_SAMPLE_SIZE (as documented in README/ARCHITECTURE): at
        // concurrency 5 that's 2 waves ≈ 2-4s, fitting the remaining budget.
        // Selected round-robin across sources so the world-emotion reading
        // reflects every available feed, not just the first provider's
        // concatenation order (issue #70).
        const eligible = allArticles
          .map((a, i) => ({ text: `${a.title} ${a.source}`.trim(), index: i, source: a.source }))
          .filter(({ text }) => text.length > 10)
        const textsToAnalyze = roundRobinByKey(eligible, e => e.source, HF_SAMPLE_SIZE)
          .map(({ text, index }) => ({ text, index }))

        const hfController = new AbortController()
        const hfWork = Promise.all([
          batchAnalyzeWithHuggingFace(textsToAnalyze, huggingFaceKey, hfController.signal),
          batchAnalyzeEmotions(textsToAnalyze, huggingFaceKey, hfController.signal),
        ])

        const hfPhase = budgetTimer(remaining)
        const enrichment = await Promise.race([hfWork, hfPhase.promise])
        hfPhase.cancel()
        // Late enrichment is dropped, not waited for — keyword scores stand
        hfController.abort()

        if (enrichment) {
          const [hfScores, emotionVectors] = enrichment

          for (const [index, score] of hfScores) {
            const article = allArticles[index]
            if (!article) continue
            const keywordScore = article.sentiment
            article.sentiment = Math.max(-10, Math.min(10,
              score * 0.7 + keywordScore * 0.3
            ))
          }

          emotion = aggregateEmotionVectors([...emotionVectors.values()]) ?? undefined

          if (hfScores.size > 0) apiSources.push('HuggingFace')
        }
      } catch (error) {
        console.warn('HuggingFace batch analysis failed, using keyword scores:', error)
      }
    }
  }

  const { score, sources } = calculateWeightedSentiment(allArticles)
  const articlesWithTitles = allArticles.filter(a => a.title && a.title.trim().length > 0)

  const result: ServerSentimentData = {
    score,
    sources,
    timestamp: Date.now(),
    apiSources,
    articles: articlesWithTitles.slice(0, MAX_RETURNED_ARTICLES),
    emotion,
    dataMode: 'live',
  }
  retainedSnapshot = result
  return result
}
