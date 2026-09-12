export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  signal?: AbortSignal
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (signal?.aborted) throw new Error('Aborted: time budget exhausted')
    try {
      return await fn()
    } catch (error) {
      // Cancelled work must not be retried — the budget is spent
      if (signal?.aborted) throw error
      // Permanent client errors (4xx except 429) won't be fixed by retrying —
      // fail fast instead of burning the serverless time budget on backoff
      const msg = error instanceof Error ? error.message : ''
      const status = Number(msg.match(/\b(4\d\d)\b/)?.[1] ?? 0)
      const isPermanent = status >= 400 && status < 500 && status !== 429
      if (isPermanent || attempt === maxRetries - 1) throw error
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}
