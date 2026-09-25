import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Article } from '../../utils/sentiment'

vi.mock('../../server/utils/gdeltService', () => ({ fetchGDELTNews: vi.fn() }))
vi.mock('../../server/utils/newsApiService', () => ({ fetchNewsAPINews: vi.fn() }))
vi.mock('../../server/utils/redditService', () => ({ fetchRedditSentiment: vi.fn() }))
vi.mock('../../server/utils/huggingFaceService', () => ({
  batchAnalyzeWithHuggingFace: vi.fn(),
  batchAnalyzeEmotions: vi.fn(),
}))
vi.mock('../../server/utils/rssService', () => ({ fetchRssHeadlines: vi.fn() }))
vi.mock('../../server/utils/guardianService', () => ({ fetchGuardianNews: vi.fn() }))

import { aggregateSentiment, clearRetainedSnapshot } from '../../server/utils/sentimentAggregator'
import { fetchGDELTNews } from '../../server/utils/gdeltService'
import { fetchNewsAPINews } from '../../server/utils/newsApiService'
import { fetchRedditSentiment } from '../../server/utils/redditService'
import { batchAnalyzeWithHuggingFace, batchAnalyzeEmotions } from '../../server/utils/huggingFaceService'
import { fetchRssHeadlines } from '../../server/utils/rssService'
import { fetchGuardianNews } from '../../server/utils/guardianService'

const gdelt = vi.mocked(fetchGDELTNews)
const news = vi.mocked(fetchNewsAPINews)
const reddit = vi.mocked(fetchRedditSentiment)
const hfSentiment = vi.mocked(batchAnalyzeWithHuggingFace)
const hfEmotions = vi.mocked(batchAnalyzeEmotions)
const rss = vi.mocked(fetchRssHeadlines)
const guardian = vi.mocked(fetchGuardianNews)

const article = (title: string, sentiment = 2): Article => ({
  title, sentiment, url: 'https://example.com', source: 'Example',
})

const never = () => new Promise<never>(() => {})

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  clearRetainedSnapshot()
  rss.mockResolvedValue([])
  guardian.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('aggregateSentiment time budget (issue #68)', () => {
  it('serves partial results when one source hangs, instead of demo data', async () => {
    // The issue's exact reproduction: GDELT returns valid articles at once,
    // Reddit hangs past every deadline
    gdelt.mockResolvedValue([article('GDELT headline')])
    news.mockResolvedValue([])
    reddit.mockImplementation(never)

    const promise = aggregateSentiment(null, null)
    await vi.advanceTimersByTimeAsync(5001)
    const result = await promise

    expect(result.dataMode).toBe('live')
    expect(result.apiSources).toEqual(['GDELT'])
    expect(result.articles?.map(a => a.title)).toContain('GDELT headline')
  })

  it('cancels straggling sources when the phase closes', async () => {
    gdelt.mockResolvedValue([article('fast')])
    news.mockResolvedValue([])
    reddit.mockImplementation(never)

    const promise = aggregateSentiment(null, null)
    await vi.advanceTimersByTimeAsync(5001)
    await promise

    const redditSignal = reddit.mock.calls[0]?.[0]
    expect(redditSignal?.aborted).toBe(true)
  })

  it('returns demo-marked fallback only when no source delivered anything', async () => {
    gdelt.mockRejectedValue(new Error('down'))
    news.mockResolvedValue([])
    reddit.mockRejectedValue(new Error('down'))

    const result = await aggregateSentiment(null, null)

    expect(result.dataMode).toBe('demo')
    expect(result.apiSources).toEqual(['Fallback'])
    expect(result.articles).toEqual([])
  })

  it('drops late HF enrichment and serves keyword scores on time', async () => {
    gdelt.mockResolvedValue([article('A real headline about politics', 3)])
    news.mockResolvedValue([])
    reddit.mockResolvedValue([])
    hfSentiment.mockImplementation(never)
    hfEmotions.mockImplementation(never)

    const promise = aggregateSentiment(null, 'hf-key')
    await vi.advanceTimersByTimeAsync(7001)
    const result = await promise

    expect(result.dataMode).toBe('live')
    expect(result.apiSources).toEqual(['GDELT'])
    expect(result.apiSources).not.toContain('HuggingFace')
    expect(result.emotion).toBeUndefined()
    // Cancellation propagated so no further HF waves launch
    const hfSignal = hfSentiment.mock.calls[0]?.[2]
    expect(hfSignal?.aborted).toBe(true)
  })

  it('applies HF enrichment when it completes within the budget', async () => {
    gdelt.mockResolvedValue([article('A real headline about politics', 3)])
    news.mockResolvedValue([])
    reddit.mockResolvedValue([])
    hfSentiment.mockResolvedValue(new Map([[0, 8]]))
    hfEmotions.mockResolvedValue(new Map([[0, {
      anger: 0.1, disgust: 0, fear: 0.2, joy: 0.5, neutral: 0.2, sadness: 0, surprise: 0,
    }]]))

    const result = await aggregateSentiment(null, 'hf-key')

    expect(result.apiSources).toEqual(['GDELT', 'HuggingFace'])
    expect(result.emotion?.dominant).toBe('joy')
    expect(result.dataMode).toBe('live')
  })
})

