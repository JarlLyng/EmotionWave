<template>
  <main class="about-page min-h-screen bg-black text-white">
    <article class="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <!-- Back link -->
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-12"
      >
        <span aria-hidden="true">←</span> Back to the experience
      </NuxtLink>

      <!-- Header -->
      <header class="mb-16">
        <h1 class="text-4xl md:text-5xl font-light tracking-tight mb-4">
          About EmotionWave
        </h1>
        <p class="text-white/60 text-xl font-light">
          A living artwork that reflects the world's mood in real time.
        </p>
      </header>

      <!-- Concept -->
      <section class="mb-14">
        <h2 class="text-2xl font-light mb-4">The concept</h2>
        <p class="text-white/70 leading-relaxed mb-4">
          EmotionWave is a data-driven artwork. It continuously reads the
          sentiment of global news and renders it as colour, motion and
          sound — so you can <em>feel</em> how the world feels right now,
          rather than read about it. A calmer world drifts toward cool blues
          and gentle major chords; a tense world darkens and turns minor.
        </p>
        <p class="text-white/70 leading-relaxed">
          The piece never stops moving. The sentiment score is re-measured
          every 30 seconds and the visuals and audio lerp smoothly toward the
          new mood, so the transition itself becomes part of the work.
        </p>
      </section>

      <!-- How it works -->
      <section class="mb-14">
        <h2 class="text-2xl font-light mb-4">How it works</h2>
        <p class="text-white/70 leading-relaxed mb-4">
          A single sentiment value, ranging from <strong class="text-white/90">−1
          (negative)</strong> to <strong class="text-white/90">+1 (positive)</strong>,
          drives everything on screen:
        </p>
        <ul class="space-y-3 text-white/70 leading-relaxed list-none">
          <li>
            <strong class="text-white/90">Particle system</strong> — 1,000–2,000
            GPU-rendered particles shift colour and movement with the mood and
            respond to your mouse.
          </li>
          <li>
            <strong class="text-white/90">Ambient sound</strong> — generative
            music built with Tone.js moves between minor and major scales as the
            sentiment changes.
          </li>
          <li>
            <strong class="text-white/90">Sentiment meter</strong> — a simple
            readout of where the world currently sits on the negative-to-positive
            axis.
          </li>
        </ul>
      </section>

      <!-- Methodology -->
      <section class="mb-14">
        <h2 class="text-2xl font-light mb-4">Methodology</h2>
        <p class="text-white/70 leading-relaxed mb-4">
          EmotionWave aggregates headlines from several sources, scores each
          one, and combines them into a single global reading:
        </p>
        <ol class="space-y-3 text-white/70 leading-relaxed list-decimal pl-5">
          <li>
            <strong class="text-white/90">Collection</strong> — headlines are
            pulled from the GDELT project, and optionally NewsAPI and Reddit,
            covering the last 24 hours.
          </li>
          <li>
            <strong class="text-white/90">Scoring</strong> — the most relevant
            headlines are analysed with a Hugging Face transformer model for
            sentiment; the rest fall back to a fast keyword-based score. This
            balances accuracy against latency.
          </li>
          <li>
            <strong class="text-white/90">Aggregation</strong> — scores are
            combined with an intensity weighting, so strong emotional signals
            count for more than neutral ones, and the result is normalised to
            the −1…+1 range.
          </li>
          <li>
            <strong class="text-white/90">Resilience</strong> — if a source or
            model is unavailable, EmotionWave degrades gracefully and falls back
            to dynamic data, so the artwork always runs.
          </li>
        </ol>
      </section>

      <!-- Data sources -->
      <section class="mb-14">
        <h2 class="text-2xl font-light mb-4">Data sources</h2>
        <p class="text-white/70 leading-relaxed">
          The primary source is the <strong class="text-white/90">GDELT API</strong>,
          which indexes millions of news articles worldwide. EmotionWave can also
          aggregate <strong class="text-white/90">NewsAPI</strong> and
          <strong class="text-white/90">Reddit</strong> for a broader view of
          global mood. Sentiment is understood through natural-language analysis
          of the headlines, not simple keyword matching.
        </p>
      </section>

      <!-- FAQ -->
      <section class="mb-14">
        <h2 class="text-2xl font-light mb-6">Frequently asked questions</h2>
        <div class="space-y-8">
          <div v-for="faq in faqs" :key="faq.question">
            <h3 class="text-lg text-white/90 font-normal mb-2">{{ faq.question }}</h3>
            <p class="text-white/70 leading-relaxed">{{ faq.answer }}</p>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="border-t border-white/10 pt-8">
        <p class="text-white/30 text-sm mb-4">
          Built with Nuxt 4, Three.js and Tone.js.
        </p>
        <p class="text-white/40 text-xs mb-2 font-light">More from IAMJARL</p>
        <nav class="flex flex-wrap gap-2 text-xs">
          <a href="https://runningfromhorses.com" target="_blank" rel="noopener noreferrer" class="text-white/50 hover:text-white/70 transition-colors">Running from Horses</a>
          <span class="text-white/20">•</span>
          <a href="https://beertuner.iamjarl.com" target="_blank" rel="noopener noreferrer" class="text-white/50 hover:text-white/70 transition-colors">BeerTuner</a>
          <span class="text-white/20">•</span>
          <a href="https://madebyhuman.iamjarl.com" target="_blank" rel="noopener noreferrer" class="text-white/50 hover:text-white/70 transition-colors">Made by Human</a>
          <span class="text-white/20">•</span>
          <a href="https://iamjarl.com" target="_blank" rel="noopener noreferrer" class="text-white/50 hover:text-white/70 transition-colors">All projects</a>
        </nav>
      </footer>
    </article>
  </main>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const siteUrl = (config.public?.siteUrl as string) || 'https://emotionwave.iamjarl.com'
