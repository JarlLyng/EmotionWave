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
  const huggingFaceKey = config.huggingFaceKey || process.env.HUGGINGFACE_API_KEY || null
  const newsApiKey = config.newsApiKey || process.env.NEWS_API_KEY || null
  
  // Log API key availability (without exposing the key itself)
  console.log('API keys status:', {
    hasHuggingFaceKey: !!huggingFaceKey,
    hasNewsApiKey: !!newsApiKey,
    huggingFaceKeyLength: huggingFaceKey ? huggingFaceKey.length : 0,
    newsApiKeyLength: newsApiKey ? newsApiKey.length : 0
  })
  
  return {
    newsApiKey,
    huggingFaceKey
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
  // Removed language:dan filter as GDELT doesn't support it in query syntax
  // GDELT doc API will return articles in various languages, we filter by relevance instead
  const focusedQuery = '(politics OR technology OR society OR economy OR climate OR health OR world OR international) NOT (sport OR entertainment OR celebrity OR gossip OR fashion)'
  
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
 * Analyze sentiment using HuggingFace API
 */
async function analyzeSentimentWithHuggingFace(text: string, apiKey: string): Promise<number> {
  try {
    // Try multiple endpoints and models
    // HuggingFace has changed their API structure, so we try multiple options
    const endpoints = [
      // Standard Inference API endpoint
      'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',
      // Alternative: older model name
      'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment',
      // Router endpoint (newer)
      'https://router.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',
      // Alternative sentiment model
      'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english'
    ]

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying HuggingFace endpoint: ${endpoint}`)
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: text.substring(0, 500) }) // Limit text length
        })

        const status = response.status
        console.log(`HuggingFace response status: ${status} for endpoint: ${endpoint}`)

        // If model is loading, wait a bit and retry once
        if (status === 503) {
          console.log('Model is loading, waiting 2 seconds...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          const retryResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: text.substring(0, 500) })
          })
          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            console.log('HuggingFace retry response:', JSON.stringify(retryData).substring(0, 200))
            // Check if response indicates endpoint is deprecated
            if (retryData.error && retryData.error.includes('no longer supported')) {
              console.log('Endpoint deprecated, trying next...')
              continue // Try next endpoint
            }
            return parseHuggingFaceSentiment(retryData)
          } else {
            const errorText = await retryResponse.text()
            console.error(`HuggingFace retry failed with status ${retryResponse.status}: ${errorText.substring(0, 200)}`)
            continue
          }
        }

        if (response.ok) {
          const data = await response.json()
          console.log('HuggingFace response data:', JSON.stringify(data).substring(0, 200))
          // Check if response indicates endpoint is deprecated
          if (data.error && data.error.includes('no longer supported')) {
            console.log('Endpoint deprecated, trying next...')
            continue // Try next endpoint
          }
          return parseHuggingFaceSentiment(data)
        } else {
          // Log error response for debugging
          const errorText = await response.text()
          console.error(`HuggingFace API error (status ${status}): ${errorText.substring(0, 300)}`)
          
          // Check for authentication errors
          if (status === 401 || status === 403) {
            console.error('HuggingFace authentication failed')
            console.error('Possible causes:')
            console.error('1. Invalid API key')
            console.error('2. Token missing "Make calls to the serverless Inference API" permission')
            console.error('3. Token may need "read" or "write" permissions (check HuggingFace token settings)')
            console.error(`Error response: ${errorText.substring(0, 200)}`)
            throw new Error(`HuggingFace authentication failed (${status}): ${errorText.substring(0, 100)}`)
          }
          
          // Check for rate limiting
          if (status === 429) {
            console.error('HuggingFace rate limit exceeded')
            throw new Error('HuggingFace rate limit exceeded')
          }
        }
      } catch (error: any) {
        console.error(`HuggingFace endpoint ${endpoint} failed:`, error.message || error)
        // Continue to next endpoint if this one fails
        continue
      }
    }

    // If all endpoints fail, throw error to trigger fallback
    throw new Error('All HuggingFace endpoints failed')
  } catch (error) {
    console.warn('HuggingFace sentiment analysis failed:', error)
    throw error
  }
}

/**
 * Parse HuggingFace sentiment response to GDELT scale (-10 to 10)
 * HuggingFace returns: [{label: 'POSITIVE', score: 0.9}, {label: 'NEGATIVE', score: 0.05}, {label: 'NEUTRAL', score: 0.05}]
 */
function parseHuggingFaceSentiment(data: any): number {
  // Handle array response
  const results = Array.isArray(data) ? data[0] : data
  
  // Handle nested array (sometimes API returns [[{...}]])
  const sentiment = Array.isArray(results) ? results[0] : results
  
  if (!sentiment || !Array.isArray(sentiment)) {
    return 0 // Neutral if we can't parse
  }

  // Find the highest scoring label
  let positiveScore = 0
  let negativeScore = 0
  let neutralScore = 0

  sentiment.forEach((item: any) => {
    const label = item.label?.toUpperCase() || ''
    const score = item.score || 0
    
    if (label.includes('POSITIVE') || label.includes('POS')) {
      positiveScore = score
    } else if (label.includes('NEGATIVE') || label.includes('NEG')) {
      negativeScore = score
    } else if (label.includes('NEUTRAL') || label.includes('NEU')) {
      neutralScore = score
    }
  })

  // Convert to GDELT scale (-10 to 10)
  // Positive: 0 to 10, Negative: -10 to 0, Neutral: around 0
  if (positiveScore > negativeScore && positiveScore > neutralScore) {
    return positiveScore * 10 // Scale 0-1 to 0-10
  } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
    return -negativeScore * 10 // Scale 0-1 to -10-0
  } else {
    return 0 // Neutral
  }
}

/**
 * Fallback keyword-based sentiment analysis
 * Improved to give more variation and better sentiment detection
 */
function keywordBasedSentiment(text: string): number {
  const lowerText = text.toLowerCase()
  let sentiment = 0
  
  // Expanded positive words with weights
  const positiveWords: Array<[string, number]> = [
    ['excellent', 0.3], ['amazing', 0.3], ['wonderful', 0.3], ['fantastic', 0.3],
    ['great', 0.2], ['good', 0.15], ['positive', 0.2], ['success', 0.25],
    ['win', 0.2], ['victory', 0.25], ['achievement', 0.2], ['breakthrough', 0.3],
    ['help', 0.1], ['support', 0.15], ['love', 0.2], ['hope', 0.15],
    ['progress', 0.2], ['improvement', 0.2], ['growth', 0.2], ['prosperity', 0.25],
    ['peace', 0.2], ['unity', 0.15], ['cooperation', 0.15], ['innovation', 0.2],
    ['fantastisk', 0.3], ['fremgang', 0.2], ['lykkedes', 0.2], ['succes', 0.2]
  ]
  
  // Expanded negative words with weights
  const negativeWords: Array<[string, number]> = [
    ['terrible', 0.3], ['awful', 0.3], ['horrible', 0.3], ['disaster', 0.3],
    ['bad', 0.15], ['negative', 0.2], ['fail', 0.2], ['failure', 0.25],
    ['loss', 0.2], ['crisis', 0.3], ['war', 0.3], ['conflict', 0.25],
    ['hate', 0.25], ['angry', 0.2], ['fear', 0.2], ['violence', 0.3],
    ['death', 0.3], ['attack', 0.3], ['destruction', 0.3], ['collapse', 0.25],
    ['dårlig', 0.2], ['katastrofe', 0.3], ['fejlet', 0.2], ['krise', 0.3],
    ['krig', 0.3], ['vold', 0.25], ['frygt', 0.2]
  ]
  
  // Count positive matches (allowing multiple occurrences)
  positiveWords.forEach(([word, weight]) => {
    const count = (lowerText.match(new RegExp(word, 'g')) || []).length
    sentiment += count * weight
  })
  
  // Count negative matches (allowing multiple occurrences)
  negativeWords.forEach(([word, weight]) => {
    const count = (lowerText.match(new RegExp(word, 'g')) || []).length
    sentiment -= count * weight
  })
  
  // Normalize based on text length (longer texts can have more matches)
  const textLength = text.split(/\s+/).length
  const lengthFactor = Math.min(1, 100 / textLength) // Normalize for texts up to 100 words
  
  // Scale to GDELT range (-10 to 10)
  const scaled = sentiment * 10 * lengthFactor
  
  return Math.max(-10, Math.min(10, scaled))
}

/**
 * Fetch news from NewsAPI (if API key available)
 * Fixed: NewsAPI language parameter now uses correct format (separate calls for en/da)
 */
async function fetchNewsAPINews(): Promise<Article[]> {
  const config = getConfig()
  if (!config.newsApiKey) {
    return []
  }
  
  const dateRange = getDateRange()
  const query = '(politics OR technology OR society OR economy OR climate OR health) NOT (sport OR entertainment OR celebrity)'
  const allArticles: Article[] = []
  
  // NewsAPI language parameter only accepts single 2-letter ISO code
  // Make separate calls for English and Danish
  const languages = ['en', 'da']
  
  for (const lang of languages) {
    try {
      const articles = await retryWithBackoff(async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        
        try {
          const response = await fetch(
            `https://newsapi.org/v2/everything?` +
            `q=${encodeURIComponent(query)}&` +
            `language=${lang}&` +
            `from=${dateRange.isoStart.split('T')[0]}&` +
            `to=${dateRange.isoEnd.split('T')[0]}&` +
            `sortBy=relevancy&` +
            `pageSize=15&` +
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
          
          return data.articles
        } catch (error) {
          clearTimeout(timeoutId)
          throw error
        }
      })
      
      // Analyze sentiment for each article
      for (const article of articles) {
        const text = `${article.title || ''} ${article.description || ''}`.trim()
        if (!text) continue
        
        let sentiment = 0
        
        // Try HuggingFace first if API key is available
        // Note: HuggingFace API endpoints have changed, so we primarily use keyword-based
        // HuggingFace integration is kept for future use when API stabilizes
        if (config.huggingFaceKey) {
          try {
            sentiment = await analyzeSentimentWithHuggingFace(text, config.huggingFaceKey)
          } catch (error) {
            // Fallback to keyword-based if HuggingFace fails (expected for now)
            sentiment = keywordBasedSentiment(text)
          }
        } else {
          // Use keyword-based sentiment (current primary method)
          sentiment = keywordBasedSentiment(text)
        }
        
        allArticles.push({
          sentiment: Math.max(-10, Math.min(10, sentiment)), // Already in GDELT scale
          url: article.url || '',
          title: article.title || '',
          source: article.source?.name || 'Unknown',
          publishedAt: article.publishedAt
        })
      }
    } catch (error) {
      // Continue with other language if one fails
      console.warn(`NewsAPI fetch failed for language ${lang}:`, error)
    }
  }
  
  return allArticles
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
    console.warn('No articles from any source, using fallback')
    return getDynamicFallbackData()
  }
  
  console.log(`Aggregating ${allArticles.length} articles from sources: ${apiSources.join(', ')}`)
  
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
  
  console.log(`Aggregated sentiment: ${averageSentiment.toFixed(3)} from ${apiSources.join(', ')} (${allArticles.length} total articles, ${sources.length} sources)`)
  console.log('Raw weighted average before normalization:', rawWeightedAverage.toFixed(3))
  console.log('Source breakdown:', sourcesForResponse.map(s => `${s.name}: ${s.score.toFixed(3)} (${s.articles} articles)`).join(', '))
  
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
    console.log('Returning cached sentiment data:', {
      score: cachedData.score,
      sources: cachedData.sources.length,
      apiSources: cachedData.apiSources
    })
    return cachedData
  }

  try {
    console.log('Starting sentiment aggregation from multiple sources...')
    // Aggregate from multiple sources
    cachedData = await aggregateSentiment()
    console.log('Sentiment aggregation completed:', {
      score: cachedData.score,
      sources: cachedData.sources.length,
      apiSources: cachedData.apiSources,
      totalArticles: cachedData.sources.reduce((sum, s) => sum + s.articles, 0)
    })
    return cachedData
  } catch (error) {
    console.error('Error aggregating sentiment data:', error)
    const fallback = getDynamicFallbackData()
    console.log('Returning fallback data:', { score: fallback.score })
    return fallback
  }
})
