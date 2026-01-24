<template>
  <main class="min-h-screen bg-black text-white" role="main" aria-label="EmotionWave sentiment visualization">
    <VisualLayer :sentiment-score="sentimentScore" />
    <AmbientSound :sentiment-score="sentimentScore" />
    <SentimentMeter 
      :score="sentimentScore" 
      :is-loading="isLoading" 
      :error="error"
      :is-using-fallback="isUsingFallback"
      @retry="fetchSentiment"
    />
    <InfoDialog />
    
    <!-- Structured Data (JSON-LD) for SEO -->
    <script type="application/ld+json" v-html="structuredData"></script>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import VisualLayer from '~/components/VisualLayer.vue'
import AmbientSound from '~/components/AmbientSound.vue'
import SentimentMeter from '~/components/SentimentMeter.vue'
import InfoDialog from '~/components/InfoDialog.vue'
import { useSentiment } from '~/composables/useSentiment'

const { sentimentScore, isLoading, error, isUsingFallback, fetchSentiment, startPolling, stopPolling } = useSentiment()

// Structured data for SEO (JSON-LD)
const config = useRuntimeConfig()
const siteUrl = config.public?.siteUrl || 'https://emotionwave.iamjarl.com'

const structuredData = computed(() => {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'EmotionWave',
    description: 'An interactive web experience that visualizes global sentiment in real-time through dynamic visuals and ambient sound, powered by live news analysis.',
    url: siteUrl,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    creator: {
      '@type': 'Person',
      name: 'Jarl Lyng'
    },
    featureList: [
      'Real-time sentiment analysis',
      'Global news aggregation',
      'Interactive data visualization',
      'Ambient sound generation',
      'Progressive Web App (PWA)'
    ],
    screenshot: `${siteUrl}/og-image.png`,
    inLanguage: 'en',
    isAccessibleForFree: true
  })
})

onMounted(() => {
  fetchSentiment()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script> 