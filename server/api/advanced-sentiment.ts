/**
 * EmotionWave Multi-Source Sentiment Analysis API
 * 
 * This module aggregates sentiment analysis from multiple news sources
 * to provide a comprehensive view of the world's mood.
 * 
 * Data Sources:
 * - GDELT API: Global news sentiment analysis
 * - NewsAPI: Additional news sources (if API key available)
 * - Reddit: Social media sentiment (optional)
 * 
 * Features:
 * - Multi-source aggregation with weighted averages
 * - Retry logic with exponential backoff
 * - Dynamic date range (last 24 hours)
 * - Sentiment normalization to [-1, 1]
 * - Fallback data when APIs unavailable
 */

import { defineEventHandler } from 'h3'

interface Article {
  sentiment: number
  url: string
  title: string
  source: string
  publishedAt?: string
}

interface SentimentSource {
  name: string
  score: number
  articles: number
  weight: number
}

interface SentimentData {
  score: number
  timestamp: number
  sources: Array<{
    name: string
    score: number
    articles: number
  }>
  apiSources: string[] // Which APIs contributed data
}

// Cache configuration
const CACHE_DURATION = 30 * 1000 // 30 seconds
let cachedData: SentimentData | null = null

// Runtime config for API keys
const getConfig = () => {
  const config = useRuntimeConfig()
  return {
    newsApiKey: config.newsApiKey || process.env.NEWS_API_KEY || null,
    huggingFaceKey: config.huggingFaceKey || process.env.HUGGINGFACE_API_KEY || null
  }
}

/**
 * Retry helper with exponential backoff
 */
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
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}

/**
 * Get dynamic date range (last 24 hours)
 */
function getDateRange(): { start: string; end: string; isoStart: string; isoEnd: string } {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  // Format: YYYYMMDDHHMMSS (for GDELT)
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
    isoEnd: now.toISOString()
  }
}

/**
 * Normalize sentiment value to [-1, 1] range
 */
function normalizeSentiment(value: number): number {
  const clamped = Math.max(-10, Math.min(10, value))
  return Math.max(-1, Math.min(1, clamped / 10))
}

/**
 * Fetch news from GDELT API with retry logic
 */
async function fetchGDELTNews(): Promise<Article[]> {
  const dateRange = getDateRange()
  const focusedQuery = '(language:dan OR language:eng) AND (politics OR technology OR society OR economy OR climate OR health OR world OR international) NOT (sport OR entertainment OR celebrity OR gossip OR fashion)'
  
  return retryWithBackoff(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    
    try {
      const response = await fetch(
        'https://api.gdeltproject.org/api/v2/doc/doc?' +
        `query=${encodeURIComponent(focusedQuery)}` +
        '&mode=artlist' +
        '&format=json' +
        '&maxrecords=30' +
        '&sort=hybridrel' +
        `&startdatetime=${dateRange.start}` +
        `&enddatetime=${dateRange.end}`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'EmotionWave/1.0' }
        }
      )
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`GDELT API error: ${response.status}`)
      }
      
      const data: any = await response.json()
      let articles: any[] = []
      
      if (Array.isArray(data)) {
        articles = data
      } else if (data.articles) {
        articles = data.articles
      } else if (data.results) {
        articles = data.results
      }
      
      return articles.map((article: any) => ({
        sentiment: Math.max(-10, Math.min(10, article.sentiment || article.tone || 0)),
        url: article.url || article.shareurl || '',
        title: article.title || article.seo || '',
        source: article.source || article.domain || 'Unknown',
        publishedAt: article.publishedAt || article.date
      }))
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  })
}

/**
 * Fetch news from NewsAPI (if API key available)
 */
async function fetchNewsAPINews(): Promise<Article[]> {
  const config = getConfig()
  if (!config.newsApiKey) {
    return []
  }
  
  const dateRange = getDateRange()
  
  return retryWithBackoff(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    
    try {
      // NewsAPI requires specific query format
      const response = await fetch(
        `https://newsapi.org/v2/everything?` +
        `q=(politics OR technology OR society OR economy OR climate OR health) ` +
        `NOT (sport OR entertainment OR celebrity)&` +
        `language=en,da&` +
        `from=${dateRange.isoStart.split('T')[0]}&` +
        `to=${dateRange.isoEnd.split('T')[0]}&` +
        `sortBy=relevancy&` +
        `pageSize=30&` +
        `apiKey=${config.newsApiKey}`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'EmotionWave/1.0' }
        }
      )
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.status !== 'ok' || !data.articles) {
        return []
      }
      
      // NewsAPI doesn't provide sentiment, so we'll use a simple keyword-based approach
      // In production, you'd use HuggingFace or similar for proper sentiment analysis
      return data.articles.map((article: any) => {
        const text = `${article.title} ${article.description || ''}`.toLowerCase()
        let sentiment = 0
        
        // Simple keyword-based sentiment (can be improved with HuggingFace)
        const positiveWords = ['good', 'great', 'positive', 'success', 'win', 'help', 'support', 'love', 'hope', 'progress']
        const negativeWords = ['bad', 'terrible', 'negative', 'fail', 'loss', 'hate', 'angry', 'fear', 'crisis', 'war']
        
        positiveWords.forEach(word => {
          if (text.includes(word)) sentiment += 0.1
        })
        negativeWords.forEach(word => {
          if (text.includes(word)) sentiment -= 0.1
        })
        
        return {
          sentiment: Math.max(-10, Math.min(10, sentiment * 10)), // Scale to GDELT range
          url: article.url || '',
          title: article.title || '',
          source: article.source?.name || 'Unknown',
          publishedAt: article.publishedAt
        }
      })
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  })
}

