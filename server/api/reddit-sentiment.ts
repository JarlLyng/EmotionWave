import { defineEventHandler } from 'h3'

// Cache sentiment data for 10 minutter
let cachedData: { score: number; timestamp: number } | null = null
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutter i millisekunder

interface RedditPost {
  title: string
  selftext: string
  score: number
  created_utc: number
}

const REDDIT_SUBREDDITS = [
  'worldnews',
  'news',
  'technology',
  'science',
  'environment'
]

const analyzeSentiment = (text: string): number => {
  // Simpel sentiment analyse baseret på nøgleord
  const positiveWords = ['happy', 'good', 'great', 'positive', 'success', 'win', 'help', 'support', 'love']
  const negativeWords = ['sad', 'bad', 'terrible', 'negative', 'fail', 'loss', 'hate', 'angry', 'fear']
  
  const words = text.toLowerCase().split(/\s+/)
  let score = 0
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 0.1
    if (negativeWords.includes(word)) score -= 0.1
  })
  
  // Normaliser score til -1 til 1 range
  return Math.max(-1, Math.min(1, score))
}

export default defineEventHandler(async (event) => {
  // Tjek om vi har cached data der stadig er gyldig
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData
  }

  try {
    // Hent posts fra forskellige subreddits
    const posts: RedditPost[] = []
    
    for (const subreddit of REDDIT_SUBREDDITS) {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`,
        {
          headers: {
            'User-Agent': 'EmotionWave/1.0'
          }
        }
      )
      
      if (!response.ok) continue
      
      const data = await response.json()
      const subredditPosts = data.data.children.map((child: any) => ({
        title: child.data.title,
        selftext: child.data.selftext,
        score: child.data.score,
        created_utc: child.data.created_utc
      }))
      
      posts.push(...subredditPosts)
    }
    
    // Analyser sentiment for hver post
    const sentiments = posts.map(post => {
      const text = `${post.title} ${post.selftext}`
      const sentiment = analyzeSentiment(text)
      // Vægt sentiment baseret på post score
      return sentiment * (1 + Math.log10(post.score + 1))
    })
    
    // Beregn vægtet gennemsnit
    const averageSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length
    
    cachedData = {
      score: averageSentiment,
      timestamp: Date.now()
    }

    return cachedData
  } catch (error) {
    console.error('Error fetching Reddit sentiment:', error)
    
    // Hvis API kaldet fejler, returner cached data hvis det findes
    if (cachedData) {
      return cachedData
    }
    
    throw createError({
      statusCode: 500,
      message: 'Kunne ikke hente Reddit sentiment data'
    })
  }
}) 