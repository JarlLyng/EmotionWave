/**
 * Client-side GDELT API integration
 * Works on static hosting (GitHub Pages) where server API routes are unavailable
 */

import {
  type BaseSentimentData,
  getDateRange,
  getDynamicFallbackData,
  normalizeGDELTArticle,
  extractArticlesFromGDELT,
  calculateWeightedSentiment,
  GDELT_QUERY,
} from '~/utils/sentiment'

/**
 * Fetch sentiment data directly from GDELT API (client-side)
 */
export async function fetchGDELTSentiment(): Promise<BaseSentimentData> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const dateRange = getDateRange()

    const params = new URLSearchParams({
      query: GDELT_QUERY,
      mode: 'artlist',
      format: 'json',
      maxrecords: '50',
      sort: 'hybridrel',
      startdatetime: dateRange.start,
      enddatetime: dateRange.end,
    })

    const apiUrl = `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    clearTimeout(timeoutId)

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`GDELT API HTTP ${response.status}: ${responseText.substring(0, 100)}`)
    }

    // Check for error messages before parsing
    const lowerText = responseText.toLowerCase()
    if (lowerText.includes('error') || lowerText.includes('invalid') ||
        lowerText.includes('one or more') || lowerText.includes('too short') ||
        lowerText.includes('too long') || lowerText.includes('too common')) {
      throw new Error(`GDELT API error: ${responseText.substring(0, 200)}`)
    }

    let data: unknown
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error('Invalid JSON response from GDELT API')
    }

    const rawArticles = extractArticlesFromGDELT(data)

    if (!rawArticles || rawArticles.length === 0) {
      return getDynamicFallbackData()
    }

    const articles = rawArticles.map(normalizeGDELTArticle)
    const { score, sources } = calculateWeightedSentiment(articles)

    return { score, sources, timestamp: Date.now() }
  } catch (error) {
    // Retry with simpler query on non-timeout errors
    if (error instanceof Error && error.name !== 'AbortError') {
      try {
        const simpleParams = new URLSearchParams({
          query: 'politics OR technology OR world',
          mode: 'artlist',
          format: 'json',
          maxrecords: '30',
          sort: 'hybridrel',
        })

        const simpleResponse = await fetch(
          `https://api.gdeltproject.org/api/v2/doc/doc?${simpleParams.toString()}`,
          { headers: { 'Accept': 'application/json' } }
        )

        if (simpleResponse.ok) {
          const simpleText = await simpleResponse.text()
          const simpleLower = simpleText.toLowerCase()
          if (simpleLower.includes('error') || simpleLower.includes('invalid')) {
            throw new Error('GDELT retry returned error')
          }

          const simpleData = JSON.parse(simpleText) as unknown
          const rawArticles = extractArticlesFromGDELT(simpleData)

          if (rawArticles && rawArticles.length > 0) {
            const articles = rawArticles.map(normalizeGDELTArticle)
            const { score, sources } = calculateWeightedSentiment(articles)
            return { score, sources, timestamp: Date.now() }
          }
        }
      } catch {
        // Fall through to fallback
      }
    }

    return getDynamicFallbackData()
  }
}
