import { HuggingFaceResponseSchema } from './schemas'

const HF_ROUTER_URL = 'https://router.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest'
const HF_INFERENCE_URL = 'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest'

const articleCache = new Map<string, number>()
const MAX_CACHE_SIZE = 1000

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

  const rawScore = (positiveScore - negativeScore) * 10
  const neutralDampen = 1 - (neutralScore * 0.5)
  return Math.max(-10, Math.min(10, rawScore * neutralDampen))
}

async function analyzeSentimentWithHuggingFace(text: string, apiKey: string): Promise<number> {
  const truncatedText = text.substring(0, 500)
  const body = JSON.stringify({ inputs: truncatedText, options: { wait_for_model: true } })
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  const endpoints = [HF_ROUTER_URL, HF_INFERENCE_URL]

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.status === 401 || response.status === 403) {
        throw new Error(`HuggingFace authentication failed (${response.status})`)
      }
      if (response.status === 429) {
        throw new Error('HuggingFace rate limit exceeded')
      }

      if (response.ok) {
        const data = await response.json()
        const parsed = HuggingFaceResponseSchema.safeParse(data)
        if (!parsed.success) {
          console.warn('HuggingFace valideringsfejl:', parsed.error.message)
        }
        if (data.error?.includes('no longer supported')) continue
        return parseHuggingFaceSentiment(parsed.success ? parsed.data : data)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('authentication') || msg.includes('rate limit')) throw error
      console.warn(`HuggingFace endpoint ${endpoint} failed:`, msg)
      continue
    }
  }

  throw new Error('All HuggingFace endpoints failed')
}

export async function batchAnalyzeWithHuggingFace(
  articles: Array<{ text: string; index: number }>,
  apiKey: string
): Promise<Map<number, number>> {
  const results = new Map<number, number>()
  const CONCURRENCY = 5

  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const batch = articles.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      batch.map(async ({ text, index }) => {
        const cacheKey = text.substring(0, 100)
        if (articleCache.has(cacheKey)) {
          return { index, score: articleCache.get(cacheKey)! }
        }
        const score = await analyzeSentimentWithHuggingFace(smartTruncate(text, 500), apiKey)
        if (articleCache.size >= MAX_CACHE_SIZE) {
          const firstKey = articleCache.keys().next().value
          if (firstKey) articleCache.delete(firstKey)
        }
        articleCache.set(cacheKey, score)
        return { index, score }
      })
    )

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.set(result.value.index, result.value.score)
      }
    }
  }

  return results
}
