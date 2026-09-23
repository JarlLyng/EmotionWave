<template>
  <div
    v-if="currentHeadline"
    class="fixed inset-0 flex items-center justify-center pointer-events-none z-10"
  >
    <div class="max-w-4xl px-8 text-center">
      <!-- Hovering the headline holds it in place while it is read. The
           particle field listens on window, so this does not block it. -->
      <h2
        :key="currentHeadline.title"
        class="text-2xl md:text-3xl lg:text-4xl font-light text-white/90 drop-shadow-lg transition-opacity duration-500 pointer-events-auto"
        :class="{ 'opacity-0': isTransitioning, 'opacity-100': !isTransitioning }"
        @mouseenter="headlineHover = true"
        @mouseleave="headlineHover = false"
      >
        {{ currentHeadline.title }}
      </h2>

      <!-- Provenance row (issue #75): publisher link, plus a pause control
           that stays visually hidden until reached by keyboard. Only for
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
          @click="manualPause = !manualPause"
        >
          {{ manualPause ? 'Resume headlines' : 'Pause headlines' }}
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
// Rotation pauses while the user hovers the headline or hovers/focuses the
// provenance row, when they toggle the keyboard pause control, and by
// default under prefers-reduced-motion (issue #75, WCAG 2.2.2)
const manualPause = ref(false)
const interactionPause = ref(false)
const headlineHover = ref(false)
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

const isPaused = computed(() => manualPause.value || interactionPause.value || headlineHover.value)

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
  // Under reduced motion the rotation starts paused; keyboard users can
  // opt back in through the pause control
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
/* Visually hidden until reached by keyboard, so it never clutters the piece
   for mouse users while still satisfying WCAG 2.2.2 for keyboard users */
.pause-button:not(:focus-visible) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.pause-button:focus-visible {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.75rem;
  outline: none;
}
</style>
