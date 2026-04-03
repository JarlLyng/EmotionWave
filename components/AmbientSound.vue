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
      :aria-pressed="isPlaying"
      aria-label="Toggle ambient music"
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
import { ref, watch, onUnmounted, computed } from 'vue'

const props = defineProps<{
  sentimentScore: number
}>()

const isPlaying = ref(false)
const isLoading = ref(false)
const needsInteraction = ref(true)
const volume = ref(0.5)
const color = ref('#4F46E5')

// ─── Tone.js module + audio nodes ────────────────────────────────────────────
let toneModule: typeof import('tone') | null = null

// Master bus
let masterGain: any = null
let masterReverb: any = null
let masterChorus: any = null
let pingPongDelay: any = null

// Layer 1: Drone
let droneSynth: any = null
let droneFilter: any = null
let droneLFO: any = null
let droneGain: any = null
let currentDroneNote = 'C2'

// Layer 2: Texture
let noiseSource: any = null
let noiseFilter: any = null
let noiseGain: any = null

// Layer 3: Melodic
let melodicSynth: any = null
let melodicFilter: any = null
let melodicGain: any = null
let chordInterval: ReturnType<typeof setTimeout> | null = null
let chordIndex = 0

// ─── Constants ───────────────────────────────────────────────────────────────

const PENTATONIC_MINOR = ['C3', 'Eb3', 'F3', 'G3', 'Bb3', 'C4', 'Eb4']
const PENTATONIC_MAJOR = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4']

const CHORD_VARIATIONS = {
  negative: [
    ['C3', 'Eb3', 'G3'],
    ['F3', 'G3', 'Bb3'],
    ['Eb3', 'G3', 'Bb3'],
  ],
  neutralNeg: [
    ['Eb3', 'G3', 'Bb3'],
    ['C3', 'Eb3', 'Bb3'],
    ['F3', 'G3', 'C4'],
  ],
  neutralPos: [
    ['C3', 'E3', 'G3'],
    ['G3', 'A3', 'D4'],
    ['E3', 'G3', 'C4'],
  ],
  positive: [
    ['C3', 'E3', 'G3'],
    ['G3', 'C4', 'E4'],
    ['D3', 'G3', 'A3'],
    ['E3', 'A3', 'C4'],
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const clamped = Math.max(inMin, Math.min(inMax, value))
  return outMin + (outMax - outMin) * ((clamped - inMin) / (inMax - inMin))
}

const getButtonTitle = computed(() => {
  if (isLoading.value) return 'Initializing audio...'
  if (needsInteraction.value) return 'Click to enable audio'
  return isPlaying.value ? 'Mute' : 'Unmute'
})

const loadToneJS = async () => {
  if (!toneModule) {
    toneModule = await import('tone')
  }
  return toneModule
}

// ─── Init audio ──────────────────────────────────────────────────────────────

const initAudio = async () => {
  const Tone = await loadToneJS()
  await Tone.start()

  // ── Master effects chain ──
  masterReverb = new Tone.Reverb({ decay: 12, wet: 0.6, preDelay: 0.3 })
  await masterReverb.generate()

  pingPongDelay = new Tone.PingPongDelay({
    delayTime: '4n',
    feedback: 0.2,
    wet: 0.15,
  })

  masterChorus = new Tone.Chorus({
    frequency: 0.3,
    delayTime: 3.5,
    depth: 0.7,
    wet: 0.3,
  }).start()

  masterGain = new Tone.Gain(Tone.dbToGain((volume.value - 1) * 20))
  masterGain.chain(masterChorus, pingPongDelay, masterReverb, Tone.getDestination())

  // ── Layer 1: Drone (continuous evolving pad) ──
  droneFilter = new Tone.Filter({ type: 'lowpass', frequency: 800, rolloff: -24, Q: 1 })
  droneGain = new Tone.Gain(Tone.dbToGain(-8))

  droneSynth = new Tone.FMSynth({
    harmonicity: 1.5,
    modulationIndex: 2,
    oscillator: { type: 'sine' },
    modulation: { type: 'sine' },
    envelope: { attack: 4, decay: 2, sustain: 0.9, release: 8 },
    modulationEnvelope: { attack: 3, decay: 1, sustain: 0.8, release: 6 },
  })
  droneSynth.chain(droneFilter, droneGain, masterGain)

  droneLFO = new Tone.LFO({ frequency: 0.05, min: 300, max: 1200, type: 'sine' })
  droneLFO.connect(droneFilter.frequency)

  // ── Layer 2: Texture (filtered noise) ──
  noiseGain = new Tone.Gain(Tone.dbToGain(-20))
  noiseFilter = new Tone.AutoFilter({
    frequency: 0.1,
    baseFrequency: 200,
    octaves: 4,
    type: 'sine',
    depth: 1,
    wet: 1,
  }).start()
  noiseFilter.connect(noiseGain)
  noiseGain.connect(masterGain)

  noiseSource = new Tone.Noise('pink')
  noiseSource.connect(noiseFilter)

  // ── Layer 3: Melodic (bell-like AM synth) ──
  melodicFilter = new Tone.Filter({ type: 'lowpass', frequency: 2000, rolloff: -12 })
  melodicGain = new Tone.Gain(Tone.dbToGain(-12))

  melodicSynth = new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 1.5,
    oscillator: { type: 'sine' },
    modulation: { type: 'sine' },
    envelope: { attack: 2, decay: 1.5, sustain: 0.6, release: 6 },
    modulationEnvelope: { attack: 1.5, decay: 1, sustain: 0.5, release: 4 },
  })
  melodicSynth.chain(melodicFilter, melodicGain, masterGain)
}

