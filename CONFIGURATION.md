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
- **HuggingFace**: Get an API key at https://huggingface.co/settings/tokens (optional, for future use)

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
- **Social**: Reddit (optional, lower weight)
- **Languages**: Danish and English news
- **Query**: Focused on politics, technology, society (excludes sports/entertainment)
- **Time Range**: Last 24 hours
- **Max Articles**: 30 articles per source
- **Aggregation**: Weighted average across all available sources

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
- Icons: favicon.ico, apple-touch-icon.png

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

## Build Configuration

### Production Build
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

