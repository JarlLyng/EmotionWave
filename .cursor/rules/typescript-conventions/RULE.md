---
description: "TypeScript conventions and type safety standards"
globs: ["**/*.ts", "**/*.vue"]
alwaysApply: false
---

# TypeScript Conventions

## Type Safety

- Always use TypeScript types, avoid `any`
- Use interfaces for object shapes
- Use type aliases for unions and complex types
- Prefer `interface` over `type` for object types (can be extended)

## Type Definitions

```typescript
// Interface for objects
interface SentimentData {
  score: number
  timestamp: number
  sources: Array<{
    name: string
    score: number
    articles: number
  }>
}

// Type alias for unions
type Status = 'loading' | 'success' | 'error'

// Function types
type EventHandler = (event: Event) => void
```

## Vue Component Types

- Use `defineProps<Type>()` for props
- Use `defineEmits<Type>()` for emits
- Use `Ref<Type>` for ref types (usually inferred)
- Use `ComputedRef<Type>` for computed types (usually inferred)

## API Types

- Define request/response types for API endpoints
- Use `defineEventHandler` with proper return types
- Handle errors with proper error types

## Common Patterns

```typescript
// Ref with type
const count = ref<number>(0)

// Computed with type
const doubled = computed<number>(() => count.value * 2)

// Function with types
function fetchData(): Promise<SentimentData> {
  // ...
}

// Async function
async function loadData(): Promise<void> {
  // ...
}
```

## Avoid

- Don't use `any` - use `unknown` if type is truly unknown
- Don't use `@ts-ignore` - fix the type issue instead
- Don't use `as` type assertions unless necessary - prefer proper typing

## Examples

See `composables/useSentiment.ts` and `server/api/advanced-sentiment.ts` for reference implementations.

