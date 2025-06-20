<template>
  <div class="sound-controls">
    <button 
      @click="toggleSound" 
      class="sound-button"
      :class="{ 
        'is-playing': isPlaying,
        'is-loading': isLoading,
        'needs-interaction': needsInteraction
      }"
      :title="getButtonTitle"
    >
      <span class="sound-icon">
        <span v-if="isLoading" class="loading-spinner"></span>
        <span v-else-if="needsInteraction">👆</span>
        <span v-else>{{ isPlaying ? '🔊' : '🔇' }}</span>
      </span>
    </button>
    <div v-if="isPlaying" class="volume-control">
      <input
        type="range"
        v-model="volume"
        min="0"
        max="1"
        step="0.01"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        :style="{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
        }"
        @input="updateVolume"
        style="appearance: none; -webkit-appearance: none;"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'

const props = defineProps<{
  sentimentScore: number
}>()

const isPlaying = ref(false)
const isLoading = ref(false)
const needsInteraction = ref(true)
const volume = ref(0.5)
const color = ref('#4F46E5') // Indigo-600
let synth: any = null
let reverb: any = null
let filter: any = null
let toneModule: any = null
let chordInterval: any = null

const getButtonTitle = computed(() => {
  if (isLoading.value) return 'Initialiserer lyd...'
  if (needsInteraction.value) return 'Klik for at aktivere lyd'
  return isPlaying.value ? 'Sluk lyd' : 'Tænd lyd'
})

// Lazy load Tone.js
const loadToneJS = async () => {
  if (!toneModule) {
    toneModule = await import('tone')
  }
  return toneModule
}

// Definer skalaer
const C_MINOR_SCALE = ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4']
const C_MAJOR_SCALE = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4']

// Opret synth med reverb og delay
const initAudio = async () => {
  try {
    const Tone = await loadToneJS()
    await Tone.start()
    
    // Opret synth med reverb
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 0.5,
        release: 4
      }
    }).toDestination()
    
    // Tilføj reverb
    reverb = new Tone.Reverb({
      decay: 8,
      wet: 0.8,
      preDelay: 0.2
    }).toDestination()
    
    // Tilføj delay
    const delay = new Tone.FeedbackDelay({
      delayTime: '4n',
      feedback: 0.4,
      wet: 0.3
    }).toDestination()
    
    // Kæd effekter sammen
    synth.chain(reverb, delay, Tone.Destination)
    
    // Opret filter
    filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 1000,
      rolloff: -24,
      Q: 1
    }).toDestination()
    
    synth.connect(filter)
    
    console.log('Lydsystem initialiseret')
  } catch (error) {
    console.error('Fejl ved initialisering af lydsystem:', error)
    needsInteraction.value = true
  }
}

// Spil akkord baseret på sentiment
const playChord = async () => {
  if (!synth || !isPlaying.value || !toneModule) return
  
  try {
    const Tone = await loadToneJS()
    const score = props.sentimentScore ?? 0
    
    // Vælg akkord baseret på sentiment
    let chord
    let scale = C_MINOR_SCALE // Default til C mol
    
    if (score <= -0.5) {
      chord = ['C3', 'Eb3', 'G3'] // C mol
    } else if (score <= 0) {
      chord = ['Eb3', 'G3', 'Bb3'] // Eb dur (relativ dur til C mol)
    } else if (score <= 0.5) {
      chord = ['F3', 'A3', 'C4'] // F dur (subdominant i C dur)
      scale = C_MAJOR_SCALE
    } else {
      chord = ['C3', 'E3', 'G3'] // C dur
      scale = C_MAJOR_SCALE
    }
    
    // Spil akkord med lange noter
    synth.triggerAttackRelease(chord, '8n')
    
    // Tilføj enkelte toner fra den valgte skala for mere ambient lyd
    const randomNote = scale[Math.floor(Math.random() * scale.length)]
    synth.triggerAttackRelease(randomNote, '2n', Tone.now() + 0.5)
    
    // Juster filter baseret på sentiment
    if (filter) {
      const frequency = Math.max(20, Math.min(20000, 1000 + score * 1000))
      filter.frequency.rampTo(frequency, 0.5)
    }
    
  } catch (error) {
    console.error('Fejl ved afspilning af akkord:', error)
  }
}

// Start ambient lyd
const playAmbientSound = async () => {
  if (!isPlaying.value || !toneModule) return
  
  try {
    const Tone = await loadToneJS()
    await playChord()
    
    // Gentag hver 8. takt
    chordInterval = setInterval(async () => {
      if (isPlaying.value) {
        await playChord()
      }
    }, 4000) // 4 sekunder mellem akkorder
    
  } catch (error) {
    console.error('Fejl ved afspilning af ambient lyd:', error)
    isPlaying.value = false
    needsInteraction.value = true
  }
}

// Toggle lyd
const toggleSound = async () => {
  if (isPlaying.value) {
    console.log('Slukker lyd...')
    isPlaying.value = false
    
    if (chordInterval) {
      clearInterval(chordInterval)
      chordInterval = null
    }
    
    if (synth) {
      synth.dispose()
      synth = null
    }
    if (reverb) {
      reverb.dispose()
      reverb = null
    }
    if (filter) {
      filter.dispose()
      filter = null
    }
  } else {
    try {
      console.log('Starter lydinitialisering...')
      isLoading.value = true
      
      // Vent på brugerinteraktion før vi starter audio context
      console.log('Venter på Tone.start()...')
      await initAudio()
      console.log('Lydsystem initialiseret')
      needsInteraction.value = false
      isPlaying.value = true
      
      // Start ambient lyd
      await playAmbientSound()
      
    } catch (error) {
      console.error('Fejl ved start af lyd:', error)
      needsInteraction.value = true
    } finally {
      isLoading.value = false
    }
  }
}

// Opdater volumen
const updateVolume = () => {
  if (synth) {
    synth.volume.value = (volume.value - 1) * 20 // Konverter 0-1 til dB
  }
}

// Opdater farve baseret på sentiment
watch(() => props.sentimentScore, () => {
  const score = props.sentimentScore ?? 0
  
  if (score <= -0.5) {
    color.value = '#6B7280' // grå
  } else if (score <= 0) {
    color.value = '#3B82F6' // blå
  } else if (score <= 0.5) {
    color.value = '#60A5FA' // lys blå
  } else {
    color.value = '#FBBF24' // gul
  }
})

onUnmounted(() => {
  if (chordInterval) {
    clearInterval(chordInterval)
  }
  
  if (synth) {
    synth.dispose()
  }
  if (reverb) {
    reverb.dispose()
  }
  if (filter) {
    filter.dispose()
  }
})
</script>

<style scoped>
.sound-controls {
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.sound-button {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.sound-button:hover {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.sound-button.is-playing {
  background: rgba(79, 70, 229, 0.3);
  border-color: rgba(79, 70, 229, 0.6);
}

.sound-button.is-loading {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.6);
}

.sound-button.needs-interaction {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.6);
  animation: pulse 2s infinite;
}

.sound-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.volume-control {
  width: 8rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  border-radius: 0.5rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.volume-control input[type="range"] {
  width: 100%;
  height: 0.5rem;
  border-radius: 0.25rem;
  outline: none;
  cursor: pointer;
}

.volume-control input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.volume-control input[type="range"]::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@media (max-width: 768px) {
  .sound-controls {
    bottom: 1rem;
    left: 1rem;
  }
  
  .sound-button {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
  }
  
  .volume-control {
    width: 6rem;
  }
}
</style> 