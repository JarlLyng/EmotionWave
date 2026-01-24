import { ref } from 'vue'
import { fetchGDELTSentiment } from './useGDELT'

interface SentimentData {
  score: number
  details: {
    positive: number
    negative: number
    neutral: number
  }
}

/**
 * Composable for managing sentiment data
 * Fetches and updates sentiment scores from the API
 */
export function useSentiment() {
  const sentimentScore = ref(0)
  const targetScore = ref(0) // Den nye målværdi vi bevæger os mod
  const sentimentDetails = ref<SentimentData['details']>({
    positive: 0,
    negative: 0,
    neutral: 0
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isUsingFallback = ref(false) // Track if using fallback data
  const sources = ref<Record<string, number>>({})
  
  let intervalId: number | null = null
  let animationFrameId: number | null = null
  
  // Funktion til at animere overgangen
  const animateTransition = () => {
    const currentScore = sentimentScore.value
    const target = targetScore.value
    const diff = target - currentScore
    
    // Hvis forskellen er meget lille, spring direkte til målværdien
    if (Math.abs(diff) < 0.001) {
      sentimentScore.value = target
      animationFrameId = null
      return
    }
    
    // Beregn næste værdi med en glidende overgang
    sentimentScore.value += diff * 0.1 // Juster 0.1 for at ændre hastigheden af overgangen
    
    // Fortsæt animationen
    animationFrameId = requestAnimationFrame(animateTransition)
  }
  
  /**
   * Fetches the latest sentiment data from the API
   */
  async function fetchSentiment() {
    isLoading.value = true
    error.value = null

    try {
      // Get baseURL from runtime config to handle GitHub Pages subdirectory
      const config = useRuntimeConfig()
      const baseURL = config.app.baseURL || '/'
      
      // Build API URL properly using URL constructor to avoid regex issues
      // On Vercel with baseURL="/", this should result in /api/advanced-sentiment
      const baseUrlObj = new URL(baseURL, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      const apiUrl = new URL('api/advanced-sentiment', baseUrlObj).toString()
      
      console.log('Fetching sentiment from API:', {
        apiUrl,
        baseURL,
        origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
        fullUrl: apiUrl
      })
      isUsingFallback.value = false
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        // If API is not available (e.g., on static hosting), use fallback
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      
      console.log('Fetched sentiment data from server API:', {
        score: data.score,
        sources: data.sources?.length || 0,
        apiSources: data.apiSources || [],
        timestamp: data.timestamp
      })
      
      targetScore.value = data.score
      
      // Opdater sources hvis de findes
      if (data.sources) {
        sources.value = data.sources.reduce((acc: Record<string, number>, source: any) => {
          acc[source.name] = source.score
          return acc
        }, {})
      }
      
      if (!animationFrameId) {
        animateTransition()
      }
    } catch (e) {
      // If server API is not available (e.g., on static hosting), try client-side GDELT API
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      console.warn('Server API not available, trying client-side GDELT API:', errorMessage)
      
      try {
        // Try fetching directly from GDELT API (client-side)
        const data = await fetchGDELTSentiment()
        
        console.log('Fetched sentiment data from GDELT (client-side):', data)
        
        isUsingFallback.value = false
        error.value = null
        targetScore.value = data.score
        
        // Update sources if they exist
        if (data.sources) {
          sources.value = data.sources.reduce((acc: Record<string, number>, source: any) => {
            acc[source.name] = source.score
            return acc
          }, {})
        }
        
        if (!animationFrameId) {
          animateTransition()
        }
      } catch (gdeltError) {
        // Final fallback to dynamic time-based data if both APIs fail
        console.warn('GDELT API also unavailable, using fallback data:', gdeltError)
        
        isUsingFallback.value = true
        error.value = 'Using demo data (API unavailable)' // Show user that fallback is active
        
        const now = Date.now()
        const hour = new Date(now).getHours()
        const minute = new Date(now).getMinutes()
        const timeBasedSeed = (hour * 60 + minute) % 1440
        const baseScore = 0.3 + (Math.sin(timeBasedSeed * 0.1) * 0.4)
        const seconds = new Date(now).getSeconds()
        const variation = (seconds % 30) / 100
        const fallbackScore = Math.max(-1, Math.min(1, baseScore + variation))
        
        targetScore.value = fallbackScore
        
        if (!animationFrameId) {
          animateTransition()
        }
      }
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Start polling for sentiment updates
   */
  function startPolling() {
    if (intervalId) {
      clearInterval(intervalId)
    }
    // Hent sentiment hver 30. sekund
    intervalId = setInterval(fetchSentiment, 30000)
  }
  
  /**
   * Stop polling for sentiment updates
   */
  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }
  
  return {
    sentimentScore,
    sentimentDetails,
    isLoading,
    error,
    isUsingFallback,
    sources,
    fetchSentiment,
    startPolling,
    stopPolling
  }
} 