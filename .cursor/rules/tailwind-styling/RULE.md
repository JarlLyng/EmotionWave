---
description: "TailwindCSS styling guidelines and conventions"
globs: ["components/**/*.vue", "pages/**/*.vue"]
alwaysApply: false
---

# TailwindCSS Styling Guidelines

## Usage

- Use TailwindCSS utility classes for all styling
- Prefer utility classes over custom CSS when possible
- Use `scoped` styles only for complex animations or when utilities aren't sufficient
- Use CSS custom properties for dynamic values in styles

## Spacing

- Use Tailwind spacing scale: `p-4`, `m-2`, `gap-4`, `space-y-4`
- Be consistent with spacing values
- Use `space-y-*` for vertical spacing between children
- Use `gap-*` for flex/grid gaps

## Colors

- Use opacity modifiers: `text-white/80`, `bg-black/40`
- Use semantic color names when appropriate
- For dynamic colors, use inline styles with CSS variables

## Responsive Design

- Use responsive prefixes: `md:`, `lg:`, `xl:`
- Mobile-first approach: base styles for mobile, then add breakpoints
- Test on mobile devices

## Common Patterns

```vue
<!-- Container with padding and backdrop -->
<div class="p-8 bg-white/5 backdrop-blur-2xl rounded-2xl">

<!-- Flex layout -->
<div class="flex items-center justify-between gap-4">

<!-- Grid layout -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">

<!-- Responsive text -->
<h2 class="text-2xl md:text-4xl font-light">
```

## Custom Styles

- Use `@apply` sparingly in `<style>` blocks
- Prefer utility classes over custom CSS
- Use CSS custom properties for dynamic values:
  ```vue
  <div :style="{ color: dynamicColor }">
  ```

## Performance

- TailwindCSS purges unused classes automatically
- Don't worry about class name length (they're purged)
- Use JIT mode (default in TailwindCSS 4)

## Examples

See `components/InfoDialog.vue` and `components/SentimentMeter.vue` for reference implementations.

