<template>
  <div class="visual-layer" :class="getSentimentClass">
    <div ref="container" class="w-full h-full"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as THREE from 'three'

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
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let particles: THREE.Points
let mousePosition = new THREE.Vector2()
let raycaster = new THREE.Raycaster()

// Opret scene
const initScene = () => {
  if (!container.value) return
  
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
  
  // Opret renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.value.appendChild(renderer.domElement)
  
  // Opret partikler
  createParticles()
  
  // Start animation
  animate()
}

// Opret partikler
const createParticles = () => {
  const particleCount = 2000
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
    sizeAttenuation: true // Gør partikler mindre når de er længere væk
  })
  
  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

// Animation loop
const animate = () => {
  requestAnimationFrame(animate)
  
  if (particles) {
    // Roter partikler
    particles.rotation.x += 0.0005
    particles.rotation.y += 0.0005
    
    // Opdater partikel positioner baseret på sentiment og mouse
    const positions = particles.geometry.attributes.position.array as Float32Array
    const speed = Math.abs(props.sentimentScore ?? 0) * 0.1
    
    for (let i = 0; i < positions.length; i += 3) {
      // Tilføj bølge-effekt baseret på sentiment
      positions[i] += Math.sin(Date.now() * 0.001 + i) * speed
      positions[i + 1] += Math.cos(Date.now() * 0.001 + i) * speed
      
      // Tilføj tilfældig bevægelse
      positions[i] += (Math.random() - 0.5) * 0.1
      positions[i + 1] += (Math.random() - 0.5) * 0.1
      
      // Hold partikler inden for scene grænser
      positions[i] = Math.max(-50, Math.min(50, positions[i]))
      positions[i + 1] = Math.max(-50, Math.min(50, positions[i + 1]))
    }
    
    particles.geometry.attributes.position.needsUpdate = true
  }
  
  renderer.render(scene, camera)
}

// Opdater mouse position baseret på sentiment
const updateMousePosition = (event: MouseEvent) => {
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
    const mouseInfluence = 0.1 // Juster denne værdi for at ændre hvor meget musen påvirker partiklerne
    
    for (let i = 0; i < positions.length; i += 3) {
      const dx = positions[i] - mousePosition.x * 50 // Skaler mouse position til scene størrelse
      const dy = positions[i + 1] - mousePosition.y * 50
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 20) { // Partikler inden for 20 enheder af musen
        const force = (1 - distance / 20) * mouseInfluence
        positions[i] += dx * force
        positions[i + 1] += dy * force
      }
    }
    
    particles.geometry.attributes.position.needsUpdate = true
  }
}

// Opdater partikler når sentiment ændrer sig
watch(() => props.sentimentScore, () => {
  if (particles) {
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
  }
})

// Håndter window resize
const handleResize = () => {
  if (!container.value) return
  
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

onMounted(() => {
  initScene()
  window.addEventListener('mousemove', updateMousePosition)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', updateMousePosition)
  window.removeEventListener('resize', handleResize)
  
  // Cleanup Three.js
  renderer?.dispose()
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