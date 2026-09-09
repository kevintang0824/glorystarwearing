import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const releaseRoot = path.join(root, "public");
const locales = ["fr", "es", "pt", "ru", "zh-cn"];
const rows = [];
const first = (html, pattern) => html.match(pattern)?.[1]?.trim() ?? "";
const jsonLdBlocks = (html) => [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
const containsProductType = (value) => {
  if (Array.isArray(value)) return value.some(containsProductType);
  if (!value || typeof value !== "object") return false;
  const type = value["@type"];
  if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return true;
  return Object.values(value).some(containsProductType);
};

for (const locale of locales) {
  const productsRoot = path.join(releaseRoot, locale, "products");
  const pages = fs.readdirSync(productsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(productsRoot, entry.name, "index.html")))
    .map((entry) => entry.name);
  const details = pages.map((slug) => {
    const html = fs.readFileSync(path.join(productsRoot, slug, "index.html"), "utf8");
    const jsonLd = jsonLdBlocks(html).map((block) => {
      try { return {value: JSON.parse(block), valid: true}; } catch { return {value: null, valid: false}; }
    });
    return {
      slug,
      description: first(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
      canonical: first(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i),
      indexable: /<meta\s+name=["']robots["'][^>]*content=["'][^"']*\bindex\b/i.test(html),
      productSchema: jsonLd.some(({value}) => containsProductType(value)),
      invalidJsonLd: jsonLd.some(({valid}) => !valid),
    };
  });
  rows.push({
    locale,
    count: details.length,
    uniqueDescriptions: new Set(details.map((row) => row.description).filter(Boolean)).size,
    missingDescriptions: details.filter((row) => !row.description).length,
    nonCanonical: details.filter((row) => !row.canonical.endsWith(`/products/${row.slug}/`)).length,
    nonIndexable: details.filter((row) => !row.indexable).length,
    missingProductSchema: details.filter((row) => !row.productSchema).length,
    invalidJsonLd: details.filter((row) => row.invalidJsonLd).length,
    missingProductSchemaSlugs: details.filter((row) => !row.productSchema).slice(0, 10).map((row) => row.slug),
  });
}

console.table(rows);
if (rows.some((row) => row.count !== 1002 || row.uniqueDescriptions !== 1002 || row.missingDescriptions || row.nonCanonical || row.nonIndexable || row.missingProductSchema || row.invalidJsonLd)) {
  console.error("Localized product index audit failed.");
  process.exit(1);
}
console.log("PASS: all 5 localized catalogs have 1,002 indexable product pages with unique descriptions and Product JSON-LD.");
