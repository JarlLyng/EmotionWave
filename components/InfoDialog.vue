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
        class="bg-white/10 backdrop-blur-md rounded-lg p-6 max-w-2xl w-full text-white border border-white/10"
        @click.stop
      >
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-2xl font-bold">Om EmotionWave</h2>
          <button 
            @click="isOpen = false"
            class="text-white/70 hover:text-white transition-colors"
            aria-label="Luk dialog"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <p>
            EmotionWave er et interaktivt kunstværk der visualiserer verdens stemning i realtid. 
            Gennem sentiment analyse af nyhedsartikler fra forskellige kilder, skaber installationen 
            en dynamisk visuel og lydoplevelse der afspejler den aktuelle globale stemning.
          </p>

          <h3 class="text-xl font-semibold mt-6">Sådan virker det</h3>
          <ul class="list-disc list-inside space-y-2">
            <li>Nyhedsartikler analyseres hver 10. minut med AI</li>
            <li>Sentiment scoren går fra -1 (negativ) til +1 (positiv)</li>
            <li>Visuelle elementer og ambient musik tilpasser sig sentimenten</li>
            <li>Interaktive partikler reagerer på dine musebevægelser</li>
          </ul>

          <h3 class="text-xl font-semibold mt-6">Visuelle elementer</h3>
          <ul class="list-disc list-inside space-y-2">
            <li>Partikelsystem der ændrer farve og bevægelse baseret på sentiment</li>
            <li>Sentiment meter der viser den aktuelle globale stemning</li>
            <li>Ambient musik der skifter mellem mol og dur skalaer</li>
          </ul>

          <h3 class="text-xl font-semibold mt-6">Nyhedskilder</h3>
          <ul class="list-disc list-inside space-y-2">
            <li>DR (Danmark)</li>
            <li>Politiken (Danmark)</li>
            <li>Berlingske (Danmark)</li>
            <li>BBC (Storbritannien)</li>
            <li>The Guardian (Storbritannien)</li>
            <li>Reuters (International)</li>
            <li>Al Jazeera (International)</li>
          </ul>

          <div class="mt-6 text-sm text-white/70">
            <p>Skabt med Nuxt 3, Three.js, og Tone.js</p>
            <p>Sentiment analyse drevet af HuggingFace</p>
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