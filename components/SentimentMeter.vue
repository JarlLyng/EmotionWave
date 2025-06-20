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
  bottom: 3rem;
  left: 3rem;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 2rem;
  border-radius: 1.5rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.meter-container {
  width: 250px;
}

.meter-track {
  height: 12px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.meter-fill {
  height: 100%;
  transition: width 0.5s ease-out, background-color 0.5s ease-out;
  border-radius: 6px;
}

.meter-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
}

.score-display {
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  margin-top: 1rem;
  transition: color 0.5s ease-out;
}

.label {
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.label:hover {
  opacity: 1;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .sentiment-meter {
    bottom: 2rem;
    left: 2rem;
    padding: 1.5rem;
  }
  
  .meter-container {
    width: 200px;
  }
  
  .score-display {
    font-size: 1.5rem;
  }
}
</style> 