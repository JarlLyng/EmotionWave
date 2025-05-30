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

const { sentimentScore, isLoading, error, fetchSentiment } = useSentiment()
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
}
</style>
