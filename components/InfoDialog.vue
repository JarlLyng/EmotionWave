<template>
  <div>
    <!-- Info Button -->
    <button 
      @click="isOpen = true"
      class="fixed top-4 right-4 p-3 rounded-full bg-black/30 hover:bg-black/50 transition-all duration-300 backdrop-blur-md border border-white/10 hover:border-white/20 shadow-lg z-50"
      aria-label="Vis information"
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
          class="bg-black/40 backdrop-blur-xl rounded-2xl p-8 max-w-2xl w-full text-white border border-white/5 shadow-2xl"
          @click.stop
        >
          <div class="flex justify-between items-start mb-8">
            <h2 class="text-3xl font-bold text-white">Om EmotionWave</h2>
            <button 
              @click="isOpen = false"
              class="text-white/50 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              aria-label="Luk dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-8">
            <p class="text-lg leading-relaxed text-white/80">
              EmotionWave er et interaktivt kunstværk der visualiserer verdens stemning i realtid. 
              Gennem sentiment analyse af nyhedsartikler fra forskellige kilder, skaber installationen 
              en dynamisk visuel og lydoplevelse der afspejler den aktuelle globale stemning.
            </p>

            <div class="space-y-6">
              <h3 class="text-2xl font-semibold text-white">Sådan virker det</h3>
              <ul class="space-y-4">
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Nyhedsartikler analyseres hver 10. minut med AI</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Sentiment scoren går fra -1 (negativ) til +1 (positiv)</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Visuelle elementer og ambient musik tilpasser sig sentimenten</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Interaktive partikler reagerer på dine musebevægelser</span>
                </li>
              </ul>
            </div>

            <div class="space-y-6">
              <h3 class="text-2xl font-semibold text-white">Visuelle elementer</h3>
              <ul class="space-y-4">
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Partikelsystem der ændrer farve og bevægelse baseret på sentiment</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Sentiment meter der viser den aktuelle globale stemning</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Ambient musik der skifter mellem mol og dur skalaer</span>
                </li>
              </ul>
            </div>

            <div class="space-y-6">
              <h3 class="text-2xl font-semibold text-white">Nyhedskilder</h3>
              <ul class="space-y-4">
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">DR (Danmark)</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Politiken (Danmark)</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Berlingske (Danmark)</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">BBC (Storbritannien)</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">The Guardian (Storbritannien)</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Reuters (International)</span>
                </li>
                <li class="flex items-start">
                  <span class="text-white/40 mr-3">•</span>
                  <span class="text-white/80">Al Jazeera (International)</span>
                </li>
              </ul>
            </div>

            <div class="pt-6 border-t border-white/5 text-sm text-white/40">
              <p>Skabt med Nuxt 3, Three.js, og Tone.js</p>
              <p>Sentiment analyse drevet af HuggingFace</p>
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
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style> 