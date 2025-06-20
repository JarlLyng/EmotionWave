<template>
  <div>
    <!-- Info Button -->
    <button 
      @click="isOpen = true"
      class="fixed top-4 right-4 p-3 rounded-full bg-black/30 hover:bg-black/50 transition-all duration-300 backdrop-blur-md border border-white/10 hover:border-white/20 shadow-lg z-50"
      aria-label="Show information"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Dialog -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div 
        v-if="isOpen"
        class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
        @click="isOpen = false"
      >
        <div 
          class="bg-black/40 backdrop-blur-xl rounded-2xl p-12 max-w-2xl w-full text-red-500 border border-white/5 shadow-2xl overflow-y-auto max-h-[90vh]"
          @click.stop
        >
          <div class="flex justify-between items-start mb-12">
            <h2 class="text-3xl font-bold text-red-500">About EmotionWave</h2>
            <button 
              @click="isOpen = false"
              class="text-red-500 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded-full"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-12">
            <p class="text-lg leading-relaxed text-red-500">
              EmotionWave is an interactive artwork that visualizes the world's mood in real-time. 
              Through sentiment analysis of news articles from various sources, the installation creates 
              a dynamic visual and audio experience that reflects the current global sentiment.
            </p>

            <div class="space-y-6">
              <h3 class="text-2xl font-semibold text-red-500">How it works</h3>
              <ul class="space-y-4 list-disc pl-10">
                <li class="text-red-500">News articles are analyzed every 10 minutes using AI</li>
                <li class="text-red-500">Sentiment score ranges from -1 (negative) to +1 (positive)</li>
                <li class="text-red-500">Visual elements and ambient music adapt to the sentiment</li>
                <li class="text-red-500">Interactive particles respond to your mouse movements</li>
              </ul>
            </div>

            <div class="space-y-6">
              <h3 class="text-2xl font-semibold text-red-500">Visual elements</h3>
              <ul class="space-y-4 list-disc pl-10">
                <li class="text-red-500">Particle system that changes color and movement based on sentiment</li>
                <li class="text-red-500">Sentiment meter showing the current global mood</li>
                <li class="text-red-500">Ambient music that shifts between minor and major scales</li>
              </ul>
            </div>

            <div class="space-y-6">
              <h3 class="text-2xl font-semibold text-red-500">News sources</h3>
              <ul class="space-y-4 list-disc pl-10">
                <li class="text-red-500">DR (Denmark)</li>
                <li class="text-red-500">Politiken (Denmark)</li>
                <li class="text-red-500">Berlingske (Denmark)</li>
                <li class="text-red-500">BBC (United Kingdom)</li>
                <li class="text-red-500">The Guardian (United Kingdom)</li>
                <li class="text-red-500">Reuters (International)</li>
                <li class="text-red-500">Al Jazeera (International)</li>
              </ul>
            </div>

            <div class="pt-8 border-t border-red-500/20 text-sm text-red-500/60">
              <p>Created with Nuxt 3, Three.js, and Tone.js</p>
              <p>Sentiment analysis powered by HuggingFace</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)
</script>

<style scoped>
/* Basic transitions */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

/* Custom scrollbar */
.max-w-2xl::-webkit-scrollbar {
  width: 8px;
}

.max-w-2xl::-webkit-scrollbar-track {
  background: transparent;
}

.max-w-2xl::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

/* List styling */
ul {
  list-style-type: disc;
}

li {
  margin-left: 1rem;
}
</style> 