<template>
  <div class="min-h-screen bg-black text-white">
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import VisualLayer from '~/components/VisualLayer.vue'
import AmbientSound from '~/components/AmbientSound.vue'
import SentimentMeter from '~/components/SentimentMeter.vue'
import InfoDialog from '~/components/InfoDialog.vue'
import { useSentiment } from '~/composables/useSentiment'

const { sentimentScore, isLoading, error, isUsingFallback, fetchSentiment, startPolling, stopPolling } = useSentiment()

onMounted(() => {
  fetchSentiment()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script> 