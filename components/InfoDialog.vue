<template>
  <div>
    <!-- Info Button -->
    <button 
      @click="isOpen = true"
      class="fixed top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-white/20 shadow-sm z-50"
      aria-label="Show information"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white/70" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Dialog -->
    <div 
      v-if="isOpen"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click="isOpen = false"
    >
      <div 
        class="bg-white/10 backdrop-blur-md rounded-lg p-6 max-w-2xl w-full text-white"
        @click.stop
      >
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-2xl font-bold">About EmotionWave</h2>
          <button 
            @click="isOpen = false"
            class="text-white/70 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <p>
            EmotionWave is an interactive art installation that visualizes the world's mood in real-time. 
            Through sentiment analysis of news articles from various sources, the installation creates a 
            dynamic visual and audio experience that reflects the current global sentiment.
          </p>

          <h3 class="text-xl font-semibold mt-6">How it works</h3>
          <ul class="list-disc list-inside space-y-2">
            <li>News articles are analyzed every 10 minutes using AI</li>
            <li>The sentiment score ranges from -1 (negative) to +1 (positive)</li>
            <li>Visual elements and ambient music adapt to the sentiment</li>
            <li>Interactive particles respond to your mouse movements</li>
          </ul>

          <h3 class="text-xl font-semibold mt-6">Visual Elements</h3>
          <ul class="list-disc list-inside space-y-2">
            <li>Particle system that changes color and movement based on sentiment</li>
            <li>Sentiment meter showing the current global mood</li>
            <li>Ambient music that shifts between minor and major scales</li>
          </ul>

          <h3 class="text-xl font-semibold mt-6">News Sources</h3>
          <ul class="list-disc list-inside space-y-2">
            <li>DR (Denmark)</li>
            <li>BBC (United Kingdom)</li>
            <li>The Guardian (United Kingdom)</li>
          </ul>

          <div class="mt-6 text-sm text-white/70">
            <p>Created with Nuxt 3, Three.js, and Tone.js</p>
            <p>Sentiment analysis powered by HuggingFace</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)
</script> 