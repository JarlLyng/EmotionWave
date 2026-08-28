import {
  type Article,
  type BaseSentimentData,
  type EmotionState,
  getDynamicFallbackData as getBaseFallbackData,
  calculateWeightedSentiment,
  aggregateEmotionVectors,
} from '~/utils/sentiment'
import { fetchGDELTNews } from './gdeltService'
import { fetchNewsAPINews } from './newsApiService'
import { fetchRedditSentiment } from './redditService'
import { batchAnalyzeWithHuggingFace, batchAnalyzeEmotions } from './huggingFaceService'

export interface ServerSentimentData extends BaseSentimentData {
  apiSources: string[]
  articles?: Article[]
  /** World-emotion state (issue #30); absent when HF is unavailable */
  emotion?: EmotionState
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

  let emotion: EmotionState | undefined

  if (huggingFaceKey) {
    try {
      // Top 10 only (as documented in README/ARCHITECTURE): at concurrency 5
      // that's 2 waves ≈ 2-4s, which fits the endpoint's 8s deadline. 30
      // articles took 6 waves and regularly blew past it on a cold cache.
      const textsToAnalyze = allArticles
        .map((a, i) => ({ text: `${a.title} ${a.source}`.trim(), index: i }))
        .filter(({ text }) => text.length > 10)
        .slice(0, 10)

      // Sentiment refinement and emotion classification run in parallel on
      // the same texts, so wall time stays at ~2 waves despite two models.
      const [hfScores, emotionVectors] = await Promise.all([
        batchAnalyzeWithHuggingFace(textsToAnalyze, huggingFaceKey),
        batchAnalyzeEmotions(textsToAnalyze, huggingFaceKey),
      ])

      for (const [index, score] of hfScores) {
        const article = allArticles[index]
        if (!article) continue
        const keywordScore = article.sentiment
        article.sentiment = Math.max(-10, Math.min(10,
          score * 0.7 + keywordScore * 0.3
        ))
      }

      emotion = aggregateEmotionVectors([...emotionVectors.values()]) ?? undefined

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
    emotion,
  }
}
