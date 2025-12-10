# 🌊 EmotionWave

A living Nuxt-based website that reacts to the world's mood. Through real-time sentiment analysis of news and social media, the site's visual expression — colors, animations, and atmosphere — changes automatically.

🌐 **Live Site**: [https://jarllyng.github.io/EmotionWave/](https://jarllyng.github.io/EmotionWave/)

## 🎯 Project Purpose

Create a data-driven artwork where the website changes in real-time based on global sentiment. Users get a visual sense of "how the world feels" through an immersive experience combining visual and audio elements.

## 🛠️ Technologies

- **Framework**: Nuxt 3.20.2 + Vite
- **UI**: TailwindCSS 4.1.17
- **Visuals**: Three.js 0.181.2 for particle effects (lazy loaded)
- **Audio**: Tone.js 15.1.22 for generative ambient sound (lazy loaded)
- **Data**: HuggingFace Inference API for sentiment analysis
- **News Sources**: GDELT API
- **PWA**: Service Worker for offline functionality
- **TypeScript**: Full type safety throughout the application

## 🎨 Features

### Visual Expression
- Dynamic particle system that reacts to sentiment (1000-2000 particles based on device)
- Color transitions based on mood with smooth animations
- Interactive mouse-based particle movement
- Smooth 60fps animations and transitions
- Responsive design with mobile optimization
- Loading states and performance optimizations
- GPU-accelerated rendering with WebGL

### Audio Experience
- Generative ambient music using Tone.js
- Musical scale changes based on sentiment:
  - Negative (-1 to -0.5): C minor, low tones
  - Neutral-negative (-0.5 to 0): Eb major, ambient
  - Neutral-positive (0 to 0.5): F major, flowing
  - Positive (0.5 to 1): C major, uplifting
- Reverb and delay effects for atmospheric sound
- Volume control with smooth transitions
- Lazy loading for better performance
- User interaction required to start audio (browser policy)

### Sentiment Analysis
- Real-time analysis of news articles via GDELT API
- Multiple news sources for balanced sentiment
- 30-second cache to limit API calls
- Sentiment score range: -1 (negative) to +1 (positive)
- Smooth animated transitions between sentiment scores using requestAnimationFrame
- Automatic fallback to dynamic time-based data if API fails
- Error handling with user-friendly messages

### Progressive Web App (PWA)
- Offline functionality with service worker
- Installable on mobile devices
- Fullscreen experience
- Optimized for mobile performance
- Manifest.json for app-like experience

## 📊 Sentiment Visualization Mapping

| Score         | Visual Mood                    | Audio Mood           | Background Color |
|---------------|--------------------------------|---------------------|------------------|
| `-1 to -0.5`  | Dark, uneasy, flickering       | C minor, low tones  | Dark gray (#111827) |
| `-0.5 to 0`   | Cold, rain-like particles      | Eb major, ambient   | Dark blue (#1e3a8a) |
| `0 to 0.5`    | Neutral, light gradient        | F major, flowing    | Blue (#3b82f6) |
| `0.5 to 1`    | Warm, bubbling, colorful       | C major, uplifting  | Yellow (#eab308) |

## 🗂️ Project Structure

```
EmotionWave/
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD workflow
│
├── assets/
│   ├── css/
│   │   └── main.css           # Global styles
│   └── visuals/               # Visual assets
│
├── components/
│   ├── VisualLayer.vue        # Three.js particle system (optimized)
│   ├── SentimentMeter.vue     # UI component for score display
│   ├── AmbientSound.vue       # Tone.js audio system (optimized)
│   └── InfoDialog.vue         # Information dialog with project details
│
├── composables/
│   └── useSentiment.ts        # Sentiment data fetching and state management
│
├── pages/
│   └── index.vue              # Main application view
│
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── favicon.ico            # Site favicon
│   └── apple-touch-icon.png   # iOS app icon
│
├── server/
│   └── api/
│       ├── advanced-sentiment.ts  # Main sentiment analysis endpoint
│       ├── sentiment.ts           # Alternative sentiment endpoint
│       └── reddit-sentiment.ts    # Reddit-based sentiment (unused)
│
├── app.vue                    # Root component (service worker registration)
├── nuxt.config.ts             # Nuxt configuration
├── tailwind.config.js         # TailwindCSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- HuggingFace API key (for sentiment analysis)

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/jarllyng/EmotionWave.git
cd EmotionWave
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create a `.env` file:**
```env
HUGGINGFACE_API_KEY=your_api_key_here
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. **Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build for production (SSR)
- `npm run generate` - Generate static site for deployment
- `npm run preview` - Preview production build locally

## 🚀 Deployment

### GitHub Pages (Current)

This project is deployed on GitHub Pages and available at [https://jarllyng.github.io/EmotionWave/](https://jarllyng.github.io/EmotionWave/)

**Automatic Deployment:**
- GitHub Actions workflow automatically builds and deploys on every push to `main` or `master`
- Configured in `.github/workflows/deploy.yml`
- Uses official GitHub Pages deployment action

**Setup Requirements:**
1. Go to repository **Settings** → **Pages**
2. Set **Source** to "GitHub Actions"
3. Configure repository secrets:
   - `HUGGINGFACE_API_KEY` (required for build)
   - `NUXT_PUBLIC_SITE_URL` (optional, defaults to GitHub Pages URL)

**Known Limitations:**
- GitHub Pages is static hosting, so server-side API routes (`/api/*`) are not available
- The application uses fallback data when API is unavailable
- For full API functionality, deploy to a platform supporting serverless functions (Vercel, Netlify, etc.)

### Alternative Deployment Options

**Vercel/Netlify:**
- Supports server-side API routes
- Automatic deployments from GitHub
- Better performance and features

**Self-hosted:**
- Requires Node.js server
- Full SSR and API support
- More control over infrastructure

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `HUGGINGFACE_API_KEY` | HuggingFace API key for sentiment analysis | Yes (for API) | - |
| `NUXT_PUBLIC_SITE_URL` | Public URL of the site | No | `http://localhost:3000` |

### Nuxt Configuration

Key configuration in `nuxt.config.ts`:

- **baseURL**: `/EmotionWave/` for GitHub Pages, `/` for root deployment
- **buildAssetsDir**: `_nuxt/` (relative to baseURL)
- **Prerendering**: Enabled for static generation
- **TailwindCSS**: Integrated via `@nuxtjs/tailwindcss`

### Sentiment Analysis Configuration

- **Update interval**: 30 seconds
- **Cache duration**: 30 seconds (server-side)
- **News sources**: GDELT API (Danish and English news)
- **Fallback**: Dynamic time-based data if API fails
- **Score range**: -1 (negative) to +1 (positive)

### Performance Optimizations

- **Code splitting**: Automatic with Nuxt
- **Lazy loading**: Three.js and Tone.js loaded on demand
- **Particle optimization**: 1000 particles on mobile, 2000 on desktop
- **Throttled events**: Mouse and resize handlers throttled
- **Service worker**: Caching for offline functionality
- **Image optimization**: Optimized assets in public folder

## 📱 Mobile Experience

- Responsive design optimized for mobile devices
- Touch-friendly controls
- Reduced particle count (1000 vs 2000) for better performance
- PWA support for app-like experience
- Fullscreen mode support
- Optimized bundle size

## 🏗️ Architecture

### Component Structure

**VisualLayer.vue**
- Manages Three.js scene, camera, and renderer
- Creates and animates particle system
- Handles mouse interaction
- Updates colors based on sentiment

**AmbientSound.vue**
- Initializes Tone.js audio context
- Generates ambient music based on sentiment
- Manages volume control
- Handles browser audio policy (requires user interaction)

**SentimentMeter.vue**
- Displays current sentiment score
- Shows loading and error states
- Provides retry functionality

**InfoDialog.vue**
- Modal dialog with project information
- Responsive design
- Smooth animations

### State Management

**useSentiment.ts Composable**
- Manages sentiment score state
- Handles API fetching with error handling
- Implements smooth score transitions using requestAnimationFrame
- Polls API every 30 seconds
- Provides fallback data when API unavailable

### API Architecture

**Server API Routes** (`server/api/`)
- `advanced-sentiment.ts`: Main endpoint using GDELT API
- Handles caching (30 seconds)
- Provides fallback data
- Error handling and logging

**Note**: Server API routes only work with SSR or serverless platforms, not static hosting.

## 🐛 Known Issues & Limitations

1. **API Availability on GitHub Pages**
   - Server-side API routes don't work on static hosting
   - Application uses fallback data automatically
   - For full functionality, deploy to Vercel/Netlify

2. **Audio Autoplay**
   - Browser policies require user interaction to start audio
   - User must click the sound button to enable audio

3. **GDELT API Rate Limits**
   - May be rate-limited during high traffic
   - Fallback data ensures application always works

## 🧪 Testing

Currently no automated tests. Manual testing checklist:

- [ ] Visual particles render correctly
- [ ] Sentiment meter updates smoothly
- [ ] Audio plays after user interaction
- [ ] Responsive design works on mobile
- [ ] Service worker registers correctly
- [ ] Fallback data works when API unavailable

## 🐛 Recent Fixes & Improvements

- ✅ Fixed component duplication between `app.vue` and `pages/index.vue`
- ✅ Improved `useSentiment` composable lifecycle management
- ✅ Fixed VisualLayer animation loop scope issues
- ✅ Enhanced SentimentMeter with proper loading and error states
- ✅ Improved API endpoint error handling and response format handling
- ✅ Fixed GitHub Pages deployment paths
- ✅ Updated all to latest versions
- ✅ Fixed security vulnerabilities
- ✅ Added fallback data for static hosting
- ✅ Improved GitHub Actions workflow

## 🔒 Security

- No sensitive data exposed in client-side code
- API keys stored as GitHub secrets
- Service worker uses secure context
- HTTPS required for PWA features

## 📈 Performance Metrics

- **Initial Load**: < 3s on 3G
- **Time to Interactive**: < 5s
- **Bundle Size**: ~700KB (gzipped)
- **Lighthouse Score**: 90+ (Performance)

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow Vue 3 Composition API patterns
- Use composables for reusable logic
- Keep components focused and small
- Add comments for complex logic

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **HuggingFace** for sentiment analysis API
- **Tone.js** for audio synthesis
- **Three.js** for 3D graphics and particle effects
- **GDELT** for news data
- **Nuxt** team for the amazing framework
- All news sources for providing content

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ using Nuxt 3, Vue 3, Three.js, and Tone.js**