// ─── Start all layers (staggered to avoid pop) ──────────────────────────────

const startAllLayers = async () => {
  if (!droneSynth || !noiseSource || !droneLFO) return

  const score = props.sentimentScore ?? 0

  // Apply initial sentiment parameters
  updateSentimentParameters(score)

  // Layer 1: Start drone
  currentDroneNote = score < 0 ? 'C2' : 'G2'
  droneSynth.triggerAttack(currentDroneNote)
  droneLFO.start()

  // Layer 2: Start noise (staggered 1s)
  await new Promise(r => setTimeout(r, 1000))
  if (!isPlaying.value) return
  noiseSource.start()

  // Layer 3: Start melodic events (staggered another 1s)
  await new Promise(r => setTimeout(r, 1000))
  if (!isPlaying.value) return
  scheduleMelodicEvent()
}

// ─── Melodic events ──────────────────────────────────────────────────────────

const playMelodicEvent = () => {
  if (!melodicSynth || !isPlaying.value || !toneModule) return

  const Tone = toneModule
  const score = props.sentimentScore ?? 0
  const now = Tone.now()

  // Pick chord variation
  let chords: string[][]
  let scale: string[]
  if (score <= -0.5) {
    chords = CHORD_VARIATIONS.negative
    scale = PENTATONIC_MINOR
  } else if (score <= 0) {
    chords = CHORD_VARIATIONS.neutralNeg
    scale = PENTATONIC_MINOR
  } else if (score <= 0.5) {
    chords = CHORD_VARIATIONS.neutralPos
    scale = PENTATONIC_MAJOR
  } else {
    chords = CHORD_VARIATIONS.positive
    scale = PENTATONIC_MAJOR
  }

  const chord = chords[chordIndex % chords.length]
  chordIndex++

  // Play chord with long release
  melodicSynth.triggerAttackRelease(chord, '2n', now)

  // 1-2 melodic notes that emerge slowly
  const numNotes = 1 + Math.floor(Math.random() * 2)
  for (let i = 0; i < numNotes; i++) {
    const note = scale[Math.floor(Math.random() * scale.length)]
    const delay = 1.0 + i * 1.2 + Math.random() * 0.8
    melodicSynth.triggerAttackRelease(note, '2n', now + delay)
  }
}

const scheduleMelodicEvent = () => {
  if (!isPlaying.value) return

  playMelodicEvent()

  const scheduleNext = () => {
    if (!isPlaying.value) return
    const score = props.sentimentScore ?? 0
    // Negative = sparser (10-15s), positive = more active (5-8s)
    const baseDelay = mapRange(score, -1, 1, 12000, 6000)
    const variation = (Math.random() - 0.5) * 3000
    const delay = Math.max(4000, baseDelay + variation)

    chordInterval = setTimeout(() => {
      if (isPlaying.value) {
        playMelodicEvent()
        scheduleNext()
      }
    }, delay)
  }

  scheduleNext()
}

// ─── Continuous sentiment mapping ────────────────────────────────────────────

