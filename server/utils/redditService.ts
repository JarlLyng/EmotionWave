import { type Article, keywordBasedSentiment } from '~/utils/sentiment'
import { RedditResponseSchema } from './schemas'

export async function fetchRedditSentiment(): Promise<Article[]> {
  const subreddits = ['worldnews', 'news', 'technology', 'science', 'environment']
  const posts: Article[] = []

  try {
    for (const subreddit of subreddits) {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`,
        { headers: { 'User-Agent': 'EmotionWave/1.0' } }
      )
      if (!response.ok) continue

      const rawData = await response.json()
      const parsed = RedditResponseSchema.safeParse(rawData)
      if (!parsed.success) {
        console.warn(`Reddit API valideringsfejl for r/${subreddit}:`, parsed.error.message)
        continue
      }

      const children = parsed.data.data.children

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
