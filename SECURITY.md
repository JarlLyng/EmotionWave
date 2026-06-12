# Security Policy

## Reporting a Vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, report them privately via [GitHub's private vulnerability reporting](https://github.com/JarlLyng/EmotionWave/security/advisories/new) on this repository. You can expect an initial response within a few days.

## Supported Versions

Only the latest deployed version at [emotionwave.iamjarl.com](https://emotionwave.iamjarl.com) and the `main` branch are supported.

## Security Practices

- **API keys** (HuggingFace, NewsAPI) are stored server-side only via Nuxt `runtimeConfig` and never reach the client bundle. `.env` is git-ignored.
- **Rate limiting**: the public `/api/*` endpoints are rate limited per IP to protect upstream API quotas.
- **Security headers**: CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` are set on all routes.
- **Input validation**: all external API responses (GDELT, NewsAPI, Reddit, HuggingFace) are validated with Zod schemas before use; failures degrade gracefully.
- **XSS**: article headlines are rendered through Vue's escaping; `innerHTML` is only used for `JSON.stringify`-generated JSON-LD.
- **Service worker** caches same-origin GET requests only.
- **Dependencies**: Dependabot runs weekly, and CI fails on high/critical `npm audit` findings.
