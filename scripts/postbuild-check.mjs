import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(root, ".vercel", "output");
const staticRoot = path.join(outputRoot, "static");
const failures = [];
const checks = [];
const fail = (message) => failures.push(message);
const pass = (message) => checks.push(message);

if (!fs.existsSync(staticRoot)) {
  console.error("ERROR: .vercel/output/static is missing. Run `vercel build --prod` first.");
  process.exit(1);
}

const files = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(entryPath);
    else files.push(path.relative(staticRoot, entryPath));
  }
};
walk(staticRoot);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>\s*https:\/\/glorystarwearing\.com(\/[^<]*)\s*<\/loc>/gi)]
  .map((match) => match[1]);
const expectedHtml = sitemapUrls.map((route) => route === "/" ? "index.html" : `${route.replace(/^\/|\/$/g, "")}/index.html`);
const sourceEnglishHtml = [...expectedHtml];
for (const prefix of ["fr", "es", "pt", "ru", "zh-cn"]) {
  expectedHtml.push(...sourceEnglishHtml.map((file) => `${prefix}/${file}`));
}
const origin = "https://glorystarwearing.com";
const expectedSitemapUrls = new Set(sitemapUrls.map((route) => `${origin}${route}`));
const blogPages = [{ file: "blog/index.html", route: "/blog/" }];
try {
  const posts = JSON.parse(fs.readFileSync(path.join(root, "blog", "posts.json"), "utf8"));
  if (!Array.isArray(posts)) throw new Error("blog/posts.json must contain an array.");
  const seen = new Set();
  for (const post of posts) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(post?.date || "") || !/^[a-z0-9-]+$/.test(post?.slug || "")) {
      throw new Error("A blog post has an invalid date or slug.");
    }
    const route = `/blog/${post.date}-${post.slug}/`;
    if (post.path !== route || seen.has(route)) throw new Error(`A blog post has an invalid or duplicate path: ${route}`);
    seen.add(route);
    blogPages.push({ file: `${route.slice(1)}index.html`, route });
    expectedSitemapUrls.add(`${origin}${route}`);
  }
  if (posts.length) expectedSitemapUrls.add(`${origin}/blog/`);
  else if (expectedSitemapUrls.has(`${origin}/blog/`)) fail("The empty blog archive must not appear in the core sitemap.");

  for (const { file, route } of blogPages) {
    expectedHtml.push(file);
    const sourcePath = path.join(root, file);
    const builtPath = path.join(staticRoot, file);
    if (!fs.existsSync(sourcePath) || !fs.existsSync(builtPath)) {
      fail(`Blog release is missing its source or built HTML: ${file}.`);
      continue;
    }
    const html = fs.readFileSync(builtPath, "utf8");
    if (!fs.readFileSync(sourcePath).equals(fs.readFileSync(builtPath))) fail(`Built blog page is stale: ${file}.`);
    const tags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
    const canonicalTags = tags.filter((tag) => /\brel=["']canonical["']/i.test(tag));
    if (canonicalTags.length !== 1 || canonicalTags[0].match(/\bhref=["']([^"']+)["']/i)?.[1] !== `${origin}${route}`) {
      fail(`Built blog page has a missing or incorrect canonical: ${file}.`);
    }
    const robotTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]).filter((tag) => /\bname=["']robots["']/i.test(tag));
    const tokens = new Set((robotTags[0]?.match(/\bcontent=["']([^"']*)["']/i)?.[1] || "").toLowerCase().split(/[\s,]+/));
    const emptyArchive = file === "blog/index.html" && posts.length === 0;
    const requiredDirective = emptyArchive ? "noindex" : "index";
    const forbiddenDirective = emptyArchive ? "index" : "noindex";
    if (robotTags.length !== 1 || !tokens.has(requiredDirective) || !tokens.has("follow") || tokens.has(forbiddenDirective) || tokens.has("nofollow") || tokens.has("none")) {
      fail(`Built blog page must declare ${requiredDirective},follow: ${file}.`);
    }
  }
  if (!failures.some((message) => /blog/i.test(message))) pass(`Blog release contract: ${posts.length} published article(s)`);
} catch (error) {
  fail(`Blog release contract could not be validated: ${error.message}`);
}
try {
  const builtSitemap = fs.readFileSync(path.join(staticRoot, "sitemap.xml"), "utf8");
  const builtUrls = [...builtSitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1]);
  const builtSet = new Set(builtUrls);
  const missingUrls = [...expectedSitemapUrls].filter((url) => !builtSet.has(url));
  const extraUrls = [...builtSet].filter((url) => !expectedSitemapUrls.has(url));
  if (builtUrls.length !== builtSet.size || missingUrls.length || extraUrls.length) {
    fail(`Built sitemap does not match the core and blog release contract: ${missingUrls.length} missing, ${extraUrls.length} unexpected, ${builtUrls.length - builtSet.size} duplicate URL(s).`);
  } else pass(`${builtUrls.length} core and blog sitemap URLs packaged`);
} catch (error) {
  fail(`Built sitemap could not be validated: ${error.message}`);
}
const builtCanonicalHtml = files.filter((file) => file === "index.html" || /\/index\.html$/.test(file));

const missingHtml = expectedHtml.filter((file) => !files.includes(file));
const extraHtml = builtCanonicalHtml.filter((file) => !expectedHtml.includes(file));
if (missingHtml.length) fail(`Build is missing ${missingHtml.length} sitemap page(s): ${missingHtml.join(", ")}`);
else pass(`${expectedHtml.length} declared HTML pages packaged`);
if (extraHtml.length) fail(`Build contains canonical HTML pages not declared in sitemap: ${extraHtml.join(", ")}`);
else pass("No undeclared canonical HTML pages");

