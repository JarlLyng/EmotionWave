import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Article } from '../../utils/sentiment'

vi.mock('../../server/utils/gdeltService', () => ({ fetchGDELTNews: vi.fn() }))
vi.mock('../../server/utils/newsApiService', () => ({ fetchNewsAPINews: vi.fn() }))
vi.mock('../../server/utils/redditService', () => ({ fetchRedditSentiment: vi.fn() }))
vi.mock('../../server/utils/huggingFaceService', () => ({
  batchAnalyzeWithHuggingFace: vi.fn(),
  batchAnalyzeEmotions: vi.fn(),
}))

import { aggregateSentiment } from '../../server/utils/sentimentAggregator'
import { fetchGDELTNews } from '../../server/utils/gdeltService'
import { fetchNewsAPINews } from '../../server/utils/newsApiService'
import { fetchRedditSentiment } from '../../server/utils/redditService'
import { batchAnalyzeWithHuggingFace, batchAnalyzeEmotions } from '../../server/utils/huggingFaceService'

const gdelt = vi.mocked(fetchGDELTNews)
const news = vi.mocked(fetchNewsAPINews)
const reddit = vi.mocked(fetchRedditSentiment)
const hfSentiment = vi.mocked(batchAnalyzeWithHuggingFace)
const hfEmotions = vi.mocked(batchAnalyzeEmotions)

const article = (title: string, sentiment = 2): Article => ({
  title, sentiment, url: 'https://example.com', source: 'Example',
})

const never = () => new Promise<never>(() => {})

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
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
