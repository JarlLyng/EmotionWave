import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vercelWaitUntil } from '../../server/utils/platformWaitUntil'

const VERCEL_REQUEST_CONTEXT = Symbol.for('@vercel/request-context')
type Hook = (event: { context: Record<string, unknown> }) => void

function setVercelContext(waitUntil: ((p: Promise<unknown>) => void) | undefined) {
  (globalThis as Record<symbol, unknown>)[VERCEL_REQUEST_CONTEXT] = { get: () => ({ waitUntil }) }
}

// Mirrors Nitro's own event.waitUntil on Node: it reaches the platform only
// through event.context.waitUntil (nitropack runtime/internal/app.mjs)
function nitroEvent() {
  const event = {
    context: {} as Record<string, unknown>,
    waitUntil: (promise: Promise<unknown>) => {
      const forward = event.context.waitUntil as ((p: Promise<unknown>) => void) | undefined
      forward?.(promise)
    },
  }
  return event
}

async function loadRequestHook(): Promise<Hook> {
  let hook: Hook | undefined
  vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
  const { default: plugin } = await import('../../server/plugins/waitUntil')
  ;(plugin as (app: unknown) => void)({
    hooks: { hook: (name: string, fn: Hook) => { if (name === 'request') hook = fn } },
  })
  if (!hook) throw new Error('plugin registered no request hook')
  return hook
}

describe('vercelWaitUntil', () => {
  afterEach(() => {
    delete (globalThis as Record<symbol, unknown>)[VERCEL_REQUEST_CONTEXT]
  })

  it('hands the promise to the current Vercel invocation', () => {
    const waitUntil = vi.fn()
    setVercelContext(waitUntil)
    const work = Promise.resolve()
    vercelWaitUntil(work)
    expect(waitUntil).toHaveBeenCalledWith(work)
  })

  it('is a no-op off Vercel', () => {
    expect(() => vercelWaitUntil(Promise.resolve())).not.toThrow()
  })
})

describe('waitUntil plugin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as Record<symbol, unknown>)[VERCEL_REQUEST_CONTEXT]
  })

  it('lets background cache refreshes keep the Vercel function alive', async () => {
    const waitUntil = vi.fn()
    setVercelContext(waitUntil)
    const hook = await loadRequestHook()

    const event = nitroEvent()
    hook(event)
    // What Nitro's stale-while-revalidate cache does with its refresh
    const refresh = Promise.resolve()
    event.waitUntil(refresh)

    expect(waitUntil).toHaveBeenCalledWith(refresh)
  })

  it('keeps a platform waitUntil that is already set', async () => {
    const existing = vi.fn()
    const hook = await loadRequestHook()

    const event = nitroEvent()
    event.context.waitUntil = existing
    hook(event)

    expect(event.context.waitUntil).toBe(existing)
  })
})
