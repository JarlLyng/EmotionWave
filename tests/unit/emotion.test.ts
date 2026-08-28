import { describe, it, expect } from 'vitest'
import {
  aggregateEmotionVectors,
  emotionToColor,
  emptyEmotionVector,
  EMOTION_COLOR_ANCHORS,
  type EmotionVector,
} from '../../utils/sentiment'
import { parseHuggingFaceEmotions } from '../../server/utils/huggingFaceService'

function vec(partial: Partial<EmotionVector>): EmotionVector {
  return { ...emptyEmotionVector(), ...partial }
}

describe('parseHuggingFaceEmotions', () => {
  it('parses a nested label array into a normalized vector', () => {
    const result = parseHuggingFaceEmotions([[
      { label: 'joy', score: 0.6 },
      { label: 'neutral', score: 0.3 },
      { label: 'fear', score: 0.1 },
    ]])
    expect(result).not.toBeNull()
    expect(result!.joy).toBeCloseTo(0.6)
    expect(result!.neutral).toBeCloseTo(0.3)
    const sum = Object.values(result!).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('ignores unknown labels and returns null when nothing matches', () => {
    expect(parseHuggingFaceEmotions([{ label: 'optimism', score: 0.9 }])).toBeNull()
    expect(parseHuggingFaceEmotions('garbage')).toBeNull()
    expect(parseHuggingFaceEmotions(null)).toBeNull()
  })
})

describe('aggregateEmotionVectors', () => {
  it('returns null for empty input', () => {
    expect(aggregateEmotionVectors([])).toBeNull()
  })

  it('averages distributions and picks the non-neutral dominant', () => {
    const state = aggregateEmotionVectors([
      vec({ fear: 0.4, neutral: 0.6 }),
      vec({ fear: 0.2, joy: 0.1, neutral: 0.7 }),
    ])
    expect(state).not.toBeNull()
    expect(state!.dominant).toBe('fear')
    const sum = Object.values(state!.vector).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('lets neutral dampen intensity without stealing dominance', () => {
    // 50% neutral (the level measured on real headlines) must still yield
    // a non-neutral dominant and a mid intensity
    const state = aggregateEmotionVectors([vec({ neutral: 0.5, anger: 0.3, sadness: 0.2 })])
    expect(state!.dominant).toBe('anger')
    expect(state!.intensity).toBeCloseTo(0.5)
  })
})

describe('emotionToColor', () => {
  it('returns the pure anchor for a single fully-intense emotion', () => {
    const state = aggregateEmotionVectors([vec({ joy: 1 })])!
    const [r, g, b] = emotionToColor(state)
    const [ar, ag, ab] = EMOTION_COLOR_ANCHORS.joy
    expect(r).toBeCloseTo(ar)
    expect(g).toBeCloseTo(ag)
    expect(b).toBeCloseTo(ab)
  })

  it('pulls toward neutral slate as neutral share grows', () => {
    const intense = emotionToColor(aggregateEmotionVectors([vec({ anger: 0.9, neutral: 0.1 })])!)
    const muted = emotionToColor(aggregateEmotionVectors([vec({ anger: 0.2, neutral: 0.8 })])!)
    // red channel dominates anger; the muted state must sit closer to slate
    expect(intense[0]).toBeGreaterThan(muted[0])
    expect(muted[0]).toBeGreaterThan(0.2)
  })

  it('blends mixed emotions instead of snapping to one anchor', () => {
    const state = aggregateEmotionVectors([vec({ anger: 0.5, joy: 0.5 })])!
    const [r, g] = emotionToColor(state)
    // between deep red (0.85, 0.18) and gold (0.95, 0.75)
    expect(r).toBeGreaterThan(0.8)
    expect(g).toBeGreaterThan(0.3)
    expect(g).toBeLessThan(0.7)
  })
})
