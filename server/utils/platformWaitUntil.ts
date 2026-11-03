// Vercel exposes the current invocation's context, including waitUntil,
// through this global symbol. @vercel/functions' waitUntil() is a thin
// wrapper around the same lookup; reading it directly avoids pulling in that
// package's dependency tree for three lines. Off Vercel the symbol is absent
// and the call is a no-op, which is fine: a long-running Node server keeps
// background work alive on its own.
const VERCEL_REQUEST_CONTEXT = Symbol.for('@vercel/request-context')

interface VercelRequestContext {
  waitUntil?: (promise: Promise<unknown>) => void
}

type ContextStore = { get?: () => VercelRequestContext | undefined } | undefined

/** Keep the serverless invocation alive until `promise` settles */
export function vercelWaitUntil(promise: Promise<unknown>): void {
  const store = (globalThis as Record<symbol, ContextStore>)[VERCEL_REQUEST_CONTEXT]
  store?.get?.()?.waitUntil?.(promise)
}
