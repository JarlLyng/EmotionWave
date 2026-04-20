# SEO & GEO Strategy — EmotionWave

Site: https://emotionwave.iamjarl.com  
Stack: Nuxt 3 (SSR) + Vercel  
GitHub: https://github.com/jarllyng/EmotionWave  
Google Search Console: Connected  
Umami Analytics: Connected  
Last updated: 2026-04-15

---

## 1. Product positioning

EmotionWave er en real-time interaktiv data-kunstinstallation: visualiserer global sentiment fra nyheder og social media som particle systems (Three.js) og generativ ambient lyd (Tone.js). Data fra GDELT, NewsAPI og Reddit. PWA med offline support. Open source. Gratis.

SEO positioning: **levende data-kunst der reagerer på verdens humør** — differentierer fra statiske datavisualiseringer og analytics-tools via kunst-vinkel, cross-sensory oplevelse (visuel + audio) og real-time sentiment. Konkurrerer med generativ kunst, creative coding showcases og interaktive web-eksperimenter.

---

## 2. Hvad der allerede er på plads

### Technical SEO (done)

- [x] SSR via Nuxt 3 på Vercel
- [x] WebApplication JSON-LD på homepage (via `nuxt.config.ts` — price: 0, korrekt for gratis, har `featureList`)
- [x] OG tags + Twitter cards (nuxt.config.ts — title, description, image, type, locale)
- [x] Canonical URL
- [x] Dynamisk `sitemap.xml` (server route, 1 URL)
- [x] Dynamisk `robots.txt` (server route, tillader alt)
- [x] Umami analytics
- [x] `og-image.png` (1200x630)
- [x] PWA med service worker (`public/sw.js`)
- [x] Favicon-set til alle platforme (ICO, PNG 16-512px, Apple Touch Icon)
- [x] `manifest.json`
- [x] Google Search Console connected
- [x] `lang="en"` på HTML

### Indhold (done — men begrænset)

- [x] Immersiv single-page oplevelse (index.vue)
- [x] InfoDialog med "About EmotionWave" (How it works, Visual elements, Data sources)
- [x] HeadlineRotator viser live nyhedsoverskrifter
- [x] SentimentMeter med real-time score

### Mangler (not done)

- [ ] FAQPage JSON-LD (foreslået i gammel strategi men aldrig implementeret)
- [ ] Cross-linking til IAMJARL-projekter (ingen footer-links)
- [ ] llms.txt til AI-indeksering
- [ ] AI-bot regler i robots.txt
- [ ] Crawlbart indhold (InfoDialog er klient-side modal, usynlig for crawlere)
- [ ] CreativeWork JSON-LD (mere passende end WebApplication for et kunst-projekt)
- [ ] Duplikeret WebApplication JSON-LD i index.vue (se RETTELSER.md)

---

## 3. DU SKAL: Ret fejl i koden

Se `RETTELSER.md` i projektets rod. Opsummering:

1. **Duplikeret WebApplication JSON-LD** → Fjern den i `index.vue`, behold den i `nuxt.config.ts`
2. **FAQPage JSON-LD** → Implementer med 5-8 spørgsmål baseret på InfoDialog-indhold
3. **Cross-linking** → Tilføj diskret footer eller "More by IAMJARL" sektion med links
4. **llms.txt** → Opret i `public/` eller som server route
5. **robots.txt AI-bots** → Tilføj eksplicitte Allow-regler
6. **Crawlbart indhold** → Gør InfoDialog-tekst tilgængeligt som statisk HTML (under fold, `/about`-route, eller begge)
7. **CreativeWork schema** → Tilføj som sekundær JSON-LD (mere passende for kunst end WebApplication alene)

---

## 4. Keyword-strategi

### Tier 1 — Generativ kunst / data visualization

- generative art
- data visualization art
- real-time sentiment visualization
- interactive data art
- creative coding
- three.js art

### Tier 2 — Teknisk / specifik

- generative audio web
- tone.js ambient music
- three.js particle system
- sentiment analysis visualization
- GDELT sentiment
- web-based art installation

### Tier 3 — Long-tail / discovery

- how to visualize sentiment data
- generative art using real-time data
- internet mood tracker
- what does the world feel right now
- real-time news sentiment art
- living data art

### Tier 4 — Portfolio / community

- creative coding portfolio
- open source generative art
- three.js portfolio projects
- nuxt creative projects
- data-driven art examples

---

## 5. GEO — Generative Engine Optimization

### Hvad der er på plads

- WebApplication JSON-LD med featureList (god for AI-ekstraktion)
- SSR giver fuld HTML til crawlere
- OG tags med beskrivende tekst

### DU SKAL: Tilføj llms.txt

Opret `public/llms.txt` med:

```
# EmotionWave

> A living website that reacts to the world's mood

EmotionWave is a real-time interactive data art installation. It visualizes global sentiment from news and social media as dynamic particle systems and generative ambient sound.

## How it works
1. Sentiment data ingested from GDELT (global events), NewsAPI (headlines), and Reddit (community sentiment)
2. Each data point scored: positive, negative, or neutral
3. Three.js particle system interprets sentiment as motion, density, and color
4. Tone.js generates ambient music synchronized to the mood
5. Live news headlines displayed on screen

## Visual mapping
- Positive sentiment: bright, ascending particles, C major / F major audio
- Negative sentiment: dark, descending particles, C minor audio
- Sentiment intensity affects particle density and speed

## Technical
- Built with Nuxt 3, Three.js, Tone.js
- Server-side rendered on Vercel
- 1000-2000 particles at 60fps
- Progressive Web App with offline support
- Open source on GitHub

## Links
- Website: https://emotionwave.iamjarl.com
- Developer: https://iamjarl.com
```

