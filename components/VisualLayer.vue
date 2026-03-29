<template>
  <div class="visual-layer" :class="getSentimentClass">
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
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import type { Scene, PerspectiveCamera, WebGLRenderer, Points } from 'three'

const props = defineProps<{
  sentimentScore?: number
}>()

const getSentimentClass = computed(() => {
  const score = props.sentimentScore ?? 0
  if (score <= -0.5) return 'sentiment-negative'
  if (score <= 0) return 'sentiment-neutral-negative'
  if (score <= 0.5) return 'sentiment-neutral-positive'
  return 'sentiment-positive'
})

const container = ref<HTMLDivElement | null>(null)
const isLoaded = ref(false)
const initError = ref(false)
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let renderer: WebGLRenderer | null = null
let particles: Points | null = null
let mousePosition = { x: 0, y: 0 }
let animationId: number | null = null
let threeModule: typeof import('three') | null = null
let THREE: typeof import('three') | null = null
let prefersReducedMotion = false

// Lazy load Three.js
const loadThreeJS = async () => {
  if (!threeModule) {
    threeModule = await import('three')
    THREE = threeModule
  }
  return threeModule
}

// Track current target color to avoid recalculating per-particle
let currentTargetR = 0.231
let currentTargetG = 0.510
let currentTargetB = 0.965
let colorsNeedUpdate = true

const initScene = async () => {
  if (!container.value) return

  try {
    const THREE = await loadThreeJS()

    // Check reduced motion preference
    if (typeof window !== 'undefined') {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        prefersReducedMotion = e.matches
      })
    }

    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 50

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.value.appendChild(renderer.domElement)

    createParticles(THREE)

    isLoaded.value = true
    animate()
  } catch (error) {
    console.error('Failed to initialize Three.js:', error)
    initError.value = true
  }
}

const createParticles = (THREE: typeof import('three')) => {
  if (!scene) return

  const particleCount = window.innerWidth < 768 ? 1000 : 2000
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100

    colors[i * 3] = currentTargetR
    colors[i * 3 + 1] = currentTargetG
    colors[i * 3 + 2] = currentTargetB
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  })

  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

const animate = (): void => {
  if (!particles || !renderer || !scene || !camera) {
    animationId = null
    return
  }

  // Reduced motion: only render, skip movement
  if (!prefersReducedMotion) {
    particles.rotation.x += 0.0005
    particles.rotation.y += 0.0005

    const positions = particles.geometry.attributes.position.array as Float32Array
    const speed = Math.abs(props.sentimentScore ?? 0) * 0.1
    const time = Date.now() * 0.001

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += Math.sin(time + i * 0.1) * speed
      positions[i + 1] += Math.cos(time + i * 0.1) * speed
      positions[i] += (Math.random() - 0.5) * 0.05
      positions[i + 1] += (Math.random() - 0.5) * 0.05
      positions[i] = Math.max(-50, Math.min(50, positions[i]))
      positions[i + 1] = Math.max(-50, Math.min(50, positions[i + 1]))
    }

    particles.geometry.attributes.position.needsUpdate = true
  }

  // Only update colors when sentiment actually changes
  if (colorsNeedUpdate) {
    const colors = particles.geometry.attributes.color.array as Float32Array
    const lerpFactor = 0.02
    let stillLerping = false

    for (let i = 0; i < colors.length; i += 3) {
      const dr = currentTargetR - colors[i]
      const dg = currentTargetG - colors[i + 1]
      const db = currentTargetB - colors[i + 2]

      if (Math.abs(dr) > 0.01 || Math.abs(dg) > 0.01 || Math.abs(db) > 0.01) {
        colors[i] += dr * lerpFactor
        colors[i + 1] += dg * lerpFactor
        colors[i + 2] += db * lerpFactor
        stillLerping = true
      }
    }

    particles.geometry.attributes.color.needsUpdate = true
    if (!stillLerping) colorsNeedUpdate = false
  }

  renderer.render(scene, camera)
  animationId = requestAnimationFrame(animate)
}

// Update target color when sentiment changes
watch(() => props.sentimentScore, () => {
  const score = props.sentimentScore ?? 0
  if (score <= -0.5) {
    currentTargetR = 0.294; currentTargetG = 0.333; currentTargetB = 0.388
  } else if (score <= 0) {
    currentTargetR = 0.231; currentTargetG = 0.510; currentTargetB = 0.965
  } else if (score <= 0.5) {
    currentTargetR = 0.376; currentTargetG = 0.647; currentTargetB = 0.980
  } else {
    currentTargetR = 0.984; currentTargetG = 0.749; currentTargetB = 0.141
  }
  colorsNeedUpdate = true
})

// Throttled mouse position update
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
      const mouseInfluence = 0.1

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

// Throttled resize handler
let resizeTimeout: number | null = null
const handleResize = () => {
  if (resizeTimeout) return

  resizeTimeout = window.setTimeout(() => {
    if (!container.value || !camera || !renderer) return

    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    resizeTimeout = null
  }, 250)
}

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
  transition: background-color 2s cubic-bezier(0.4, 0, 0.2, 1);
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

.sentiment-negative {
  background-color: rgb(17, 24, 39);
}

.sentiment-neutral-negative {
  background-color: rgb(30, 58, 138);
}

.sentiment-neutral-positive {
  background-color: rgb(59, 130, 246);
}

.sentiment-positive {
  background-color: rgb(234, 179, 8);
}
</style>