function updateSentimentParameters(score: number) {
  if (!droneSynth) return

  // ── Drone ──
  const modIndex = mapRange(score, -1, 1, 6, 0.5)
  droneSynth.modulationIndex.rampTo(modIndex, 10)

  // LFO speed: negative = faster/unsettled, positive = glacial/calm
  if (droneLFO) {
    const lfoFreq = mapRange(score, -1, 1, 0.15, 0.02)
    droneLFO.frequency.rampTo(lfoFreq, 8)

    const filterMin = mapRange(score, -1, 1, 200, 400)
    const filterMax = mapRange(score, -1, 1, 600, 1400)
    droneLFO.min = filterMin
    droneLFO.max = filterMax
  }

  // Drone note: crossfade to new root
  const newDroneNote = score < -0.3 ? 'C2' : score < 0.3 ? 'Eb2' : 'G2'
  if (newDroneNote !== currentDroneNote && droneSynth) {
    droneSynth.triggerRelease('+0')
    setTimeout(() => {
      if (isPlaying.value && droneSynth) {
        currentDroneNote = newDroneNote
        droneSynth.triggerAttack(newDroneNote)
      }
    }, 2000)
  }

  // ── Texture ──
  if (noiseFilter) {
    const autoFilterFreq = mapRange(score, -1, 1, 0.03, 0.2)
    noiseFilter.frequency.rampTo(autoFilterFreq, 8)
    noiseFilter.baseFrequency = mapRange(score, -1, 1, 100, 800)
    noiseFilter.octaves = mapRange(score, -1, 1, 2, 5)
  }

  // Change noise type at thresholds (crossfade to avoid click)
  if (noiseSource && noiseGain) {
    let targetType: 'brown' | 'pink' | 'white' = 'pink'
    if (score < -0.3) targetType = 'brown'
    else if (score > 0.3) targetType = 'white'

    if (noiseSource.type !== targetType) {
      // Fade out, switch, fade back in
      const Tone = toneModule!
      noiseGain.gain.rampTo(0, 0.5)
      setTimeout(() => {
        if (noiseSource) {
          noiseSource.type = targetType
          noiseGain?.gain.rampTo(Tone.dbToGain(-20), 0.5)
        }
      }, 600)
    }
  }

  // ── Master effects ──
  if (masterReverb) {
    masterReverb.wet.rampTo(mapRange(score, -1, 1, 0.8, 0.5), 8)
  }
  if (masterChorus) {
    masterChorus.wet.rampTo(mapRange(score, -1, 1, 0.15, 0.45), 8)
  }
  if (pingPongDelay) {
    pingPongDelay.feedback.rampTo(mapRange(score, -1, 1, 0.35, 0.15), 8)
  }

  // ── Melodic filter ──
  if (melodicFilter) {
    const cutoff = mapRange(score, -1, 1, 600, 3000)
    melodicFilter.frequency.rampTo(cutoff, 5)
  }

  // ── Melodic harmonicity ──
  if (melodicSynth) {
    // AMSynth harmonicity affects timbre dissonance
    // Can't rampTo on PolySynth voices directly, so set for next notes
    melodicSynth.set({
      harmonicity: mapRange(score, -1, 1, 2.5, 1.0),
    })
  }
}

// ─── Volume ──────────────────────────────────────────────────────────────────

const updateVolume = () => {
  if (masterGain && toneModule) {
    const Tone = toneModule
    masterGain.gain.rampTo(Tone.dbToGain((volume.value - 1) * 20), 0.1)
  }
}

// ─── Color for slider ────────────────────────────────────────────────────────

watch(() => props.sentimentScore, (score) => {
  const s = score ?? 0

  if (s <= -0.5) color.value = '#6B7280'
  else if (s <= 0) color.value = '#3B82F6'
  else if (s <= 0.5) color.value = '#60A5FA'
  else color.value = '#FBBF24'

  if (isPlaying.value) {
    updateSentimentParameters(s)
  }
})

// ─── Toggle ──────────────────────────────────────────────────────────────────

const toggleSound = async () => {
  if (isLoading.value) return

  if (isPlaying.value) {
    isPlaying.value = false
    cleanup()
  } else {
    try {
      isLoading.value = true
      await initAudio()
      needsInteraction.value = false
      isPlaying.value = true
      await startAllLayers()
    } catch (error) {
      console.error('Audio init failed:', error)
      needsInteraction.value = true
      cleanup()
    } finally {
      isLoading.value = false
    }
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

const cleanup = () => {
  if (chordInterval) {
    clearTimeout(chordInterval)
    chordInterval = null
  }
  chordIndex = 0

  // Stop sources
  if (noiseSource) { try { noiseSource.stop() } catch {} }
  if (droneSynth) { try { droneSynth.triggerRelease() } catch {} }
  if (melodicSynth) { try { melodicSynth.releaseAll() } catch {} }
  if (droneLFO) { try { droneLFO.stop() } catch {} }

  // Dispose all nodes
  const nodes = [
    droneLFO, droneSynth, droneFilter, droneGain,
    noiseSource, noiseFilter, noiseGain,
    melodicSynth, melodicFilter, melodicGain,
    pingPongDelay, masterChorus, masterReverb, masterGain,
  ]
  for (const node of nodes) {
    if (node) { try { node.dispose() } catch {} }
  }

  // Reset references
  droneSynth = null; droneFilter = null; droneLFO = null; droneGain = null
  noiseSource = null; noiseFilter = null; noiseGain = null
  melodicSynth = null; melodicFilter = null; melodicGain = null
  pingPongDelay = null; masterChorus = null; masterReverb = null; masterGain = null
}

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
    left: 1rem;
    right: 1rem;
    justify-content: flex-start;
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
