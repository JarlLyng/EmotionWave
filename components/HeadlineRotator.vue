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

      <!-- Provenance row (issue #75): publisher link, pause control. Only for
           real articles — fallback/status lines stay plain text. -->
      <div
        class="mt-4 flex items-center justify-center gap-3 pointer-events-auto text-sm text-white/50 transition-opacity duration-500"
        :class="{ 'opacity-0': isTransitioning, 'opacity-100': !isTransitioning }"
        @mouseenter="interactionPause = true"
        @mouseleave="interactionPause = false"
        @focusin="interactionPause = true"
        @focusout="interactionPause = false"
      >
        <a
          v-if="currentLink"
          :href="currentLink"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-4 hover:text-white/80 focus-visible:text-white/80 transition-colors"
        >
          {{ currentHeadline.source }}
        </a>
        <span v-else-if="isRealArticle">{{ currentHeadline.source }}</span>

        <button
          v-if="validArticles.length > 1"
          type="button"
          class="pause-button"
          :aria-pressed="manualPause"
          :aria-label="manualPause ? 'Resume headline rotation' : 'Pause headline rotation'"
          @click="manualPause = !manualPause"
        >
          {{ manualPause ? '▶' : '❚❚' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { safeArticleUrl } from '~/utils/sentiment'

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
// Rotation pauses while the user hovers/focuses the provenance row, when
// they press pause, and by default under prefers-reduced-motion (issue #75)
const manualPause = ref(false)
const interactionPause = ref(false)
let intervalId: ReturnType<typeof setInterval> | null = null

// Filter articles with valid titles
const validArticles = computed(() => {
  return props.articles.filter(a => a.title && a.title.trim().length > 0)
})

const currentHeadline = computed(() => {
  if (validArticles.value.length === 0) return null
  return validArticles.value[currentIndex.value % validArticles.value.length]
})

/** Fallback/status lines use the EmotionWave pseudo-source — no link, no label */
const isRealArticle = computed(() =>
  !!currentHeadline.value && currentHeadline.value.source !== 'EmotionWave'
)

const currentLink = computed(() =>
  isRealArticle.value ? safeArticleUrl(currentHeadline.value?.url) : null
)

const isPaused = computed(() => manualPause.value || interactionPause.value)

function rotateHeadline() {
  if (validArticles.value.length <= 1 || isPaused.value) return

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
    // Rotate every 5 seconds
    intervalId = setInterval(rotateHeadline, 5000)
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

// Pause rotation while the tab is hidden — no reason to churn timers
// (and burn the fade transition) for a page nobody is looking at
function handleVisibilityChange() {
  if (document.hidden) {
    stopRotation()
  } else if (validArticles.value.length > 1) {
    startRotation()
  }
}

onMounted(() => {
  // Under reduced motion the rotation starts paused; the pause button
  // doubles as an explicit opt back in
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    manualPause.value = true
  }
  if (validArticles.value.length > 0) {
    currentIndex.value = Math.floor(Math.random() * validArticles.value.length)
    startRotation()
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  stopRotation()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.pause-button {
  min-width: 1.9rem;
  height: 1.9rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.6rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.pause-button:hover,
.pause-button:focus-visible {
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.5);
}
</style>
