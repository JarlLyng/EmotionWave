# Review af EmotionWave

## Fund (prioriteret)

### Hoj
- NewsAPI-kaldet bruger `language=en,da`, som ikke er et gyldigt parameterformat for NewsAPI og derfor typisk giver 400-fejl. Resultat: NewsAPI bidrager aldrig, saa multi-source reelt kun er GDELT/Reddit. Forslag: koer to separate kald (en/da), eller drop `language` og filter anderledes. `server/api/advanced-sentiment.ts:191`

### Medium
- `Retry`-knappen kan ikke trykkes, fordi hele meteren har `pointer-events: none`. Det gor fejlgenopretning umulig i UI. Forslag: flyt `pointer-events: none` til kun visuelle dele, og sæt `pointer-events: auto` paa knappen. `components/SentimentMeter.vue:61`
- Tone.js delay-instansen bliver aldrig gemt eller disposed, saa hvert toggle kan efterlade audio nodes i hukommelsen. Forslag: gem `delay` i en variabel og kald `dispose()` ved stop/unmount. `components/AmbientSound.vue:99`
- Polling kan overlappe hvis et kald tager >30 sekunder, fordi `setInterval` kalder `fetchSentiment` uden in-flight guard. Det kan give ekstra API-load og race conditions i UI. Forslag: track `inFlight` eller brug `AbortController` pr. polling-cyklus. `composables/useSentiment.ts:149`

### Lav
- `Date.now()` beregnes inde i partikel-loopet ved hvert iteration. Det er unodvendigt dyrt; beregn en gang udenfor loopet. `components/VisualLayer.vue:147`
- Globalt `user-scalable=no` og `touch-action: manipulation` blokerer zoom/selection og skader tilgaengelighed. Overvej at scope dette til canvas-laget eller drop det. `app.vue:51`
- `gsap` er i dependencies, men bruges ikke i koden. Det oger install-tid/bundle uden gevinst. `package.json:14`
- `SentimentSource` indeholder ikke `rawScore`, men objekter oprettes med `rawScore`. Det giver type-inkonsistens og skjuler fejl. Overvej separat type til intern beregning. `server/api/advanced-sentiment.ts:375`

## Dokumentation
- Deployments for Vercel/Netlify lover server-side API, men build-kommanden er `npm run generate`, som laver statisk site og slaar API-ruter fra. Det er modstridende og vil give manglende funktionalitet. Forslag: skift til `nuxt build` + serverless/edge setup eller tydeliggor at dette er statisk. `DEPLOYMENT.md:61`
- README fremhaever multi-source (GDELT/NewsAPI/Reddit) som generel feature, men paa GitHub Pages bruges kun client-side GDELT/fallback. Overvej at praecisere det under features/known issues. `README.md:17`

## Test- og kvalitetsgab
- Ingen automatiske tests eller lint/typecheck i CI. Det oger risikoen for regressions (især i API-integrationen). Overvej at tilfoeje `npm run lint` og `npm run typecheck` til workflowet. `package.json:5`, `.github/workflows/deploy.yml:31`

## Anbefalinger (kort)
1. Ret NewsAPI-query (sprog-parameter) og tilfoej simpel in-flight guard for polling.
2. Giv `Retry`-knap pointer events, og disposer alle Tone.js effekter korrekt.
3. Juster deployments-docs for Vercel/Netlify (statisk vs. serverless) og praeciser multi-source i README.
4. Tilfoej lint/typecheck i CI og fjern ubrugte dependencies.

## Spoergsmaal / antagelser
- Skal GitHub Pages-udgaven være helt statisk, eller oensker du ogsaa server-side API i produktion (f.eks. via Vercel/Netlify/SSR)?
- Er `NewsAPI` en aktiv funktion du vil have i produktion, eller skal den bevidst vaere optional/demo?

## Kort opsummering
Styrkerne er klar: veldefineret arkitektur, gode fallback-paths og en levende oplevelse. De primære problemer er en defekt NewsAPI-query, manglende interaktion paa `Retry`-knappen og et par resource/perf-ting. Dokumentationen for serverless deployment boer opdateres for at matche den faktiske build-strategi.
