import { describe, it, expect } from 'vitest'
import {
  isDemoPayload,
  safeArticleUrl,
  normalizeSentiment,
  keywordBasedSentiment,
  getDynamicFallbackData,
  getDateRange,
  normalizeGDELTArticle,
  extractArticlesFromGDELT,
  calculateWeightedSentiment,
  type Article,
} from '../../utils/sentiment'

describe('normalizeSentiment', () => {
  it('maps the raw [-10, 10] range into [-1, 1]', () => {
    expect(normalizeSentiment(0)).toBe(0)
    expect(normalizeSentiment(2.5)).toBe(1)
    expect(normalizeSentiment(-2.5)).toBe(-1)
  })

  it('clamps extreme values', () => {
    expect(normalizeSentiment(100)).toBe(1)
    expect(normalizeSentiment(-100)).toBe(-1)
  })
})

describe('keywordBasedSentiment', () => {
  it('scores positive text above zero', () => {
    expect(keywordBasedSentiment('An excellent breakthrough and amazing success')).toBeGreaterThan(0)
  })

  it('scores negative text below zero', () => {
    expect(keywordBasedSentiment('War and crisis bring death and destruction')).toBeLessThan(0)
  })

  it('scores text without sentiment keywords as zero', () => {
    expect(keywordBasedSentiment('The committee met on Tuesday afternoon')).toBe(0)
  })

  it('understands Danish keywords', () => {
    expect(keywordBasedSentiment('en fantastisk fremgang')).toBeGreaterThan(0)
    expect(keywordBasedSentiment('krig og katastrofe')).toBeLessThan(0)
  })

  it('stays within the [-10, 10] bounds for keyword-heavy text', () => {
    const extreme = 'war crisis death attack destruction disaster '.repeat(50)
    const score = keywordBasedSentiment(extreme)
    expect(score).toBeGreaterThanOrEqual(-10)
    expect(score).toBeLessThanOrEqual(10)
  })

  it('does not match keyword stems inside unrelated words', () => {
    // "war" in hardware/award, "win" in window/winter, "hope" in Hopewell
    expect(keywordBasedSentiment('New hardware and software awards announced')).toBe(0)
    expect(keywordBasedSentiment('Window displays draw crowds this winter')).toBe(0)
  })

  it('still matches common inflections at word boundaries', () => {
    expect(keywordBasedSentiment('Wars and conflicts escalate as attacks continue')).toBeLessThan(0)
    expect(keywordBasedSentiment('Team wins after years of breakthroughs')).toBeGreaterThan(0)
  })

  it('matches Danish suffixed forms', () => {
    expect(keywordBasedSentiment('krigen og krisen fortsætter efter katastrofen')).toBeLessThan(0)
  })
})

describe('getDynamicFallbackData', () => {
  it('returns a clamped score with a Fallback source', () => {
    const data = getDynamicFallbackData()
    expect(data.score).toBeGreaterThanOrEqual(-1)
    expect(data.score).toBeLessThanOrEqual(1)
    expect(data.sources).toEqual([
      { name: 'Fallback', score: data.score, articles: 0 },
    ])
    expect(data.timestamp).toBeTypeOf('number')
  })
})

describe('getDateRange', () => {
  it('returns GDELT-formatted timestamps spanning 24 hours', () => {
    const range = getDateRange()
    expect(range.start).toMatch(/^\d{14}$/)
    expect(range.end).toMatch(/^\d{14}$/)
    const diffMs = new Date(range.isoEnd).getTime() - new Date(range.isoStart).getTime()
    expect(diffMs).toBe(24 * 60 * 60 * 1000)
  })
})

