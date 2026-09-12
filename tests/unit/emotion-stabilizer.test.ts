import { describe, it, expect } from 'vitest'
import { createEmotionStabilizer, type EmotionState, emptyEmotionVector } from '../../utils/sentiment'

const reading = (dominant: EmotionState['dominant'], intensity = 0.6): EmotionState => ({
  vector: emptyEmotionVector(),
  dominant,
  intensity,
})

describe('createEmotionStabilizer (issue #73)', () => {
  it('adopts the first reading immediately', () => {
    const s = createEmotionStabilizer()
    s.observe(reading('joy'))
    expect(s.current()).toBe('joy')
  })

  it('does not switch on a single transient reading', () => {
    // The issue\'s exact reproduction: joy, then ONE fear reading
    const s = createEmotionStabilizer()
    s.observe(reading('joy'))
    s.observe(reading('fear'))
    expect(s.current()).toBe('joy')
  })

  it('repeated lookups never advance the state', () => {
    const s = createEmotionStabilizer()
    s.observe(reading('joy'))
    s.observe(reading('fear'))
    // Playback reads the bucket many times between polls
    expect(s.current()).toBe('joy')
    expect(s.current()).toBe('joy')
    expect(s.current()).toBe('joy')
  })

  it('switches after two qualifying consecutive readings', () => {
    const s = createEmotionStabilizer()
    s.observe(reading('joy'))
    s.observe(reading('fear'))
    s.observe(reading('fear'))
    expect(s.current()).toBe('fear')
  })

  it('a flicker back to the stable label resets the pending switch', () => {
    const s = createEmotionStabilizer()
    s.observe(reading('joy'))
    s.observe(reading('fear'))
    s.observe(reading('joy'))
    s.observe(reading('fear'))
    expect(s.current()).toBe('joy')
  })

  it('treats missing and low-intensity readings as "none" under the same rule', () => {
    const s = createEmotionStabilizer()
    s.observe(reading('joy'))
    s.observe(null)
    expect(s.current()).toBe('joy') // one missing reading is a transient
    s.observe(reading('anger', 0.05)) // low intensity counts as none too
    expect(s.current()).toBeNull() // two consecutive none-readings → score fallback
  })

  it('recovers from none back to an emotion with the same stability rule', () => {
    const s = createEmotionStabilizer()
    s.observe(null)
    expect(s.current()).toBeNull()
    s.observe(reading('sadness'))
    expect(s.current()).toBeNull() // first sadness is only pending
    s.observe(reading('sadness'))
    expect(s.current()).toBe('sadness')
  })
})
