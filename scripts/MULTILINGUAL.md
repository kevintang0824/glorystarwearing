# Native multilingual site

The site has six saved-language versions: English (`/`), French (`/fr/`), Spanish (`/es/`), Portuguese (`/pt/`), Russian (`/ru/`) and Simplified Chinese (`/zh-cn/`). Each route is a standalone HTML document with authored copy; the browser never sends page content to a translation provider.

The shared header selector uses native language names and flags. Its links map the current English route to the corresponding route in every language and retain safe query parameters and fragments, so a selected product or quote context survives a language change. JavaScript only remembers `gsw_locale` and improves keyboard behavior. Every link remains functional without JavaScript.

Content and SEO:

- Each language has its own navigation, homepage, product catalogue, 22 business and policy pages, inquiry form, and 1,002 product detail pages.
- Product pages use controlled native product naming, localized category labels, and factual attributes extracted from the original catalogue. SKUs, media, sizes and stated fibre percentages remain unchanged.
- Each indexable page has its own language declaration, canonical URL, language-specific metadata, structured data and reciprocal `hreflang` links. English is the `x-default` version.
- `sitemap-multilingual.xml` lists all 5,130 non-English pages. The existing English sitemap remains unchanged and `robots.txt` advertises both files.
- English and localized legal pages explain that `gsw_locale` stores only the language choice. The consent banner is also written in each page's language.

Maintenance:

- `scripts/locales.mjs` is the source of the authored interface, business, legal and product vocabulary.
- `node scripts/prepare-multilingual.mjs` updates English language selectors and stores the governed English catalogue snapshot.
- `node scripts/prepare-multilingual.mjs --release` creates all native language pages in the release output.
- Catalogue generation and the immutable release-cache build both preserve and regenerate the language versions.
- `node scripts/verify-release-output.mjs` checks page completeness, language declarations, canonicals, reciprocal links and the absence of runtime translation services.
- `node --test scripts/multilingual.test.mjs` checks native language navigation, URL context, keyboard behavior, catalogue filtering and inquiry generation.
