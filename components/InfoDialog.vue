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
          class="dialog-container bg-white/5 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
          @click.stop
        >
          <!-- Header -->
          <div class="flex justify-between items-start pb-6">
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
          <div class="content-section overflow-y-auto max-h-[60vh]">
            <!-- Description -->
            <div class="content-block">
              <p class="text-white/80 text-lg leading-relaxed font-light">
                EmotionWave is an interactive artwork that visualizes the world's mood in real-time. 
                Through sentiment analysis of news articles from various sources, the installation creates 
                a dynamic visual and audio experience that reflects the current global sentiment.
              </p>
            </div>

            <!-- How it works -->
            <div class="content-block">
              <h3 class="text-2xl font-light text-white mb-4">
                How it works
              </h3>
              <div class="space-y-4">
                <p class="text-white/70 text-base leading-relaxed">
                  EmotionWave continuously analyzes news articles from global sources every 30 seconds. 
                  Using state-of-the-art AI models (Hugging Face Transformers), it performs deep semantic 
                  analysis to calculate a precise sentiment score ranging from -1 (negative) to +1 (positive).
                </p>
                <p class="text-white/70 text-base leading-relaxed">
                  This score then influences all elements on the site: particles change color and movement, 
                  ambient music shifts between minor and major scales, and the visual atmosphere automatically 
                  adapts to the world's current mood.
                </p>
                <p class="text-white/70 text-base leading-relaxed">
                  You can interact with the particles by moving your mouse around the screen. 
                  The particles respond to your movement and create a dynamic, living experience.
                </p>
              </div>
            </div>

            <!-- Visual elements -->
            <div class="content-block">
              <h3 class="text-2xl font-light text-white mb-4">
                Visual elements
              </h3>
              <div class="space-y-4">
                <p class="text-white/70 text-base leading-relaxed">
                  <strong class="text-white/90">Particle system:</strong> A dynamic system with 1000-2000 particles 
                  that change color and movement based on sentiment. The particles respond to mouse movements 
                  and create a living, interactive visual experience.
                </p>
                <br />
                <p class="text-white/70 text-base leading-relaxed">
                  <strong class="text-white/90">Sentiment meter:</strong> A visual indicator showing the current 
                  global mood. The meter displays how positive or negative the world's mood is right now.
                </p>
                <br />
                <p class="text-white/70 text-base leading-relaxed">
                  <strong class="text-white/90">Ambient music:</strong> Generative music that shifts between minor and major scales 
                  based on sentiment. The music adapts automatically and creates an atmospheric audio experience 
                  that complements the visual elements.
                </p>
              </div>
            </div>

            <!-- Data sources -->
            <div class="content-block">
              <h3 class="text-2xl font-light text-white mb-4">
                Data sources
              </h3>
              <div class="space-y-4">
                <p class="text-white/70 text-base leading-relaxed">
                  EmotionWave uses multiple data sources for sentiment analysis. The primary source is the 
                  <strong class="text-white/90">GDELT API</strong>, which indexes millions of news articles 
                  from around the world and provides access to real-time sentiment data.
                </p>
                <p class="text-white/70 text-base leading-relaxed">
                  Additionally, the system can aggregate data from <strong class="text-white/90">NewsAPI</strong> 
                   and <strong class="text-white/90">Reddit</strong> 
                  for a more comprehensive view of global sentiment. We use advanced Natural Language Processing 
                  to understand the true emotion behind headlines, not just keyword matching.
                </p>
                <p class="text-white/70 text-base leading-relaxed">
                  The data is continuously analyzed, and sentiment scores are updated every 30 seconds to 
                  give you the most current experience of the world's mood.
                </p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer-section bg-white/5">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-white/50">
              <p class="text-white/30">Built with Nuxt 3, Three.js and Tone.js</p>
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
.dialog-container {
  padding: 2rem;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.content-block {
  display: flex;
  flex-direction: column;
}

.footer-section {
  padding: 1.5rem 2rem;
  margin: 0 -2rem -2rem -2rem;
}

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
  
  .dialog-container {
    padding: 1.5rem;
  }
  
  .content-section {
    gap: 2rem;
  }
  
  .footer-section {
    padding: 1rem 1.5rem;
    margin: 0 -1.5rem -1.5rem -1.5rem;
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