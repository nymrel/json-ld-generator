# JSON-LD Studio

Generate schema.org structured data for your pages, or check the markup you already
have. Runs entirely in your browser.

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

## Privacy

Nothing you type leaves your browser. The tool makes no server calls.

## Credits

Instrument Serif, Instrument Sans, and IBM Plex Mono are used under the SIL Open
Font License.

## Who built it

[Nymrel](https://nymrel.com) — a software studio that builds and runs its own products.

## License

MIT. See [LICENSE](LICENSE).