/**
 * Fetch Reddit posts for social sentiment (optional)
 */
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
      const subredditPosts = data.data.children.map((child: any) => {
        const text = `${child.data.title} ${child.data.selftext || ''}`.toLowerCase()
        let sentiment = 0
        
        // Simple keyword-based sentiment
        const positiveWords = ['good', 'great', 'positive', 'success', 'win', 'help', 'love', 'hope']
        const negativeWords = ['bad', 'terrible', 'negative', 'fail', 'loss', 'hate', 'angry', 'fear']
        
        positiveWords.forEach(word => {
          if (text.includes(word)) sentiment += 0.1
        })
        negativeWords.forEach(word => {
          if (text.includes(word)) sentiment -= 0.1
        })
        
        // Weight by upvotes
        const weight = Math.log10(child.data.score + 1)
        sentiment *= (1 + weight * 0.1)
        
        return {
          sentiment: Math.max(-10, Math.min(10, sentiment * 10)),
          url: `https://reddit.com${child.data.permalink}`,
          title: child.data.title,
          source: `Reddit: r/${subreddit}`,
          publishedAt: new Date(child.data.created_utc * 1000).toISOString()
        }
      })
      
      posts.push(...subredditPosts)
    }
  } catch (error) {
    console.warn('Reddit API error:', error)
  }
  
  return posts
}

/**
 * Aggregate sentiment from multiple sources
 */
async function aggregateSentiment(): Promise<SentimentData> {
  const apiSources: string[] = []
  const allArticles: Article[] = []
  
  // Fetch from GDELT (primary source)
  try {
    const gdeltArticles = await fetchGDELTNews()
    if (gdeltArticles.length > 0) {
      allArticles.push(...gdeltArticles)
      apiSources.push('GDELT')
      console.log(`GDELT: ${gdeltArticles.length} articles`)
    }
  } catch (error) {
    console.warn('GDELT fetch failed:', error)
  }
  
  // Fetch from NewsAPI (if available)
  try {
    const newsApiArticles = await fetchNewsAPINews()
    if (newsApiArticles.length > 0) {
      allArticles.push(...newsApiArticles)
      apiSources.push('NewsAPI')
      console.log(`NewsAPI: ${newsApiArticles.length} articles`)
    }
  } catch (error) {
    console.warn('NewsAPI fetch failed:', error)
  }
  
  // Fetch from Reddit (optional, lower weight)
  try {
    const redditArticles = await fetchRedditSentiment()
    if (redditArticles.length > 0) {
      // Reddit gets lower weight (0.5x) as it's less reliable
      allArticles.push(...redditArticles.map(a => ({
        ...a,
        sentiment: a.sentiment * 0.5
      })))
      apiSources.push('Reddit')
      console.log(`Reddit: ${redditArticles.length} posts`)
    }
  } catch (error) {
    console.warn('Reddit fetch failed:', error)
  }
  
  // If no articles, return fallback
  if (allArticles.length === 0) {
    console.log('No articles from any source, using fallback')
    return getDynamicFallbackData()
  }
  
  // Group articles by source
  const sourceGroups = allArticles.reduce((acc, article) => {
    const source = article.source
    if (!acc[source]) {
      acc[source] = []
    }
    acc[source].push(article)
    return acc
  }, {} as Record<string, Article[]>)
  
  // Calculate weighted averages per source
  const sources: SentimentSource[] = Object.entries(sourceGroups).map(([name, articles]) => {
    const rawAvgSentiment = articles.reduce((sum, article) => sum + article.sentiment, 0) / articles.length
    const articleCount = articles.length
    
    return {
      name,
      rawScore: rawAvgSentiment,
      articles: articleCount,
      weight: articleCount
    }
  })
  
  // Calculate overall weighted average
  const totalWeight = sources.reduce((sum, source) => sum + source.weight, 0)
  const rawWeightedAverage = totalWeight > 0
    ? sources.reduce((sum, source) => sum + (source.rawScore * source.weight), 0) / totalWeight
    : 0
  
  // Normalize only once on total score
  const averageSentiment = normalizeSentiment(rawWeightedAverage)
  
  // Prepare response
  const sourcesForResponse = sources.map(({ rawScore, ...rest }) => ({
    ...rest,
    score: normalizeSentiment(rawScore)
  }))
  
  console.log(`Aggregated sentiment: ${averageSentiment.toFixed(2)} from ${apiSources.join(', ')} (${allArticles.length} total articles, ${sources.length} sources)`)
  
  return {
    score: averageSentiment,
    sources: sourcesForResponse,
    timestamp: Date.now(),
    apiSources
  }
}

/**
 * Dynamic fallback data based on time
 */
function getDynamicFallbackData(): SentimentData {
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
      { name: 'Fallback', score: finalScore, articles: 0 }
    ],
    apiSources: ['Fallback']
  }
}

/**
 * Main API endpoint handler
 */
export default defineEventHandler(async (event) => {
  // Check cache
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log('Returning cached sentiment data')
    return cachedData
  }

  try {
    // Aggregate from multiple sources
    cachedData = await aggregateSentiment()
    return cachedData
  } catch (error) {
    console.error('Error aggregating sentiment data:', error)
    return getDynamicFallbackData()
  }
})
