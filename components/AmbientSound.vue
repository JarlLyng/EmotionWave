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
        <span v-else-if="needsInteraction">Start music</span>
        <span v-else>{{ isPlaying ? 'Stop music' : 'Start music' }}</span>
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
let delay: any = null
let filter: any = null
let toneModule: any = null
let chordInterval: any = null
let chordIndex = 0 // Track hvilken variation vi er på

const getButtonTitle = computed(() => {
  if (isLoading.value) return 'Initializing audio...'
  if (needsInteraction.value) return 'Click to enable audio'
  return isPlaying.value ? 'Mute' : 'Unmute'
})

// Lazy load Tone.js
const loadToneJS = async () => {
  if (!toneModule) {
    toneModule = await import('tone')
  }
  return toneModule
}

// Definer skalaer
const C_MINOR_SCALE = ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4', 'D4', 'Eb4']
const C_MAJOR_SCALE = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4']

// Akkord-variationer for hver sentiment-range
const CHORD_VARIATIONS = {
  negative: [
    ['C3', 'Eb3', 'G3'], // C mol
    ['Ab3', 'C4', 'Eb4'], // Ab dur (relativ dur)
    ['F3', 'Ab3', 'C4'], // F mol
    ['G3', 'Bb3', 'D4'], // G mol
  ],
  neutralNegative: [
    ['Eb3', 'G3', 'Bb3'], // Eb dur
    ['C3', 'Eb3', 'G3', 'Bb3'], // C mol7
    ['Ab3', 'C4', 'Eb4'], // Ab dur
    ['F3', 'A3', 'C4'], // F dur
  ],
  neutralPositive: [
    ['F3', 'A3', 'C4'], // F dur
    ['C3', 'E3', 'G3', 'A3'], // Am7
    ['G3', 'B3', 'D4'], // G dur
    ['D3', 'F3', 'A3'], // D mol
  ],
  positive: [
    ['C3', 'E3', 'G3'], // C dur
    ['G3', 'B3', 'D4'], // G dur
    ['F3', 'A3', 'C4'], // F dur
    ['A3', 'C4', 'E4'], // Am
    ['D3', 'F#3', 'A3'], // D dur
  ]
}


// Opret synth med reverb og delay
const initAudio = async () => {
  try {
    const Tone = await loadToneJS()
    await Tone.start()
    
    // Opret filter først
    filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 1000,
      rolloff: -24,
      Q: 1
    })
    
    // Tilføj reverb og generer den
    reverb = new Tone.Reverb({
      decay: 8,
      wet: 0.8,
      preDelay: 0.2
    })
    // Generer reverb impulsrespons (kort timeout for hurtigere init)
    await reverb.generate()
    
    // Tilføj delay med variation
    delay = new Tone.FeedbackDelay({
      delayTime: '4n',
      feedback: 0.3 + Math.random() * 0.2, // Variation i feedback
      wet: 0.25 + Math.random() * 0.15
    })
    
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle' // Default start lyd
      },
      envelope: {
        attack: 1,
        decay: 0.5,
        sustain: 0.5,
        release: 3
      }
    })
    
    // Kæd effekter sammen i korrekt rækkefølge: synth -> filter -> reverb -> delay -> destination
    synth.chain(filter, reverb, delay, Tone.Destination)
    
    // Sæt initial volumen
    synth.volume.value = (volume.value - 1) * 20
    
    console.log('Lydsystem initialiseret')
  } catch (error) {
    console.error('Fejl ved initialisering af lydsystem:', error)
    needsInteraction.value = true
  }
}

