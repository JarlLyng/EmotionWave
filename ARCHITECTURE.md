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

### HeadlineRotator.vue
- **Purpose**: Displays rotating article headlines from sentiment analysis
- **Responsibilities**:
  - Shows article titles centered on screen
  - Rotates headlines every 5 seconds
  - Filters articles with valid titles
  - Manages smooth fade transitions between headlines
- **Key Features**:
  - Centered display with responsive text sizing
  - Smooth opacity transitions (500ms fade)
  - Random initial headline selection
  - Non-blocking overlay (pointer-events-none)
  - Only displays when articles are available

## State Management

### useSentiment.ts Composable
- **Purpose**: Manages sentiment data fetching and state
- **Responsibilities**:
  - Fetches sentiment data from API
  - Manages sentiment score state
  - Stores article headlines for display
  - Handles API fetching with error handling
  - Implements smooth score transitions using requestAnimationFrame
  - Polls API every 30 seconds
  - Provides fallback data when API unavailable
- **Key Features**:
  - Smooth animated transitions between scores
  - Automatic fallback to time-based data
  - Error handling with user-friendly messages
  - Lifecycle management (start/stop polling)
  - Falls back to client-side GDELT API when server API unavailable
  - Stores articles array with titles, URLs, sources, and sentiment

### useGDELT.ts Composable
- **Purpose**: Client-side GDELT API integration for static hosting
- **Responsibilities**:
  - Fetches sentiment data directly from GDELT API (client-side)
  - Works on static hosting (GitHub Pages) where server API routes are unavailable
  - Handles GDELT API response parsing and normalization
  - Provides dynamic fallback data based on time if API fails
- **Key Features**:
  - Direct client-side API calls to GDELT
  - Dynamic date range queries (last 24 hours)
  - Focused queries (filters out sports, entertainment, etc.)
  - Sentiment normalization to [-1, 1] range
  - Weighted average calculation across sources
  - Automatic retry with simpler query if complex query fails
  - Time-based fallback data when API unavailable
- **Used by**: `useSentiment.ts` as fallback when server API is unavailable

## API Architecture

### Server API Routes (`server/api/`)

#### advanced-sentiment.ts
- **Purpose**: Multi-source sentiment analysis endpoint
- **Responsibilities**:
  - Aggregates sentiment from multiple news sources:
    - **GDELT API**: Primary source for global news sentiment
    - **NewsAPI**: Additional news sources (optional, requires API key)
      - Uses HuggingFace Inference API for advanced sentiment analysis (optional)
      - Falls back to keyword-based sentiment if HuggingFace unavailable
    - **Reddit**: Social media sentiment (optional, lower weight)
  - Calculates weighted average sentiment across all sources
  - Handles caching (30 seconds)
  - Provides fallback data when APIs unavailable
- **Key Features**:
  - **Multi-source aggregation**: Combines data from multiple APIs for better accuracy
  - **HuggingFace integration**: Optional advanced sentiment analysis via Inference API
    - Strategically used on top 10 articles only (prevents timeouts, maintains accuracy)
    - Remaining articles use fast keyword-based analysis
  - **Keyword-based fallback**: Enhanced keyword analysis with weighted scoring when APIs don't provide explicit sentiment
  - **Reddit integration**: Social media sentiment with full weight (removed 0.5x reduction)
  - **Data filtering**: Filters out articles with exactly 0 sentiment (missing data) for better accuracy
  - **Retry logic**: Exponential backoff for failed API calls (3 retries)
  - **Dynamic date range**: Last 24 hours of news
  - **Focused queries**: Filters out noise (sports, entertainment, etc.)
  - **Normalized scores**: All sentiment values normalized to [-1, 1]
  - **Weighted averages**: Articles weighted by valid (non-zero) article count per source
  - **Article return**: Returns up to 50 articles with titles, URLs, sources, and sentiment for display
  - **Graceful degradation**: Works even if some APIs fail
  - **Error handling**: Comprehensive error handling and logging

#### Server Routes (`server/routes/`)
- **manifest.json.ts**: Dynamic PWA manifest generation with correct baseURL and icon paths
- **robots.txt.ts**: Dynamic robots.txt generation with sitemap reference
- **sitemap.xml.ts**: Dynamic sitemap.xml generation with current date

**Note**: Server API routes only work with SSR or serverless platforms, not static hosting.

### SEO Architecture

#### Meta Tags & Structured Data
- **Location**: `nuxt.config.ts` (head configuration) and `pages/index.vue` (structured data)
- **Open Graph tags**: Complete OG tags for social sharing (title, description, image, URL)
- **Twitter Cards**: Summary large image cards for Twitter sharing
- **Structured Data**: JSON-LD schema.org WebApplication markup for rich snippets
- **Canonical URLs**: Proper canonical links to prevent duplicate content
- **Language tags**: HTML lang attribute for proper language detection

#### SEO Files
- **sitemap.xml**: Dynamically generated with current date
- **robots.txt**: Dynamically generated with sitemap reference
- **Favicons**: Complete favicon set (favicon.ico, apple-touch-icon-180x180.png, android-chrome icons)

## Data Flow

1. **Initialization**:
   - Component mounts → `useSentiment` composable initializes
   - Fetches initial sentiment data
   - Starts polling every 30 seconds

2. **Sentiment Update**:
   - API returns sentiment score and articles array
   - Score animates smoothly to new value
   - VisualLayer updates particle colors
   - AmbientSound updates music scale
   - SentimentMeter updates display
   - HeadlineRotator displays article headlines (rotates every 5 seconds)

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
│   ├── HeadlineRotator.vue    # Rotating article headlines display
│   └── InfoDialog.vue         # Information dialog
│
├── composables/
│   ├── useSentiment.ts        # Sentiment data fetching and state management
│   └── useGDELT.ts            # Client-side GDELT API integration
│
├── pages/
│   └── index.vue              # Main application view
│
├── public/
│   ├── sw.js                  # Service worker
│   ├── favicon.ico            # Site favicon (16x16, 32x32)
│   ├── apple-touch-icon-180x180.png  # iOS app icon
│   ├── android-chrome-192x192.png    # PWA icon (Android)
│   ├── android-chrome-512x512.png    # PWA splash screen
│   ├── favicon-*.png          # Additional favicon sizes
│   └── og-image.png           # Open Graph image (1200x630)
│
├── server/
│   ├── api/
│   │   └── advanced-sentiment.ts  # Multi-source sentiment analysis endpoint
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

- **Framework**: Nuxt 3.21.0 + Vite
- **UI**: TailwindCSS 4.1.18
- **Visuals**: Three.js 0.182.0 (lazy loaded)
- **Audio**: Tone.js 15.1.22 (lazy loaded)
- **Data**: Multi-source sentiment analysis (GDELT API, NewsAPI, Reddit)
- **PWA**: Service Worker for offline functionality
- **TypeScript**: Full type safety throughout

## Design Patterns

- **Composition API**: All components use `<script setup>`
- **Composables**: Reusable logic in composables directory
- **Server Routes**: Dynamic file generation for SEO/PWA
- **Error Boundaries**: Graceful fallback handling
- **Lazy Loading**: Heavy dependencies loaded on demand
- **Service Worker**: Offline-first caching strategy

