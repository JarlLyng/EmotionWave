/**
 * Shared sentiment analysis utilities
 * Used by both client-side (useGDELT) and server-side (advanced-sentiment) code
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SentimentSource {
  name: string
  score: number
  articles: number
  weight: number
  rawScore: number
}

export interface Article {
  sentiment: number
  url: string
  title: string
  source: string
  publishedAt?: string
}

/**
 * Where the data actually came from (issue #67):
 * - live:  real, freshly aggregated news
 * - stale: a retained last-good snapshot shown during an outage (client-side)
 * - demo:  synthetic time-based data; nothing real is available
 * Servers only ever emit 'live' or 'demo'; 'stale' is derived by the client.
 */
export type DataMode = 'live' | 'stale' | 'demo'

export interface BaseSentimentData {
  score: number
  timestamp: number
  sources: Array<{
    name: string
    score: number
    articles: number
  }>
  dataMode?: DataMode
}

/**
 * True when a payload is synthetic. Checks the explicit dataMode field and,
 * for older payloads without it, the legacy Fallback source marker.
 */
export function isDemoPayload(data: Pick<BaseSentimentData, 'dataMode' | 'sources'>): boolean {
  if (data.dataMode === 'demo') return true
  if (data.dataMode === 'live') return false
  return Array.isArray(data.sources) && data.sources.length > 0
    && data.sources.every(s => s.name === 'Fallback')
}

// ─── Emotion categories (issue #30) ──────────────────────────────────────────
// Labels match j-hartmann/emotion-english-distilroberta-base (Ekman 6 + neutral)

export const EMOTION_LABELS = ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'] as const
export type EmotionLabel = (typeof EMOTION_LABELS)[number]
export type EmotionVector = Record<EmotionLabel, number>

export interface EmotionState {
  /** Raw averaged distribution across analyzed articles (sums to ~1, incl. neutral) */
  vector: EmotionVector
  /** Argmax over the non-neutral classes after renormalization */
  dominant: Exclude<EmotionLabel, 'neutral'>
  /** 1 - neutral share: how strongly the world feels *anything* right now */
  intensity: number
}

const NON_NEUTRAL = EMOTION_LABELS.filter(l => l !== 'neutral') as Array<Exclude<EmotionLabel, 'neutral'>>

export function emptyEmotionVector(): EmotionVector {
  return { anger: 0, disgust: 0, fear: 0, joy: 0, neutral: 0, sadness: 0, surprise: 0 }
}

/**
 * Aggregate per-article emotion distributions into one world-emotion state.
 * News-headline models over-report neutral, so the dominant label is chosen
 * over the renormalized non-neutral classes and neutral only dampens intensity.
 */
export function aggregateEmotionVectors(vectors: EmotionVector[]): EmotionState | null {
  if (vectors.length === 0) return null

  const sum = emptyEmotionVector()
  for (const v of vectors) {
    for (const label of EMOTION_LABELS) sum[label] += v[label] ?? 0
  }

  const total = EMOTION_LABELS.reduce((acc, l) => acc + sum[l], 0)
  if (total <= 0) return null

  const vector = emptyEmotionVector()
  for (const label of EMOTION_LABELS) vector[label] = sum[label] / total

  let dominant: Exclude<EmotionLabel, 'neutral'> = 'joy'
  let best = -1
  for (const label of NON_NEUTRAL) {
    if (vector[label] > best) { best = vector[label]; dominant = label }
  }

  return {
    vector,
    dominant,
    intensity: Math.max(0, Math.min(1, 1 - vector.neutral)),
  }
}

