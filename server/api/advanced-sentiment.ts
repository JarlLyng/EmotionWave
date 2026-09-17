import { getDynamicFallbackData as getBaseFallbackData } from '~/utils/sentiment'
import { aggregateSentiment, getRetainedSnapshot } from '../utils/sentimentAggregator'

// Hard ceiling on aggregation time. Upstream retries can stack up past the
// serverless function limit, in which case the client would see a raw
// timeout instead of our graceful fallback payload.
const AGGREGATION_DEADLINE_MS = 8000

export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  const newsApiKey = (config.newsApiKey || process.env.NEWS_API_KEY || null) as string | null
  const huggingFaceKey = (config.huggingFaceKey || process.env.HUGGINGFACE_API_KEY || null) as string | null
  const guardianApiKey = (config.guardianApiKey || process.env.GUARDIAN_API_KEY || null) as string | null

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined
  try {
    const deadline = new Promise<never>((_, reject) => {
      deadlineTimer = setTimeout(
        () => reject(new Error(`Sentiment aggregation exceeded ${AGGREGATION_DEADLINE_MS}ms deadline`)),
        AGGREGATION_DEADLINE_MS
      )
    })
    return await Promise.race([aggregateSentiment(newsApiKey, huggingFaceKey, guardianApiKey), deadline])
  } catch (error) {
    console.error('Error aggregating sentiment data:', error)
    // Deadline exceeded or hard failure: last real reading beats demo
    const retained = getRetainedSnapshot()
    if (retained) return retained
    const fallback = getBaseFallbackData()
    return { ...fallback, apiSources: ['Fallback'], articles: [], dataMode: 'demo' as const }
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer)
  }
}, {
  maxAge: 30, // 30 seconds caching
  name: 'advanced-sentiment',
  getKey: () => 'global' // Single cache key as it's the same data for everyone
})
