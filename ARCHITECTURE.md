# 🏗️ Architecture

This document describes the technical architecture and component structure of EmotionWave.

## Component Structure

### VisualLayer.vue
- **Purpose**: Manages Three.js scene, camera, and renderer
- **Responsibilities**:
  - Creates and animates particle system (1000-2000 particles based on device)
  - Handles mouse interaction for particle movement
  - Updates colors based on sentiment score
  - Optimizes performance with throttled events
- **Key Features**:
  - Lazy loading of Three.js library
  - GPU-accelerated rendering with WebGL
  - Responsive particle count (mobile vs desktop)
  - Smooth color transitions

### AmbientSound.vue
- **Purpose**: Generates ambient music based on sentiment
- **Responsibilities**:
  - Initializes Tone.js audio context
  - Generates ambient music with reverb and delay effects
  - Manages volume control
  - Handles browser audio policy (requires user interaction)
- **Key Features**:
  - Lazy loading of Tone.js library
  - Musical scale changes based on sentiment:
    - Negative (-1 to -0.5): C minor, low tones
    - Neutral-negative (-0.5 to 0): Eb major, ambient
    - Neutral-positive (0 to 0.5): F major, flowing
    - Positive (0.5 to 1): C major, uplifting
  - Smooth volume transitions

### SentimentMeter.vue
- **Purpose**: Displays current sentiment score
- **Responsibilities**:
  - Visual representation of sentiment score
  - Shows loading and error states
  - Provides retry functionality
  - Displays fallback indicator when using demo data
- **Key Features**:
  - Color-coded meter bar
  - Smooth animations
  - Responsive design

### InfoDialog.vue
- **Purpose**: Modal dialog with project information
- **Responsibilities**:
  - Displays project description and features
  - Explains how the system works
  - Shows data sources
- **Key Features**:
  - Responsive design
  - Smooth animations
  - Accessible modal dialog

## State Management

### useSentiment.ts Composable
- **Purpose**: Manages sentiment data fetching and state
- **Responsibilities**:
  - Fetches sentiment data from API
  - Manages sentiment score state
  - Handles API fetching with error handling
  - Implements smooth score transitions using requestAnimationFrame
  - Polls API every 30 seconds
  - Provides fallback data when API unavailable
- **Key Features**:
  - Smooth animated transitions between scores
  - Automatic fallback to time-based data
  - Error handling with user-friendly messages
  - Lifecycle management (start/stop polling)

## API Architecture

### Server API Routes (`server/api/`)

#### advanced-sentiment.ts
- **Purpose**: Main sentiment analysis endpoint
- **Responsibilities**:
  - Fetches news articles from GDELT API
  - Analyzes sentiment from multiple sources
  - Calculates weighted average sentiment
  - Handles caching (30 seconds)
  - Provides fallback data
- **Key Features**:
  - Dynamic date range (last 24 hours)
  - Focused query terms (politics, technology, society)
  - Normalized sentiment scores (-1 to 1)
  - Weighted average based on article count
  - Error handling and logging

#### Server Routes (`server/routes/`)
- **manifest.json.ts**: Dynamic PWA manifest generation
- **robots.txt.ts**: Dynamic robots.txt generation
- **sitemap.xml.ts**: Dynamic sitemap.xml generation

**Note**: Server API routes only work with SSR or serverless platforms, not static hosting.

## Data Flow

1. **Initialization**:
   - Component mounts → `useSentiment` composable initializes
   - Fetches initial sentiment data
   - Starts polling every 30 seconds

2. **Sentiment Update**:
   - API returns sentiment score
   - Score animates smoothly to new value
   - VisualLayer updates particle colors
   - AmbientSound updates music scale
   - SentimentMeter updates display

3. **Error Handling**:
   - API fails → Fallback to time-based data
   - Error state displayed in UI
   - Retry functionality available

## Performance Optimizations

- **Code splitting**: Automatic with Nuxt
- **Lazy loading**: Three.js and Tone.js loaded on demand
- **Particle optimization**: 1000 particles on mobile, 2000 on desktop
- **Throttled events**: Mouse and resize handlers throttled
- **Service worker**: Caching for offline functionality
- **Image optimization**: Optimized assets in public folder
- **Bundle size**: ~700KB (gzipped)

## Project Structure

```
EmotionWave/
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD workflow
│
├── .cursor/
│   └── rules/                  # Cursor AI rules
│
├── assets/
│   ├── css/
│   │   └── main.css           # Global styles
│   └── visuals/               # Visual assets
│
├── components/
│   ├── VisualLayer.vue        # Three.js particle system
│   ├── SentimentMeter.vue     # UI component for score display
│   ├── AmbientSound.vue       # Tone.js audio system
│   └── InfoDialog.vue         # Information dialog
│
├── composables/
│   └── useSentiment.ts        # Sentiment data fetching and state management
│
├── pages/
│   └── index.vue              # Main application view
│
├── public/
│   ├── manifest.json          # PWA manifest (generated)
│   ├── sw.js                  # Service worker
│   ├── favicon.ico            # Site favicon
│   └── apple-touch-icon.png   # iOS app icon
│
├── server/
│   ├── api/
│   │   ├── advanced-sentiment.ts  # Main sentiment analysis endpoint
│   │   ├── sentiment.ts           # Alternative sentiment endpoint
│   │   └── reddit-sentiment.ts    # Reddit-based sentiment (unused)
│   └── routes/
│       ├── manifest.json.ts   # Dynamic manifest generation
│       ├── robots.txt.ts       # Dynamic robots.txt generation
│       └── sitemap.xml.ts      # Dynamic sitemap.xml generation
│
├── app.vue                    # Root component (service worker registration)
├── nuxt.config.ts             # Nuxt configuration
├── tailwind.config.js         # TailwindCSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Technology Stack

- **Framework**: Nuxt 3.20.2 + Vite
- **UI**: TailwindCSS 4.1.17
- **Visuals**: Three.js 0.181.2 (lazy loaded)
- **Audio**: Tone.js 15.1.22 (lazy loaded)
- **Data**: GDELT API for news sentiment
- **PWA**: Service Worker for offline functionality
- **TypeScript**: Full type safety throughout

## Design Patterns

- **Composition API**: All components use `<script setup>`
- **Composables**: Reusable logic in composables directory
- **Server Routes**: Dynamic file generation for SEO/PWA
- **Error Boundaries**: Graceful fallback handling
- **Lazy Loading**: Heavy dependencies loaded on demand
- **Service Worker**: Offline-first caching strategy

