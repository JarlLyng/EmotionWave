import { type Article, keywordBasedSentiment } from '~/utils/sentiment'
import { RedditResponseSchema } from './schemas'

const FETCH_TIMEOUT_MS = 8000

async function fetchSubreddit(subreddit: string): Promise<Article[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`,
      { headers: { 'User-Agent': 'EmotionWave/1.0' }, signal: controller.signal }
    )
    if (!response.ok) return []

    const rawData = await response.json()
    const parsed = RedditResponseSchema.safeParse(rawData)
    if (!parsed.success) {
      console.warn(`Reddit API valideringsfejl for r/${subreddit}:`, parsed.error.message)
      return []
    }

    return parsed.data.data.children.map((child) => {
      const text = `${child.data.title} ${child.data.selftext || ''}`
      let sentiment = keywordBasedSentiment(text)

      const upvoteWeight = Math.log10(Math.max(1, child.data.score) + 1) / 2
      sentiment *= (1 + upvoteWeight * 0.2)

      return {
        sentiment: Math.max(-10, Math.min(10, sentiment)),
        url: `https://reddit.com${child.data.permalink}`,
        title: child.data.title,
        source: `Reddit: r/${subreddit}`,
        publishedAt: new Date(child.data.created_utc * 1000).toISOString(),
      }
    })
  } catch (error) {
    console.warn(`Reddit API error for r/${subreddit}:`, error)
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchRedditSentiment(): Promise<Article[]> {
  const subreddits = ['worldnews', 'news', 'technology', 'science', 'environment']

  // Fetch all subreddits in parallel — a slow or hanging subreddit should
  // neither stall the others nor delay the whole aggregation
  const results = await Promise.all(subreddits.map(fetchSubreddit))
  return results.flat()
}