// Spil akkord baseret på sentiment med variation
const playChord = async () => {
  if (!synth || !isPlaying.value || !toneModule) return
  
  try {
    const Tone = await loadToneJS()
    const score = props.sentimentScore ?? 0
    const now = Tone.now()
    
    // Vælg akkord-variation baseret på sentiment
    let chordVariations
    let scale = C_MINOR_SCALE
    
    if (score <= -0.5) {
      chordVariations = CHORD_VARIATIONS.negative
    } else if (score <= 0) {
      chordVariations = CHORD_VARIATIONS.neutralNegative
    } else if (score <= 0.5) {
      chordVariations = CHORD_VARIATIONS.neutralPositive
      scale = C_MAJOR_SCALE
    } else {
      chordVariations = CHORD_VARIATIONS.positive
      scale = C_MAJOR_SCALE
    }
    
    // Vælg akkord med rotation gennem variationer
    const chord = chordVariations[chordIndex % chordVariations.length]
    chordIndex++
    
    // Opdater synth karakter (Timbre/Envelope) dynamisk baseret på sentiment
    // Dette ændrer lyden fra "skarp/stresset" til "blød/drømmende"
    if (synth) {
       if (score <= -0.5) {
        // Negativ: Skarp, markant lyd (Sawtooth)
        synth.set({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.05, decay: 0.2, sustain: 0.1, release: 1 }
        })
      } else if (score <= 0) {
        // Neutral-Negativ: Kold, hul lyd (Square med langsomt attack)
        synth.set({
          oscillator: { type: 'square' },
          envelope: { attack: 2, decay: 1, sustain: 0.2, release: 3 }
        })
      } else if (score <= 0.5) {
        // Neutral-Positiv: Blød, klar lyd (Triangle)
        synth.set({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.5, decay: 0.5, sustain: 0.5, release: 3 }
        })
      } else {
        // Positiv: Rig, varm lyd (Fat Sine/Triangle)
        synth.set({
          oscillator: { type: 'fatsine' }, // Rigere sinus-lyd
          envelope: { attack: 1.5, decay: 1, sustain: 0.8, release: 5 }
        })
      }
    }

    // Variation i note-durationer
    const durations = ['2n', '4n', '1n', '2n.']
    const chordDuration = durations[Math.floor(Math.random() * durations.length)]
    
    // Spil hovedakkord
    synth.triggerAttackRelease(chord, chordDuration, now)
    
    // Tilføj flere melodiske elementer med variation
    const numMelodicNotes = 2 + Math.floor(Math.random() * 2) // 2-3 ekstra noter
    
    for (let i = 0; i < numMelodicNotes; i++) {
      const randomNote = scale[Math.floor(Math.random() * scale.length)]
      const delay = 0.5 + i * 0.8 + Math.random() * 0.5 // Varieret timing
      const noteDuration = ['4n', '8n', '2n'][Math.floor(Math.random() * 3)]
      synth.triggerAttackRelease(randomNote, noteDuration, now + delay)
    }
    
    // Tilføj arpeggio nogle gange (30% chance)
    if (Math.random() < 0.3) {
      const arpeggioNotes = [...chord].reverse() // Spil akkord omvendt som arpeggio
      arpeggioNotes.forEach((note, index) => {
        synth.triggerAttackRelease(note, '8n', now + 1.5 + index * 0.2)
      })
    }
    
    // Tilføj bass-note nogle gange (40% chance)
    if (Math.random() < 0.4) {
      const bassNote = chord[0].replace(/\d/, (match) => {
        const octave = parseInt(match)
        return Math.max(1, octave - 1).toString() // En oktav lavere
      })
      synth.triggerAttackRelease(bassNote, '1n', now + 0.3)
    }
    
    // Juster filter baseret på sentiment med smooth transition
    if (filter) {
      const baseFreq = 500 + score * 2000
      const variation = (Math.random() - 0.5) * 500 // ±250 Hz variation
      const frequency = Math.max(200, Math.min(8000, baseFreq + variation))
      filter.frequency.rampTo(frequency, 1.5)
    }
    
    // Juster reverb baseret på sentiment med variation
    if (reverb) {
      const baseWet = 0.6 - score * 0.3
      const variation = (Math.random() - 0.5) * 0.1
      const wetAmount = Math.max(0.3, Math.min(0.9, baseWet + variation))
      reverb.wet.rampTo(wetAmount, 1.5)
    }
    
    // Variation i delay-time
    if (delay) {
      const delayTimes = ['4n', '8n', '2n']
      const randomDelay = delayTimes[Math.floor(Math.random() * delayTimes.length)]
      delay.delayTime.value = randomDelay
    }
    
  } catch (error) {
    console.error('Fejl ved afspilning af akkord:', error)
  }
}

// Start ambient lyd med varieret timing
const playAmbientSound = async () => {
  if (!isPlaying.value || !toneModule) return
  
  try {
    const Tone = await loadToneJS()
    await playChord()
    
    // Funktion til at spille næste akkord med varieret timing
    const scheduleNextChord = () => {
      if (!isPlaying.value) return
      
      // Variation i timing: 3-6 sekunder
      const baseDelay = 4000
      const variation = (Math.random() - 0.5) * 2000 // ±1 sekund
      const delay = Math.max(3000, Math.min(6000, baseDelay + variation))
      
      chordInterval = setTimeout(async () => {
        if (isPlaying.value) {
          await playChord()
          scheduleNextChord() // Planlæg næste akkord
        }
      }, delay)
    }
    
    scheduleNextChord()
    
  } catch (error) {
    console.error('Fejl ved afspilning af ambient lyd:', error)
    isPlaying.value = false
    needsInteraction.value = true
  }
}

// Cleanup funktion
const cleanup = () => {
  if (chordInterval) {
    clearTimeout(chordInterval)
    chordInterval = null
  }
  
  // Reset chord index
  chordIndex = 0
  
  // Stop alle aktive noter først
  if (synth) {
    synth.releaseAll()
  }
  
  // Dispose alle effekter i korrekt rækkefølge
  if (delay) {
    delay.dispose()
    delay = null
  }
  if (reverb) {
    reverb.dispose()
    reverb = null
  }
  if (filter) {
    filter.dispose()
    filter = null
  }
  if (synth) {
    synth.dispose()
    synth = null
  }
}

// Toggle lyd
const toggleSound = async () => {
  if (isPlaying.value) {
    console.log('Slukker lyd...')
    isPlaying.value = false
    cleanup()
  } else {
    try {
      console.log('Starter lydinitialisering...')
      isLoading.value = true
      
      // Wait for user interaction before starting audio context
      console.log('Waiting for Tone.start()...')
      await initAudio()
      console.log('Lydsystem initialiseret')
      needsInteraction.value = false
      isPlaying.value = true
      
      // Start ambient lyd
      await playAmbientSound()
      
    } catch (error) {
      console.error('Fejl ved start af lyd:', error)
      needsInteraction.value = true
      cleanup()
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
  
  // Opdater musikken reaktivt når sentiment ændres (hvis den spiller)
  if (isPlaying.value && synth) {
    // Spil nyt akkord baseret på opdateret sentiment
    playChord()
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.sound-controls {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 50;
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: center;
}

.sound-button {
  min-width: 8rem;
  height: 3rem;
  padding: 0 1rem;
  border-radius: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  white-space: nowrap;
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
    right: 1rem;
  }
  
  .sound-button {
    min-width: 7rem;
    height: 2.5rem;
    padding: 0 0.75rem;
    font-size: 0.75rem;
  }
  
  .volume-control {
    width: 6rem;
  }
}
</style> 