# 🚀 Deployment Guide

This guide covers deployment options and configurations for EmotionWave.

## GitHub Pages (Current)

This project is currently deployed on GitHub Pages and available at [https://jarllyng.github.io/EmotionWave/](https://jarllyng.github.io/EmotionWave/)

### Automatic Deployment

- GitHub Actions workflow automatically builds and deploys on every push to `main` or `master`
- Configured in `.github/workflows/deploy.yml`
- Uses official GitHub Pages deployment action

### Setup Requirements

1. Go to repository **Settings** → **Pages**
2. Set **Source** to "GitHub Actions"
3. Configure repository secrets (all optional):
   - `HUGGINGFACE_API_KEY` (optional, for future advanced sentiment analysis)
   - `NEWS_API_KEY` (optional, improves accuracy with additional news sources)
   - `NUXT_PUBLIC_SITE_URL` (optional, defaults to GitHub Pages URL)
   - `NUXT_PUBLIC_BASE_URL` (optional, defaults to `/EmotionWave/`)

### Configuration

The workflow uses these environment variables:
- `NUXT_PUBLIC_SITE_URL`: Public URL of the site (defaults to GitHub Pages URL)
- `NUXT_PUBLIC_BASE_URL`: Base URL path (`/EmotionWave/` for GitHub Pages)

### Known Limitations

- **Static Hosting**: GitHub Pages is static hosting, so server-side API routes (`/api/*`) are not available
- **Fallback Data**: The application uses fallback data when API is unavailable
- **Full Functionality**: For full API functionality, deploy to a platform supporting serverless functions (Vercel, Netlify, etc.)

### Build Process

1. Install dependencies: `npm ci`
2. Build static site: `npm run generate`
3. Output directory: `.output/public`
4. Deploy: GitHub Actions uploads to GitHub Pages

## Vercel Deployment

Vercel supports serverless functions, enabling full API functionality.

### Setup

1. **Connect Repository**:
   - Import project from GitHub
   - Vercel auto-detects Nuxt 3

2. **Environment Variables**:
   ```
   HUGGINGFACE_API_KEY=your_api_key
   NUXT_PUBLIC_SITE_URL=https://your-app.vercel.app
   NUXT_PUBLIC_BASE_URL=/
   ```

3. **Build Settings**:
   - Build Command: `npm run generate`
   - Output Directory: `.output/public`
   - Install Command: `npm ci`

4. **Deploy**: Automatic on every push to main branch

### Advantages

- ✅ Server-side API routes work
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments for PRs
- ✅ Analytics and monitoring

## Netlify Deployment

Similar to Vercel, Netlify supports serverless functions.

### Setup

1. **Connect Repository**:
   - Import project from GitHub
   - Netlify auto-detects Nuxt 3

2. **Build Settings**:
   - Build command: `npm run generate`
   - Publish directory: `.output/public`

3. **Environment Variables**:
   ```
   HUGGINGFACE_API_KEY=your_api_key
   NUXT_PUBLIC_SITE_URL=https://your-app.netlify.app
   NUXT_PUBLIC_BASE_URL=/
   ```

4. **Netlify Functions** (for API routes):
   - Server API routes automatically work as Netlify Functions
   - No additional configuration needed

### Advantages

- ✅ Server-side API routes work
- ✅ Automatic HTTPS
- ✅ Form handling
- ✅ Split testing
- ✅ Edge functions support

## Self-Hosted Deployment

For full control over infrastructure.

### Requirements

- Node.js 20.x or higher
- npm or yarn
- Web server (nginx, Apache, or similar)

### Setup

1. **Build the application**:
   ```bash
   npm install
   npm run generate
   ```

2. **Configure Environment Variables**:
   ```env
   HUGGINGFACE_API_KEY=your_api_key
   NUXT_PUBLIC_SITE_URL=https://your-domain.com
   NUXT_PUBLIC_BASE_URL=/
   ```

3. **Serve Static Files**:
   - Copy `.output/public` to web server root
   - Configure web server for SPA routing
   - Set up HTTPS (required for PWA features)

4. **For SSR Support** (optional):
   ```bash
   npm run build
   npm run preview
   ```
   - Use PM2 or similar process manager
   - Configure reverse proxy (nginx)

### Advantages

- ✅ Full control over infrastructure
- ✅ SSR support possible
- ✅ Custom server configuration
- ✅ No vendor lock-in

## Environment Variables

See [CONFIGURATION.md](./CONFIGURATION.md) for detailed environment variable documentation.

## Troubleshooting

### Build Failures

- Check Node.js version (requires 20.x+)
- Verify all dependencies installed: `npm ci`
- Check for TypeScript errors: `npm run build`
- Review GitHub Actions logs

### Deployment Issues

- Verify environment variables are set
- Check baseURL configuration matches deployment path
- Ensure `NUXT_PUBLIC_SITE_URL` matches actual domain
- Review service worker registration paths

### API Not Working

- **GitHub Pages**: API routes don't work (static hosting limitation)
- **Vercel/Netlify**: Verify serverless functions are enabled
- **Self-hosted**: Ensure Node.js server is running for SSR

## Performance Optimization

- Enable compression (gzip/brotli)
- Configure CDN caching
- Optimize images and assets
- Use service worker for offline caching
- Monitor bundle size

## Monitoring

- Set up error tracking (Sentry, etc.)
- Monitor API response times
- Track user analytics
- Monitor service worker registration
- Check Lighthouse scores regularly

