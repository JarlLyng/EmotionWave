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

export interface BaseSentimentData {
  score: number
  timestamp: number
  sources: Array<{
    name: string
    score: number
    articles: number
  }>
}

// ─── Pre-compiled regex patterns ─────────────────────────────────────────────

const positiveWords: Array<[RegExp, number]> = [
  [/excellent/g, 0.3], [/amazing/g, 0.3], [/wonderful/g, 0.3], [/fantastic/g, 0.3],
  [/great/g, 0.2], [/good/g, 0.15], [/positive/g, 0.2], [/success/g, 0.25],
  [/win/g, 0.2], [/victory/g, 0.25], [/achievement/g, 0.2], [/breakthrough/g, 0.3],
  [/help/g, 0.1], [/support/g, 0.15], [/love/g, 0.2], [/hope/g, 0.15],
  [/progress/g, 0.2], [/improvement/g, 0.2], [/growth/g, 0.2], [/prosperity/g, 0.25],
  [/peace/g, 0.2], [/unity/g, 0.15], [/cooperation/g, 0.15], [/innovation/g, 0.2],
  [/fantastisk/g, 0.3], [/fremgang/g, 0.2], [/lykkedes/g, 0.2], [/succes/g, 0.2],
]

const negativeWords: Array<[RegExp, number]> = [
  [/terrible/g, 0.3], [/awful/g, 0.3], [/horrible/g, 0.3], [/disaster/g, 0.3],
  [/bad/g, 0.15], [/negative/g, 0.2], [/fail/g, 0.2], [/failure/g, 0.25],
  [/loss/g, 0.2], [/crisis/g, 0.3], [/war/g, 0.3], [/conflict/g, 0.25],
  [/hate/g, 0.25], [/angry/g, 0.2], [/fear/g, 0.2], [/violence/g, 0.3],
  [/death/g, 0.3], [/attack/g, 0.3], [/destruction/g, 0.3], [/collapse/g, 0.25],
  [/dårlig/g, 0.2], [/katastrofe/g, 0.3], [/fejlet/g, 0.2], [/krise/g, 0.3],
  [/krig/g, 0.3], [/vold/g, 0.25], [/frygt/g, 0.2],
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
