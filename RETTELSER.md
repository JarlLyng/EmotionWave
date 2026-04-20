# RETTELSER — EmotionWave

Fejl og mangler fundet ved gennemgang af koden 2026-04-15.

---

## 1. Duplikeret WebApplication JSON-LD

`nuxt.config.ts` tilføjer WebApplication JSON-LD globalt (linje 122-139), OG `pages/index.vue` tilføjer endnu en WebApplication JSON-LD (linje 33-58). Resultatet er to identiske schema-blokke på homepage. Fjern den ene — behold den i `nuxt.config.ts` da den er mere komplet (har `featureList`), og fjern den i `index.vue`.

---

## 2. Ingen FAQPage JSON-LD

SEO-strategien foreslår FAQPage JSON-LD med 8 spørgsmål, men ingen er implementeret i koden. InfoDialog har FAQ-lignende indhold ("How it works", "Visual elements", "Data sources"), men det er i en klient-side modal — ikke crawlbar.

---

## 3. Ingen cross-linking til IAMJARL-projekter

Ingen sider linker til andre IAMJARL-projekter. InfoDialog footer siger kun "Built with Nuxt 3, Three.js and Tone.js" uden links. BeerTuner og andre projekter linker allerede TIL EmotionWave, men EmotionWave linker ikke tilbage.

---

## 4. Ingen llms.txt

Projektet har ingen `llms.txt` til AI-indeksering. Opret som server route eller statisk fil i `public/`.

---

## 5. robots.txt nævner ikke AI-bots

`server/routes/robots.txt.ts` genererer en minimal robots.txt uden eksplicitte AI-bot regler. Tilføj Allow-regler for ChatGPT-User, Claude-SearchBot, PerplexityBot, Applebot, Google-Extended.

---

## 6. Sitemap har kun 1 URL

`server/routes/sitemap.xml.ts` genererer kun én URL (`/`). Det er korrekt for den nuværende single-page app, men når/hvis content pages tilføjes, skal sitemap udvides.

---

## 7. InfoDialog-indhold er ikke crawlbart

Al "About"-information (How it works, Visual elements, Data sources) er inde i en klient-side modal (`InfoDialog.vue`). Søgemaskiner og AI-crawlere kan ikke se dette indhold. Overvej at tilføje en crawlbar `/about`-side eller inkludere nøgleindhold direkte i page HTML.
