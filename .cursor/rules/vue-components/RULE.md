---
description: "Vue 3 component standards and styling guidelines"
globs: ["components/**/*.vue"]
alwaysApply: false
---

# Vue 3 Component Standards

## Component Structure

Always follow this structure order:

```vue
<template>
  <!-- Template content -->
</template>

<script setup lang="ts">
// Imports
// Props/Emits definitions
// Composables
// State
// Computed properties
// Methods
// Lifecycle hooks
</script>

<style scoped>
/* Component styles */
</style>
```

## Script Setup

- Always use `<script setup lang="ts">` with TypeScript
- Define props with `defineProps<Type>()` for type safety
- Define emits with `defineEmits<{ (e: 'eventName', payload: Type): void }>()`
- Use `import` statements at the top
- Use composables for reusable logic

## Props and Emits

```typescript
// Props example
const props = defineProps<{
  score: number
  isLoading: boolean
  error?: string | null
}>()

// Emits example
const emit = defineEmits<{
  (e: 'retry'): void
  (e: 'update', value: number): void
}>()
```

## State Management

- Use `ref()` for reactive primitive values
- Use `reactive()` for reactive objects (rarely needed)
- Use `computed()` for derived values
- Prefer composables over global state when possible

## Lifecycle Hooks

- Use `onMounted()` for initialization
- Use `onUnmounted()` for cleanup (always clean up!)
- Use `watch()` or `watchEffect()` for reactivity
- Clean up intervals, event listeners, and subscriptions

## Styling

- Use `scoped` styles for component-specific CSS
- Use TailwindCSS utility classes for styling
- Use CSS custom properties for dynamic values
- Keep styles organized and maintainable

## Performance

- Use `v-if` for conditional rendering (removes from DOM)
- Use `v-show` for frequent toggling (keeps in DOM)
- Use `key` attribute for list items when order changes
- Lazy load heavy components with `defineAsyncComponent`

## Examples

See `components/SentimentMeter.vue` and `components/AmbientSound.vue` for reference implementations.

