/**
 * Client-side GDELT API integration
 * Works on static hosting (GitHub Pages) where server API routes are unavailable
 */

import {
  type Article,
  type BaseSentimentData,
  getDateRange,
  getDynamicFallbackData,
  normalizeGDELTArticle,
  extractArticlesFromGDELT,
  calculateWeightedSentiment,
  GDELT_QUERY,
} from '../utils/sentiment'

export type GDELTClientPayload = BaseSentimentData & { articles?: Article[] }

const CLIENT_TIMEOUT_MS = 10000
const MAX_ARTICLES = 50

/**
 * Run one GDELT query. Parses the body structurally (issue #69): JSON first,
 * then the shared error-field inspection. GDELT reports query problems as
 * plain text with HTTP 200, so a JSON parse failure IS the API error signal —
 * article content is never scanned for error-looking words.
 */
async function queryGDELT(params: URLSearchParams, externalSignal?: AbortSignal): Promise<Article[] | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  const abortListener = () => controller.abort()
  externalSignal?.addEventListener('abort', abortListener, { once: true })

  try {
    const response = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`,
      { signal: controller.signal, headers: { 'Accept': 'application/json' } }
    )
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`GDELT HTTP ${response.status}: ${text.substring(0, 100)}`)
    }

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`GDELT API message: ${text.substring(0, 200)}`)
    }

    // Structural inspection only — {error}/{message} payloads return null
    const rawArticles = extractArticlesFromGDELT(data)
    if (!rawArticles) return null
    return rawArticles.map(normalizeGDELTArticle)
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', abortListener)
  }
}

/** Build a live payload that keeps the headlines (issue #69) */
function buildPayload(articles: Article[]): GDELTClientPayload {
  const { score, sources } = calculateWeightedSentiment(articles)
  const withTitles = articles.filter(a => a.title && a.title.trim().length > 0)
  return {
    score,
    sources,
    timestamp: Date.now(),
    dataMode: 'live',
    articles: withTitles.slice(0, MAX_ARTICLES),
  }
}

/**
 * Fetch sentiment data directly from GDELT API (client-side).
 * Resolves with a demo-marked fallback payload on failure — never rejects.
 */
export async function fetchGDELTSentiment(signal?: AbortSignal): Promise<GDELTClientPayload> {
  try {
    const params = new URLSearchParams({
      query: GDELT_QUERY,
      mode: 'artlist',
      format: 'json',
      maxrecords: '50',
      sort: 'hybridrel',
      startdatetime: getDateRange().start,
      enddatetime: getDateRange().end,
    })

    const articles = await queryGDELT(params, signal)
    if (articles && articles.length > 0) return buildPayload(articles)
    return getDynamicFallbackData()
  } catch (error) {
    // Retry with a simpler query only when the failure looks transient.
    // Aborts (external cancellation or timeout) and permanent client errors
    // (4xx) won't be helped by an immediate retry against the same API.
    const isAbort = signal?.aborted || (error instanceof Error && error.name === 'AbortError')
    const httpStatus = error instanceof Error
      ? Number(error.message.match(/HTTP (\d{3})/)?.[1] ?? 0)
      : 0
    const isPermanent = httpStatus >= 400 && httpStatus < 500

    if (!isAbort && !isPermanent) {
      try {
        const simpleParams = new URLSearchParams({
          query: 'politics OR technology OR world',
          mode: 'artlist',
          format: 'json',
          maxrecords: '30',
          sort: 'hybridrel',
        })
        const articles = await queryGDELT(simpleParams, signal)
        if (articles && articles.length > 0) return buildPayload(articles)
      } catch {
        // Fall through to fallback
      }
    }

    return getDynamicFallbackData()
  }
}
