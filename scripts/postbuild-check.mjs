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
const builtCanonicalHtml = files.filter((file) => file === "index.html" || /\/index\.html$/.test(file));

const missingHtml = expectedHtml.filter((file) => !files.includes(file));
const extraHtml = builtCanonicalHtml.filter((file) => !expectedHtml.includes(file));
if (missingHtml.length) fail(`Build is missing ${missingHtml.length} sitemap page(s): ${missingHtml.join(", ")}`);
else pass(`${expectedHtml.length} sitemap pages packaged`);
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
  const builtAssetCache = routes.find((route) => /wp-content/.test(route.src ?? ""))?.headers?.["Cache-Control"] ?? "";
  const has404 = routes.some((route) => route.status === 404 && route.dest === "/404.html");
  if (!hasWwwRoot) fail("Built routes are missing the www homepage redirect.");
  else pass("Built www homepage redirect");
  if (!hasWwwPath) fail("Built routes are missing the www path redirect.");
  else pass("Built www path redirect");
  if (!hasTrailingSlashRedirect) fail("Built routes are missing the extensionless-path trailing-slash redirect.");
  else pass("Built trailing-slash redirect");
  if (!builtAssetCache || /immutable/i.test(builtAssetCache) || !/max-age=86400/i.test(builtAssetCache)) fail("Built /wp-content cache policy is missing the governed revalidation window.");
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