describe('aggregateSentiment sampling (issue #70)', () => {
  it('spreads the HF sample across providers and includes all subreddits', async () => {
    const many = (n: number, source: string, prefix: string): Article[] =>
      Array.from({ length: n }, (_, i) => ({
        title: `${prefix} headline number ${i}`, sentiment: 1,
        url: `https://example.com/${prefix}/${i}`, source,
      }))
    const subs = ['worldnews', 'news', 'technology', 'science', 'environment']

    gdelt.mockResolvedValue(many(30, 'GDELT', 'gdelt'))
    news.mockResolvedValue([])
    reddit.mockResolvedValue(subs.flatMap(sub => many(10, `Reddit: r/${sub}`, sub)))
    hfSentiment.mockResolvedValue(new Map())
    hfEmotions.mockResolvedValue(new Map())

    const result = await aggregateSentiment(null, 'hf-key')

    // The HF sample is no longer 10× the first provider
    const sample = hfSentiment.mock.calls[0]![0]
    expect(sample).toHaveLength(10)
    const gdeltShare = sample.filter(t => t.text.includes('GDELT')).length
    expect(gdeltShare).toBeLessThan(10)
    expect(gdeltShare).toBeGreaterThan(0)

    // Every configured subreddit contributes to the aggregation
    const sourceNames = new Set(result.articles?.map(a => a.source))
    for (const sub of subs) {
      expect(sourceNames.has(`Reddit: r/${sub}`)).toBe(true)
    }
  })

  it('deduplicates the same story arriving from two feeds', async () => {
    gdelt.mockResolvedValue([{ title: 'Shared story', sentiment: 2, url: 'https://www.paper.com/story/', source: 'GDELT' }])
    news.mockResolvedValue([{ title: 'Shared story', sentiment: 2, url: 'https://paper.com/story', source: 'Paper' }])
    reddit.mockResolvedValue([])

    const result = await aggregateSentiment(null, null)
    expect(result.articles).toHaveLength(1)
    expect(result.articles?.[0]?.source).toBe('GDELT')
  })
})

describe('retained snapshot during total outage', () => {
  it('serves the last good reading marked stale instead of demo', async () => {
    gdelt.mockResolvedValue([article('Yesterday news', 3)])
    news.mockResolvedValue([])
    reddit.mockResolvedValue([])
    const live = await aggregateSentiment(null, null)
    expect(live.dataMode).toBe('live')

    // Total outage on the next cycle
    gdelt.mockRejectedValue(new Error('429'))
    reddit.mockRejectedValue(new Error('403'))
    const later = await aggregateSentiment(null, null)

    expect(later.dataMode).toBe('stale')
    expect(later.articles?.[0]?.title).toBe('Yesterday news')
    expect(later.apiSources).toEqual(['GDELT'])
    // Original measurement time is preserved for the provenance display
    expect(later.timestamp).toBe(live.timestamp)
  })

  it('expires the snapshot after six hours and falls back to demo', async () => {
    gdelt.mockResolvedValue([article('Old news', 3)])
    news.mockResolvedValue([])
    reddit.mockResolvedValue([])
    await aggregateSentiment(null, null)

    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1)
    gdelt.mockRejectedValue(new Error('429'))
    reddit.mockRejectedValue(new Error('403'))
    const later = await aggregateSentiment(null, null)

    expect(later.dataMode).toBe('demo')
  })
})

