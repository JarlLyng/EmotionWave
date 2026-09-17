# 🔧 Configuration Guide

This document describes all configuration options for EmotionWave.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `HUGGINGFACE_API_KEY` | HuggingFace API key — activates model-based sentiment refinement and emotion classification on a sample of headlines | No (optional) | - |
| `GUARDIAN_API_KEY` | The Guardian Open Platform key (free developer tier: https://open-platform.theguardian.com/access/) — adds Guardian world news as a source | No (optional) | - |
| `NEWS_API_KEY` | NewsAPI key for additional news sources | No (optional, improves accuracy) | - |
| `NUXT_PUBLIC_SITE_URL` | Public URL of the site | No | `http://localhost:3000` |
| `NUXT_PUBLIC_BASE_URL` | Base URL path (e.g., `/EmotionWave/` for subdirectory hosting) | No | `/` |

### Setting Environment Variables

**Local Development**:
Create a `.env` file in the project root:
```env
HUGGINGFACE_API_KEY=your_api_key_here
NEWS_API_KEY=your_api_key_here
NUXT_PUBLIC_SITE_URL=http://localhost:3000
NUXT_PUBLIC_BASE_URL=/
```

**Getting API Keys**:
- **NewsAPI**: Get a free API key at https://newsapi.org/register (100 requests/day free tier)
- **HuggingFace**: 
  - **Step 1**: Go to https://huggingface.co/settings/tokens and click "New token"
  - **Step 2**: Select **"Fine-grained"** as token type (not "Read" or "Write")
  - **Step 3**: Under "User permissions" → "Inference", check **"Make calls to Inference Providers"**
    - This is the permission needed for the Serverless Inference API
    - You can also check "Make calls to your Inference Endpoints" if you plan to use dedicated endpoints
  - **Step 4**: Give the token a name (e.g., "emotionwave") and click "Create token"
  - Free accounts work fine, but need the correct permissions!
  - The token should start with `hf_`
  - If you get 401/403 errors, your token likely doesn't have the right permissions

**Production**:
- **GitHub Pages**: Set as repository secrets in GitHub Settings (static hosting only)
- **Vercel**: Set in Vercel dashboard (recommended for full functionality)
- **Self-hosted**: Set in environment or `.env` file

⚠️ **Security Note**: Never commit `.env` files to git. If your API key has been exposed, rotate it immediately.

## Nuxt Configuration

Key configuration in `nuxt.config.ts`:

### Base URL
```typescript
app: {
  baseURL: process.env.NUXT_PUBLIC_BASE_URL || '/',
}
```
- **Default**: `/` (root — Vercel is the primary deployment)
- **Subdirectory hosting**: set `NUXT_PUBLIC_BASE_URL` accordingly

### Build Assets Directory
```typescript
buildAssetsDir: '_nuxt/'
```
- Relative to `baseURL`
- Ensures correct asset paths in subdirectory deployments

### Prerendering
```typescript
nitro: {
  prerender: {
    crawlLinks: false,
    routes: ['/', '/about', '/robots.txt', '/sitemap.xml']
  }
}
```
- Prerenders the pages and SEO files at build time

### TailwindCSS
```typescript
vite: {
  plugins: [tailwindcss()],  // @tailwindcss/vite
}
```
- Integrated via the `@tailwindcss/vite` plugin (Tailwind 4)
- Entry point: `assets/css/main.css` (`@import "tailwindcss"`)

## Sentiment Analysis Configuration

### Update Interval
- **Client-side polling**: 30 seconds
- Configured in `composables/useSentiment.ts`

### Cache Duration
- **Server-side cache**: 30 seconds
- Configured in `server/api/advanced-sentiment.ts`

### News Sources
- **Primary**: GDELT API (always used)
- **Keyless RSS**: BBC World and NPR World feeds (always used — no key, no quota; the most outage-resistant source)
- **Secondary**: NewsAPI (optional, requires API key)
- **The Guardian**: world section via the free Open Platform developer key (optional)
- **Social**: Reddit (optional, full weight — up to 20 posts spread round-robin across five subreddits)
- **Languages**: English and Danish news (separate API calls for NewsAPI)
- **Query**: Focused on politics, technology, society (excludes sports/entertainment)
- **Time Range**: Last 24 hours
- **Time budget**: sources get a 5s collection phase; whatever finished is served and stragglers are cancelled (one slow source cannot discard another's results)
- **Deduplication**: the same story arriving from two feeds is matched on normalized URL and counted once
- **Aggregation**: Weighted average across all available sources, filtered by valid (non-zero) sentiment

### Sentiment Analysis Methods
- **Keyword-based (always-on baseline)**: word-boundary-anchored keyword lists
  (English and Danish) with weighted scoring and length normalization —
  this scores every article, with or without API keys
- **GDELT API**: built-in sentiment/tone fields used when present
- **HuggingFace (optional enrichment, requires API key)**:
  - Sentiment model: cardiffnlp/twitter-roberta-base-sentiment-latest
  - Emotion model: j-hartmann/emotion-english-distilroberta-base (7 emotions, drives the palette and musical scale)
  - Applied to a sample of 10 articles selected round-robin across sources
  - 10-second timeout per request; the whole enrichment phase only gets
    whatever remains of the endpoint's time budget and is dropped when late
  - On any failure the keyword scores stand

### Sentiment Score Range
- **Range**: -1 (negative) to +1 (positive)
- **Normalization**: GDELT values normalized to [-1, 1]
- **Weighted Average**: Based on valid (non-zero) article count per source
- **Data Filtering**: Articles with exactly 0 sentiment are filtered out when calculating averages (likely missing data)

### Fallback Data
- **Data modes**: every payload carries `dataMode` — `live` (real news),
  `stale` (client keeps the last good reading during an outage) or `demo`
  (synthetic time-based data when nothing real was ever received)
- **Indicator**: the UI badge shows "Demo data" or "Last known mood", and
  the provenance line under the meter shows mode, providers and reading age

## Performance Configuration

### Code Splitting
- Automatic with Nuxt
- Lazy loading for heavy dependencies
- Route-based code splitting

### Lazy Loading
- **Three.js**: Loaded on demand in VisualLayer
- **Tone.js**: Loaded on demand in AmbientSound
- Reduces initial bundle size

### Particle Optimization
- **Mobile**: 1000 particles
- **Desktop**: 2000 particles
- Configured in `components/VisualLayer.vue`

### Throttled Events
- **Mouse events**: Throttled to ~60fps
- **Resize events**: Throttled to 250ms
- Prevents performance issues

## PWA Configuration

PWA generation is fully delegated to `@vite-pwa/nuxt` (configured in the
`pwa` block of `nuxt.config.ts`):

- **Service worker**: generated at build time as `sw.js` (Workbox precache
  of built assets, `autoUpdate` registration handled by the module)
- **Manifest**: generated as `manifest.webmanifest` with the icons from
  `public/`
- The earlier hand-written `public/sw.js` and `server/routes/manifest.json.ts`
  were superseded by this and have been removed

## TypeScript Configuration

### Type Safety
- Strict mode enabled
- Full type coverage
- No `any` types allowed
- Configuration in `tsconfig.json`

### Path Aliases
- `~/` - Project root
- `@/` - Source directory
- Auto-imported from Nuxt

## TailwindCSS Configuration

### Customization
- Configuration in `tailwind.config.js`
- Custom colors and utilities
- Responsive breakpoints
- Dark mode support (if needed)

## SEO Configuration

### Meta Tags
- Configured in `nuxt.config.ts` under `app.head`
- Includes: title, description, keywords, author
- Open Graph tags for social sharing
- Twitter Card tags
- Canonical URLs

### Structured Data
- JSON-LD schema.org markup in `pages/index.vue`
- WebApplication schema with features and creator info
- Helps search engines understand the application

### SEO Files
- **sitemap.xml**: Generated dynamically via `server/routes/sitemap.xml.ts`
- **robots.txt**: Generated dynamically via `server/routes/robots.txt.ts`
- Both use `NUXT_PUBLIC_SITE_URL` for correct domain

### Favicons
- Required: favicon.ico, apple-touch-icon-180x180.png, android-chrome-192x192.png, android-chrome-512x512.png
- All favicon files are located in `/public/` directory

## Build Configuration

### Production Build (Vercel/Serverless)
```bash
npm run build
```
- Builds for SSR/serverless
- Output: `.output`
- Enables server API routes

### Static Build (GitHub Pages)
```bash
npm run generate
```
- Generates static site
- Output: `.output/public`
- Prerenders all routes

### Development Build
```bash
npm run dev
```
- Development server with HMR
- Port: 3000 (default)
- Hot module replacement

### Preview Build
```bash
npm run preview
```
- Preview production build locally
- Tests static generation
- Verifies deployment output

## Troubleshooting

### Base URL Issues
- Verify `NUXT_PUBLIC_BASE_URL` matches deployment path
- Check asset paths in browser console

### API Issues
- Check environment variables are set
- Verify API endpoints are accessible
- Review fallback data behavior

### Build Issues
- Clear `.output` and `.nuxt` directories
- Run `npm ci` for clean install
- Check Node.js version (20.x+)

