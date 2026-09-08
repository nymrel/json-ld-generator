# Contributing

This repository is the reviewable source for JSON-LD Studio. Schema generation and checking must stay deterministic, browser-local, safe to embed in HTML, and truthful about their evidence boundary.

## Development

1. Use Node 24.20.0 and npm 11.19.1. The quality gate also runs on Node 22.12.0.
2. Run `npm ci --ignore-scripts`.
3. Install the test browser once with `npx playwright install chromium`.
4. Run `npm run check` before opening a pull request.

The product remains dependency-free static HTML, CSS, JavaScript, and fonts. npm dependencies exist only for repeatable verification.

## Change boundaries

- Keep generated and pasted JSON-LD out of analytics and other network requests.
- Preserve the HTML-embedding guard: JSON serialized inside an `application/ld+json` script block must escape every literal `<` as `\u003c` while round-tripping to the original value after `JSON.parse`.
- Do not change schema construction, checker semantics, checkout, or paid-tier behavior without focused tests and plain-language documentation.
- Do not embed live payment links, secrets, fabricated outcomes, or guaranteed search and answer-engine claims.
- Keep automatic browser-local persistence explicit in customer-facing and security documentation.
- Treat hosted CI, deployment, adoption, customer use, purchases, and revenue as separate evidence gates.
