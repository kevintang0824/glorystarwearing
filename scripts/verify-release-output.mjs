import fs from "node:fs";
import path from "node:path";
import { canonicalPages, releaseImageAssets } from "./prepare-multilingual.mjs";
import { languages } from "./locales.mjs";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const failures = [];
const fail = (message) => failures.push(message);

const listFiles = (directory) => {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(entryPath);
      else files.push(entryPath);
    }
  };
  walk(directory);
  return files;
};

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(publicRoot, "products", "catalog-manifest.json"), "utf8"));
} catch (error) {
  fail(`Catalog manifest is missing or invalid: ${error.message}`);
}

if (manifest) {
  if (manifest.products !== 1002) fail(`Catalog manifest reports ${manifest.products} products; expected 1002.`);
  if (manifest.mediaFiles !== 7994) fail(`Catalog manifest reports ${manifest.mediaFiles} media files; expected 7994.`);
  if (!Array.isArray(manifest.mediaReviewProducts) || manifest.mediaReviewProducts.length !== 0) {
    fail(`Catalog manifest contains ${manifest.mediaReviewProducts?.length ?? "invalid"} media-review products; expected 0.`);
  }
  if (manifest.catalogIndexEntries !== 1002 || manifest.initialCatalogCards !== 24) {
    fail(`Catalog delivery manifest is invalid: ${manifest.catalogIndexEntries ?? "missing"} index entries and ${manifest.initialCatalogCards ?? "missing"} initial cards.`);
  }
}

const productsRoot = path.join(publicRoot, "products");
const productPages = fs.existsSync(productsRoot)
  ? fs.readdirSync(productsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(productsRoot, entry.name, "index.html")))
  : [];
if (productPages.length !== 1002) fail(`Release contains ${productPages.length} product pages; expected 1002.`);

try {
  const catalogIndex = JSON.parse(fs.readFileSync(path.join(productsRoot, "catalog-index.json"), "utf8"));
  const routes = catalogIndex.map((product) => product?.route);
  if (catalogIndex.length !== 1002 || new Set(routes).size !== 1002 || routes.some((route) => !/^\/products\/[a-z0-9-]+\/$/.test(route ?? ""))) {
    fail(`Release catalog index is invalid: ${catalogIndex.length} entries and ${new Set(routes).size} unique routes.`);
  }
} catch (error) {
  fail(`Release catalog index is missing or invalid: ${error.message}`);
}

try {
  const catalogPagePath = path.join(productsRoot, "index.html");
  const catalogPage = fs.readFileSync(catalogPagePath, "utf8");
  const initialCards = [...catalogPage.matchAll(/\bdata-catalog-item\b/g)].length;
  const crawlSection = catalogPage.match(/<details class="catalog-crawl-index">([\s\S]*?)<\/details>/)?.[1] ?? "";
  const crawlRoutes = [...crawlSection.matchAll(/href="(\/products\/[a-z0-9-]+\/)"/g)].map((match) => match[1]);
  if (fs.statSync(catalogPagePath).size > 350_000) fail(`Release catalog HTML is ${fs.statSync(catalogPagePath).size} bytes; expected at most 350000.`);
  if (initialCards !== 24) fail(`Release catalog renders ${initialCards} initial cards; expected 24.`);
  if (!/data-catalog-feed="\/products\/catalog-index\.json"/.test(catalogPage) || !/data-catalog-total="1002"/.test(catalogPage)) {
    fail("Release catalog is missing its governed on-demand feed attributes.");
  }
  if (crawlRoutes.length !== 1002 || new Set(crawlRoutes).size !== 1002) {
    fail(`Release compact crawl index contains ${crawlRoutes.length} links and ${new Set(crawlRoutes).size} unique routes; expected 1002.`);
  }
} catch (error) {
  fail(`Release catalog delivery could not be validated: ${error.message}`);
}

const mediaFiles = listFiles(path.join(publicRoot, "wp-content", "uploads", "catalog"));
if (mediaFiles.length !== 7994) fail(`Release contains ${mediaFiles.length} catalog media files; expected 7994.`);

