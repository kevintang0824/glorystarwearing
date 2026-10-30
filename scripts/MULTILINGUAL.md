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
# Editorial updates on October 29, 2026

Seven English pages now contain expanded buyer guidance. Their previous English source is retained in `catalog-data/editorial-source-baseline.json.gz` for the existing five authored language mappings. `editorial-localization.mjs` validates each source hash and date before generation. This prevents new English paragraphs from becoming generic fallback text in other languages.

To translate a held page, add reviewed locale mappings for all new copy, remove that page from the baseline, then compare the rendered locale pages and FAQ structured data. Company identity, contacts, navigation or policy corrections must also be applied to held sources; this is a content baseline, not permission to leave facts stale.

The multilingual sitemap now uses the actual source modification date (or the retained editorial date), rather than refreshing every URL on every build. Check this contract with `node --test scripts/editorial-localization.test.mjs`.

## Authored French leggings page — October 30, 2026

The leggings guide now has a complete French document in `scripts/templates/editorial/fr/custom-leggings-manufacturer/index.html`. `authored-editorial.mjs` registers its revision date and checks its language, canonical and schema date. Both regular generation and release verification use this document directly, without the legacy phrase translator. Keep its navigation, assets, company identity and contact information synchronized when the shared shell changes.

The previous English leggings source is the eighth entry in the translation baseline. Spanish, Portuguese, Russian and Chinese continue using that source until their expanded content is translated and checked. Only the revised English and French leggings sitemap entries advance to October 30. Run `node --test scripts/authored-editorial.test.mjs` to check regeneration and exact visible FAQ/schema agreement.

On 2026-10-30 the English sports bra, gym wear and activewear set guides gained category-specific buyer questions and catalog references. Their five existing translations retain the previously reviewed sources until equivalent translations are authored; the editorial baseline now holds 11 routes.

## SKU-specific English details — October 30, 2026

`catalog-data/product-editorial.json` holds reviewed copy for nine products. `product-editorial.mjs` renders it over the governed catalog snapshot after localization, preserving SKU identity and source specifications. Release verification rejects missing or stale overlays. The five language versions retain their previous snapshot content and dates until translated; do not capture these English overlays into the multilingual snapshot. Run `node --test scripts/product-editorial.test.mjs` when editing this content or integration.
