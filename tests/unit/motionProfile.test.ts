import { describe, it, expect } from 'vitest'
import {
  EMOTION_PROFILES,
  lerpProfileInPlace,
  motionProfileFor,
  neutralProfile,
} from '../../utils/motionProfile'
import { emptyEmotionVector, type EmotionState, type EmotionVector } from '../../utils/sentiment'

const state = (partial: Partial<EmotionVector>, intensity: number, dominant: EmotionState['dominant'] = 'joy'): EmotionState => ({
  vector: { ...emptyEmotionVector(), ...partial },
  dominant,
  intensity,
})

describe('motionProfileFor', () => {
  it('falls back to the classic score-driven motion without emotion data', () => {
    expect(motionProfileFor(null, 0.5)).toEqual(neutralProfile(0.5))
    expect(motionProfileFor(undefined, -1)).toEqual(neutralProfile(-1))
  })

  it('reproduces a single emotion\'s profile at full intensity', () => {
    const p = motionProfileFor(state({ anger: 1 }, 1, 'anger'), 0)
    expect(p.hardness).toBeCloseTo(EMOTION_PROFILES.anger.hardness)
    expect(p.turbulence).toBeCloseTo(EMOTION_PROFILES.anger.turbulence)
  })

  it('stays neutral at zero intensity', () => {
    const p = motionProfileFor(state({ fear: 1 }, 0, 'fear'), 0.2)
    expect(p).toEqual(neutralProfile(0.2))
  })

  it('gives joy a rising drift and sadness a falling one', () => {
    expect(motionProfileFor(state({ joy: 1 }, 1), 0).drift).toBeGreaterThan(0)
    expect(motionProfileFor(state({ sadness: 1 }, 1, 'sadness'), 0).drift).toBeLessThan(0)
  })

  it('blends mixed emotions instead of snapping to the dominant one', () => {
    const p = motionProfileFor(state({ anger: 0.5, joy: 0.5 }, 1, 'anger'), 0)
    const mid = (EMOTION_PROFILES.anger.hardness + EMOTION_PROFILES.joy.hardness) / 2
    expect(p.hardness).toBeCloseTo(mid)
  })

  it('ignores the neutral share when weighting emotions', () => {
    const withNeutral = motionProfileFor(state({ fear: 0.2, neutral: 0.8 }, 1, 'fear'), 0)
    expect(withNeutral.turbulence).toBeCloseTo(EMOTION_PROFILES.fear.turbulence)
  })
})

describe('lerpProfileInPlace', () => {
  it('eases every field toward the target', () => {
    const current = neutralProfile(0)
    const target = EMOTION_PROFILES.anger
    lerpProfileInPlace(current, target, 0.5)
    expect(current.hardness).toBeCloseTo((neutralProfile(0).hardness + target.hardness) / 2)
    expect(current.spin).toBeCloseTo((1 + target.spin) / 2)
  })
})
