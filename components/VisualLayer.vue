<template>
  <div class="visual-layer">
    <div ref="container" class="w-full h-full"></div>
    <div v-if="!isLoaded && !initError" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    <div v-if="initError" class="loading-overlay fallback-bg">
      <p class="text-white/60 text-sm">Visualization unavailable</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import type {
  Scene, PerspectiveCamera, WebGLRenderer, Points, Color, FogExp2,
} from 'three'

const props = defineProps<{
  sentimentScore?: number
}>()

const container = ref<HTMLDivElement | null>(null)
const isLoaded = ref(false)
const initError = ref(false)

let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let renderer: WebGLRenderer | null = null
let particles: Points | null = null
let composer: any = null
let bloomPass: any = null
let mousePosition = { x: 0, y: 0 }
let animationId: number | null = null
let threeModule: typeof import('three') | null = null
let prefersReducedMotion = false

// Per-particle random phase offsets for organic flow
let particlePhases: Float32Array | null = null

// Smooth color/background targets
let currentTargetR = 0.18
let currentTargetG = 0.42
let currentTargetB = 0.75
let colorsNeedUpdate = true

// Scene background lerping
let currentBgR = 0.02
let currentBgG = 0.05
let currentBgB = 0.09
let targetBgR = 0.02
let targetBgG = 0.05
let targetBgB = 0.09

// Bloom target
let targetBloomStrength = 1.2

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

// ─── Color gradient ──────────────────────────────────────────────────────────

const colorAnchors = [
  { s: -1.0, r: 0.15, g: 0.10, b: 0.25 }, // deep indigo
  { s: -0.5, r: 0.20, g: 0.25, b: 0.45 }, // slate blue
  { s:  0.0, r: 0.18, g: 0.42, b: 0.75 }, // cool blue
  { s:  0.5, r: 0.15, g: 0.65, b: 0.70 }, // teal/cyan
  { s:  1.0, r: 0.95, g: 0.75, b: 0.20 }, // warm gold
]

function sentimentToColor(score: number): [number, number, number] {
  const clamped = Math.max(-1, Math.min(1, score))
  let lower = colorAnchors[0]
  let upper = colorAnchors[colorAnchors.length - 1]

  for (let i = 0; i < colorAnchors.length - 1; i++) {
    if (clamped >= colorAnchors[i].s && clamped <= colorAnchors[i + 1].s) {
      lower = colorAnchors[i]
      upper = colorAnchors[i + 1]
      break
    }
  }

  const t = upper.s === lower.s ? 0 : (clamped - lower.s) / (upper.s - lower.s)
  return [
    lower.r + (upper.r - lower.r) * t,
    lower.g + (upper.g - lower.g) * t,
    lower.b + (upper.b - lower.b) * t,
  ]
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin))
}

// ─── Lazy load Three.js ──────────────────────────────────────────────────────

const loadThreeJS = async () => {
  if (!threeModule) {
    threeModule = await import('three')
  }
  return threeModule
}

// ─── Init ────────────────────────────────────────────────────────────────────

const initScene = async () => {
  if (!container.value) return

  try {
    const THREE = await loadThreeJS()

    // Postprocessing imports (lazy)
    const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js')
    const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js')
    const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js')
    const { OutputPass } = await import('three/examples/jsm/postprocessing/OutputPass.js')

    // Reduced motion
    if (typeof window !== 'undefined') {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        prefersReducedMotion = e.matches
      })
    }

    // Scene + fog
    scene = new THREE.Scene()
    scene.background = new THREE.Color(currentBgR, currentBgG, currentBgB)
    scene.fog = new THREE.FogExp2(0x020509, 0.015)

    // Camera
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 50

    // Renderer (alpha: false — we control background via scene)
    renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    container.value.appendChild(renderer.domElement)

    // Postprocessing
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      isMobile ? 0.9 : 1.5, // strength
      0.4,                    // radius
      0.85                    // threshold
    )
    composer.addPass(bloomPass)
    composer.addPass(new OutputPass())

    // Particles
    createParticles(THREE)

    // Set initial sentiment color
    updateSentimentTargets(props.sentimentScore ?? 0)

    isLoaded.value = true
    animate()
  } catch (error) {
    console.error('Failed to initialize Three.js:', error)
    initError.value = true
  }
}

