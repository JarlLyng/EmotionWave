/**
 * EmotionWave Multi-Source Sentiment Analysis API
 *
 * Aggregates sentiment from GDELT, NewsAPI, Reddit, and HuggingFace.
 */

import { defineEventHandler } from 'h3'
import {
  type Article,
  type BaseSentimentData,
  normalizeSentiment,
  keywordBasedSentiment,
  getDynamicFallbackData as getBaseFallbackData,
  getDateRange,
  normalizeGDELTArticle,
  extractArticlesFromGDELT,
  calculateWeightedSentiment,
  GDELT_QUERY,
} from '~/utils/sentiment'

// ─── Extended types for server response ──────────────────────────────────────

interface ServerSentimentData extends BaseSentimentData {
  apiSources: string[]
  articles?: Article[]
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const CACHE_DURATION = 30 * 1000
let cachedData: ServerSentimentData | null = null

// ─── Config ──────────────────────────────────────────────────────────────────

const getConfig = () => {
  const config = useRuntimeConfig()
  return {
    newsApiKey: (config.newsApiKey || process.env.NEWS_API_KEY || null) as string | null,
    huggingFaceKey: (config.huggingFaceKey || process.env.HUGGINGFACE_API_KEY || null) as string | null,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}

function smartTruncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  const truncated = text.substring(0, limit)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  )
  if (lastSentenceEnd > limit * 0.8) return truncated.substring(0, lastSentenceEnd + 1)
  const lastSpace = truncated.lastIndexOf(' ')
  return lastSpace > -1 ? truncated.substring(0, lastSpace) : truncated
}

// ─── Article sentiment cache ─────────────────────────────────────────────────

const articleCache = new Map<string, number>()
const MAX_CACHE_SIZE = 1000

// ─── GDELT ───────────────────────────────────────────────────────────────────

async function fetchGDELTNews(): Promise<Article[]> {
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

      const data = await response.json() as unknown
      const rawArticles = extractArticlesFromGDELT(data)
      if (!rawArticles) return []

      return rawArticles.map(normalizeGDELTArticle)
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  })
}

// ─── HuggingFace ─────────────────────────────────────────────────────────────

async function analyzeSentimentWithHuggingFace(text: string, apiKey: string): Promise<number> {
  const endpoints = [
    'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',
    'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment',
    'https://router.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',
    'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english',
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text.substring(0, 500) }),
      })

      if (response.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const retry = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: text.substring(0, 500) }),
        })
        if (retry.ok) {
          const data = await retry.json()
          if (data.error?.includes('no longer supported')) continue
          return parseHuggingFaceSentiment(data)
        }
        continue
      }

      if (response.ok) {
        const data = await response.json()
        if (data.error?.includes('no longer supported')) continue
        return parseHuggingFaceSentiment(data)
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(`HuggingFace authentication failed (${response.status})`)
      }
      if (response.status === 429) {
        throw new Error('HuggingFace rate limit exceeded')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`HuggingFace endpoint ${endpoint} failed:`, msg)
      continue
    }
  }

  throw new Error('All HuggingFace endpoints failed')
}

interface HuggingFaceLabel {
  label: string
  score: number
}

function parseHuggingFaceSentiment(data: unknown): number {
  let results = data
  while (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
    results = results[0]
  }

  let sentimentArray: HuggingFaceLabel[] | null = null

  if (Array.isArray(results)) {
    sentimentArray = results as HuggingFaceLabel[]
  } else if (results && typeof results === 'object' && 'label' in (results as Record<string, unknown>)) {
    sentimentArray = [results as HuggingFaceLabel]
  } else {
    return 0
  }

  if (!sentimentArray || sentimentArray.length === 0) return 0

  let positiveScore = 0
  let negativeScore = 0
  let neutralScore = 0

  for (const item of sentimentArray) {
    const label = (item.label ?? '').toUpperCase()
    const score = item.score ?? 0

    if (label.includes('POSITIVE') || label.includes('POS') || label === 'LABEL_2') {
      positiveScore = score
    } else if (label.includes('NEGATIVE') || label.includes('NEG') || label === 'LABEL_0') {
      negativeScore = score
    } else if (label.includes('NEUTRAL') || label.includes('NEU') || label === 'LABEL_1') {
      neutralScore = score
    }
  }

  if (positiveScore > negativeScore && positiveScore > neutralScore) return positiveScore * 10
  if (negativeScore > positiveScore && negativeScore > neutralScore) return -negativeScore * 10
  return 0
}

// ─── NewsAPI ─────────────────────────────────────────────────────────────────

