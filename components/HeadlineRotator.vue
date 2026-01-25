<template>
  <div 
    v-if="currentHeadline" 
    class="fixed inset-0 flex items-center justify-center pointer-events-none z-10"
  >
    <div class="max-w-4xl px-8 text-center">
      <h2 
        :key="currentHeadline.title"
        class="text-2xl md:text-3xl lg:text-4xl font-light text-white/90 drop-shadow-lg transition-opacity duration-500"
        :class="{ 'opacity-0': isTransitioning, 'opacity-100': !isTransitioning }"
      >
        {{ currentHeadline.title }}
      </h2>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Article {
  title: string
  url: string
  source: string
  sentiment: number
}

interface Props {
  articles: Article[]
}

const props = defineProps<Props>()

const currentIndex = ref(0)
const isTransitioning = ref(false)
let intervalId: number | null = null

// Filter articles with valid titles
const validArticles = computed(() => {
  return props.articles.filter(a => a.title && a.title.trim().length > 0)
})

const currentHeadline = computed(() => {
  if (validArticles.value.length === 0) return null
  return validArticles.value[currentIndex.value % validArticles.value.length]
})

function rotateHeadline() {
  if (validArticles.value.length <= 1) return
  
  // Fade out
  isTransitioning.value = true
  
  // After fade out, change headline
  setTimeout(() => {
    currentIndex.value = (currentIndex.value + 1) % validArticles.value.length
    isTransitioning.value = false
  }, 500) // Half of transition duration
}

function startRotation() {
  if (intervalId) {
    clearInterval(intervalId)
  }
  
  if (validArticles.value.length > 1) {
    // Rotate every 3 seconds
    intervalId = setInterval(rotateHeadline, 3000)
  }
}

function stopRotation() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

// Start rotation when articles are available
watch(() => validArticles.value.length, (newLength) => {
  if (newLength > 0) {
    // Randomize initial index
    currentIndex.value = Math.floor(Math.random() * newLength)
    startRotation()
  } else {
    stopRotation()
  }
}, { immediate: true })

onMounted(() => {
  if (validArticles.value.length > 0) {
    currentIndex.value = Math.floor(Math.random() * validArticles.value.length)
    startRotation()
  }
})

onUnmounted(() => {
  stopRotation()
})
</script>