const governedCoreHtml = sourceEnglishHtml.filter((file) => file === "index.html" || !file.startsWith("products/"));
const staleCoreHtml = governedCoreHtml.filter((file) => {
  const sourcePath = path.join(root, file);
  const builtPath = path.join(staticRoot, file);
  return !fs.existsSync(sourcePath) || !fs.existsSync(builtPath) ||
    !fs.readFileSync(sourcePath).equals(fs.readFileSync(builtPath));
});
if (staleCoreHtml.length) fail(`Build contains ${staleCoreHtml.length} stale governed core page(s): ${staleCoreHtml.join(", ")}`);
else pass(`${governedCoreHtml.length} governed core pages match source`);

for (const required of ["404.html", "robots.txt", "sitemap.xml", "assets/seo-pages.css", "assets/accessibility.css", "assets/seo-pages.js", "assets/privacy-controls.js", "assets/catalog.js", "products/catalog-index.json", "privacy-policy/index.html", "terms-of-use/index.html", "cookie-policy/index.html"]) {
  if (!files.includes(required)) fail(`Build is missing required file ${required}.`);
  else pass(`${required} packaged`);
}

const indexNowKeyFiles = files.filter((file) => /^[A-Za-z0-9-]{8,128}\.txt$/.test(file));
if (indexNowKeyFiles.length !== 1) fail(`Build must contain exactly one root IndexNow key file; found ${indexNowKeyFiles.length}.`);
else {
  const key = indexNowKeyFiles[0].slice(0, -4);
  const content = fs.readFileSync(path.join(staticRoot, indexNowKeyFiles[0]), "utf8").trim();
  if (content !== key) fail("Built IndexNow key filename and content do not match.");
  else pass("IndexNow root key packaged");
}

const forbiddenPatterns = [
  /^SEO_.*\.md$/i,
  /^scripts\//i,
  /^(?:package(?:-lock)?\.json|turbo\.json)$/i,
  /(?:^|\/)\.(?:turbo|wrangler)(?:\/|$)/i,
  /(?:^|\/)\.env/i,
  /(?:^|\/)_url_map\.json$/i,
  /(?:^|\/)AGENTS\.md$/i,
];
for (const pattern of forbiddenPatterns) {
  const matches = files.filter((file) => pattern.test(file));
  if (matches.length) fail(`Internal files leaked into build: ${matches.join(", ")}`);
}
if (!failures.some((message) => message.startsWith("Internal files leaked"))) pass("Internal operations and environment files excluded");

try {
  const config = JSON.parse(fs.readFileSync(path.join(outputRoot, "config.json"), "utf8"));
  const routes = Array.isArray(config.routes) ? config.routes : [];
  const hasWwwRoot = routes.some((route) => route.status === 308 && route.headers?.Location === "https://glorystarwearing.com/" && route.has?.some((item) => item.type === "host" && item.value === "www.glorystarwearing.com"));
  const hasWwwPath = routes.some((route) => route.status === 308 && /glorystarwearing\.com\/\$1$/.test(route.headers?.Location ?? "") && route.has?.some((item) => item.type === "host" && item.value === "www.glorystarwearing.com"));
  const hasTrailingSlashRedirect = routes.some((route) => route.status === 308 && route.headers?.Location === "/$1/" && /\[\^\/\\\.\]/.test(route.src ?? ""));
  const builtAssetHeaders = routes.find((route) => /wp-content/.test(route.src ?? ""))?.headers ?? {};
  const builtAssetCache = Object.entries(builtAssetHeaders).find(([name]) => name.toLowerCase() === "cache-control")?.[1] ?? "";
  const browserMaxAge = Number(builtAssetCache.match(/(?:^|,)\s*max-age=(\d+)\s*(?:,|$)/i)?.[1] ?? Number.NaN);
  const has404 = routes.some((route) => route.status === 404 && route.dest === "/404.html");
  if (!hasWwwRoot) fail("Built routes are missing the www homepage redirect.");
  else pass("Built www homepage redirect");
  if (!hasWwwPath) fail("Built routes are missing the www path redirect.");
  else pass("Built www path redirect");
  if (!hasTrailingSlashRedirect) fail("Built routes are missing the extensionless-path trailing-slash redirect.");
  else pass("Built trailing-slash redirect");
  if (!builtAssetCache || /immutable/i.test(builtAssetCache) || !Number.isFinite(browserMaxAge) || browserMaxAge > 604800) fail("Built /wp-content assets need a revalidating browser cache of at most seven days and must not be immutable.");
  else pass("Built revalidating asset cache");
  if (!has404) fail("Built routes are missing the custom 404 fallback.");
  else pass("Built custom 404 route");
} catch (error) {
  fail(`Could not validate .vercel/output/config.json: ${error.message}`);
}

try {
  const buildMetadata = JSON.parse(fs.readFileSync(path.join(outputRoot, "builds.json"), "utf8"));
  if (buildMetadata.target !== "production") fail(`Vercel build target is ${buildMetadata.target ?? "(missing)"}; expected production.`);
  else pass("Production build target");
} catch (error) {
  fail(`Could not validate .vercel/output/builds.json: ${error.message}`);
}

console.log(`Postbuild checks passed: ${checks.length} | static files: ${files.length}`);
if (failures.length) {
  for (const message of failures) console.error(`ERROR: ${message}`);
  process.exit(1);
}
console.log("PASS: Vercel build output matches the canonical release contract.");
