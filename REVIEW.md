# Code review — EmotionWave

## Status: ✅ De fleste kritiske problemer er løst

---

## Kritiske fund

### ✅ LØST: API matcher ikke beskrivelsen
**Status**: Delvist løst
- ✅ Dynamisk tidsperiode implementeret (seneste 24 timer)
- ✅ Sentiment-værdier normaliseres til [-1, 1] med `normalizeSentiment()`
- ✅ Vægtet gennemsnit baseret på artikelantal implementeret
- ⚠️ **ÅBENT**: HuggingFace integration er ikke implementeret. Pakken er fjernet fra `package.json`, men kommentarer i koden nævner den stadig. Enten implementer HuggingFace på artikeltekst eller fjern alle referencer.

### ✅ LØST: Base paths og assets er låst til `/EmotionWave/`
**Status**: Løst
- ✅ Alle paths er nu dynamiske baseret på `app.baseURL` fra runtime config
- ✅ Manifest.json, ikoner og service worker bruger dynamiske paths
- ✅ `og:image` meta tag er fjernet (filen eksisterede ikke)
- ✅ Fungerer både lokalt og på GitHub Pages

### ⚠️ DELVIS LØST: Offline/PWA dækker ikke bundle-filer
**Status**: Forbedret, men kan optimeres
- ✅ Service worker forsøger at cache `_nuxt` assets dynamisk
- ⚠️ **FORBEDRING**: Overvej at bruge Nuxt PWA plugin eller en mere robust pre-cache strategi med hashed assets

### ✅ LØST: Fejl skjules og URL-join er skrøbelig
**Status**: Løst
- ✅ API-URL bruger nu `new URL()` constructor i stedet for regex
- ✅ Fallback-data vises tydeligt i UI (brugeren ser når demo-data bruges)
- ✅ Fejlbeskeder vises korrekt i `SentimentMeter` komponenten

### ✅ LØST: Secret-hygiejne
**Status**: Løst
- ✅ `.env` er i `.gitignore` og bliver ikke committet
- ✅ `.env.example` er oprettet med placeholder-værdier
- ✅ README opdateret med sikkerhedsnoter om API key rotation

---

## Vedligeholdelses- og kvalitetsfund

### ⚠️ DELVIS LØST: SEO-filer peger på andet domæne
**Status**: Opdateret, men ikke helt dynamisk
- ✅ `robots.txt` og `sitemap.xml` er opdateret til GitHub Pages URL
- ⚠️ **FORBEDRING**: Filerne er stadig statiske. Overvej at generere dem dynamisk ved build-time baseret på `NUXT_PUBLIC_SITE_URL`

### ✅ LØST: Data- og fejlkvalitet
**Status**: Løst
- ✅ GDELT-værdier normaliseres til [-1, 1] med `normalizeSentiment()`
- ✅ Vægtet gennemsnit baseret på artikelantal implementeret
- ✅ Logging tilføjet for at vise hvilke kilder der indgår

### ✅ LØST: Ubrugte/beskrevne afhængigheder
**Status**: Løst
- ✅ `@huggingface/inference` fjernet fra `package.json`
- ✅ `cheerio` og `@types/cheerio` fjernet
- ✅ `@vueuse/motion` fjernet
- ✅ Alle ubrugte dependencies er fjernet

### ✅ LØST: Typer og ressourcer
**Status**: Løst
- ✅ `NodeJS.Timeout` ændret til `number` i `useSentiment.ts`
- ✅ `any` typer erstattet med specifikke THREE.js typer (`THREE.Scene`, `THREE.PerspectiveCamera`, etc.)

## Forslag til næste skridt

### ✅ Færdiggjort
1) ✅ Base-URL, manifest, meta-tags og service worker er nu konfigurerbare via `baseURL`  
3) ✅ Synlig fejlhåndtering/fallback-indikator er implementeret i UI  
4) ✅ Ubrugte pakker er fjernet, typer er strammet

### ⚠️ Åbent
2) **Beslut om HuggingFace**: Pakken er fjernet, men kommentarer i koden nævner den stadig. Enten:
   - Implementer HuggingFace tekstanalyse på artikeltekst (fx med `@xenova/transformers` for lokal kørsel)
   - Eller fjern alle referencer til HuggingFace fra kode og dokumentation

### 🎯 Nye forslag
5) **Forbedre service worker**: Overvej Nuxt PWA plugin eller mere robust pre-cache strategi  
6) **Dynamisk SEO-filer**: Generer `robots.txt` og `sitemap.xml` dynamisk ved build-time  
7) **Tests**: Tilføj enhedstest for `useSentiment` og integrationstest for API med mockede svar  
8) **Vis datakilde i UI**: Vis tydeligt hvilke kilder/fallbacks der er aktive (fx "Live fra GDELT" vs. "Fallback: syntetisk")

## API-anbefalinger (gratis)
- Behold GDELT som primær nyhedskilde, men brug et kort dynamisk tidsvindue (seneste 24h), hold `maxrecords` lavt, clamp/normalisér tone-værdier og vægt kilder efter artikelantal.
- Drop remote HuggingFace Inference i drift (gratis kvote er minimal); kør lokal model med `@xenova/transformers` (fx `distilbert-base-uncased-finetuned-sst-2-english` eller en multilingual variant) eller et simpelt lexicon (`vader-sentiment`/`wink-sentiment`) for nul API-forbrug.
- Supplér med gratis signaler uden nøgle: Reddit JSON (fx top/hot fra relevante subreddits) og Hacker News Algolia API (`front_page` tag) for tech/nyheds-stemning; filtrér reklamer og meget korte posts.
- Hvis du vil have en nøgle-baseret men gratis tier nyheds-API: `GNews` eller `Newsdata.io` (små kvoter) kan bruges som sekundær kilde; cache hårdt for at holde dig under limits.
- Vis tydeligt i UI hvilke kilder/fallbacks der er aktive (fx “Live fra GDELT + Reddit” vs. “Fallback: syntetisk”), så brugeren forstår datakvaliteten.
