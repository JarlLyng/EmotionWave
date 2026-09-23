import type { EmotionLabel, EmotionState } from './sentiment'

/**
 * How the particle field moves and looks. Every value is interpolated, so a
 * mixed world emotion produces mixed motion, just like the colour blend.
 */
export interface MotionProfile {
  /** Amplitude of the slow organic drift, per frame */
  speed: number
  /** Vertical drift per frame: positive rises, negative falls */
  drift: number
  /** Amplitude of fast trembling */
  turbulence: number
  /** Particle shape: 0 = soft glowing orb, 1 = crisp disc */
  hardness: number
  /** Depth of brightness flicker, 0..1 */
  twinkle: number
  /** Multiplier on the field's slow rotation */
  spin: number
}

type Emotion = Exclude<EmotionLabel, 'neutral'>

// Joy rises and glows, sadness falls like slow rain, anger is fast, hard and
// restless, fear trembles and flickers, surprise sparkles, disgust churns.
export const EMOTION_PROFILES: Record<Emotion, MotionProfile> = {
  joy:      { speed: 0.05,  drift: 0.025,  turbulence: 0,    hardness: 0.05, twinkle: 0.35, spin: 1.3 },
  surprise: { speed: 0.07,  drift: 0.005,  turbulence: 0.04, hardness: 0.35, twinkle: 0.6,  spin: 1.8 },
  sadness:  { speed: 0.012, drift: -0.02,  turbulence: 0,    hardness: 0.15, twinkle: 0.05, spin: 0.4 },
  fear:     { speed: 0.025, drift: 0,      turbulence: 0.18, hardness: 0.6,  twinkle: 0.55, spin: 0.7 },
  anger:    { speed: 0.09,  drift: 0,      turbulence: 0.22, hardness: 0.9,  twinkle: 0.25, spin: 2.2 },
  disgust:  { speed: 0.018, drift: -0.006, turbulence: 0.08, hardness: 0.6,  twinkle: 0.1,  spin: 0.6 },
}

const KEYS: Array<keyof MotionProfile> = ['speed', 'drift', 'turbulence', 'hardness', 'twinkle', 'spin']

/** The classic score-driven motion, used when no emotion data is available */
export function neutralProfile(score: number): MotionProfile {
  const s = Number.isFinite(score) ? Math.max(-1, Math.min(1, score)) : 0
  return { speed: 0.02 + Math.abs(s) * 0.04, drift: 0, turbulence: 0, hardness: 0.3, twinkle: 0.15, spin: 1 }
}

/**
 * Blend the per-emotion profiles by the non-neutral share of the emotion
 * vector, then mix with the neutral profile by intensity, so a world that
 * feels little moves close to the classic behaviour.
 */
export function motionProfileFor(emotion: EmotionState | null | undefined, score: number): MotionProfile {
  const neutral = neutralProfile(score)
  if (!emotion) return neutral

  const emotions = Object.keys(EMOTION_PROFILES) as Emotion[]
  const total = emotions.reduce((sum, e) => sum + (emotion.vector[e] ?? 0), 0)
  if (total <= 0) return neutral

  const blended: MotionProfile = { speed: 0, drift: 0, turbulence: 0, hardness: 0, twinkle: 0, spin: 0 }
  for (const e of emotions) {
    const weight = (emotion.vector[e] ?? 0) / total
    for (const key of KEYS) blended[key] += EMOTION_PROFILES[e][key] * weight
  }

  const t = Math.max(0, Math.min(1, emotion.intensity))
  const result = { ...neutral }
  for (const key of KEYS) result[key] = neutral[key] + (blended[key] - neutral[key]) * t
  return result
}

/** Ease `current` toward `target` in place (called once per frame) */
export function lerpProfileInPlace(current: MotionProfile, target: MotionProfile, factor: number): void {
  for (const key of KEYS) current[key] += (target[key] - current[key]) * factor
}
