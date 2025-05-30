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
        appearance="none"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import * as Tone from 'tone'

const props = defineProps<{
  sentimentScore: number
}>()

const isPlaying = ref(false)
const isLoading = ref(false)
const needsInteraction = ref(true)
const volume = ref(0.5)
const color = ref('#4F46E5') // Indigo-600
let synth: Tone.PolySynth | null = null
let reverb: Tone.Reverb | null = null
let filter: Tone.Filter | null = null

const getButtonTitle = computed(() => {
  if (isLoading.value) return 'Initialiserer lyd...'
  if (needsInteraction.value) return 'Klik for at aktivere lyd'
  return isPlaying.value ? 'Sluk lyd' : 'Tænd lyd'
})

// Definer skalaer
const C_MINOR_SCALE = ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4']
const C_MAJOR_SCALE = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4']

// Opret synth med reverb og delay
const initAudio = async () => {
  try {
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
    const reverb = new Tone.Reverb({
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
  if (!synth || !isPlaying.value) return
  
  try {
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
  if (!isPlaying.value) return
  
  try {
    await playChord()
    
    // Gentag hver 8. takt
    Tone.Transport.scheduleRepeat(async () => {
      if (isPlaying.value) {
        await playChord()
      }
    }, '8n')
    
    Tone.Transport.start()
    
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
    synth?.dispose()
    reverb?.dispose()
    filter?.dispose()
    synth = null
    reverb = null
    filter = null
  } else {
    try {
      console.log('Starter lydinitialisering...')
      isLoading.value = true
      
      // Vent på brugerinteraktion før vi starter audio context
      console.log('Venter på Tone.start()...')
      await Tone.start()
      console.log('Tone.start() fuldført')
      needsInteraction.value = false
      
      // Opret synth med reverb og delay
      console.log('Opretter synth...')
      await initAudio()
      
      // Sæt master volume
      Tone.Destination.volume.value = -10
      
      // Sæt isPlaying til true før vi starter lyden
      isPlaying.value = true
      
      console.log('Lydsystem initialiseret, starter ambient lyd...')
      await playAmbientSound()
    } catch (err) {
      console.error('Kunne ikke starte lyd:', err)
      needsInteraction.value = true
      isPlaying.value = false
    } finally {
      isLoading.value = false
    }
  }
}

// Opdater lyd når sentiment ændrer sig
watch(() => props.sentimentScore, (newScore) => {
  if (isPlaying.value) {
    playAmbientSound()
  }
})

// Opdater lydstyrke
watch(volume, (newVolume) => {
  if (isPlaying.value && Tone.Destination) {
    // Konverter 0-1 til -60-0 dB
    const db = newVolume * 60 - 60
    Tone.Destination.volume.value = db
  }
})

function updateVolume(event: Event) {
  const target = event.target as HTMLInputElement
  volume.value = parseFloat(target.value)
}

onUnmounted(() => {
  synth?.dispose()
  reverb?.dispose()
  filter?.dispose()
})
</script>

<style scoped>
.sound-controls {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 1rem;
  border-radius: 1rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.sound-button {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  position: relative;
}

.sound-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.sound-button.is-playing {
  background-color: rgba(255, 255, 255, 0.1);
}

.sound-button.is-loading {
  cursor: wait;
}

.sound-button.needs-interaction {
  animation: pulse 2s infinite;
}

.loading-spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.volume-control {
  width: 100%;
  padding: 0 0.5rem;
}

.volume-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.volume-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}
</style> 