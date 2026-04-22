import { getDynamicFallbackData as getBaseFallbackData } from '~/utils/sentiment'
import { aggregateSentiment } from '../utils/sentimentAggregator'

export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  const newsApiKey = (config.newsApiKey || process.env.NEWS_API_KEY || null) as string | null
  const huggingFaceKey = (config.huggingFaceKey || process.env.HUGGINGFACE_API_KEY || null) as string | null

  try {
    return await aggregateSentiment(newsApiKey, huggingFaceKey)
  } catch (error) {
    console.error('Error aggregating sentiment data:', error)
    const fallback = getBaseFallbackData()
    return { ...fallback, apiSources: ['Fallback'], articles: [] }
  }
}, {
  maxAge: 30, // 30 seconds caching
  name: 'advanced-sentiment',
  getKey: () => 'global' // Single cache key as it's the same data for everyone
})