/** RGB anchors per emotion, tuned to read distinctly against the dark background */
export const EMOTION_COLOR_ANCHORS: Record<Exclude<EmotionLabel, 'neutral'>, [number, number, number]> = {
  joy: [0.95, 0.75, 0.20],      // warm gold (matches the +1 sentiment anchor)
  surprise: [0.55, 0.85, 0.95], // bright cyan
  fear: [0.45, 0.25, 0.65],     // cold violet
  anger: [0.85, 0.18, 0.18],    // deep red
  sadness: [0.20, 0.30, 0.55],  // desaturated blue
  disgust: [0.45, 0.55, 0.20],  // sickly yellow-green
}

const NEUTRAL_COLOR: [number, number, number] = [0.25, 0.35, 0.50] // slate (matches the 0 anchor)

/**
 * Blend emotion distribution into one RGB colour: weighted mix of the
 * non-neutral anchors, pulled toward neutral slate by the neutral share.
 */
export function emotionToColor(state: EmotionState): [number, number, number] {
  const nonNeutralTotal = NON_NEUTRAL.reduce((acc, l) => acc + state.vector[l], 0)
  if (nonNeutralTotal <= 0) return [...NEUTRAL_COLOR]

  const mixed: [number, number, number] = [0, 0, 0]
  for (const label of NON_NEUTRAL) {
    const w = state.vector[label] / nonNeutralTotal
    const [r, g, b] = EMOTION_COLOR_ANCHORS[label]
    mixed[0] += r * w; mixed[1] += g * w; mixed[2] += b * w
  }

  const t = state.intensity
  return [
    NEUTRAL_COLOR[0] + (mixed[0] - NEUTRAL_COLOR[0]) * t,
    NEUTRAL_COLOR[1] + (mixed[1] - NEUTRAL_COLOR[1]) * t,
    NEUTRAL_COLOR[2] + (mixed[2] - NEUTRAL_COLOR[2]) * t,
  ]
}

// ─── Sampling helpers (issue #70) ────────────────────────────────────────────

/** Normalize an article URL enough to catch the same story from two feeds */
export function normalizeArticleUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/+$/, '')
    return `${u.hostname.toLowerCase().replace(/^www\./, '')}${path.toLowerCase()}`
  } catch {
    return url.trim().toLowerCase()
  }
}

/** Drop later duplicates of the same story (matched on normalized URL) */
export function dedupeByUrl(articles: Article[]): Article[] {
  const seen = new Set<string>()
  const result: Article[] = []
  for (const article of articles) {
    const key = article.url ? normalizeArticleUrl(article.url) : ''
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    result.push(article)
  }
  return result
}

/**
 * Pick up to `limit` items fairly across groups: one from each group in turn
 * (round-robin) until the cap is reached, preserving each group's own order.
 * Used so a large first feed cannot monopolize the HF sample or the Reddit
 * quota by concatenation order alone.
 */
export function roundRobinByKey<T>(items: T[], keyOf: (item: T) => string, limit: number): T[] {
  if (items.length <= limit) return [...items]

  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }

  const result: T[] = []
  let queues = [...groups.values()]
  while (result.length < limit && queues.length > 0) {
    const survivors: T[][] = []
    for (const queue of queues) {
      if (result.length >= limit) break
      const item = queue.shift()
      if (item !== undefined) result.push(item)
      if (queue.length > 0) survivors.push(queue)
    }
    queues = survivors
  }
  return result
}

// ─── Pre-compiled regex patterns ─────────────────────────────────────────────

