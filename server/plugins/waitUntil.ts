import { vercelWaitUntil } from '../utils/platformWaitUntil'

// The sentiment endpoint is cached stale-while-revalidate: once the 30s entry
// expires, Nitro answers from cache and refreshes in the background, handing
// that work to event.waitUntil. On Node, event.waitUntil only reaches the
// platform through event.context.waitUntil, which Nitro's Vercel preset never
// sets. So the function froze as soon as the cached response went out, and
// the refresh stalled until the next request thawed it, by which point its
// time budget had already elapsed: every refresh came back empty, and the API
// kept serving the retained snapshot as 'stale' for as long as the instance
// stayed warm.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.waitUntil ??= vercelWaitUntil
  })
})
