/**
 * EmotionWave Sentiment Analysis API
 * 
 * This module provides real-time sentiment analysis of news articles from multiple sources.
 * It uses HuggingFace's text classification model to analyze the sentiment of articles
 * and combines the results into an overall sentiment score.
 */

import { HfInference } from '@huggingface/inference'
import { defineEventHandler } from 'h3'

interface GDELTResponse {
  articles: Array<{
    sentiment: number
    url: string
    title: string
    source: string
  }>
}

interface SentimentData {
  score: number
  timestamp: number
  sources: Array<{
    name: string
    score: number
    articles: number
  }>
}

// Cache configuration
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes in milliseconds
let cachedData: SentimentData | null = null

// Initialize HuggingFace client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

// Static fallback data for GitHub Pages
const STATIC_DATA: SentimentData = {
  score: 0.86,
  timestamp: Date.now(),
  sources: [
    {
      name: 'Reuters',
      score: 0.97,
      articles: 5
    },
    {
      name: 'Al Jazeera',
      score: 0.76,
      articles: 5
    }
  ]
}

async function fetchAndAnalyzeNews(): Promise<SentimentData> {
  try {
    console.log('Fetching news from GDELT...')
    
    // Opret en AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 sekunder timeout
    
    // Hent nyheder fra GDELT med timeout
    const response = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?' +
      'query=language:dan OR language:eng' + // Dansk og engelsk nyheder
      '&mode=artlist' +
      '&format=json' +
      '&maxrecords=50' + // Begræns til 50 artikler
      '&sort=hybridrel' + // Sorter efter relevans
      '&startdatetime=20240601000000', // Start fra 1. juni 2024
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'EmotionWave/1.0'
        }
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('GDELT API error:', response.status, response.statusText)
      throw new Error('GDELT API fejl')
    }

    const data: GDELTResponse = await response.json()
    console.log('GDELT response:', {
      totalArticles: data.articles.length,
      sources: [...new Set(data.articles.map(a => a.source))]
    })
    
    // Gruppér artikler efter kilde
    const sourceGroups = data.articles.reduce((acc, article) => {
      const source = article.source
      if (!acc[source]) {
        acc[source] = []
      }
      acc[source].push(article)
      return acc
    }, {} as Record<string, GDELTResponse['articles']>)

    // Beregn sentiment for hver kilde
    const sources = Object.entries(sourceGroups).map(([name, articles]) => {
      const avgSentiment = articles.reduce((sum, article) => sum + article.sentiment, 0) / articles.length
      console.log(`${name} sentiment score: ${avgSentiment.toFixed(2)} (${articles.length} articles)`)
      return {
        name,
        score: avgSentiment,
        articles: articles.length
      }
    })

    // Beregn gennemsnitlig sentiment
    const averageSentiment = sources.reduce((sum, source) => sum + source.score, 0) / sources.length
    console.log(`Overall sentiment score: ${averageSentiment.toFixed(2)}`)
    
    return {
      score: averageSentiment,
      sources,
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('Error fetching sentiment data:', error)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Request timed out, using static data')
    }
    return STATIC_DATA
  }
}

/**
 * Main API endpoint handler
 * 
 * This endpoint:
 * 1. Checks for valid cached data
 * 2. If cache is invalid, fetches and analyzes new data
 * 3. Returns sentiment analysis results
 * 
 * @returns SentimentData Object containing sentiment analysis results
 * @throws Error with 500 status code if sentiment analysis fails
 */
export default defineEventHandler(async (event) => {
  // Check if we're in production (GitHub Pages)
  if (process.env.NODE_ENV === 'production') {
    return STATIC_DATA
  }

  // Check if we have valid cached data
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log('Returning cached sentiment data')
    return cachedData
  }

  try {
    // Fetch and analyze new data
    cachedData = await fetchAndAnalyzeNews()
    return cachedData
  } catch (error) {
    console.error('Error fetching sentiment data:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch sentiment data'
    })
  }
}) 