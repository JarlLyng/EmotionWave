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

import { emotionToColor, type EmotionState } from '~/utils/sentiment'
import { motionProfileFor, lerpProfileInPlace, neutralProfile, type MotionProfile } from '~/utils/motionProfile'

const props = defineProps<{
  sentimentScore?: number
  emotion?: EmotionState | null
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
const mousePosition = { x: 0, y: 0 }
let animationId: number | null = null
let threeModule: typeof import('three') | null = null
let prefersReducedMotion = false
let isDestroyed = false
let reducedMotionQuery: MediaQueryList | null = null
const onReducedMotionChange = (e: MediaQueryListEvent) => {
  prefersReducedMotion = e.matches
}

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

// Emotion-driven motion and particle shape, eased toward its target
const currentProfile: MotionProfile = neutralProfile(0)
let targetProfile: MotionProfile = neutralProfile(0)
let particleMaterial: any = null

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
  let lower = colorAnchors[0]!
  let upper = colorAnchors[colorAnchors.length - 1]!

  for (let i = 0; i < colorAnchors.length - 1; i++) {
    const a = colorAnchors[i]!
    const b = colorAnchors[i + 1]!
    if (clamped >= a.s && clamped <= b.s) {
      lower = a
      upper = b
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

    // Component may have unmounted while the dynamic imports were loading
    if (isDestroyed || !container.value) return

    // Reduced motion
    if (typeof window !== 'undefined') {
      reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      prefersReducedMotion = reducedMotionQuery.matches
      reducedMotionQuery.addEventListener('change', onReducedMotionChange)
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
  // Per-particle size (skewed small, with the odd large bokeh orb) and a
  // seed that desynchronises the twinkle
  const sizes = new Float32Array(particleCount)
  const seeds = new Float32Array(particleCount)

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

    sizes[i] = 0.35 + Math.pow(Math.random(), 3) * 1.6
    seeds[i] = Math.random()
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

  // A plain PointsMaterial renders every point as a square. This shader
  // draws round points whose edge morphs between a soft glowing orb and a
  // crisp disc (uHardness), with per-particle size and twinkle.
  particleMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uSize: { value: isMobile ? 1.6 : 2.0 },
        uScale: { value: pointScale() },
        uMaxSize: { value: maxPointSize() },
        uTime: { value: 0 },
        uHardness: { value: currentProfile.hardness },
        uTwinkle: { value: currentProfile.twinkle },
      },
    ]),
    vertexShader: `
      attribute float aSize;
      attribute float aSeed;
      uniform float uSize;
      uniform float uScale;
      uniform float uMaxSize;
      uniform float uTime;
      uniform float uTwinkle;
      varying vec3 vColor;
      varying float vAlpha;
      #include <fog_pars_vertex>
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float size = uSize * aSize * (uScale / -mvPosition.z);
        gl_PointSize = min(size, uMaxSize);
        gl_Position = projectionMatrix * mvPosition;
        float flicker = 0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 6.2831);
        // Particles close to the camera fade into faint bokeh instead of
        // blooming into haze that drowns the headline
        float nearFade = clamp(14.0 / size, 0.25, 1.0);
        vAlpha = (1.0 - uTwinkle * flicker) * nearFade;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uHardness;
      varying vec3 vColor;
      varying float vAlpha;
      #include <fog_pars_fragment>
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float soft = pow(1.0 - d, 2.0);
        float crisp = 1.0 - smoothstep(1.0 - mix(0.35, 0.05, uHardness), 1.0, d);
        gl_FragColor = vec4(vColor, mix(soft, crisp, uHardness) * vAlpha * 0.9);
        #include <fog_fragment>
      }
    `,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true,
  })

  particles = new THREE.Points(geometry, particleMaterial)
  scene.add(particles)
}

/** Matches PointsMaterial's size attenuation so sizes read the same */
function pointScale(): number {
  const pixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio, 2)
  return window.innerHeight * pixelRatio * 0.5
}

/** Upper bound on on-screen particle size, in device pixels */
function maxPointSize(): number {
  const pixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio, 2)
  return 36 * pixelRatio
}

// ─── Animation loop ──────────────────────────────────────────────────────────