### DU SKAL: Gør indhold crawlbart

InfoDialog-indholdet er usynligt for søgemaskiner. Tilføj crawlbar version:

**Option A:** Tilføj hidden-but-crawlable sektion i `index.vue` (ligesom BeerTuner's SEO content section below the fold)

**Option B:** Opret `/about` route med fuld tekst + FAQPage JSON-LD

Option A er bedst for EmotionWave's immersive design — undgå at bryde oplevelsen.

### DU SKAL: Tilføj FAQPage JSON-LD

Implementer med disse spørgsmål (baseret på InfoDialog-indhold):

1. "What is EmotionWave?" — Real-time interactive art that visualizes global sentiment
2. "What data sources does EmotionWave use?" — GDELT, NewsAPI, Reddit
3. "How does sentiment become visualization?" — Three.js particle system maps sentiment to color, motion, density
4. "Is there sound?" — Yes, Tone.js generative ambient music synchronized to mood
5. "Can I see what headlines drive the mood?" — Yes, live headlines displayed on screen
6. "Is EmotionWave free?" — Yes, completely free, no account needed
7. "Is the code open source?" — Yes, available on GitHub

### Target queries for AI-citation

- "Best generative art websites" → homepage
- "Real-time sentiment visualization" → homepage
- "Interactive data art examples" → homepage
- "Three.js art projects" → homepage / llms.txt
- "How does the internet feel right now" → homepage

---

## 6. Cross-linking

### Fra EmotionWave til andre IAMJARL-projekter

Tilføj en diskret "More by IAMJARL" sektion. Kan være:
- Fast-positioneret footer-bar (semi-transparent, matches dark aesthetic)
- Link i InfoDialog footer
- Begge

Links:

- [iamjarl.com](https://iamjarl.com) — portfolio
- [BeerTuner](https://beertuner.iamjarl.com) — music rating (music cluster)
- [Running from Horses](https://runningfromhorses.com) — music project (music cluster)
- [It's mono, yo!](https://itsmonoyo.iamjarl.com) — audio tools (music cluster)
- [Made by Human](https://madebyhuman.iamjarl.com) — IAMJARL brand

### Music project cluster

EmotionWave, BeerTuner, Running from Horses og It's mono, yo! udgør en "music cluster" inden for IAMJARL. BeerTuner linker allerede til EmotionWave — EmotionWave bør linke tilbage.

### Fra andre projekter til EmotionWave

Disse sites linker allerede til EmotionWave:

- BeerTuner (footer) ✓

Disse bør tilføje links:

- iamjarl.com — Projects-sektion
- runningfromhorses.com — cross-promotion
- madebyhuman.iamjarl.com — featured project

---

## 7. DU SKAL: Tilføj CreativeWork JSON-LD

WebApplication er korrekt men utilstrækkeligt for et kunst-projekt. Tilføj CreativeWork som sekundær schema:

```json
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "EmotionWave",
  "description": "A real-time interactive data art installation that visualizes global news sentiment as dynamic particle systems and generative ambient audio.",
  "url": "https://emotionwave.iamjarl.com",
  "author": {
    "@type": "Person",
    "name": "Jarl Lyng",
    "url": "https://iamjarl.com"
  },
  "genre": ["Generative Art", "Data Visualization", "Interactive Installation"],
  "image": "https://emotionwave.iamjarl.com/og-image.png",
  "dateCreated": "2025-01-01",
  "inLanguage": "en",
  "license": "https://opensource.org/licenses/MIT",
  "isAccessibleForFree": true
}
```

---

## 8. Where to make noise

### Reddit

- **r/dataisbeautiful** (~900k) — "I visualized the internet's mood in real time using GDELT, NewsAPI, and Reddit sentiment"
- **r/InternetIsBeautiful** (~17M) — "Watch the internet's mood shift moment to moment through particles and sound"
- **r/generativeart** (~100k) — "Real-time sentiment data visualization with Three.js + Tone.js. Open source."
- **r/creativecoding** (~150k) — creative coding approach, link GitHub
- **r/webdev** (~1M) — PWA + Three.js + SSR performance angle
- **r/threejs** (~50k) — "Rendering 1000+ sentiment-driven particles at 60fps"

### Andre kanaler

- **Hacker News** — Show HN: EmotionWave — See the internet's mood in real time
- **Product Hunt** — "The internet's mood, visualized" (Art & Design category)
- **Indie Hackers** — creative code journey
- **Awwwards** — submit som design/code showcase
- **Creative coding communities** — Slack/Discord channels for #generative-art, #threejs

---

## 9. Monitoring

- **Google Search Console**: Ugentlig — impressions, clicks, crawl errors
- **Umami Analytics**: Sidevisninger, referral sources, session duration (vigtigt for immersiv oplevelse)
- **Nøgletal**: Organisk trafik, session varighed, bounce rate, GitHub stars/forks
