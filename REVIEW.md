# Code review — EmotionWave

## Kritiske fund
- **API matcher ikke beskrivelsen** (`server/api/advanced-sentiment.ts:9-170`): `HfInference` initialiseres med `HUGGINGFACE_API_KEY`, men HuggingFace anvendes aldrig. Vi bruger kun GDELTs `sentiment/tone` værdier (ofte udenfor [-1,1]) og startdatoen er hårdt sat til 20240601, så data kan være måneder gamle og misvisende. Justér til en dynamisk tidsperiode (fx seneste 24h), clamp/normalisér værdier, og brug HuggingFace på artikeltekst (eller fjern afhængigheden/secret helt).
- **Base paths og assets er låst til `/EmotionWave/`** (`nuxt.config.ts:24-48`, `public/manifest.json`, `public/sw.js`): Alle ikoner/manifest/OG-links bruger hardkodet path, hvilket giver 404 i lokale builds og andre produktionsmiljøer end GitHub Pages. `og:image` peger desuden på en fil der ikke findes. Hent base fra runtime-config (`app.baseURL`), generér URLs med `joinURL`/`new URL`, og tilføj eller fjern den manglende OG-billede-reference.
- **Offline/PWA dækker ikke bundle-filer** (`public/sw.js:1-46`): Service worker cacher kun index + ikoner og fanger ikke `_nuxt` assets, så offline-mode og “PWA” løfterne i README stemmer ikke. Brug Nuxt/Vite PWA plugin eller en pre-cache liste med hashed assets + runtime caching-strategi pr. asset-type.
- **Fejl skjules og URL-join er skrøbelig** (`composables/useSentiment.ts:55-106`): Ethvert fetch-fejlscenario nulstilles til pseudo-tilfældige data uden at informere brugeren (`error` bliver altid `null`). Samtidig kan `.replace(/\/+/g, '/')` ødelægge absolutte base-URL’er (`https://` → `https:/`). Vis tydeligt når fallback-data bruges, bevar fejltekst til UI’et og byg API-URL med `joinURL`/`new URL` i stedet for regex.
- **Secret-hygiejne** (`.env`): Der ligger en fuld HuggingFace API-nøgle i `.env`. Selvom filen ignoreres, er der lækagerisiko via commit/logs. Roter nøglen og brug kun eksempelværdier i repoet.

## Vedligeholdelses- og kvalitetsfund
- **SEO-filer peger på andet domæne** (`public/robots.txt`, `public/sitemap.xml`, `nuxt.config.ts:39`): Filerne bruger `emotionwave.dk`, mens README peger på GitHub Pages. Det giver forkerte sitemap-links og social previews. Generér disse værdier fra den aktuelle `siteUrl` konfig.
- **Data- og fejlkvalitet** (`server/api/advanced-sentiment.ts:135-172`): GDELT-værdier clamped ikke til [-1,1], og gennemsnittet vægter alle kilder ens uanset artikelantal. Tilføj validering, vægt efter artikelcount og log/returnér hvilke kilder der faktisk indgår.
- **Ubrugte/beskrevne afhængigheder** (`package.json`): `@huggingface/inference`, `cheerio`, `@vueuse/motion` m.fl. er ikke i brug. Det forlænger install/build og øger angrebsflade. Fjern dem eller implementér det tilsigtede brug.
- **Typer og ressourcer** (`composables/useSentiment.ts:28`, `components/VisualLayer.vue`): `NodeJS.Timeout` i browserkode og brede `any`-typer gør lint/IDE svagere. Brug browser-typer (`number`, `THREE.Scene` osv.) for bedre tooling og færre runtime-overraskelser.

## Forslag til næste skridt
1) Afklar deployments (GitHub Pages vs. custom domæne) og gør base-URL, manifest, meta-tags og service worker konfigurerbare.  
2) Beslut om HuggingFace skal bruges rigtigt; implementér tekstanalyse eller drop secret + afhængighed.  
3) Indfør synlig fejlhåndtering/fallback-indikator i UI’et og test både online/offline flows.  
4) Ryd op i ubrugte pakker, stram typerne og overvej et par basale tests (fx enhedstest af `useSentiment` og integrationstest af API’et med mockede svar).
