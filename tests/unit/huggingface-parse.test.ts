import { describe, it, expect } from 'vitest'
import { parseHuggingFaceSentiment } from '../../server/utils/huggingFaceService'

describe('parseHuggingFaceSentiment', () => {
  it('parses the standard nested-array format', () => {
    const data = [[
      { label: 'positive', score: 0.9 },
      { label: 'neutral', score: 0.08 },
      { label: 'negative', score: 0.02 },
    ]]
    expect(parseHuggingFaceSentiment(data)).toBeGreaterThan(0)
  })

  it('parses a flat array format', () => {
    const data = [
      { label: 'NEGATIVE', score: 0.85 },
      { label: 'POSITIVE', score: 0.15 },
    ]
    expect(parseHuggingFaceSentiment(data)).toBeLessThan(0)
  })

  it('parses a single-object format', () => {
    expect(parseHuggingFaceSentiment({ label: 'POSITIVE', score: 0.95 })).toBeGreaterThan(0)
  })

  it('maps LABEL_0/1/2 outputs to negative/neutral/positive', () => {
    const negative = [[
      { label: 'LABEL_0', score: 0.8 },
      { label: 'LABEL_1', score: 0.15 },
      { label: 'LABEL_2', score: 0.05 },
    ]]
    expect(parseHuggingFaceSentiment(negative)).toBeLessThan(0)

    const positive = [[
      { label: 'LABEL_0', score: 0.05 },
      { label: 'LABEL_1', score: 0.15 },
      { label: 'LABEL_2', score: 0.8 },
    ]]
    expect(parseHuggingFaceSentiment(positive)).toBeGreaterThan(0)
  })

  it('dampens the score when neutral confidence is high', () => {
    const confident = parseHuggingFaceSentiment([[{ label: 'positive', score: 0.6 }, { label: 'neutral', score: 0.0 }]])
    const dampened = parseHuggingFaceSentiment([[{ label: 'positive', score: 0.6 }, { label: 'neutral', score: 0.9 }]])
    expect(Math.abs(dampened)).toBeLessThan(Math.abs(confident))
  })

  it('returns 0 for unknown labels and malformed payloads', () => {
    expect(parseHuggingFaceSentiment([[{ label: 'SOMETHING_ELSE', score: 0.9 }]])).toBe(0)
    expect(parseHuggingFaceSentiment(null)).toBe(0)
    expect(parseHuggingFaceSentiment('error')).toBe(0)
    expect(parseHuggingFaceSentiment([])).toBe(0)
    expect(parseHuggingFaceSentiment({ error: 'model loading' })).toBe(0)
  })

  it('stays within the [-10, 10] bounds', () => {
    const score = parseHuggingFaceSentiment([[{ label: 'positive', score: 1 }, { label: 'negative', score: 0 }]])
    expect(score).toBeLessThanOrEqual(10)
    expect(score).toBeGreaterThanOrEqual(-10)
  })
})