try {
  const sitemap = fs.readFileSync(path.join(publicRoot, "sitemap.xml"), "utf8");
  const sitemapUrls = [...sitemap.matchAll(/<loc>\s*https:\/\/glorystarwearing\.com\//g)].length;
  if (sitemapUrls !== 1026) fail(`Release sitemap contains ${sitemapUrls} canonical URLs; expected 1026.`);
} catch (error) {
  fail(`Release sitemap is missing or invalid: ${error.message}`);
}

try {
  const sourceSitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const governedCoreRoutes = [...sourceSitemap.matchAll(/<loc>\s*https:\/\/glorystarwearing\.com(\/[^<]*)\s*<\/loc>/gi)]
    .map((match) => match[1])
    .filter((route) => !route.startsWith("/products/"));
  const staleCorePages = governedCoreRoutes.filter((route) => {
    const relative = route === "/" ? "index.html" : `${route.replace(/^\/|\/$/g, "")}/index.html`;
    const sourcePath = path.join(root, relative);
    const releasePath = path.join(publicRoot, relative);
    return !fs.existsSync(sourcePath) || !fs.existsSync(releasePath) ||
      !fs.readFileSync(sourcePath).equals(fs.readFileSync(releasePath));
  });
  if (staleCorePages.length) {
    fail(`Release core is stale for ${staleCorePages.length} canonical page(s): ${staleCorePages.join(", ")}`);
  }
} catch (error) {
  fail(`Release core source parity could not be checked: ${error.message}`);
}

for (const route of ["privacy-policy", "terms-of-use", "cookie-policy"]) {
  if (!fs.existsSync(path.join(publicRoot, route, "index.html"))) fail(`Release is missing /${route}/.`);
}
for (const internal of [".turbo", ".wrangler"]) {
  if (fs.existsSync(path.join(publicRoot, internal))) fail(`Release leaks internal build directory public/${internal}.`);
}

for (const relative of ["assets/multilingual.js", "assets/multilingual.css", "assets/localized-site.js", "assets/localized-site.css", "assets/privacy-controls.js"]) {
  const source = path.join(root, relative);
  const output = path.join(publicRoot, relative);
  if (!fs.existsSync(output) || !fs.readFileSync(source).equals(fs.readFileSync(output))) {
    fail(`Multilingual asset is missing or stale: ${relative}`);
  }
}
for (const relative of releaseImageAssets) {
  const source = path.join(root, relative);
  const output = path.join(publicRoot, relative);
  if (!fs.existsSync(output) || !fs.readFileSync(source).equals(fs.readFileSync(output))) {
    fail(`Release image is missing or stale: ${relative}`);
  }
}
for (const relative of canonicalPages(publicRoot)) {
  const page = fs.readFileSync(path.join(publicRoot, relative), "utf8");
  for (const asset of ["multilingual.js", "multilingual.css"]) {
    if (page.split(`/assets/${asset}?v=20260906-1`).length !== 2) fail(`Expected one ${asset} reference in ${relative}.`);
  }
  if (!page.includes('data-language="fr"')) fail(`Missing native language links in ${relative}.`);
  if (relative === "404.html") continue;
  for (const language of languages.slice(1)) {
    const translatedPath = path.join(publicRoot, language.prefix, relative);
    if (!fs.existsSync(translatedPath)) { fail(`Missing language page ${language.prefix}/${relative}`); continue; }
    const localized = fs.readFileSync(translatedPath, "utf8");
    for (const tag of ["section", "article", "img", "form", "input", "textarea", "details", "figure"]) {
      const sourceCount = (page.match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
      const localizedCount = (localized.match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
      if (localizedCount !== sourceCount) fail(`Interface parity failed for ${language.prefix}/${relative}: ${tag} ${localizedCount}/${sourceCount}`);
    }
    const route = relative === "index.html" ? "/" : `/${relative.replace(/index\.html$/, "")}`;
    const canonical = `https://glorystarwearing.com/${language.prefix}${route}`;
    if (!localized.includes(`<html lang="${language.code}"`) || !localized.includes(`<link rel="canonical" href="${canonical}">`)) {
      fail(`Incorrect language or canonical in ${language.prefix}/${relative}`);
    }
    if (localized.split('hreflang="x-default"').length !== 2) fail(`Missing alternate languages in ${language.prefix}/${relative}`);
    if (/translate\.google|gtranslate|googtrans|TranslateElement/.test(localized)) fail(`Unexpected translation service in ${language.prefix}/${relative}`);
    if (/\b(?:src|href|data-[\w-]+)="(?:wp-content|wp-includes)\//.test(localized)) {
      fail(`Locale-relative shared asset URL in ${language.prefix}/${relative}`);
    }
  }
}

if (failures.length) {
  for (const message of failures) console.error(`ERROR: ${message}`);
  process.exit(1);
}

console.log(`Release verified: ${productPages.length} products, ${mediaFiles.length} media files, 1026 canonical URLs, 3 legal pages.`);
