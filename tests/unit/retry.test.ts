import { describe, it, expect, vi } from 'vitest'
import { retryWithBackoff } from '../../server/utils/retry'

describe('retryWithBackoff', () => {
  it('returns immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(retryWithBackoff(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries with exponential backoff and eventually succeeds', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok')

    const promise = retryWithBackoff(fn, 3, 100)
    await vi.advanceTimersByTimeAsync(100) // first backoff
    await vi.advanceTimersByTimeAsync(200) // second backoff (doubled)
    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })

  it('throws the last error after exhausting retries', async () => {
    vi.useFakeTimers()
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    const promise = retryWithBackoff(fn, 3, 100)
    const expectation = expect(promise).rejects.toThrow('always fails')
    await vi.advanceTimersByTimeAsync(100 + 200)
    await expectation
    expect(fn).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })

  it('fails fast on permanent 4xx errors without retrying', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('GDELT API error: 404'))
    await expect(retryWithBackoff(fn, 3, 100)).rejects.toThrow('404')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws immediately when the signal is already aborted', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const controller = new AbortController()
    controller.abort()
    await expect(retryWithBackoff(fn, 3, 100, controller.signal)).rejects.toThrow('Aborted')
    expect(fn).toHaveBeenCalledTimes(0)
  })

  it('does not retry after the signal aborts mid-flight', async () => {
    const controller = new AbortController()
    const fn = vi.fn().mockImplementation(() => {
      controller.abort()
      return Promise.reject(new Error('upstream aborted'))
    })
    await expect(retryWithBackoff(fn, 3, 100, controller.signal)).rejects.toThrow('upstream aborted')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('fails fast on 429 to protect daily quotas', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('API error: 429'))
    await expect(retryWithBackoff(fn, 3, 100)).rejects.toThrow('429')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
