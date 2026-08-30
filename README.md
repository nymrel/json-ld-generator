# JSON-LD Studio

Generate schema.org structured data for your pages, or check the markup you already
have. Generation and checking run in your browser.

**Use it:** https://nymrel.com/tools/json-ld-generator

## What it does

Structured data is how a search or answer engine knows that a page is a business, a
product, or a set of questions — not just text. This tool builds valid JSON-LD for the
common types (LocalBusiness, Product, FAQ, and more) from a short form, and will read
back markup you paste in and tell you what is wrong with it.

No account, no email gate, no trial clock.

## Run it locally

No build step and no dependencies. It is a static page.

```
git clone https://github.com/nymrel/json-ld-generator.git
cd json-ld-generator
python3 -m http.server 8000
```

Then open http://localhost:8000/tools/json-ld-generator/

The page loads its stylesheet, script, and fonts from absolute paths (`/assets/...`),
so it needs a server rooted at the repo folder. Opening the HTML file straight from
disk will render unstyled.

## What is in here

| Path | What it is |
| --- | --- |
| `tools/json-ld-generator/index.html` | The whole tool — markup, copy, and logic |
| `assets/site.css`, `assets/site.js` | Shared styles and behavior across the Nymrel tools |
| `assets/pro/` | The paid-tier module, as shipped |
| `assets/checkout-config.js` | The checkout registry template |
| `assets/fonts/` | The three fonts the page uses |

`tools/json-ld-generator/index.html` is byte-for-byte the file nymrel.com serves.

## A note on the paid tier

The page offers a paid tier. `assets/checkout-config.js` here is the committed template
with no payment links set, so in a local copy the upgrade button falls back to email.
The free generator produces valid markup on its own.

## Privacy and local state

Generated and pasted JSON-LD is processed locally and may be saved in your browser's
local storage so a draft survives a reload. Product values are not attached to network
requests. The hosted page also loads aggregate Vercel Web Analytics; a local copy does
not load that endpoint successfully unless the host provides it.

Generated script blocks escape literal `<` characters inside JSON values as `\u003c`.
`JSON.parse` restores the original value, while the encoded source remains safe to paste
inside an HTML `application/ld+json` script element.

## Verification

Node 24.20.0 and npm 11.19.1 are the primary verification runtime; CI also exercises
Node 22.12.0. Run `npm ci --ignore-scripts`, install Chromium once with
`npx playwright install chromium`, then run `npm run check`.

## Credits

Instrument Serif, Instrument Sans, and IBM Plex Mono are used under the SIL Open
Font License.

## Who built it

[Nymrel](https://nymrel.com) — we build and run products, services, websites, software,
and apps.

## License

MIT. See [LICENSE](LICENSE).