// Word-boundary anchored so short stems don't match inside unrelated words
// (e.g. "war" in hardware/award, "win" in window). English words use full
// \b…\b with common inflections; Danish stems use a leading \b only so
// suffixed forms (krigen, krisen, katastrofen) still match.
const positiveWords: Array<[RegExp, number]> = [
  [/\bexcellent\b/g, 0.3], [/\bamazing\b/g, 0.3], [/\bwonderful\b/g, 0.3], [/\bfantastic\b/g, 0.3],
  [/\bgreat\b/g, 0.2], [/\bgood\b/g, 0.15], [/\bpositive\b/g, 0.2], [/\bsuccess(ful|es)?\b/g, 0.25],
  [/\bwins?\b/g, 0.2], [/\bvictor(y|ies)\b/g, 0.25], [/\bachievements?\b/g, 0.2], [/\bbreakthroughs?\b/g, 0.3],
  [/\bhelps?\b/g, 0.1], [/\bsupports?\b/g, 0.15], [/\blove[ds]?\b/g, 0.2], [/\bhopes?\b/g, 0.15],
  [/\bprogress\b/g, 0.2], [/\bimprovements?\b/g, 0.2], [/\bgrowth\b/g, 0.2], [/\bprosperity\b/g, 0.25],
  [/\bpeace(ful)?\b/g, 0.2], [/\bunity\b/g, 0.15], [/\bcooperation\b/g, 0.15], [/\binnovations?\b/g, 0.2],
  [/\bfantastisk/g, 0.3], [/\bfremgang/g, 0.2], [/\blykkedes\b/g, 0.2], [/\bsucces\b/g, 0.2],
]

const negativeWords: Array<[RegExp, number]> = [
  [/\bterrible\b/g, 0.3], [/\bawful\b/g, 0.3], [/\bhorrible\b/g, 0.3], [/\bdisasters?\b/g, 0.3],
  [/\bbad\b/g, 0.15], [/\bnegative\b/g, 0.2], [/\bfail(s|ed|ing)?\b/g, 0.2], [/\bfailures?\b/g, 0.25],
  [/\bloss(es)?\b/g, 0.2], [/\bcris(is|es)\b/g, 0.3], [/\bwars?\b/g, 0.3], [/\bconflicts?\b/g, 0.25],
  [/\bhate[ds]?\b/g, 0.25], [/\bangry\b/g, 0.2], [/\bfears?\b/g, 0.2], [/\bviolen(ce|t)\b/g, 0.3],
  [/\bdeaths?\b/g, 0.3], [/\battacks?\b/g, 0.3], [/\bdestruction\b/g, 0.3], [/\bcollapsed?\b/g, 0.25],
  [/\bdårlig/g, 0.2], [/\bkatastrofe/g, 0.3], [/\bfejlede?\b/g, 0.2], [/\bkrise/g, 0.3],
  [/\bkrig/g, 0.3], [/\bvold\b/g, 0.25], [/\bfrygt/g, 0.2],
]

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Normalize sentiment value to [-1, 1] range
 */
export function normalizeSentiment(value: number): number {
  const clamped = Math.max(-10, Math.min(10, value))
  return Math.max(-1, Math.min(1, clamped / 2.5))
}

/**
 * Keyword-based sentiment analysis (fallback when API doesn't provide sentiment)
 * Uses pre-compiled regex patterns for performance.
 */
export function keywordBasedSentiment(text: string): number {
  const lowerText = text.toLowerCase()
  let sentiment = 0

  for (const [regex, weight] of positiveWords) {
    regex.lastIndex = 0
    const count = (lowerText.match(regex) || []).length
    sentiment += count * weight
  }

  for (const [regex, weight] of negativeWords) {
    regex.lastIndex = 0
    const count = (lowerText.match(regex) || []).length
    sentiment -= count * weight
  }

  const textLength = text.split(/\s+/).length
  const lengthFactor = Math.min(1, 100 / textLength)
  const scaled = sentiment * 10 * lengthFactor

  return Math.max(-10, Math.min(10, scaled))
}

/**
 * Get dynamic fallback data based on time (used when all APIs fail)
 */
export function getDynamicFallbackData(): BaseSentimentData {
  const now = Date.now()
  const hour = new Date(now).getHours()
  const minute = new Date(now).getMinutes()

  const timeBasedSeed = (hour * 60 + minute) % 1440
  const baseScore = 0.3 + (Math.sin(timeBasedSeed * 0.1) * 0.4)

  const seconds = new Date(now).getSeconds()
  const variation = (seconds % 30) / 100

  const finalScore = Math.max(-1, Math.min(1, baseScore + variation))

  return {
    score: finalScore,
    timestamp: now,
    sources: [
      { name: 'Fallback', score: finalScore, articles: 0 },
    ],
    dataMode: 'demo',
  }
}

