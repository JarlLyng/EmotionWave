/**
 * EmotionWave Sentiment Analysis API
 * 
 * This module provides real-time sentiment analysis of news articles from multiple sources.
 * It uses HuggingFace's text classification model to analyze the sentiment of articles
 * and combines the results into an overall sentiment score.
 */

import { HfInference } from '@huggingface/inference'
import { defineEventHandler } from 'h3'
import * as cheerio from 'cheerio'

/**
 * Represents a single sentiment analysis result from HuggingFace
 */
interface SentimentResult {
  /** The sentiment label (e.g., 'POSITIVE', 'NEGATIVE') */
  label: string
  /** The confidence score between 0 and 1 */
  score: number
}

/**
 * Configuration for a news source to analyze
 */
interface NewsSource {
  /** The name of the news source */
  name: string
  /** The URL to fetch news from */
  url: string
  /** CSS selector to find articles on the page */
  selector: string
}

/**
 * Result of sentiment analysis for a single news source
 */
interface SourceResult {
  /** The name of the news source */
  name: string
  /** The normalized sentiment score (-1 to 1) */
  score: number
  /** Number of articles analyzed */
  articles: number
}

/**
 * Complete sentiment analysis result
 */
interface SentimentData {
  /** Overall sentiment score (-1 to 1) */
  score: number
  /** Timestamp of the analysis */
  timestamp: number
  /** Results from individual news sources */
  sources: SourceResult[]
}

// Cache configuration
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes in milliseconds
let cachedData: SentimentData | null = null

// Initialize HuggingFace client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

/**
 * News sources to analyze for sentiment
 * Each source should have a valid URL and CSS selector for finding articles
 */
const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'DR',
    url: 'https://www.dr.dk/nyheder',
    selector: '.dre-teaser__link'
  },
  {
    name: 'Politiken',
    url: 'https://politiken.dk/',
    selector: '.teaser__link'
  },
  {
    name: 'Berlingske',
    url: 'https://www.berlingske.dk/',
    selector: '.teaser__link'
  },
  {
    name: 'BBC',
    url: 'https://www.bbc.com/news',
    selector: '.gs-c-promo-link'
  },
  {
    name: 'The Guardian',
    url: 'https://www.theguardian.com/international',
    selector: '.fc-item__link'
  },
  {
    name: 'Reuters',
    url: 'https://www.reuters.com/',
    selector: '.story-card'
  },
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/',
    selector: '.article-card'
  }
]

/**
 * Truncates text to a maximum number of words to stay within model's token limit
 * @param text The text to truncate
 * @param maxWords Maximum number of words to keep (approximately 512 tokens)
 * @returns Truncated text
 */
function truncateText(text: string, maxWords: number = 400): string {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + '...'
}

/**
 * Fetches and analyzes news articles from multiple sources
 * 
 * This function:
 * 1. Fetches HTML from each news source
 * 2. Extracts article text using CSS selectors
 * 3. Analyzes sentiment using HuggingFace's model
 * 4. Normalizes scores and calculates an average
 * 
 * @returns Promise<SentimentData> Object containing overall sentiment score and source details
 * @throws Error if no valid sentiment results are found from any source
 */
async function fetchAndAnalyzeNews(): Promise<SentimentData> {
  const results: SourceResult[] = []
  
  for (const source of NEWS_SOURCES) {
    try {
      console.log(`Fetching news from ${source.name}...`)
      const response = await fetch(source.url)
      
      if (!response.ok) {
        console.warn(`Could not fetch news from ${source.name}: ${response.status}`)
        continue
      }
      
      const html = await response.text()
      const $ = cheerio.load(html)
      const articles = $(source.selector).slice(0, 5) // Analyze up to 5 articles per source
      
      if (articles.length === 0) {
        console.warn(`No articles found for ${source.name}`)
        continue
      }
      
      console.log(`Analyzing sentiment for ${source.name}...`)
      const sentiments = await Promise.all(
        articles.map(async (_: number, article: cheerio.Element) => {
          const text = $(article).text().trim()
          if (!text) return null
          
          try {
            // Truncate text to stay within model's token limit
            const truncatedText = truncateText(text)
            const result = await hf.textClassification({
              model: 'distilbert-base-uncased-finetuned-sst-2-english',
              inputs: truncatedText
            })
            return result[0] as SentimentResult
          } catch (error) {
            console.error(`Error analyzing article from ${source.name}:`, error)
            return null
          }
        })
      ) as Array<SentimentResult | null>
      
      const validSentiments = sentiments.filter((s): s is SentimentResult => s !== null)
      if (validSentiments.length === 0) {
        console.warn(`No valid sentiment scores for ${source.name}`)
        continue
      }
      
      // Calculate average sentiment score and normalize to [-1, 1] range
      const avgScore = validSentiments.reduce((acc: number, s: SentimentResult) => acc + s.score, 0) / validSentiments.length
      const normalizedScore = avgScore * 2 - 1 // Convert from [0,1] to [-1,1]
      
      console.log(`${source.name} sentiment score: ${normalizedScore.toFixed(2)}`)
      results.push({
        name: source.name,
        score: normalizedScore,
        articles: validSentiments.length
      })
    } catch (error) {
      console.error(`Error processing ${source.name}:`, error)
    }
  }
  
  if (results.length === 0) {
    throw new Error('No valid sentiment results from any source')
  }
  
  // Calculate final sentiment score as average of all sources
  const finalScore = results.reduce((acc, r) => acc + r.score, 0) / results.length
  console.log(`New sentiment score: ${finalScore.toFixed(2)}`)
  
  return {
    score: finalScore,
    sources: results,
    timestamp: Date.now()
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