const animate = (): void => {
  if (isDestroyed || !particles || !composer || !scene || !camera) {
    animationId = null
    return
  }

  // Ease the motion profile toward the current emotion
  lerpProfileInPlace(currentProfile, targetProfile, 0.01)
  if (particleMaterial) {
    particleMaterial.uniforms.uTime.value = performance.now() * 0.001
    particleMaterial.uniforms.uHardness.value = currentProfile.hardness
    particleMaterial.uniforms.uTwinkle.value = prefersReducedMotion ? 0 : currentProfile.twinkle
  }

  // ── Organic particle movement ──
  if (!prefersReducedMotion) {
    particles.rotation.x += 0.0003 * currentProfile.spin
    particles.rotation.y += 0.0004 * currentProfile.spin

    const positions = particles.geometry.attributes.position!.array as Float32Array
    const time = Date.now() * 0.0005
    const jitterTime = Date.now() * 0.02
    const sentimentSpeed = currentProfile.speed
    const { drift, turbulence } = currentProfile

    if (particlePhases) {
      for (let i = 0; i < positions.length; i += 3) {
        const px = particlePhases[i]!
        const py = particlePhases[i + 1]!
        const pz = particlePhases[i + 2]!

        // Three octaves of sine at incommensurate frequencies (pseudo-Perlin)
        const nx = Math.sin(time * 0.7 + px) * 0.5
                 + Math.sin(time * 1.3 + px * 2.1) * 0.3
                 + Math.sin(time * 2.9 + px * 0.7) * 0.2

        const ny = Math.sin(time * 0.5 + py) * 0.5
                 + Math.sin(time * 1.1 + py * 1.7) * 0.3
                 + Math.sin(time * 2.3 + py * 1.3) * 0.2

        // Fast trembling (fear, anger) on top of the slow drift
        const jx = turbulence ? Math.sin(jitterTime + px * 7.3) * turbulence : 0
        const jy = turbulence ? Math.sin(jitterTime * 1.3 + py * 5.1) * turbulence : 0

        let x = positions[i]! + nx * sentimentSpeed + jx
        let y = positions[i + 1]! + ny * sentimentSpeed + jy + drift
        let z = positions[i + 2]!

        // Z-axis drift for depth (skip on mobile)
        if (!isMobile) {
          z += Math.sin(time * 0.3 + pz) * sentimentSpeed * 0.3
        }

        // Soft wrapping instead of hard clamp
        if (x > 55) x -= 110
        else if (x < -55) x += 110
        if (y > 55) y -= 110
        else if (y < -55) y += 110
        if (z > 55) z -= 110
        else if (z < -55) z += 110

        positions[i] = x
        positions[i + 1] = y
        positions[i + 2] = z
      }

      particles.geometry.attributes.position!.needsUpdate = true
    }
  }

  // ── Color lerp ──
  if (colorsNeedUpdate) {
    const colors = particles.geometry.attributes.color!.array as Float32Array
    const lerpFactor = 0.015
    let stillLerping = false

    for (let i = 0; i < colors.length; i += 3) {
      const cr = colors[i]!
      const cg = colors[i + 1]!
      const cb = colors[i + 2]!
      const dr = currentTargetR - cr
      const dg = currentTargetG - cg
      const db = currentTargetB - cb

      if (Math.abs(dr) > 0.005 || Math.abs(dg) > 0.005 || Math.abs(db) > 0.005) {
        colors[i] = cr + dr * lerpFactor
        colors[i + 1] = cg + dg * lerpFactor
        colors[i + 2] = cb + db * lerpFactor
        stillLerping = true
      }
    }

    particles.geometry.attributes.color!.needsUpdate = true
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
  // Emotion vector (when the server provides one) paints richer hues than the
  // single sentiment axis: blended non-neutral anchors, pulled toward slate
  // by the neutral share. Falls back to the classic score gradient.
  const [r, g, b] = props.emotion ? emotionToColor(props.emotion) : sentimentToColor(score)
  currentTargetR = r
  currentTargetG = g
  currentTargetB = b
  colorsNeedUpdate = true

  // Background = 12% brightness of particle color
  targetBgR = r * 0.12
  targetBgG = g * 0.12
  targetBgB = b * 0.12

  // Bloom: with emotion data, glow follows how strongly the world feels
  // anything (intensity); otherwise dimmer for negative, brighter for positive
  const baseStrength = props.emotion
    ? mapRange(props.emotion.intensity, 0, 1, 0.8, 2.0)
    : mapRange(score, -1, 1, 0.8, 2.0)
  targetBloomStrength = isMobile ? baseStrength * 0.6 : baseStrength

  targetProfile = motionProfileFor(props.emotion, score)
}

watch([() => props.sentimentScore, () => props.emotion], () => {
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
      const positions = particles.geometry.attributes.position!.array as Float32Array
      const mouseInfluence = 0.08

      for (let i = 0; i < positions.length; i += 3) {
        const xi = positions[i]!
        const yi = positions[i + 1]!
        const dx = xi - mousePosition.x * 50
        const dy = yi - mousePosition.y * 50
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 20) {
          const force = (1 - distance / 20) * mouseInfluence
          positions[i] = xi + dx * force
          positions[i + 1] = yi + dy * force
        }
      }

      particles.geometry.attributes.position!.needsUpdate = true
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
    if (particleMaterial) {
      particleMaterial.uniforms.uScale.value = pointScale()
      particleMaterial.uniforms.uMaxSize.value = maxPointSize()
    }

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
  isDestroyed = true

  window.removeEventListener('mousemove', updateMousePosition)
  window.removeEventListener('resize', handleResize)
  if (reducedMotionQuery) {
    reducedMotionQuery.removeEventListener('change', onReducedMotionChange)
    reducedMotionQuery = null
  }

  if (animationId) cancelAnimationFrame(animationId)
  if (mouseUpdateTimeout) clearTimeout(mouseUpdateTimeout)
  if (resizeTimeout) clearTimeout(resizeTimeout)

  if (bloomPass) bloomPass.dispose()
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

  bloomPass = null
  composer = null
  renderer = null
  particles = null
  scene = null
  camera = null
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
