import { ref, onMounted, onUnmounted } from 'vue'

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
  const sources = ref<Record<string, number>>({})
  
  let intervalId: NodeJS.Timeout | null = null
  let animationFrameId: number | null = null
  
  // Funktion til at animere overgangen
  const animateTransition = () => {
    const currentScore = sentimentScore.value
    const target = targetScore.value
    const diff = target - currentScore
    
    // Hvis forskellen er meget lille, spring direkte til målværdien
    if (Math.abs(diff) < 0.001) {
      sentimentScore.value = target
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
      // Brug statisk data i produktion
      if (process.env.NODE_ENV === 'production') {
        const staticData = {
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
        targetScore.value = staticData.score
        if (!animationFrameId) {
          animateTransition()
        }
        return
      }

      const response = await fetch('/api/advanced-sentiment')
      if (!response.ok) {
        throw new Error('Failed to fetch sentiment data')
      }
      const data = await response.json()
      targetScore.value = data.score
      
      if (!animationFrameId) {
        animateTransition()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'An error occurred'
      console.error('Error fetching sentiment:', e)
    } finally {
      isLoading.value = false
    }
  }
  
  onMounted(() => {
    // Hent første gang
    fetchSentiment()
    
    // Hent sentiment hver 30. sekund
    intervalId = setInterval(fetchSentiment, 30000)
  })
  
  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId)
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
  })
  
  return {
    sentimentScore,
    sentimentDetails,
    isLoading,
    error,
    fetchSentiment
  }
} 