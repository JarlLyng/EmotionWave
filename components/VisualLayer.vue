<template>
  <div class="visual-layer" :class="getSentimentClass">
    <div ref="container" class="w-full h-full"></div>
    <div v-if="!isLoaded" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'

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
let scene: any
let camera: any
let renderer: any
let particles: any
let mousePosition = { x: 0, y: 0 }
let animationId: number | null = null
let threeModule: any = null

// Lazy load Three.js
const loadThreeJS = async () => {
  if (!threeModule) {
    threeModule = await import('three')
  }
  return threeModule
}

// Opret scene
const initScene = async () => {
  if (!container.value) return
  
  const THREE = await loadThreeJS()
  
  // Opret scene
  scene = new THREE.Scene()
  
  // Opret kamera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.z = 50
  
  // Opret renderer med optimeringer
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Begræns pixel ratio for performance
  container.value.appendChild(renderer.domElement)
  
  // Opret partikler
  createParticles(THREE)
  
  isLoaded.value = true
  
  // Start animation
  animate(THREE)
}

// Opret partikler med optimeret antal
const createParticles = (THREE: any) => {
  const particleCount = window.innerWidth < 768 ? 1000 : 2000 // Færre partikler på mobile
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  
  // Generer tilfældige positioner og farver
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100
    
    // Vælg farve baseret på sentiment
    let color
    const score = props.sentimentScore ?? 0
    if (score <= -0.5) {
      color = new THREE.Color(0x4B5563) // grå
    } else if (score <= 0) {
      color = new THREE.Color(0x3B82F6) // blå
    } else if (score <= 0.5) {
      color = new THREE.Color(0x60A5FA) // lys blå
    } else {
      color = new THREE.Color(0xFBBF24) // gul
    }
    
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  
  // Opret materiale med custom shader
  const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  })
  
  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

// Optimiseret animation loop
const animate = (THREE: any) => {
  if (!particles) return
  
  // Roter partikler
  particles.rotation.x += 0.0005
  particles.rotation.y += 0.0005
  
  // Opdater partikel positioner baseret på sentiment og mouse
  const positions = particles.geometry.attributes.position.array as Float32Array
  const speed = Math.abs(props.sentimentScore ?? 0) * 0.1
  
  // Batch opdateringer for bedre performance
  for (let i = 0; i < positions.length; i += 3) {
    // Tilføj bølge-effekt baseret på sentiment
    const time = Date.now() * 0.001
    positions[i] += Math.sin(time + i * 0.1) * speed
    positions[i + 1] += Math.cos(time + i * 0.1) * speed
    
    // Tilføj tilfældig bevægelse (reduceret for performance)
    positions[i] += (Math.random() - 0.5) * 0.05
    positions[i + 1] += (Math.random() - 0.5) * 0.05
    
    // Hold partikler inden for scene grænser
    positions[i] = Math.max(-50, Math.min(50, positions[i]))
    positions[i + 1] = Math.max(-50, Math.min(50, positions[i + 1]))
  }
  
  particles.geometry.attributes.position.needsUpdate = true
  renderer.render(scene, camera)
  
  animationId = requestAnimationFrame(() => animate(THREE))
}

// Throttled mouse position update
let mouseUpdateTimeout: number | null = null
const updateMousePosition = (event: MouseEvent) => {
  if (mouseUpdateTimeout) return
  
  mouseUpdateTimeout = window.setTimeout(() => {
    const score = props.sentimentScore ?? 0
    const rect = container.value?.getBoundingClientRect()
    if (!rect) return
    
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    // Juster mouse position baseret på sentiment
    mousePosition.x = x * (1 + score * 0.5)
    mousePosition.y = y * (1 + score * 0.5)
    
    // Opdater partikler baseret på mouse position
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
  }, 16) // ~60fps
}

// Opdater partikler når sentiment ændrer sig
watch(() => props.sentimentScore, async () => {
  if (!particles || !threeModule) return
  
  const THREE = await loadThreeJS()
  const colors = particles.geometry.attributes.color.array as Float32Array
  const score = props.sentimentScore ?? 0
  
  // Opdater farver baseret på sentiment
  for (let i = 0; i < colors.length; i += 3) {
    let color
    if (score <= -0.5) {
      color = new THREE.Color(0x4B5563)
    } else if (score <= 0) {
      color = new THREE.Color(0x3B82F6)
    } else if (score <= 0.5) {
      color = new THREE.Color(0x60A5FA)
    } else {
      color = new THREE.Color(0xFBBF24)
    }
    
    colors[i] = color.r
    colors[i + 1] = color.g
    colors[i + 2] = color.b
  }
  
  particles.geometry.attributes.color.needsUpdate = true
})

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
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (mouseUpdateTimeout) {
    clearTimeout(mouseUpdateTimeout)
  }
  
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  
  // Cleanup Three.js
  if (renderer) {
    renderer.dispose()
  }
  if (particles) {
    particles.geometry.dispose()
    particles.material.dispose()
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