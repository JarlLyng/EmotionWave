# Code review – EmotionWave (2026-01-27)

Scope: `components/`, `composables/`, `server/`, `public/sw.js`, `nuxt.config.ts`.  
Tests were not run as part of this review.

## Findings (prioritized)

### High
1) **HuggingFace sentiment parsing treats `LABEL_0/1/2` as neutral**  
   - **Where:** `server/api/advanced-sentiment.ts:342-380`  
   - **Why it matters:** The `twitter-roberta-base-sentiment(-latest)` models typically return labels like `LABEL_0/1/2`. The parser only checks for `POSITIVE/NEGATIVE/NEUTRAL`, so these responses become `0` (neutral) and are treated as successful, preventing fallback to other endpoints. This can flatten sentiment to neutral even when a valid response exists.  
   - **Recommendation:** Map `LABEL_0/1/2` to the model’s `id2label` or treat unknown labels as a parse failure so the next endpoint is tried.

### Medium
1) **Audio init can run multiple times during loading**  
   - **Where:** `components/AmbientSound.vue:349-376`  
   - **Why it matters:** If the user clicks repeatedly while `isLoading` is true, multiple `initAudio()` calls can overlap, creating multiple Tone contexts/timeouts and leaking resources.  
   - **Recommendation:** Early-return when `isLoading` is true and/or disable the button while loading.

2) **Service worker attempts to cache non-GET requests**  
   - **Where:** `public/sw.js:88-176`  
   - **Why it matters:** `cache.put` only supports GET requests. If a non-GET is introduced later (e.g., analytics beacon, POST API), the SW could throw and break the fetch handler.  
   - **Recommendation:** Add a guard at the top of the fetch handler to bypass non-GET requests.

### Low
1) **Dialog lacks accessibility semantics and keyboard support**  
   - **Where:** `components/InfoDialog.vue:23-145`  
   - **Why it matters:** No `role="dialog"`, `aria-modal`, focus trap, or ESC-to-close. This makes the dialog hard to use for keyboard and assistive tech users.  
   - **Recommendation:** Add dialog semantics + focus management; optionally restore focus to the trigger button on close.

2) **Reddit “top posts” logic doesn’t actually sort**  
   - **Where:** `server/api/advanced-sentiment.ts:680-688`  
   - **Why it matters:** The sort comparator always returns 0, so the “top 20” is just the original order. The comment implies it’s ranking by engagement.  
   - **Recommendation:** Either capture upvote counts in `Article` and sort by them or remove the misleading sort/comment.

## Testing gaps
- No automated tests detected. Recommended minimum:
  - Contract test for `/api/advanced-sentiment` (success + fallback paths).
  - Unit tests for `parseHuggingFaceSentiment` with `LABEL_*` and `POS/NEG/NEU` formats.
  - Lightweight e2e smoke test to verify the page loads, dialog opens/closes, and sentiment polling updates state.

## Quick wins
- Add `type="button"` to dialog buttons to prevent accidental form submissions if embedded later.
- Consider throttling chatty `console.log` output in `server/api/advanced-sentiment.ts` for production.
