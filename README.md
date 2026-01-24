# 🌊 EmotionWave

A living Nuxt-based website that reacts to the world's mood. Through real-time sentiment analysis of news and social media, the site's visual expression — colors, animations, and atmosphere — changes automatically.

🌐 **Live Site**: [https://emotionwave.iamjarl.com](https://emotionwave.iamjarl.com) (Vercel) | [GitHub Pages](https://jarllyng.github.io/EmotionWave/)

## 🎯 Project Purpose

Create a data-driven artwork where the website changes in real-time based on global sentiment. Users get a visual sense of "how the world feels" through an immersive experience combining visual and audio elements.

## 🛠️ Technologies

- **Framework**: Nuxt 3.20.2 + Vite
- **UI**: TailwindCSS 4.1.17
- **Visuals**: Three.js 0.181.2 for particle effects (lazy loaded)
- **Audio**: Tone.js 15.1.22 for generative ambient sound (lazy loaded)
- **Data**: Multi-source sentiment analysis (GDELT API, NewsAPI, Reddit)
- **PWA**: Service Worker for offline functionality
- **TypeScript**: Full type safety throughout the application

## 🎨 Features

### Visual Expression
- Dynamic particle system that reacts to sentiment (1000-2000 particles based on device)
- Color transitions based on mood with smooth animations
- Interactive mouse-based particle movement
- Smooth 60fps animations and transitions
- Responsive design with mobile optimization
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
- User interaction required to start audio (browser policy)

### Sentiment Analysis
- **Multi-source aggregation**: Combines data from GDELT API, NewsAPI (optional), and Reddit
- **Advanced analysis**: Optional HuggingFace Inference API integration for improved sentiment detection
- **Keyword-based fallback**: Enhanced keyword analysis when APIs don't provide explicit sentiment scores
- Real-time analysis of news articles from multiple sources
- Weighted average sentiment across all sources for better accuracy
- Retry logic with exponential backoff for reliable data fetching
- 30-second cache to limit API calls
- Sentiment score range: -1 (negative) to +1 (positive)
- Smooth animated transitions between sentiment scores
- Automatic fallback to dynamic time-based data if APIs fail
- Graceful degradation: works even if some APIs are unavailable

### Progressive Web App (PWA)
- Offline functionality with service worker
- Installable on mobile devices
- Fullscreen experience
- Optimized for mobile performance

### SEO & Social Sharing
- Comprehensive meta tags (Open Graph, Twitter Cards)
- Structured data (JSON-LD) for rich snippets
- Dynamic sitemap.xml and robots.txt generation
- Canonical URLs for proper indexing
- Optimized favicon set for all platforms

## 📊 Sentiment Visualization Mapping

| Score         | Visual Mood                    | Audio Mood           | Background Color |
|---------------|--------------------------------|---------------------|------------------|
| `-1 to -0.5`  | Dark, uneasy, flickering       | C minor, low tones  | Dark gray (#111827) |
| `-0.5 to 0`   | Cold, rain-like particles      | Eb major, ambient   | Dark blue (#1e3a8a) |
| `0 to 0.5`    | Neutral, light gradient        | F major, flowing    | Blue (#3b82f6) |
| `0.5 to 1`    | Warm, bubbling, colorful       | C major, uplifting  | Yellow (#eab308) |

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/jarllyng/EmotionWave.git
cd EmotionWave
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create a `.env` file** (optional):
```env
NUXT_PUBLIC_SITE_URL=http://localhost:3000
NUXT_PUBLIC_BASE_URL=/
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

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and component structure
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guides for various platforms
- **[CONFIGURATION.md](./CONFIGURATION.md)** - Configuration options and environment variables
- **[FAVICON_GUIDE.md](./FAVICON_GUIDE.md)** - Favicon setup and requirements
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guidelines for contributing

## 🐛 Known Issues & Limitations

1. **Static Hosting Limitations**
   - Server-side API routes don't work on static hosting (GitHub Pages, etc.)
   - Application uses fallback data automatically on static hosting
   - For full functionality with HuggingFace sentiment analysis, deploy to Vercel

2. **Audio Autoplay**
   - Browser policies require user interaction to start audio
   - User must click the sound button to enable audio

3. **GDELT API Rate Limits**
   - May be rate-limited during high traffic
   - Fallback data ensures application always works

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

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **GDELT** for news data
- **Tone.js** for audio synthesis
- **Three.js** for 3D graphics and particle effects
- **Nuxt** team for the amazing framework

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ using Nuxt 3, Vue 3, Three.js, and Tone.js**
