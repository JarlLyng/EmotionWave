# Code review — EmotionWave (rev 2)

## Kritiske fund
- **Service worker-URL kan break’e ved absolut base** (`app.vue:13-21`): `\`${baseURL}sw.js\`.replace(/\/+/g, '/')` reducerer `https://` til `https:/` hvis `NUXT_PUBLIC_BASE_URL` er absolut. Registrering fejler på custom domæne. Brug `new URL('sw.js', baseURLOrOrigin).toString()` og undgå regex.
- **Manifest/robots/sitemap er dobbelte og kan blive outdated** (`nuxt.config.ts:17-89`, `public/manifest.json`, `public/robots.txt`, `public/sitemap.xml`): Prerender-hook genererer filer, men i dev/SSR serviceres de statiske med hårdkodet `/EmotionWave/` og gammel dato. Fjern statiske versioner eller generér dem altid dynamisk via Nitro-route, så base/domæne altid matcher `NUXT_PUBLIC_BASE_URL`/`siteUrl`.
- **Offline-first er stadig skrøbeligt** (`public/sw.js:12-88`): `_nuxt`-assets pre-caches ikke ved install, så første offline-load fejler. Strategien er “network first” uden manifest-baseret precache af hashed assets. Overvej Nuxt PWA-plugin eller eget precache-manifest + `stale-while-revalidate` for statiske filer.
- **GDELT-query er meget bred** (`server/api/advanced-sentiment.ts:117-210`): Ingen `enddatetime` og ingen søgetermer → høj støj. Tilføj `enddatetime` (nu) og en fokuseret query (fx emner/kilder), og returnér kildetællinger i API’et for transparens i UI.
- **Secret i repo** (`.env`): HuggingFace API-nøglen ligger stadig lokalt. Selvom pakken er fjernet, bør nøglen roteres og erstattes af en dummy i `.env.example`; undgå at committe rigtige secrets.

## Vedligeholdelses- og kvalitetsfund
- **Dobbelt-normalisering dæmper variance** (`server/api/advanced-sentiment.ts:171-215`): Artikler clamped til [-1,1], kildescores clamped igen, og totalscore clamped igen. Overvej at clamp på artikelniveau og kun én gang på totalscore; returnér evt. rå gennemsnit til debugging.
- **Fallback-flag ikke brugt i UI** (`composables/useSentiment.ts:26-114`, `components/SentimentMeter.vue`): `isUsingFallback` sættes men vises ikke. Vis et neutralt “Demo data” badge i UI i stedet for at bruge error-tekst som primær tilstand.
- **Meta/link sættes kun via hook** (`nuxt.config.ts:117-133`): `head.link` er tom og fyldes i `app:created`. Det virker, men statisk HTML (view-source/SEO-lint) ser tom ud. Overvej at generere links i `app.head` direkte med en helper, så de er til stede i SSR-output.
- **Statiske manifest/robots/sitemap i public divergerer fra dynamisk output** (`public/manifest.json`, `public/robots.txt`, `public/sitemap.xml`): Kommentarerne nævner dynamisk generation, men filerne kopieres stadig til output og kan overskygge forventet indhold. Ryd op eller gør dem til skabeloner, der matches med Nitro-output.

## Forslag til næste skridt
1) Fix SW-URL-join med `new URL`, og opgrader cache-strategi (precache `_nuxt` manifest, stale-while-revalidate for statiske aktiver, offline fallback for dokumenter).  
2) Gør manifest/robots/sitemap entydige: fjern statiske kopier eller generér dem runtime; brug `NUXT_PUBLIC_BASE_URL`/`siteUrl` konsekvent.  
3) Stram GDELT-query: tilføj `enddatetime`, smal søgestreng, og eksponer kilder + artikelantal i API og UI.  
4) Vis `isUsingFallback` i UI som badge/tooltip, så brugeren ser datakvaliteten uden alarm-fejltekst.  
5) Roter HuggingFace-nøglen og læg kun en placeholder i repoets `.env.example`.  
