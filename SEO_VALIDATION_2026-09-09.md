# Production / search validation — 2026-09-09

## Production site

- Canonical origin: `https://glorystarwearing.com/`
- `https://www.glorystarwearing.com/` redirects to the canonical host.
- Production `sitemap.xml`: HTTP 200, **1,026 URLs**.
- Sitemap composition: **1,002 product detail URLs**, the `/products/` index and the remaining editorial/site URLs.
- Full production SEO check: **1,026/1,026 pages checked**, Organization identity parity **1,026/1,026**, canonical release alignment passed.
- Current production `robots.txt` is being modified by Cloudflare Managed content. It still blocks `Google-Extended`, `GPTBot` and `ClaudeBot`; the retrieval-policy change in the repository will not be visible until deployment and the Cloudflare managed rule is updated.

## Google Search Console

Property checked: `sc-domain:glorystarwearing.com`.

- Indexing report last updated: **2026/09/04**.
- Indexed: **1**.
- Not indexed: **3**, all shown under “Page with redirect”.
- Sitemaps report: **0 submitted sitemaps** and no sitemap row for this property.
- Interpretation: this property is not yet receiving the site’s 1,026-URL sitemap discovery signal. The 1 indexed / 3 not indexed figures must not be interpreted as the final production coverage of the catalog.

## Bing Webmaster Tools

Property checked: `glorystarwearing.com/`.

- Known sitemaps: **0**.
- Total URLs discovered: **-**.
- Sitemap table: **0 rows**.
- Interpretation: Bing has not yet established a sitemap discovery record for the target domain. A separate `glorystarpacking.com` property has a successful sitemap with 74 discovered URLs; that is a different site and is not evidence for Glory Star Wear.

## Account-side actions still pending

1. Deploy the repository robots policy.
2. In Cloudflare, change the managed robots/content-signal policy so `OAI-SearchBot`, `Claude-SearchBot`, `Google-Extended` and `PerplexityBot` can retrieve public reference content. Keep training crawlers blocked if that is the chosen policy.
3. Submit `https://glorystarwearing.com/sitemap.xml` in the target GSC property and Bing property, then record the resulting status and discovered URL counts.
4. After the first crawl cycle, use GSC query/impression data and product availability to decide whether any of the 50 review candidates need content improvement, consolidation or a noindex/redirect decision.
