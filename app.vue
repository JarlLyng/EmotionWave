<template>
  <div>
    <VisualLayer :sentiment-score="sentimentScore" />
    <AmbientSound :sentiment-score="sentimentScore" />
    <SentimentMeter 
      :score="sentimentScore" 
      :is-loading="isLoading"
      :error="error"
      @retry="fetchSentiment"
    />
    <InfoDialog />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { useSentiment } from '~/composables/useSentiment'
import VisualLayer from '~/components/VisualLayer.vue'
import AmbientSound from '~/components/AmbientSound.vue'
import SentimentMeter from '~/components/SentimentMeter.vue'
import InfoDialog from '~/components/InfoDialog.vue'
import { onMounted } from 'vue'

const { sentimentScore, isLoading, error, fetchSentiment } = useSentiment()

// Register service worker for PWA functionality
onMounted(() => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  }
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: black;
  color: white;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Prevent zoom on double tap (iOS) */
* {
  touch-action: manipulation;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>