async function fetchNewsAPINews(): Promise<Article[]> {
  const config = getConfig()
  if (!config.newsApiKey) return []

  const dateRange = getDateRange()
  const query = '(politics OR technology OR society OR economy OR climate OR health) NOT (sport OR entertainment OR celebrity)'
  const allArticles: Article[] = []
  const languages = ['en', 'da']

  for (const lang of languages) {
    try {
      const rawArticles = await retryWithBackoff(async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        try {
          const response = await fetch(
            `https://newsapi.org/v2/everything?` +
            `q=${encodeURIComponent(query)}&language=${lang}&` +
            `from=${dateRange.isoStart.split('T')[0]}&to=${dateRange.isoEnd.split('T')[0]}&` +
            `sortBy=relevancy&pageSize=15&apiKey=${config.newsApiKey}`,
            {
              signal: controller.signal,
              headers: { 'User-Agent': 'EmotionWave/1.0' },
            }
          )

          clearTimeout(timeoutId)
          if (!response.ok) throw new Error(`NewsAPI error: ${response.status}`)

          const data = await response.json()
          return (data.status === 'ok' && data.articles) ? data.articles : []
        } catch (error) {
          clearTimeout(timeoutId)
          throw error
        }
      })

      const articlesToAnalyze = rawArticles.slice(0, 10)
      const remainingArticles = rawArticles.slice(10)

      for (const article of articlesToAnalyze) {
        const fullText = `${article.title || ''} ${article.description || ''}`.trim()
        if (!fullText) continue

        const cacheKey = fullText.substring(0, 100)
        let sentiment = 0

        if (articleCache.has(cacheKey)) {
          sentiment = articleCache.get(cacheKey)!
        } else {
          const truncatedText = smartTruncate(fullText, 500)

          if (config.huggingFaceKey) {
            try {
              const timeoutPromise = new Promise<number>((_, reject) =>
                setTimeout(() => reject(new Error('HuggingFace timeout')), 3000)
              )
              sentiment = await Promise.race([
                analyzeSentimentWithHuggingFace(truncatedText, config.huggingFaceKey),
                timeoutPromise,
              ])

              if (articleCache.size >= MAX_CACHE_SIZE) {
                const firstKey = articleCache.keys().next().value
                if (firstKey) articleCache.delete(firstKey)
              }
              articleCache.set(cacheKey, sentiment)
            } catch {
              sentiment = keywordBasedSentiment(fullText)
            }
          } else {
            sentiment = keywordBasedSentiment(fullText)
          }
        }

        allArticles.push({
          sentiment: Math.max(-10, Math.min(10, sentiment)),
          url: article.url || '',
          title: article.title || '',
          source: article.source?.name || 'Unknown',
          publishedAt: article.publishedAt,
        })
      }

      for (const article of remainingArticles) {
        const text = `${article.title || ''} ${article.description || ''}`.trim()
        if (!text) continue

        allArticles.push({
          sentiment: Math.max(-10, Math.min(10, keywordBasedSentiment(text))),
          url: article.url || '',
          title: article.title || '',
          source: article.source?.name || 'Unknown',
          publishedAt: article.publishedAt,
        })
      }
    } catch (error) {
      console.warn(`NewsAPI fetch failed for language ${lang}:`, error)
    }
  }

  return allArticles
}

// ─── Reddit ──────────────────────────────────────────────────────────────────

interface RedditChild {
  data: {
    title: string
    selftext?: string
    score: number
    permalink: string
    created_utc: number
  }
}

async function fetchRedditSentiment(): Promise<Article[]> {
  const subreddits = ['worldnews', 'news', 'technology', 'science', 'environment']
  const posts: Article[] = []

  try {
    for (const subreddit of subreddits) {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`,
        { headers: { 'User-Agent': 'EmotionWave/1.0' } }
      )
      if (!response.ok) continue

      const data = await response.json()
      const children: RedditChild[] = data.data.children

      for (const child of children) {
        const text = `${child.data.title} ${child.data.selftext || ''}`
        let sentiment = keywordBasedSentiment(text)

        const upvoteWeight = Math.log10(Math.max(1, child.data.score) + 1) / 2
        sentiment *= (1 + upvoteWeight * 0.2)

        posts.push({
          sentiment: Math.max(-10, Math.min(10, sentiment)),
          url: `https://reddit.com${child.data.permalink}`,
          title: child.data.title,
          source: `Reddit: r/${subreddit}`,
          publishedAt: new Date(child.data.created_utc * 1000).toISOString(),
        })
      }
    }
  } catch (error) {
    console.warn('Reddit API error:', error)
  }

  return posts
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

async function aggregateSentiment(): Promise<ServerSentimentData> {
  const apiSources: string[] = []
  const allArticles: Article[] = []

  // Fetch from all sources in parallel
  const [gdeltResult, newsApiResult, redditResult] = await Promise.allSettled([
    fetchGDELTNews(),
    fetchNewsAPINews(),
    fetchRedditSentiment(),
  ])

  if (gdeltResult.status === 'fulfilled' && gdeltResult.value.length > 0) {
    allArticles.push(...gdeltResult.value)
    apiSources.push('GDELT')
  }

  if (newsApiResult.status === 'fulfilled' && newsApiResult.value.length > 0) {
    allArticles.push(...newsApiResult.value)
    apiSources.push('NewsAPI')
  }

  if (redditResult.status === 'fulfilled' && redditResult.value.length > 0) {
    allArticles.push(...redditResult.value.slice(0, 20))
    apiSources.push('Reddit')
  }

  if (allArticles.length === 0) {
    const fallback = getBaseFallbackData()
    return { ...fallback, apiSources: ['Fallback'], articles: [] }
  }

  const { score, sources } = calculateWeightedSentiment(allArticles)
  const articlesWithTitles = allArticles.filter(a => a.title && a.title.trim().length > 0)

  return {
    score,
    sources,
    timestamp: Date.now(),
    apiSources,
    articles: articlesWithTitles.slice(0, 50),
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default defineEventHandler(async () => {
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData
  }

  try {
    cachedData = await aggregateSentiment()
    return cachedData
  } catch (error) {
    console.error('Error aggregating sentiment data:', error)
    const fallback = getBaseFallbackData()
    return { ...fallback, apiSources: ['Fallback'], articles: [] }
  }
})
