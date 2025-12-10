---
description: "Nuxt 3 project standards and conventions for EmotionWave"
alwaysApply: true
---

# Nuxt 3 Standards

## Project Structure

- Use Nuxt 3 file-based routing in `pages/` directory
- Place reusable components in `components/` directory (auto-imported)
- Create composables in `composables/` directory (auto-imported)
- Server API routes go in `server/api/` directory
- Server routes (like manifest.json) go in `server/routes/` directory
- Static assets go in `public/` directory

## Configuration

- Always use `defineNuxtConfig()` for configuration
- Use `runtimeConfig` for environment variables:
  - `public` properties are exposed to client
  - Private properties are server-only
- Use `app.baseURL` for GitHub Pages subdirectory support
- Set `buildAssetsDir: '_nuxt/'` for correct asset paths

## Server Routes

- Use `defineEventHandler` from `h3` for API endpoints
- Use `defineEventHandler` for server routes (manifest.json, robots.txt, etc.)
- Always set appropriate `Content-Type` headers
- Use `useRuntimeConfig()` to access runtime configuration

## Prerendering

- Use `nitro.prerender.routes` for static generation
- Server routes are automatically prerendered during `nuxt generate`
- Ensure dynamic routes handle both SSR and static generation

## Environment Variables

- Use `NUXT_PUBLIC_*` prefix for client-accessible variables
- Access via `useRuntimeConfig().public.*` in components
- Access via `process.env.NUXT_PUBLIC_*` in `nuxt.config.ts`
- Never commit `.env` files (use `.env.example`)

## Best Practices

- Use `<script setup lang="ts">` for all Vue components
- Prefer Composition API over Options API
- Use TypeScript for type safety
- Lazy load heavy dependencies (Three.js, Tone.js) for performance
- Use `onMounted` and `onUnmounted` for lifecycle hooks
- Clean up resources (intervals, event listeners) in `onUnmounted`

