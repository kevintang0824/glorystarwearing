# Production search snapshot — 2026-10-07

## Public HTTP checks

Fetched from `https://glorystarwearing.com/` on 2026-10-07. These checks show availability and declared crawl policy; they do not prove Google indexing or rankings.

- `robots.txt`: HTTP 200. The public policy allows `OAI-SearchBot`, `Claude-SearchBot`, `Google-Extended` and `PerplexityBot`; it blocks model-training crawlers `GPTBot`, `ClaudeBot` and `CCBot`.
- `sitemap.xml`: HTTP 200, 1,027 URLs. It includes `/blog/`.
- `sitemap-multilingual.xml`: HTTP 200, 5,130 URLs: 1,026 each under `/fr/`, `/es/`, `/pt/`, `/ru/` and `/zh-cn/`. It does not include `/blog/`.
- Sampled localized homepages (`/fr/`, `/es/`, `/pt/`, `/ru/`, `/zh-cn/`): HTTP 200 with locale-specific titles, self canonicals and hreflang declarations. This is a homepage sample, not a full audit of all 5,130 URLs.
- `/blog/`: HTTP 200 with the “first article will appear” placeholder. The page has no `noindex` directive and is in the production sitemap, so the empty archive is currently eligible for indexing.

## Account-side data

- Search Console coverage and sitemap-submission status for `glorystarwearing.com` were not available in the current browser session. The saved 2026-09-09 report is historical and must not be treated as current coverage.
- The visible Analytics report was not scoped exclusively to this site, so its traffic and conversion figures were not used as a baseline.
- Bing Webmaster indexing data and AI citation results remain unverified.

## Local release changes in progress

- Keep the empty blog archive `noindex,follow` and out of the release sitemap until it has a published article.
- When articles exist, add the archive and article URLs with `lastmod` values to the blog release sitemap overlay.
- Give generated blog pages the canonical Organization entity, Article/Blog and BreadcrumbList data, visible publication byline, consent-controlled analytics and accessible navigation.
- Run the SEO audit during the blog release build so malformed or unindexable articles stop before deployment.

The local source sitemap has 1,026 URLs and intentionally excludes the blog overlay. The production sitemap's extra URL is the current empty `/blog/` archive; the release changes above prevent that discrepancy from recurring after deployment.
