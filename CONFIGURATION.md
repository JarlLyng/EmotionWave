# 🔧 Configuration Guide

This document describes all configuration options for EmotionWave.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `HUGGINGFACE_API_KEY` | HuggingFace API key for advanced sentiment analysis | No (optional, for future use) | - |
| `NEWS_API_KEY` | NewsAPI key for additional news sources | No (optional, improves accuracy) | - |
| `NUXT_PUBLIC_SITE_URL` | Public URL of the site | No | `http://localhost:3000` |
| `NUXT_PUBLIC_BASE_URL` | Base URL path (e.g., `/EmotionWave/` for GitHub Pages) | No | `/` (dev) or `/EmotionWave/` (prod) |

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
- **GitHub Pages**: Set as repository secrets in GitHub Settings
- **Vercel/Netlify**: Set in platform dashboard
- **Self-hosted**: Set in environment or `.env` file

⚠️ **Security Note**: Never commit `.env` files to git. If your API key has been exposed, rotate it immediately.

## Nuxt Configuration

Key configuration in `nuxt.config.ts`:

### Base URL
```typescript
app: {
  baseURL: process.env.NUXT_PUBLIC_BASE_URL || 
           (process.env.NODE_ENV === 'production' ? '/EmotionWave/' : '/'),
}
```
- **Development**: `/` (root)
- **GitHub Pages**: `/EmotionWave/` (subdirectory)
- **Root Domain**: `/` (root)

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
    routes: ['/', '/manifest.json', '/robots.txt', '/sitemap.xml']
  }
}
```
- Static generation for GitHub Pages
- Dynamic routes generated at build time

### TailwindCSS
```typescript
modules: ['@nuxtjs/tailwindcss']
```
- Integrated via Nuxt module
- Configuration in `tailwind.config.js`

## Sentiment Analysis Configuration

### Update Interval
- **Client-side polling**: 30 seconds
- Configured in `composables/useSentiment.ts`

### Cache Duration
- **Server-side cache**: 30 seconds
- Configured in `server/api/advanced-sentiment.ts`

### News Sources
- **Primary**: GDELT API (always used)
- **Secondary**: NewsAPI (optional, requires API key)
  - Uses HuggingFace Inference API for sentiment analysis (if API key provided)
  - Falls back to keyword-based sentiment if HuggingFace unavailable
- **Social**: Reddit (optional, lower weight)
- **Languages**: English and Danish news (separate API calls for NewsAPI)
- **Query**: Focused on politics, technology, society (excludes sports/entertainment)
- **Time Range**: Last 24 hours
- **Max Articles**: 30 articles per source
- **Aggregation**: Weighted average across all available sources

### Sentiment Analysis Methods
- **GDELT API**: Uses built-in sentiment/tone fields when available
- **HuggingFace**: Advanced ML-based sentiment analysis (optional, requires API key)
  - Model: cardiffnlp/twitter-roberta-base-sentiment-latest
  - Falls back to keyword-based if API unavailable
- **Keyword-based**: Enhanced keyword analysis with weighted scoring
  - Expanded keyword lists with positive/negative words
  - Weighted scoring (strong words get higher weight)
  - Multiple occurrence counting
  - Text length normalization

### Sentiment Score Range
- **Range**: -1 (negative) to +1 (positive)
- **Normalization**: GDELT values normalized to [-1, 1]
- **Weighted Average**: Based on article count per source

### Fallback Data
- **Trigger**: API unavailable or error
- **Type**: Dynamic time-based data
- **Update**: Changes based on current time
- **Indicator**: UI shows "Demo data" badge

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

### Service Worker
- **Cache Strategy**: Stale-while-revalidate for static assets
- **Precache**: _nuxt assets discovered from HTML
- **Offline Fallback**: Cached index.html

## PWA Configuration

### Manifest
- Generated dynamically via `server/routes/manifest.json.ts`
- Uses `NUXT_PUBLIC_BASE_URL` for correct paths
- Icons: favicon.ico, apple-touch-icon-180x180.png, android-chrome-192x192.png, android-chrome-512x512.png
- See [FAVICON_GUIDE.md](./FAVICON_GUIDE.md) for complete favicon setup

### Service Worker
- File: `public/sw.js`
- Registration: `app.vue` on mount
- Scope: Matches `baseURL`
- Cache version: Updated on changes

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
- See [FAVICON_GUIDE.md](./FAVICON_GUIDE.md) for complete setup
- Required: favicon.ico, apple-touch-icon-180x180.png, android-chrome-192x192.png, android-chrome-512x512.png

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
- Ensure service worker scope matches baseURL

### API Issues
- Check environment variables are set
- Verify API endpoints are accessible
- Review fallback data behavior

### Build Issues
- Clear `.output` and `.nuxt` directories
- Run `npm ci` for clean install
- Check Node.js version (20.x+)

