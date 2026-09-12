import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../composables/useGDELT', () => ({ fetchGDELTSentiment: vi.fn() }))

import { useSentiment } from '../../composables/useSentiment'
import { fetchGDELTSentiment } from '../../composables/useGDELT'
import { getDynamicFallbackData } from '../../utils/sentiment'

const gdelt = vi.mocked(fetchGDELTSentiment)
const fetchMock = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ app: { baseURL: '/' } }))
  // Run score animation to completion synchronously so assertions see final state
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const livePayload = {
  score: 0.8,
  timestamp: 1,
  dataMode: 'live' as const,
  sources: [{ name: 'GDELT', score: 0.8, articles: 3 }],
  articles: [{ title: 'Live headline', url: 'https://x.com', source: 'X', sentiment: 2 }],
}

/** fetch that never settles until its signal aborts */
const hangingFetch = () => fetchMock.mockImplementation((_url: string, opts: { signal: AbortSignal }) =>
  new Promise((_, reject) => {
    opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })
)

describe('useSentiment fetch bounds and cancellation (issue #71)', () => {
  it('times out a hanging server request, falls back, and can fetch again', async () => {
    hangingFetch()
    gdelt.mockResolvedValue(getDynamicFallbackData())

    const s = useSentiment()
    const first = s.fetchSentiment()
    await vi.advanceTimersByTimeAsync(12001)
    await first

    expect(gdelt).toHaveBeenCalledTimes(1)
    expect(s.dataMode.value).toBe('demo')
    expect(s.isLoading.value).toBe(false)

    // in-flight state was released: a second call reaches the network again
    fetchMock.mockResolvedValue({ ok: true, json: async () => livePayload })
    await s.fetchSentiment()
    expect(s.dataMode.value).toBe('live')
  })

  it('discards a response that settles after stopPolling', async () => {
    let resolveLate: (value: unknown) => void = () => {}
    fetchMock.mockImplementation(() => new Promise((resolve) => { resolveLate = resolve }))

    const s = useSentiment()
    const pending = s.fetchSentiment()

    s.stopPolling()
    resolveLate({ ok: true, json: async () => livePayload })
    await pending

    // Late completion must not update disposed state
    expect(s.sentimentScore.value).toBe(0)
    expect(s.articles.value).toHaveLength(0)
    expect(s.dataMode.value).toBe('live') // untouched initial value
  })

  it('does not cascade into a fallback request when deliberately stopped', async () => {
    hangingFetch()

    const s = useSentiment()
    const pending = s.fetchSentiment()
    s.stopPolling() // aborts the active controller
    await pending

    expect(gdelt).not.toHaveBeenCalled()
  })

  it('applies live data normally when the server responds in time', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => livePayload })

    const s = useSentiment()
    await s.fetchSentiment()

    expect(s.dataMode.value).toBe('live')
    expect(s.articles.value[0]?.title).toBe('Live headline')
    expect(gdelt).not.toHaveBeenCalled()
  })

  it('keeps the last good snapshot marked stale during an outage', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => livePayload })
    const s = useSentiment()
    await s.fetchSentiment()

    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 })
    gdelt.mockResolvedValue(getDynamicFallbackData())
    await s.fetchSentiment()

    expect(s.dataMode.value).toBe('stale')
    expect(s.articles.value[0]?.title).toBe('Live headline')
    expect(s.isUsingFallback.value).toBe(true)
  })
})
