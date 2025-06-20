<template>
  <div>
    <!-- Info Button -->
    <button 
      @click="isOpen = true"
      class="fixed top-8 right-8 p-4 rounded-full bg-white/10 transition-all duration-300 backdrop-blur-md shadow-xl z-50"
      aria-label="Show information"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Dialog -->
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div 
        v-if="isOpen"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-8 z-50"
        @click="isOpen = false"
      >
        <div 
          class="bg-white/5 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden p-8"
          @click.stop
        >
          <!-- Header -->
          <div class="flex justify-between items-start p-8 pb-6">
            <div class="space-y-3">
              <h2 class="text-4xl font-light text-white tracking-tight">
                About EmotionWave
              </h2>
              <p class="text-white/60 text-lg font-light">
                A living artwork that reflects the world's mood
              </p>
            </div>
            <button 
              @click="isOpen = false"
              class="text-white/40 transition-colors p-2 rounded-full"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
            <!-- Description -->
            <div class="space-y-4">
              <p class="text-white/80 text-lg leading-relaxed font-light">
                EmotionWave is an interactive artwork that visualizes the world's mood in real-time. 
                Through sentiment analysis of news articles from various sources, the installation creates 
                a dynamic visual and audio experience that reflects the current global sentiment.
              </p>
            </div>

            <!-- How it works -->
            <div class="space-y-6">
              <h3 class="text-2xl font-light text-white flex items-center gap-3">
                How it works
              </h3>
              <div class="grid gap-4">
                <div class="flex items-start gap-4 p-6 rounded-xl">
                  <p class="text-white/70 text-base">News articles are analyzed every 30 seconds using AI</p>
                </div>
                <div class="flex items-start gap-4 p-6 rounded-xl">
                  <p class="text-white/70 text-base">Sentiment score ranges from -1 (negative) to +1 (positive)</p>
                </div>
                <div class="flex items-start gap-4 p-6 rounded-xl">
                  <p class="text-white/70 text-base">Visual elements and ambient music adapt to the sentiment</p>
                </div>
                <div class="flex items-start gap-4 p-6 rounded-xl">
                  <p class="text-white/70 text-base">Interactive particles respond to your mouse movements</p>
                </div>
              </div>
            </div>

            <!-- Visual elements -->
            <div class="space-y-6">
              <h3 class="text-2xl font-light text-white flex items-center gap-3">
                Visual elements
              </h3>
              <div class="grid gap-4">
                <div class="flex items-start gap-4 p-6 rounded-xl">
                  <p class="text-white/70 text-base">Particle system that changes color and movement based on sentiment</p>
                </div>
                <div class="flex items-start gap-4 p-6 rounded-xl">
                  <p class="text-white/70 text-base">Sentiment meter showing the current global mood</p>
                </div>
                <div class="flex items-start gap-4 p-6 rounded-xl">
                  <p class="text-white/70 text-base">Ambient music that shifts between minor and major scales</p>
                </div>
              </div>
            </div>

            <!-- News sources -->
            <div class="space-y-6">
              <h3 class="text-2xl font-light text-white flex items-center gap-3">
                News sources
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-6 rounded-xl">
                  <p class="text-white/80 font-medium text-base">GDELT API</p>
                  <p class="text-white/50 text-sm">Global news sentiment data</p>
                </div>
                <div class="p-6 rounded-xl">
                  <p class="text-white/80 font-medium text-base">HuggingFace</p>
                  <p class="text-white/50 text-sm">AI sentiment analysis</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-8 pt-6 bg-white/5">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-white/50">
              <div class="flex items-center gap-6">
                <span class="flex items-center gap-2">
                  Nuxt 3
                </span>
                <span class="flex items-center gap-2">
                  Three.js
                </span>
                <span class="flex items-center gap-2">
                  Tone.js
                </span>
              </div>
              <p class="text-white/30">Sentiment analysis powered by HuggingFace</p>
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
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .max-w-4xl {
    max-width: 95vw;
  }
  
  .p-8 {
    padding: 1.5rem;
  }
  
  .text-4xl {
    font-size: 2rem;
  }
  
  .text-2xl {
    font-size: 1.5rem;
  }
  
  .p-6 {
    padding: 1rem;
  }
  
  .gap-4 {
    gap: 0.75rem;
  }
  
  .space-y-8 {
    margin-top: 2rem;
  }
  
  .space-y-6 {
    margin-top: 1.5rem;
  }
}
</style> 