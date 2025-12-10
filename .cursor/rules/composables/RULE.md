---
description: "Composables pattern and reusable logic standards"
globs: ["composables/**/*.ts"]
alwaysApply: false
---

# Composables Standards

## Structure

- Composables are auto-imported from `composables/` directory
- Use `.ts` extension (not `.js`)
- Export a function that returns reactive state and methods
- Use `use` prefix for composable names (e.g., `useSentiment`)

## Pattern

```typescript
import { ref, computed } from 'vue'

export function useComposable() {
  // State
  const state = ref<Type>(initialValue)
  
  // Computed
  const computedValue = computed(() => {
    // computation
  })
  
  // Methods
  function doSomething() {
    // logic
  }
  
  // Return public API
  return {
    state,
    computedValue,
    doSomething
  }
}
```

## Lifecycle Management

- **Don't** use `onMounted` or `onUnmounted` in composables
- Return `start()` and `stop()` functions instead
- Let the component handle lifecycle hooks
- Clean up resources in `stop()` function

## Example Pattern

```typescript
export function usePolling() {
  let intervalId: number | null = null
  
  function start() {
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(() => {
      // poll
    }, 30000)
  }
  
  function stop() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
  
  return { start, stop }
}

// In component:
const { start, stop } = usePolling()
onMounted(() => start())
onUnmounted(() => stop())
```

## State Management

- Use `ref()` for reactive state
- Use `computed()` for derived values
- Keep state local to composable when possible
- Return only what components need

## Error Handling

- Use `ref<string | null>(null)` for error state
- Set error messages when operations fail
- Clear errors when operations succeed
- Return error state in composable return

## Best Practices

- Keep composables focused and single-purpose
- Make composables reusable across components
- Document return values with TypeScript types
- Handle cleanup properly (intervals, listeners, etc.)

See `composables/useSentiment.ts` for a reference implementation.

