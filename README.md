# 🌊 EmotionWave

A living Nuxt-based website that reacts to the world's mood. Through real-time sentiment analysis of news and social media, the site's visual expression — colors, animations, and atmosphere — changes automatically.

## 🎯 Project Purpose

Create a data-driven artwork where the website changes in real-time based on global sentiment. Users get a visual sense of "how the world feels" through an immersive experience combining visual and audio elements.

## 🛠️ Technologies

- **Framework**: Nuxt 3 + Vite
- **UI**: TailwindCSS
- **Visuals**: Three.js for particle effects (lazy loaded)
- **Audio**: Tone.js for generative ambient sound (lazy loaded)
- **Data**: HuggingFace for sentiment analysis
- **News Sources**: GDELT API
- **PWA**: Service Worker for offline functionality

## 🎨 Features

### Visual Expression
- Dynamic particle system that reacts to sentiment
- Color transitions based on mood
- Interactive mouse-based particle movement
- Smooth animations and transitions
- Responsive design with mobile optimization
- Loading states and performance optimizations

### Audio Experience
- Generative ambient music using Tone.js
- Musical scale changes based on sentiment (C minor for negative, C major for positive)
- Reverb and delay effects for atmospheric sound
- Volume control with smooth transitions
- Lazy loading for better performance

### Sentiment Analysis
- Real-time analysis of news articles via GDELT API
- Multiple news sources for balanced sentiment
- 10-minute cache to limit API calls
- Sentiment score range: -1 (negative) to +1 (positive)
- Fallback to static data in production

### Progressive Web App (PWA)
- Offline functionality with service worker
- Installable on mobile devices
- Fullscreen experience
- Optimized for mobile performance

## 📊 Sentiment Visualization Mapping

| Score         | Visual Mood                    | Audio Mood           |
|---------------|--------------------------------|---------------------|
| `-1 to -0.5`  | Dark, uneasy, flickering       | C minor, low tones  |
| `-0.5 to 0`   | Cold, rain-like particles      | Eb major, ambient   |
| `0 to 0.5`    | Neutral, light gradient        | F major, flowing    |
| `0.5 to 1`    | Warm, bubbling, colorful       | C major, uplifting  |

## 🗂️ Project Structure
```
emotionwave/
│
├── components/
│   ├── VisualLayer.vue        # Dynamic visual background (optimized)
│   ├── SentimentMeter.vue     # UI component for score display
│   ├── AmbientSound.vue       # Generative audio system (optimized)
│   └── InfoDialog.vue         # Information dialog
│
├── composables/
│   └── useSentiment.ts        # Data fetching and interpretation
│
├── pages/
│   └── index.vue              # Main view
│
├── server/
│   └── api/
│       └── advanced-sentiment.ts  # Sentiment analysis endpoint
│
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker
│
└── nuxt.config.ts
```

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/EmotionWave.git
cd EmotionWave
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
HUGGINGFACE_API_KEY=your_api_key_here
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables
- `HUGGINGFACE_API_KEY`: Your HuggingFace API key
- `NUXT_PUBLIC_SITE_URL`: The public URL of your site

### Sentiment Analysis
- Update interval: 30 seconds
- Cache duration: 10 minutes
- News sources: GDELT API (danish and english news)

### Performance Optimizations
- Lazy loading of Three.js and Tone.js
- Code splitting with manual chunks
- Mobile-optimized particle count
- Throttled event handlers
- Service worker for offline functionality

## 📱 Mobile Experience

- Responsive design optimized for mobile devices
- Touch-friendly controls
- Reduced particle count on mobile for better performance
- PWA support for app-like experience
- Fullscreen mode support

## 🚀 Performance

- **Bundle Size**: Optimized with code splitting
- **Loading**: Lazy loading of heavy libraries
- **Caching**: Service worker for offline functionality
- **Mobile**: Optimized for mobile devices
- **Animations**: 60fps smooth animations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- HuggingFace for sentiment analysis
- Tone.js for audio synthesis
- Three.js for visual effects
- GDELT for news data
- All news sources for providing content