// ─── Particles ───────────────────────────────────────────────────────────────

const createParticles = (THREE: typeof import('three')) => {
  if (!scene) return

  const particleCount = isMobile ? 1000 : 2000
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  // Phase offsets for organic movement
  particlePhases = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100

    colors[i * 3] = currentTargetR
    colors[i * 3 + 1] = currentTargetG
    colors[i * 3 + 2] = currentTargetB

    particlePhases[i * 3] = Math.random() * Math.PI * 2
    particlePhases[i * 3 + 1] = Math.random() * Math.PI * 2
    particlePhases[i * 3 + 2] = Math.random() * Math.PI * 2
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: isMobile ? 1.5 : 2.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

// ─── Animation loop ──────────────────────────────────────────────────────────

const animate = (): void => {
  if (!particles || !composer || !scene || !camera) {
    animationId = null
    return
  }

  const score = props.sentimentScore ?? 0

  // ── Organic particle movement ──
  if (!prefersReducedMotion) {
    particles.rotation.x += 0.0003
    particles.rotation.y += 0.0004

    const positions = particles.geometry.attributes.position.array as Float32Array
    const time = Date.now() * 0.0005
    const sentimentSpeed = 0.02 + Math.abs(score) * 0.04

    if (particlePhases) {
      for (let i = 0; i < positions.length; i += 3) {
        const px = particlePhases[i]
        const py = particlePhases[i + 1]
        const pz = particlePhases[i + 2]

        // Three octaves of sine at incommensurate frequencies (pseudo-Perlin)
        const nx = Math.sin(time * 0.7 + px) * 0.5
                 + Math.sin(time * 1.3 + px * 2.1) * 0.3
                 + Math.sin(time * 2.9 + px * 0.7) * 0.2

        const ny = Math.sin(time * 0.5 + py) * 0.5
                 + Math.sin(time * 1.1 + py * 1.7) * 0.3
                 + Math.sin(time * 2.3 + py * 1.3) * 0.2

        positions[i] += nx * sentimentSpeed
        positions[i + 1] += ny * sentimentSpeed

        // Z-axis drift for depth (skip on mobile)
        if (!isMobile) {
          positions[i + 2] += Math.sin(time * 0.3 + pz) * sentimentSpeed * 0.3
        }

        // Soft wrapping instead of hard clamp
        if (positions[i] > 55) positions[i] -= 110
        else if (positions[i] < -55) positions[i] += 110
        if (positions[i + 1] > 55) positions[i + 1] -= 110
        else if (positions[i + 1] < -55) positions[i + 1] += 110
        if (positions[i + 2] > 55) positions[i + 2] -= 110
        else if (positions[i + 2] < -55) positions[i + 2] += 110
      }

      particles.geometry.attributes.position.needsUpdate = true
    }
  }

  // ── Color lerp ──
  if (colorsNeedUpdate) {
    const colors = particles.geometry.attributes.color.array as Float32Array
    const lerpFactor = 0.015
    let stillLerping = false

    for (let i = 0; i < colors.length; i += 3) {
      const dr = currentTargetR - colors[i]
      const dg = currentTargetG - colors[i + 1]
      const db = currentTargetB - colors[i + 2]

      if (Math.abs(dr) > 0.005 || Math.abs(dg) > 0.005 || Math.abs(db) > 0.005) {
        colors[i] += dr * lerpFactor
        colors[i + 1] += dg * lerpFactor
        colors[i + 2] += db * lerpFactor
        stillLerping = true
      }
    }

    particles.geometry.attributes.color.needsUpdate = true
    if (!stillLerping) colorsNeedUpdate = false
  }

  // ── Background + fog lerp ──
  const bgLerp = 0.005
  currentBgR += (targetBgR - currentBgR) * bgLerp
  currentBgG += (targetBgG - currentBgG) * bgLerp
  currentBgB += (targetBgB - currentBgB) * bgLerp

  if (scene.background && (scene.background as Color).isColor) {
    (scene.background as Color).setRGB(currentBgR, currentBgG, currentBgB)
  }
  if (scene.fog) {
    (scene.fog as FogExp2).color.setRGB(currentBgR, currentBgG, currentBgB)
  }

  // ── Bloom lerp ──
  if (bloomPass) {
    bloomPass.strength += (targetBloomStrength - bloomPass.strength) * 0.01
  }

  // ── Render ──
  composer.render()
  animationId = requestAnimationFrame(animate)
}

// ─── Sentiment update ────────────────────────────────────────────────────────

function updateSentimentTargets(score: number) {
  const [r, g, b] = sentimentToColor(score)
  currentTargetR = r
  currentTargetG = g
  currentTargetB = b
  colorsNeedUpdate = true

  // Background = 12% brightness of particle color
  targetBgR = r * 0.12
  targetBgG = g * 0.12
  targetBgB = b * 0.12

  // Bloom: dimmer for negative, brighter for positive
  const baseStrength = mapRange(score, -1, 1, 0.8, 2.0)
  targetBloomStrength = isMobile ? baseStrength * 0.6 : baseStrength
}

watch(() => props.sentimentScore, () => {
  updateSentimentTargets(props.sentimentScore ?? 0)
})

// ─── Mouse interaction ───────────────────────────────────────────────────────

let mouseUpdateTimeout: number | null = null
const updateMousePosition = (event: MouseEvent) => {
  if (mouseUpdateTimeout || prefersReducedMotion) return

  mouseUpdateTimeout = window.setTimeout(() => {
    const score = props.sentimentScore ?? 0
    const rect = container.value?.getBoundingClientRect()
    if (!rect) return

    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    mousePosition.x = x * (1 + score * 0.5)
    mousePosition.y = y * (1 + score * 0.5)

    if (particles) {
      const positions = particles.geometry.attributes.position.array as Float32Array
      const mouseInfluence = 0.08

      for (let i = 0; i < positions.length; i += 3) {
        const dx = positions[i] - mousePosition.x * 50
        const dy = positions[i + 1] - mousePosition.y * 50
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 20) {
          const force = (1 - distance / 20) * mouseInfluence
          positions[i] += dx * force
          positions[i + 1] += dy * force
        }
      }

      particles.geometry.attributes.position.needsUpdate = true
    }

    mouseUpdateTimeout = null
  }, 16)
}

// ─── Resize ──────────────────────────────────────────────────────────────────

let resizeTimeout: number | null = null
const handleResize = () => {
  if (resizeTimeout) return

  resizeTimeout = window.setTimeout(() => {
    if (!container.value || !camera || !renderer || !composer) return

    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2))
    composer.setSize(window.innerWidth, window.innerHeight)

    resizeTimeout = null
  }, 250)
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(() => {
  initScene()
  window.addEventListener('mousemove', updateMousePosition, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', updateMousePosition)
  window.removeEventListener('resize', handleResize)

  if (animationId) cancelAnimationFrame(animationId)
  if (mouseUpdateTimeout) clearTimeout(mouseUpdateTimeout)
  if (resizeTimeout) clearTimeout(resizeTimeout)

  if (composer) composer.dispose()
  if (renderer) renderer.dispose()
  if (particles) {
    particles.geometry.dispose()
    if (Array.isArray(particles.material)) {
      particles.material.forEach(m => m.dispose())
    } else {
      particles.material.dispose()
    }
  }
})
</script>

<style scoped>
.visual-layer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10;
}

.fallback-bg {
  background: rgba(0, 0, 0, 0.4);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
