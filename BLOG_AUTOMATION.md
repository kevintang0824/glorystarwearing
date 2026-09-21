# Daily Reddit blog publishing

The Daily Reddit blog GitHub Actions workflow runs at 09:00 Asia/Shanghai (01:00 UTC). GitHub scheduled runs are best effort and may start a little later.

Each run reads weekly top posts from activewear, yoga, apparel-startup, clothing-startup, and small-business communities. It selects recent activewear product discussions, then uses the OpenAI Responses API to write one original English article around an approved site keyword. The article links to its Reddit sources and a relevant Glory Star Wear guide.

The workflow keeps one post per Shanghai calendar day. A retry on the same day reuses the existing post and continues deployment. If no suitable recent Reddit discussion is available, that run publishes nothing.

## Required GitHub Actions secrets

- Add OPENAI_API_KEY under Settings → Secrets and variables → Actions → New repository secret. The workflow uses this key to generate the article.
- Add a Vercel access token scoped to the Glory Star Wear team as VERCEL_TOKEN in the same Actions secrets page. Set an expiration date and rotate the token before it expires. The team and project IDs are already configured in the workflow.

After article generation, the workflow commits the blog files to main, builds the production output with the existing release build, overlays the blog pages and sitemap entries, and deploys to Vercel.

## Editorial rules

- Reddit provides qualitative topic signals, not evidence of general product performance.
- Articles paraphrase themes, omit usernames, and link to public source threads.
- The generator rejects unsupported company facts and specific performance claims.
- SEO keywords come from the site's activewear topic map; each article links to its matching guide.
