---
description: "Server API route standards and best practices"
globs: ["server/api/**/*.ts", "server/routes/**/*.ts"]
alwaysApply: false
---

# Server API Route Standards

## Structure

- API endpoints go in `server/api/` directory
- Server routes (manifest.json, robots.txt) go in `server/routes/` directory
- Use `defineEventHandler` from `h3` for all handlers

## API Endpoints

```typescript
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  // Handler logic
  return {
    // Response data
  }
})
```

## Error Handling

- Always handle errors gracefully
- Return appropriate status codes
- Provide meaningful error messages
- Use try-catch for async operations

## Caching

- Implement caching for expensive operations
- Use in-memory cache with TTL for API responses
- Cache duration: 30 seconds for sentiment data

## Response Types

- Always define TypeScript interfaces for responses
- Use consistent response structure
- Include timestamp for time-sensitive data

## Environment Variables

- Access via `useRuntimeConfig()` in handlers
- Use `runtimeConfig.public.*` for client-accessible config
- Never expose secrets to client

## Examples

```typescript
// Caching pattern
const CACHE_DURATION = 30 * 1000
let cachedData: SentimentData | null = null

export default defineEventHandler(async (event) => {
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData
  }
  
  // Fetch new data
  cachedData = await fetchData()
  return cachedData
})
```

## Server Routes

- Use `defineEventHandler` for routes like manifest.json
- Set appropriate `Content-Type` headers
- Use `useRuntimeConfig()` for dynamic values
- Ensure routes work in both SSR and static generation

## Best Practices

- Keep handlers focused and single-purpose
- Use async/await for async operations
- Handle timeouts for external API calls
- Implement fallback data when APIs fail
- Log errors for debugging

See `server/api/advanced-sentiment.ts` and `server/routes/manifest.json.ts` for reference implementations.