describe('extractArticlesFromGDELT', () => {
  it('handles a bare array', () => {
    expect(extractArticlesFromGDELT([{ title: 'a' }])).toEqual([{ title: 'a' }])
  })

  it('handles articles/results/docs wrappers', () => {
    expect(extractArticlesFromGDELT({ articles: [{ title: 'a' }] })).toEqual([{ title: 'a' }])
    expect(extractArticlesFromGDELT({ results: [{ title: 'b' }] })).toEqual([{ title: 'b' }])
    expect(extractArticlesFromGDELT({ docs: [{ title: 'c' }] })).toEqual([{ title: 'c' }])
  })

  it('returns null on error payloads and unknown shapes', () => {
    expect(extractArticlesFromGDELT({ error: 'nope' })).toBeNull()
    expect(extractArticlesFromGDELT({ message: 'rate limited' })).toBeNull()
    expect(extractArticlesFromGDELT('not json')).toBeNull()
    expect(extractArticlesFromGDELT(null)).toBeNull()
  })
})

describe('normalizeGDELTArticle', () => {
  it('uses the explicit sentiment field when present', () => {
    const article = normalizeGDELTArticle({ title: 'x', sentiment: 4, url: 'u', source: 's' })
    expect(article.sentiment).toBe(4)
  })

  it('clamps explicit sentiment to [-10, 10]', () => {
    expect(normalizeGDELTArticle({ sentiment: 42 }).sentiment).toBe(10)
    expect(normalizeGDELTArticle({ sentiment: -42 }).sentiment).toBe(-10)
  })

  it('falls back to keyword analysis when sentiment is missing or zero', () => {
    const article = normalizeGDELTArticle({ title: 'amazing breakthrough success' })
    expect(article.sentiment).toBeGreaterThan(0)
  })

  it('fills defaults for missing fields', () => {
    const article = normalizeGDELTArticle({})
    expect(article.url).toBe('')
    expect(article.title).toBe('')
    expect(article.source).toBe('Unknown')
  })
})

describe('calculateWeightedSentiment', () => {
  const make = (source: string, sentiment: number): Article => ({
    sentiment,
    url: 'u',
    title: 't',
    source,
  })

  it('returns zero for an empty article list', () => {
    const { score, sources } = calculateWeightedSentiment([])
    expect(score).toBe(0)
    expect(sources).toEqual([])
  })

  it('averages within a source and normalizes to [-1, 1]', () => {
    const { score, sources } = calculateWeightedSentiment([
      make('A', 2.5),
      make('A', 2.5),
    ])
    expect(score).toBe(1)
    expect(sources).toHaveLength(1)
    expect(sources[0]!.articles).toBe(2)
  })

  it('weights intense sources more than neutral ones', () => {
    const { score } = calculateWeightedSentiment([
      make('strong', 5),
      make('weak', -0.5),
    ])
    expect(score).toBeGreaterThan(0)
  })

  it('ignores zero-sentiment articles when others exist in the source', () => {
    const { sources } = calculateWeightedSentiment([
      make('A', 5),
      make('A', 0),
    ])
    expect(sources[0]!.score).toBe(normalizeSentiment(5))
  })
})

describe('isDemoPayload', () => {
  it('trusts an explicit dataMode over everything else', () => {
    expect(isDemoPayload({ dataMode: 'demo', sources: [] })).toBe(true)
    expect(isDemoPayload({ dataMode: 'live', sources: [{ name: 'Fallback', score: 0, articles: 0 }] })).toBe(false)
  })

  it('detects legacy fallback payloads without a dataMode field', () => {
    expect(isDemoPayload({ sources: [{ name: 'Fallback', score: 0.3, articles: 0 }] })).toBe(true)
    expect(isDemoPayload({ sources: [{ name: 'GDELT', score: 0.1, articles: 5 }] })).toBe(false)
    expect(isDemoPayload({ sources: [] })).toBe(false)
  })
})

describe('safeArticleUrl (issue #75)', () => {
  it('accepts plain web links', () => {
    expect(safeArticleUrl('https://example.com/story')).toBe('https://example.com/story')
    expect(safeArticleUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1')
  })

  it('rejects missing, unparsable and non-web schemes', () => {
    expect(safeArticleUrl('')).toBeNull()
    expect(safeArticleUrl(undefined)).toBeNull()
    expect(safeArticleUrl('not a url')).toBeNull()
    expect(safeArticleUrl(['javascript', 'alert(1)'].join(':'))).toBeNull()
    expect(safeArticleUrl('data:text/html,hi')).toBeNull()
  })
})