/**
 * Get dynamic date range (last 24 hours) formatted for GDELT API
 */
export function getDateRange(): { start: string; end: string; isoStart: string; isoEnd: string } {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}${month}${day}${hours}${minutes}${seconds}`
  }

  return {
    start: formatDate(yesterday),
    end: formatDate(now),
    isoStart: yesterday.toISOString(),
    isoEnd: now.toISOString(),
  }
}

/**
 * Standard GDELT query string
 */
export const GDELT_QUERY = '(politics OR technology OR society OR economy OR climate OR health OR world OR international) NOT (sport OR entertainment OR celebrity OR gossip OR fashion)'

/**
 * Normalize a raw GDELT article into a standard Article shape
 */
export function normalizeGDELTArticle(article: Record<string, unknown>): Article {
  let rawSentiment = (article.sentiment ?? article.tone ?? article.avgtone ?? null) as number | null

  if (rawSentiment === null || rawSentiment === undefined || rawSentiment === 0) {
    const text = `${article.title || ''} ${article.seo || ''} ${article.description || ''}`.toLowerCase()
    rawSentiment = keywordBasedSentiment(text)
  }

  return {
    sentiment: Math.max(-10, Math.min(10, rawSentiment)),
    url: (article.url || article.shareurl || '') as string,
    title: (article.title || article.seo || '') as string,
    source: (article.source || article.domain || 'Unknown') as string,
    publishedAt: (article.publishedAt || article.date) as string | undefined,
  }
}

/**
 * Extract articles array from GDELT response (handles multiple formats)
 */
export function extractArticlesFromGDELT(data: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (obj.error || obj.message) return null
    if (Array.isArray(obj.articles)) return obj.articles
    if (Array.isArray(obj.results)) return obj.results
    if (Array.isArray(obj.docs)) return obj.docs
  }
  return null
}

/**
 * Calculate weighted sentiment score from grouped sources
 */
export function calculateWeightedSentiment(
  articles: Article[]
): { score: number; sources: Array<{ name: string; score: number; articles: number; weight: number }> } {
  const sourceGroups = articles.reduce((acc, article) => {
    const source = article.source
    if (!acc[source]) acc[source] = []
    acc[source].push(article)
    return acc
  }, {} as Record<string, Article[]>)

  const sources = Object.entries(sourceGroups).map(([name, arts]) => {
    const validArticles = arts.filter(a => a.sentiment !== 0)
    const articlesToUse = validArticles.length > 0 ? validArticles : arts
    const rawAvgSentiment = articlesToUse.length > 0
      ? articlesToUse.reduce((sum, a) => sum + a.sentiment, 0) / articlesToUse.length
      : 0

    return {
      name,
      rawScore: rawAvgSentiment,
      articles: arts.length,
      weight: validArticles.length > 0 ? validArticles.length : arts.length,
    }
  })

  // Intensity-weighted average (score^1.5)
  const totalWeight = sources.reduce((sum, source) => {
    const intensityWeight = 1 + Math.pow(Math.abs(source.rawScore), 1.5)
    return sum + source.weight * intensityWeight
  }, 0)

  const rawWeightedAverage = totalWeight > 0
    ? sources.reduce((sum, source) => {
        const intensityWeight = 1 + Math.pow(Math.abs(source.rawScore), 1.5)
        return sum + source.rawScore * source.weight * intensityWeight
      }, 0) / totalWeight
    : 0

  const score = normalizeSentiment(rawWeightedAverage)

  return {
    score,
    sources: sources.map(({ rawScore, ...rest }) => ({
      ...rest,
      score: normalizeSentiment(rawScore),
    })),
  }
}
