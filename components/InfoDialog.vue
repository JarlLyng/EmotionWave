<template>
  <div>
    <!-- Info Button -->
    <button 
      @click="isOpen = true"
      class="fixed top-6 right-6 p-4 rounded-full bg-black/20 hover:bg-black/40 transition-all duration-300 backdrop-blur-md border border-white/10 hover:border-white/30 shadow-lg z-50 group"
      aria-label="Show information"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
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
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50"
        @click="isOpen = false"
      >
        <div 
          class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          @click.stop
        >
          <!-- Animated background -->
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse"></div>
          
          <!-- Content -->
          <div class="relative z-10">
            <!-- Header -->
            <div class="flex justify-between items-start mb-10">
              <div>
                <h2 class="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                  About EmotionWave
                </h2>
                <div class="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
              </div>
              <button 
                @click="isOpen = false"
                class="text-white/60 hover:text-white transition-colors p-3 hover:bg-white/10 rounded-full group"
                aria-label="Close dialog"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="space-y-10 overflow-y-auto max-h-[60vh] pr-4">
              <!-- Description -->
              <div class="bg-white/5 rounded-2xl p-8 border border-white/5">
                <p class="text-xl leading-relaxed text-white/90">
                  EmotionWave is an interactive artwork that visualizes the world's mood in real-time. 
                  Through sentiment analysis of news articles from various sources, the installation creates 
                  a dynamic visual and audio experience that reflects the current global sentiment.
                </p>
              </div>

              <!-- How it works -->
              <div class="space-y-6">
                <h3 class="text-3xl font-semibold text-white flex items-center gap-4">
                  <div class="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  How it works
                </h3>
                <div class="grid gap-4">
                  <div class="flex items-start gap-4 p-6 bg-white/5 rounded-xl border border-white/5">
                    <div class="w-3 h-3 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-white/80 text-lg">News articles are analyzed every 30 seconds using AI</p>
                  </div>
                  <div class="flex items-start gap-4 p-6 bg-white/5 rounded-xl border border-white/5">
                    <div class="w-3 h-3 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-white/80 text-lg">Sentiment score ranges from -1 (negative) to +1 (positive)</p>
                  </div>
                  <div class="flex items-start gap-4 p-6 bg-white/5 rounded-xl border border-white/5">
                    <div class="w-3 h-3 bg-pink-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-white/80 text-lg">Visual elements and ambient music adapt to the sentiment</p>
                  </div>
                  <div class="flex items-start gap-4 p-6 bg-white/5 rounded-xl border border-white/5">
                    <div class="w-3 h-3 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-white/80 text-lg">Interactive particles respond to your mouse movements</p>
                  </div>
                </div>
              </div>

              <!-- Visual elements -->
              <div class="space-y-6">
                <h3 class="text-3xl font-semibold text-white flex items-center gap-4">
                  <div class="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  Visual elements
                </h3>
                <div class="grid gap-4">
                  <div class="flex items-start gap-4 p-6 bg-white/5 rounded-xl border border-white/5">
                    <div class="w-3 h-3 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-white/80 text-lg">Particle system that changes color and movement based on sentiment</p>
                  </div>
                  <div class="flex items-start gap-4 p-6 bg-white/5 rounded-xl border border-white/5">
                    <div class="w-3 h-3 bg-pink-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-white/80 text-lg">Sentiment meter showing the current global mood</p>
                  </div>
                  <div class="flex items-start gap-4 p-6 bg-white/5 rounded-xl border border-white/5">
                    <div class="w-3 h-3 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-white/80 text-lg">Ambient music that shifts between minor and major scales</p>
                  </div>
                </div>
              </div>

              <!-- News sources -->
              <div class="space-y-6">
                <h3 class="text-3xl font-semibold text-white flex items-center gap-4">
                  <div class="w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
                  News sources
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="p-6 bg-white/5 rounded-xl border border-white/5">
                    <p class="text-white/80 font-medium text-lg">GDELT API</p>
                    <p class="text-white/60 text-base">Global news sentiment data</p>
                  </div>
                  <div class="p-6 bg-white/5 rounded-xl border border-white/5">
                    <p class="text-white/80 font-medium text-lg">HuggingFace</p>
                    <p class="text-white/60 text-base">AI sentiment analysis</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="pt-8 mt-10 border-t border-white/10">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 text-base text-white/60">
                <div class="flex items-center gap-6">
                  <span class="flex items-center gap-3">
                    <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                    Nuxt 3
                  </span>
                  <span class="flex items-center gap-3">
                    <div class="w-3 h-3 bg-purple-400 rounded-full"></div>
                    Three.js
                  </span>
                  <span class="flex items-center gap-3">
                    <div class="w-3 h-3 bg-pink-400 rounded-full"></div>
                    Tone.js
                  </span>
                </div>
                <p class="text-white/40">Sentiment analysis powered by HuggingFace</p>
              </div>
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
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, rgba(59, 130, 246, 0.5), rgba(147, 51, 234, 0.5));
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, rgba(59, 130, 246, 0.7), rgba(147, 51, 234, 0.7));
}

/* Force proper padding on dialog */
.bg-gradient-to-br {
  padding: 3rem !important;
}

/* Additional padding for dialog content */
.relative.z-10 {
  padding: 1rem;
}

/* Smooth animations */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Gradient text animation */
.bg-gradient-to-r {
  background-size: 200% 200%;
  animation: gradient 3s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .max-w-4xl {
    max-width: 95vw;
  }
  
  .bg-gradient-to-br {
    padding: 1.5rem !important;
  }
  
  .text-5xl {
    font-size: 2.5rem;
  }
  
  .text-3xl {
    font-size: 1.75rem;
  }
  
  .p-6 {
    padding: 1rem;
  }
  
  .gap-4 {
    gap: 0.75rem;
  }
  
  .space-y-10 {
    margin-top: 2rem;
  }
  
  .space-y-6 {
    margin-top: 1.5rem;
  }
}
</style> 