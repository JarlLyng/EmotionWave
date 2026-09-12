import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchGDELTSentiment } from '../../composables/useGDELT'

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(body),
})

const textResponse = (body: string, ok = true, status = 200) => ({
  ok,
  status,
  text: async () => body,
})

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('fetchGDELTSentiment structural parsing (issue #69)', () => {
  it('accepts ordinary headlines containing error-looking words', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      articles: [
        { title: 'Software error fixed after breakthrough', domain: 'example.com', url: 'https://example.com/a' },
        { title: 'One or more invalid ballots recounted', domain: 'example.org', url: 'https://example.org/b' },
      ],
    }))

    const result = await fetchGDELTSentiment()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.dataMode).toBe('live')
    expect(result.articles?.map(a => a.title)).toContain('Software error fixed after breakthrough')
  })

  it('preserves headline URLs, sources and publication time', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      articles: [{ title: 'A calm day', domain: 'example.com', url: 'https://example.com/calm', date: '2026-09-12' }],
    }))

    const result = await fetchGDELTSentiment()
    const article = result.articles?.[0]
    expect(article?.url).toBe('https://example.com/calm')
    expect(article?.source).toBe('example.com')
    expect(article?.publishedAt).toBe('2026-09-12')
  })

  it('treats a plain-text API message as an error and retries the simpler query', async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse('Your query was too long or too common.'))
      .mockResolvedValueOnce(jsonResponse({ articles: [{ title: 'Recovered headline', domain: 'ex.com', url: 'https://ex.com/r' }] }))

    const result = await fetchGDELTSentiment()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.dataMode).toBe('live')
    expect(result.articles?.[0]?.title).toBe('Recovered headline')
  })

  it('returns demo-marked fallback when both queries fail, without throwing', async () => {
    fetchMock.mockResolvedValue(textResponse('Service temporarily unavailable', false, 503))

    const result = await fetchGDELTSentiment()
    expect(result.dataMode).toBe('demo')
  })

  it('does not retry on permanent 4xx errors', async () => {
    fetchMock.mockResolvedValue(textResponse('Forbidden', false, 403))

    const result = await fetchGDELTSentiment()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.dataMode).toBe('demo')
  })

  it('returns fallback on structural error payloads without scanning content', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'rate limited' }))

    const result = await fetchGDELTSentiment()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.dataMode).toBe('demo')
  })
})
