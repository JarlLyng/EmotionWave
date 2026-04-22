import {
  type Article,
  type BaseSentimentData,
  getDynamicFallbackData as getBaseFallbackData,
  calculateWeightedSentiment,
} from '~/utils/sentiment'
import { fetchGDELTNews } from './gdeltService'
import { fetchNewsAPINews } from './newsApiService'
import { fetchRedditSentiment } from './redditService'
import { batchAnalyzeWithHuggingFace } from './huggingFaceService'

export interface ServerSentimentData extends BaseSentimentData {
  apiSources: string[]
  articles?: Article[]
}

export async function aggregateSentiment(
  newsApiKey: string | null,
  huggingFaceKey: string | null
): Promise<ServerSentimentData> {
  const apiSources: string[] = []
  const allArticles: Article[] = []

  const [gdeltResult, newsApiResult, redditResult] = await Promise.allSettled([
    fetchGDELTNews(),
    fetchNewsAPINews(newsApiKey),
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

  if (huggingFaceKey) {
    try {
      const textsToAnalyze = allArticles
        .map((a, i) => ({ text: `${a.title} ${a.source}`.trim(), index: i }))
        .filter(({ text }) => text.length > 10)
        .slice(0, 30)

      const hfScores = await batchAnalyzeWithHuggingFace(textsToAnalyze, huggingFaceKey)

      for (const [index, score] of hfScores) {
        const keywordScore = allArticles[index].sentiment
        allArticles[index].sentiment = Math.max(-10, Math.min(10,
          score * 0.7 + keywordScore * 0.3
        ))
      }

      if (hfScores.size > 0) apiSources.push('HuggingFace')
    } catch (error) {
      console.warn('HuggingFace batch analysis failed, using keyword scores:', error)
    }
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
