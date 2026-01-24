# Review af EmotionWave

## Findings (prioriteret)

### High
- HuggingFace-resultater bliver altid neutral (0), fordi `parseHuggingFaceSentiment` forventer et array, men parser et objekt. Det betyder, at HuggingFace-integrationen ikke kan give bedre score selv ved succes. Ret parseren til at acceptere `[{...}]` og `[[{...}]]`. `server/api/advanced-sentiment.ts:298`
- HuggingFace kaldes sekventielt per artikel og per endpoint, hvilket kan give lange responstider/timeouts (ses i logs). Overvej circuit breaker, batch/parallel med rate limit, eller stop efter foerste fejlede artikel i et request. `server/api/advanced-sentiment.ts:449`, `logs_result.json:1`

### Medium
- Service worker cache forsoger at hente `apple-touch-icon.png`, som ikke findes. `cache.addAll` fejler derfor, og de statiske assets bliver ikke cached. Opdater til `apple-touch-icon-180x180.png`. `public/sw.js:13`
- Retry-knappen er ikke klikbar, fordi hele meteren har `pointer-events: none`. Flyt `pointer-events: none` til de visuelle dele eller saet `pointer-events: auto` paa knappen. `components/SentimentMeter.vue:61`
- Polling kan overlappe (ingen in-flight guard), saa API-kald kan stapel sig op ved langsomme responser. Tilfoej abort eller `inFlight` flag. `composables/useSentiment.ts:161`
- Delay-node i Tone.js bliver ikke gemt/disposed, saa toggles kan efterlade audio nodes i hukommelsen. Gem `delay` i en variabel og kald `dispose()`. `components/AmbientSound.vue:99`
- `rawScore` bruges i `SentimentSource`, men typen definerer det ikke. Det skjuler typefejl og goer TS-sikkerhed falsk. Overvej separat type for intern beregning. `server/api/advanced-sentiment.ts:368`

### Low
- `og:image`/`twitter:image` kan ende med dobbelt base path, hvis `NUXT_PUBLIC_SITE_URL` allerede indeholder `/EmotionWave/` og `NUXT_PUBLIC_BASE_URL` er sat til det samme. Saml URL med en entydig base. `nuxt.config.ts:53`
- `FAVICON_GUIDE.md` beskriver filer der ikke matcher de faktiske assets (fx `apple-touch-icon.png`, `icon-192.png`). Opdater guiden til nuvaerende filnavne. `FAVICON_GUIDE.md:13`
- `logs_result.json` og `public/.DS_Store` bor ikke ligge i repo. Tilfoej til `.gitignore` og fjern fra tracking. `logs_result.json:1`
- `Date.now()` beregnes inde i partikel-loopet for hvert punkt, hvilket er unodigt dyrt. Flyt beregning udenfor loopet. `components/VisualLayer.vue:147`
- `user-scalable=no` i viewport og global `touch-action: manipulation` skader tilgaengelighed (zoom/assistive). Overvej scope eller fjern. `nuxt.config.ts:40`

## Dokumentation
- Netlify-delen bruger `npm run generate` men siger samtidig at serverless API routes virker. Det er modstridende. Brug `npm run build` hvis API skal virke, eller skriv at det er statisk. `DEPLOYMENT.md:38`

## Test- og kvalitetsgab
- Ingen lint/typecheck/test scripts i CI. Overvej at tilfoeje `lint`/`typecheck` og koble til pipeline. `package.json:5`

## Spoergsmaal / antagelser
- Skal HuggingFace bruges aktivt i prod, eller skal den vaere off som default og kun slas til med feature flag?
- Er Vercel den primare deployment, eller skal GitHub Pages fortsat behandles som ligevaerdig path (baseURL-defaults)?
