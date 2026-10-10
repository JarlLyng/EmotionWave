# AGENTS.md

Conventions for anyone changing this repository, human or AI agent. How the system fits together is in [ARCHITECTURE.md](./ARCHITECTURE.md) and environment variables are in [CONFIGURATION.md](./CONFIGURATION.md); this file covers the rules that are easy to get wrong.

## Commands

Use Node 22, the version CI runs.

```bash
npm run dev        # local dev server
npm run lint
npm run typecheck
npm test           # Vitest, tests/unit
npm run build
npm run audit:ci   # dependency audit gate, see "Dependencies and security"
```

CI runs lint, typecheck, test, build and audit:ci. `main` is protected and only takes pull requests with a green `ci` check, so run all five before pushing.

## Layout

| Path | What lives there |
| --- | --- |
| `pages/` | `index.vue` (the experience) and `about.vue` |
| `components/` | `VisualLayer` (Three.js), `AmbientSound` (Tone.js), `HeadlineRotator`, `SentimentMeter`, `InfoDialog` |
| `composables/` | `useSentiment` (polling, fallbacks, data modes) and `useGDELT` (direct client-side GDELT fallback) |
| `utils/` | Pure functions shared by client and server: `sentiment.ts` (scoring, emotion vectors, palette) and `motionProfile.ts` |
| `server/api/advanced-sentiment.ts` | The only API endpoint |
| `server/utils/` | One service per news source, `huggingFaceService`, `sentimentAggregator`, `retry`, zod `schemas` |
| `server/routes/` | `robots.txt` and `sitemap.xml` |
| `scripts/audit.mjs` | The CI audit gate and its allowlist |

## Server and data

- The endpoint is a `defineCachedEventHandler` with a 30 second cache and a single global key. Every visitor gets the same response.
- Every upstream call takes the caller's `AbortSignal` and goes through `retryWithBackoff(fn, retries, delay, signal)`. It retries network errors and 5xx, and fails fast on any 4xx, 429 included.
- Sources fail soft: a fetcher catches its own errors and returns `[]`. One slow or broken source must never hold up the others.
- The time budget lives in `sentimentAggregator.ts`: 7 s in total, a 5 s source phase that closes 1.5 s after the first source delivers articles, then HuggingFace. The endpoint adds a hard 8 s deadline. Fit new work inside that budget instead of extending it, because the serverless function limit is the ceiling.
- Validate external JSON with zod (`server/utils/schemas.ts`, or a local schema) before using it.
- Every response carries `dataMode`: `live`, `stale` (a retained snapshot up to 6 h old) or `demo` (generated). Never label stale or demo data as live; the UI badges depend on it.
- All API keys are optional and server-only, read through private `runtimeConfig`: `NEWS_API_KEY`, `HUGGINGFACE_API_KEY`, `GUARDIAN_API_KEY`. The site must keep working with none of them set. Don't add paid services.

## Client

- Components use `<script setup lang="ts">` with `defineProps<T>()` and `defineEmits<T>()`.
- Three.js and Tone.js are loaded with dynamic `import()` inside the component so they stay out of the initial bundle; static imports from them are `import type` only. Dispose of renderers, geometries, materials and synths in `onUnmounted`.
- Composables don't register lifecycle hooks. They return start/stop functions (`startPolling`, `stopPolling`) and the page calls them from `onMounted` and `onUnmounted`.
- Respect `prefers-reduced-motion` in anything that animates.
- Style with Tailwind 4 utilities, mobile first. Use scoped CSS only where utilities fall short, and inline styles or CSS variables for colours driven by data.
- Any new host the browser talks to must be added to the Content-Security-Policy in `nuxt.config.ts`.

## TypeScript and lint

- Prefer precise types, and `unknown` over `any`. No `@ts-ignore`. The untyped Tone.js nodes in `AmbientSound.vue` are an existing exception; don't add more.
- Prefix intentionally unused variables and arguments with `_`.

## Tests

- Vitest runs without Nuxt, so the `~/` alias does not resolve there. A module that a test imports for real must use relative imports (`../../utils/sentiment`); a module that tests only mock may use `~/`.
- Tests never hit the network. Mock the source services, as `tests/unit/aggregator.test.ts` does.
- A bug fix comes with a test that fails without the fix.

## Dependencies and security

- Dependabot opens a weekly grouped pull request for minor and patch updates. Major updates arrive one by one and need a local test run before merging.
- `npm run audit:ci` fails on high and critical advisories. An advisory goes on the allowlist in `scripts/audit.mjs` only with a written reason: why it can't be fixed yet, and why it isn't reachable in production. Remove an entry when the script reports it as no longer present.

## Repository conventions

- Conventional commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`), squash-merged pull requests.
- Code, comments and docs are written in English.
- The repository stays neutral about tools: this file is the only agent instruction file. Don't commit `.cursor/`, `.claude/`, `.windsurf/`, `.mcp.json` or a `CLAUDE.md`.
