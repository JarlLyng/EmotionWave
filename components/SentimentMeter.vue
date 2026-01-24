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
        <span class="label negative">Negative</span>
        <span class="label neutral">Neutral</span>
        <span class="label positive">Positive</span>
      </div>
    </div>
    <div v-if="isUsingFallback" class="fallback-badge">
      <span class="fallback-icon">📡</span>
      <span class="fallback-text">Demo data</span>
    </div>
    <button 
      v-if="error && !isUsingFallback" 
      @click="$emit('retry')"
      class="retry-button"
    >
      Retry
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  score: number
  isLoading: boolean
  error?: string | null
  isUsingFallback?: boolean
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

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
</script>

<style scoped>
.sentiment-meter {
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 1rem 1rem 0.3rem 1rem;
  border-radius: 1.5rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.meter-container,
.meter-track,
.meter-fill,
.meter-labels,
.fallback-badge {
  pointer-events: none;
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

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  pointer-events: auto;
}

.retry-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.fallback-badge {
  margin-top: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  backdrop-filter: blur(10px);
}

.fallback-icon {
  font-size: 0.875rem;
}

.fallback-text {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.label {
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.label:hover {
  opacity: 1;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .sentiment-meter {
    bottom: 2rem;
    left: 2rem;
    padding: 0.75rem;
  }
  
  .meter-container {
    width: 200px;
  }
}
</style> 