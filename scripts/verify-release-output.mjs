import fs from "node:fs";
import path from "node:path";
import { canonicalPages, releaseImageAssets } from "./prepare-multilingual.mjs";
import { languages } from "./locales.mjs";
import { editorialSource } from "./editorial-localization.mjs";

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

const parseJsonLdNodes = (html) => html.split('<script type="application/ld+json">').slice(1).flatMap((part) => {
  try {
    const data = JSON.parse(part.split('</script>')[0]);
    return data?.["@graph"] || [data];
  } catch {
    return [];
  }
});
const structuredEnhancementFailures = [];
for (const entry of productPages) {
  const productPath = path.join(productsRoot, entry.name, "index.html");
  const nodes = parseJsonLdNodes(fs.readFileSync(productPath, "utf8"));
  const product = nodes.find((node) => node?.["@type"] === "Product");
  const organization = nodes.find((node) => node?.["@type"] === "Organization");
  if (!Array.isArray(product?.additionalProperty) || !product.brand?.["@id"] || !organization?.contactPoint) {
    structuredEnhancementFailures.push(entry.name);
  }
}
if (structuredEnhancementFailures.length) {
  fail(`Product structured-data enhancements are incomplete on ${structuredEnhancementFailures.length} page(s).`);
}

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
  if (!sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')) {
    fail("Release sitemap is missing the image namespace.");
  }
  const sitemapImageLocs = [...sitemap.matchAll(/<image:loc>\s*https:\/\/glorystarwearing\.com\//g)].length;
  if (sitemapImageLocs !== 1002) fail(`Release sitemap contains ${sitemapImageLocs} product image entries; expected 1002.`);
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
for (const relative of ["robots.txt", "llms.txt"]) {
  const source = path.join(root, relative);
  const output = path.join(publicRoot, relative);
  if (!fs.existsSync(output) || !fs.readFileSync(source).equals(fs.readFileSync(output))) {
    fail(`Release policy file is missing or stale: ${relative}`);
  }
}
for (const relative of releaseImageAssets) {
  const source = path.join(root, relative);
  const output = path.join(publicRoot, relative);
  if (!fs.existsSync(output) || !fs.readFileSync(source).equals(fs.readFileSync(output))) {
    fail(`Release image is missing or stale: ${relative}`);
  }
}
const multilingualVersion = fs.readFileSync(path.join(root, "index.html"), "utf8").match(/\/assets\/multilingual\.js\?v=([^"']+)/)?.[1];
if (!multilingualVersion) fail("Source homepage is missing the multilingual asset version.");
for (const relative of canonicalPages(publicRoot)) {
  const page = fs.readFileSync(path.join(publicRoot, relative), "utf8");
  for (const asset of ["multilingual.js", "multilingual.css"]) {
    if (!multilingualVersion || page.split(`/assets/${asset}?v=${multilingualVersion}`).length !== 2) fail(`Expected one ${asset} reference in ${relative}.`);
  }
  if (!page.includes('data-language="fr"')) fail(`Missing native language links in ${relative}.`);
  if (relative === "404.html") continue;
  // Held editorial pages are compared with their validated translation source,
  // while every other page must still match the current English structure.
  const translationSource = editorialSource(relative, () => page);
  for (const language of languages.slice(1)) {
    const translatedPath = path.join(publicRoot, language.prefix, relative);
    if (!fs.existsSync(translatedPath)) { fail(`Missing language page ${language.prefix}/${relative}`); continue; }
    const localized = fs.readFileSync(translatedPath, "utf8");
    for (const tag of ["section", "article", "img", "form", "input", "textarea", "details", "figure"]) {
      const sourceCount = (translationSource.match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
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
