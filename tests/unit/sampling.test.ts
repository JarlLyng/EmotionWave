import { describe, it, expect } from 'vitest'
import { dedupeByUrl, normalizeArticleUrl, roundRobinByKey, type Article } from '../../utils/sentiment'

const article = (title: string, source: string, url: string): Article => ({
  title, source, url, sentiment: 1,
})

describe('normalizeArticleUrl', () => {
  it('matches the same story across www/trailing-slash/case variants', () => {
    expect(normalizeArticleUrl('https://www.Example.com/Story/')).toBe(normalizeArticleUrl('http://example.com/story'))
  })

  it('keeps distinct paths distinct', () => {
    expect(normalizeArticleUrl('https://example.com/a')).not.toBe(normalizeArticleUrl('https://example.com/b'))
  })
})

describe('dedupeByUrl (issue #70)', () => {
  it('drops later duplicates of the same story', () => {
    const result = dedupeByUrl([
      article('From GDELT', 'GDELT', 'https://www.paper.com/story/'),
      article('From NewsAPI', 'Paper', 'https://paper.com/story'),
      article('Other', 'Paper', 'https://paper.com/other'),
    ])
    expect(result.map(a => a.title)).toEqual(['From GDELT', 'Other'])
  })

  it('keeps articles without URLs', () => {
    const result = dedupeByUrl([article('A', 's', ''), article('B', 's', '')])
    expect(result).toHaveLength(2)
  })
})

describe('roundRobinByKey (issue #70)', () => {
  const items = [
    ...['a1', 'a2', 'a3', 'a4'].map(t => ({ t, k: 'A' })),
    ...['b1', 'b2'].map(t => ({ t, k: 'B' })),
    ...['c1', 'c2', 'c3'].map(t => ({ t, k: 'C' })),
  ]

  it('spreads the cap across all groups instead of taking the first feed', () => {
    const picked = roundRobinByKey(items, i => i.k, 6)
    const byKey = picked.reduce((acc, i) => { acc[i.k] = (acc[i.k] ?? 0) + 1; return acc }, {} as Record<string, number>)
    expect(byKey.A).toBe(2)
    expect(byKey.B).toBe(2)
    expect(byKey.C).toBe(2)
  })

  it('preserves each group\'s internal order', () => {
    const picked = roundRobinByKey(items, i => i.k, 6)
    const aOrder = picked.filter(i => i.k === 'A').map(i => i.t)
    expect(aOrder).toEqual(['a1', 'a2'])
  })

  it('lets remaining groups fill the cap when one group is sparse', () => {
    const picked = roundRobinByKey(items, i => i.k, 8)
    expect(picked).toHaveLength(8)
    expect(picked.filter(i => i.k === 'B')).toHaveLength(2)
  })

  it('returns everything unchanged when under the cap', () => {
    expect(roundRobinByKey(items, i => i.k, 100)).toHaveLength(items.length)
  })
})
