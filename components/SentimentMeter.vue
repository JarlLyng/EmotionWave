<template>
  <div class="sentiment-meter">
    <div class="meter-container">
      <div class="meter-track">
        <div 
          class="meter-fill" 
          :style="{ 
            width: `${(sentimentScore + 1) * 50}%`,
            backgroundColor: getMeterColor
          }"
        ></div>
      </div>
      <div class="meter-labels">
        <span class="label negative">Negativ</span>
        <span class="label neutral">Neutral</span>
        <span class="label positive">Positiv</span>
      </div>
    </div>
    <div class="score-display" :style="{ color: getMeterColor }">
      {{ formatScore }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  score: number
  isLoading: boolean
  error?: string | null
}>()

defineEmits<{
  (e: 'retry'): void
}>()

const formattedScore = computed(() => {
  if (typeof props.score !== 'number') return '0.00'
  return props.score.toFixed(2)
})

const sentimentScore = computed(() => {
  if (typeof props.score !== 'number') return 0
  return props.score
})

const getMeterColor = computed(() => {
  if (typeof props.score !== 'number') return '#ff4444'
  if (props.score < 0) return '#ff4444'
  if (props.score > 0) return '#00C851'
  return '#ffbb33'
})

const formatScore = computed(() => {
  if (typeof props.score !== 'number') return '0.00'
  return formattedScore.value
})
</script>

<style scoped>
.sentiment-meter {
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 1.5rem;
  border-radius: 1rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  user-select: none;
}

.meter-container {
  width: 200px;
}

.meter-track {
  height: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.meter-fill {
  height: 100%;
  transition: width 0.5s ease-out, background-color 0.5s ease-out;
  border-radius: 4px;
}

.meter-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.score-display {
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 0.5rem;
  transition: color 0.5s ease-out;
}

.label {
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.label:hover {
  opacity: 1;
}
</style> 