describe('keyless RSS and Guardian sources', () => {
  it('keeps the reading live on RSS alone when every API fails', async () => {
    gdelt.mockRejectedValue(new Error('429'))
    news.mockResolvedValue([])
    reddit.mockRejectedValue(new Error('403'))
    rss.mockResolvedValue([article('BBC world headline')])

    const result = await aggregateSentiment(null, null)

    expect(result.dataMode).toBe('live')
    expect(result.apiSources).toEqual(['RSS'])
    expect(result.articles?.[0]?.title).toBe('BBC world headline')
  })

  it('includes Guardian when a key is provided', async () => {
    gdelt.mockResolvedValue([])
    news.mockResolvedValue([])
    reddit.mockResolvedValue([])
    guardian.mockResolvedValue([article('Guardian world headline')])

    const result = await aggregateSentiment(null, null, 'guardian-key')

    expect(guardian.mock.calls[0]?.[0]).toBe('guardian-key')
    expect(result.apiSources).toEqual(['Guardian'])
  })
})

describe('source-phase grace window', () => {
  const later = <T>(ms: number, value: T) => () => new Promise<T>(resolve => setTimeout(() => resolve(value), ms))

  it('keeps emotion enrichment when a hanging source would have eaten the budget', async () => {
    // Production: GDELT hangs, RSS answers at once, HF needs ~2.5s. Waiting
    // the full 5s source phase left HF 1.8s and emotion was always dropped.
    gdelt.mockImplementation(never)
    news.mockResolvedValue([])
    reddit.mockResolvedValue([])
    rss.mockResolvedValue([article('BBC world headline', 2)])
    hfSentiment.mockImplementation(later(2500, new Map([[0, 5]])))
    hfEmotions.mockImplementation(later(2500, new Map([[0, {
      anger: 0.6, disgust: 0, fear: 0.1, joy: 0, neutral: 0.3, sadness: 0, surprise: 0,
    }]])))

    const promise = aggregateSentiment(null, 'hf-key')
    await vi.advanceTimersByTimeAsync(7001)
    const result = await promise

    expect(result.apiSources).toEqual(['RSS', 'HuggingFace'])
    expect(result.emotion?.dominant).toBe('anger')
    // The hanging source was cut off when the grace window closed
    expect(gdelt.mock.calls[0]?.[0]?.aborted).toBe(true)
  })

  it('still includes a source that arrives within the grace window', async () => {
    rss.mockResolvedValue([article('Fast RSS headline')])
    gdelt.mockImplementation(later(1000, [article('Slightly slower GDELT headline')]))
    news.mockResolvedValue([])
    reddit.mockImplementation(never)

    const promise = aggregateSentiment(null, null)
    await vi.advanceTimersByTimeAsync(5001)
    const result = await promise

    expect(result.apiSources).toEqual(['GDELT', 'RSS'])
  })

  it('does not open the grace window on empty results', async () => {
    // Keyless/blocked sources answering [] instantly must not cut off a
    // slower source that actually has articles
    news.mockResolvedValue([])
    reddit.mockResolvedValue([])
    rss.mockImplementation(later(3000, [article('Late but real headline')]))
    gdelt.mockImplementation(never)

    const promise = aggregateSentiment(null, null)
    await vi.advanceTimersByTimeAsync(5001)
    const result = await promise

    expect(result.dataMode).toBe('live')
    expect(result.apiSources).toEqual(['RSS'])
  })
})
