# 🚀 Deployment Guide

This guide covers deployment options and configurations for EmotionWave.

## Vercel Deployment (Current)

This project is currently deployed on Vercel at [https://emotionwave.iamjarl.com](https://emotionwave.iamjarl.com)

Vercel supports serverless functions, enabling full API functionality.

### Setup

1. **Connect Repository**:
   - Import project from GitHub
   - Vercel auto-detects Nuxt 3

2. **Environment Variables**:
   ```
   HUGGINGFACE_API_KEY=your_api_key
   NEWS_API_KEY=your_api_key
   NUXT_PUBLIC_SITE_URL=https://emotionwave.iamjarl.com
   NUXT_PUBLIC_BASE_URL=/
   ```
   **Note**: For custom domain, use your actual domain. For default Vercel domain, use `https://your-app.vercel.app`

3. **Build Settings**:
   - Build Command: `npm run build` (not `generate` - we need serverless functions)
   - Output Directory: `.output` (not `.output/public`)
   - Install Command: `npm ci`
   - Framework Preset: Nuxt.js (auto-detected)

4. **Deploy**: Automatic on every push to main branch

### Advantages

- ✅ Server-side API routes work
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments for PRs
- ✅ Analytics and monitoring

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
- Review Vercel deployment logs

### Deployment Issues

- Verify environment variables are set
- Check baseURL configuration matches deployment path
- Ensure `NUXT_PUBLIC_SITE_URL` matches actual domain
- Review service worker registration paths

### API Not Working

- **Vercel**: Verify serverless functions are enabled and environment variables are set
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

