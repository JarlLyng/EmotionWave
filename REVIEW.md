# Review af EmotionWave

## Findings (prioriteret)

### High
- HuggingFace-parseren returnerer altid neutral, fordi `parseHuggingFaceSentiment` forventer et array, men typisk faar et objekt. Det betyder, at HuggingFace-integrationen i praksis ikke virker selv ved succes. `server/api/advanced-sentiment.ts:298`
- HuggingFace-kald sker sekventielt per artikel og per endpoint, hvilket giver lange responstider og timeouts (ses i logs). Overvej circuit breaker, parallelisering med begranset concurrency eller disable i prod. `server/api/advanced-sentiment.ts:449` `logs_result.json:1`

### Medium
- Service worker cachen inkluderer `apple-touch-icon.png`, som ikke findes. Det faar `cache.addAll` til at fejle, saa statiske assets ikke caches. Brug `apple-touch-icon-180x180.png`. `public/sw.js:13`
- Retry-knappen er ikke klikbar, fordi meteren har `pointer-events: none`. Flyt `pointer-events` eller slaa det til paa knappen. `components/SentimentMeter.vue:61`
- Polling kan overlappe uden in-flight guard, saa langsomme requests kan stapel sig op. Tilfoej abort/inFlight flag. `composables/useSentiment.ts:161`
- Tone.js delay-node bliver ikke disposed ved stop, saa toggles kan efterlade audio nodes. Gem delay i en variabel og kald `dispose()`. `components/AmbientSound.vue:99`
- `rawScore` bruges i `SentimentSource`, men typen definerer det ikke. Det skjuler typefejl og svakker TS-sikkerhed. Brug en separat intern type. `server/api/advanced-sentiment.ts:368`
- BaseURL default er sat til `/EmotionWave/` i production. Hvis env ikke er sat paa Vercel, peger API-kald paa forkert path (ses i logs). Overvej at default'e til `/` og override i GH Actions. `nuxt.config.ts:31` `composables/useSentiment.ts:66` `logs_result.json:1`

### Low
- `FAVICON_GUIDE.md` matcher ikke de faktiske filnavne (fx apple-touch-icon og android-chrome). Opdater guiden til nuvaerende assets. `FAVICON_GUIDE.md:13`
- `logs_result.json` og `public/.DS_Store` burde ikke ligge i repo. Tilfoej til `.gitignore` og fjern fra tracking. `logs_result.json:1` `public/.DS_Store`
- `Date.now()` beregnes inde i partikel-loopet for hvert punkt; flyt ud af loop for at spare CPU. `components/VisualLayer.vue:147`
- `user-scalable=no` og global `touch-action: manipulation` skader tilgaengelighed (zoom/assistive). Overvej scope eller fjern. `nuxt.config.ts:40`

## Test- og kvalitetsgab
- Ingen lint/typecheck/test scripts kores i CI. Overvej at tilfoeje `lint`/`typecheck` og koble til pipeline. `package.json:5`

## Spoergsmaal / antagelser
- Skal HuggingFace vaere aktivt i prod, eller kun aktiveres via feature flag?
- Skal Vercel vaere primar deployment, eller skal GH Pages stadig vaere foerste-class (baseURL defaults)?
