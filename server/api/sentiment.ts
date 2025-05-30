import { defineEventHandler } from 'h3'

// Cache sentiment data for 10 minutter
let cachedData: { score: number; timestamp: number } | null = null
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutter i millisekunder

interface GDELTResponse {
  articles: Array<{
    sentiment: number
    url: string
    title: string
  }>
}

const calculateAverageSentiment = (articles: GDELTResponse['articles']): number => {
  if (articles.length === 0) return 0
  
  const sum = articles.reduce((acc, article) => acc + article.sentiment, 0)
  return sum / articles.length
}

export default defineEventHandler(async (event) => {
  // Tjek om vi har cached data der stadig er gyldig
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData
  }

  try {
    // Hent nyheder fra GDELT
    const response = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?' +
      'query=language:dan OR language:eng' + // Dansk og engelsk nyheder
      '&mode=artlist' +
      '&format=json' +
      '&maxrecords=50' + // Begræns til 50 artikler for at undgå overbelastning
      '&sort=hybridrel' // Sorter efter relevans
    )

    if (!response.ok) {
      throw new Error('GDELT API fejl')
    }

    const data: GDELTResponse = await response.json()
    
    // Beregn gennemsnitlig sentiment
    const averageSentiment = calculateAverageSentiment(data.articles)
    
    // Normaliser sentiment til -1 til 1 range
    const normalizedSentiment = Math.max(-1, Math.min(1, averageSentiment))
    
    cachedData = {
      score: normalizedSentiment,
      timestamp: Date.now()
    }

    return cachedData
  } catch (error) {
    console.error('Error fetching sentiment:', error)
    
    // Hvis API kaldet fejler, returner cached data hvis det findes
    if (cachedData) {
      return cachedData
    }
    
    throw createError({
      statusCode: 500,
      message: 'Kunne ikke hente sentiment data'
    })
  }
}) 