const baseUrl = siteUrl.replace(/\/$/, '')
const pageUrl = `${baseUrl}/about`

// Visible FAQ content — kept identical to the FAQPage structured data below,
// as required for rich results.
const faqs = [
  {
    question: 'What is EmotionWave?',
    answer:
      'EmotionWave is a real-time data artwork that visualizes the mood of global news as colour, motion and ambient sound. It turns sentiment analysis of headlines into an immersive audiovisual experience.',
  },
  {
    question: "How is the world's mood measured?",
    answer:
      'Headlines from the last 24 hours are scored for sentiment — the most relevant ones with a Hugging Face transformer model, the rest with fast keyword analysis. The scores are combined with an intensity weighting and normalised to a single value from −1 (negative) to +1 (positive).',
  },
  {
    question: 'Where does the data come from?',
    answer:
      'The primary source is the GDELT project, which indexes news worldwide. EmotionWave can also aggregate NewsAPI and Reddit for a broader picture of global sentiment.',
  },
  {
    question: 'How often does it update?',
    answer:
      'The sentiment reading is refreshed every 30 seconds, and the visuals and audio transition smoothly toward each new value.',
  },
  {
    question: 'Does EmotionWave collect my data?',
    answer:
      'No personal data is collected. EmotionWave only reads public news sentiment; nothing about you is tracked or stored.',
  },
  {
    question: 'Can I install it or use it on mobile?',
    answer:
      'Yes. EmotionWave is a Progressive Web App, so it works in any modern browser and can be installed on mobile devices for a fullscreen experience.',
  },
]

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

const aboutStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About EmotionWave',
  url: pageUrl,
  description:
    "How EmotionWave works: the concept, methodology and data sources behind the real-time artwork that visualizes the world's mood.",
  isPartOf: {
    '@type': 'WebSite',
    name: 'EmotionWave',
    url: baseUrl,
  },
}

const description =
  "How EmotionWave works — the concept, methodology, data sources and FAQ behind the real-time artwork that turns global news sentiment into generative visuals and ambient sound."

useHead({
  title: 'About EmotionWave — How the world-mood artwork works',
  link: [{ rel: 'canonical', href: pageUrl }],
  meta: [
    { name: 'description', content: description },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: 'About EmotionWave' },
    { property: 'og:description', content: description },
    { property: 'og:url', content: pageUrl },
    { property: 'og:image', content: `${baseUrl}/og-image.png` },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'About EmotionWave' },
    { name: 'twitter:description', content: description },
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(faqStructuredData) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(aboutStructuredData) },
  ],
})
</script>
