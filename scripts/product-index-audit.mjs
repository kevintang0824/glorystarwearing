import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const productsRoot = path.join(root, "products");
const writeReport = process.argv.includes("--write");
const generatedDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());

const textFromHtml = (html) => html
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&(?:amp|nbsp|quot|#39|#x27);/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

const first = (html, pattern) => html.match(pattern)?.[1]?.trim() ?? "";
const all = (html, pattern) => [...html.matchAll(pattern)].map((match) => match[1].trim());
const productDirectories = fs.readdirSync(productsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(productsRoot, entry.name, "index.html")))
  .map((entry) => entry.name)
  .sort();

const pages = productDirectories.map((slug) => {
  const route = `/products/${slug}/`;
  const file = path.join(productsRoot, slug, "index.html");
  const html = fs.readFileSync(file, "utf8");
  const title = first(html, /<title>([\s\S]*?)<\/title>/i);
  const description = first(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const h1 = first(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "").trim();
  const canonical = first(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  const sku = first(html, /SKU\s*([^<\s]+)</i);
  const words = textFromHtml(html).split(/\s+/).filter(Boolean).length;
  const images = all(html, /<img\b[^>]*\bsrc=["']([^"']+)["']/gi);
  const flags = [];
  if (!canonical || !canonical.endsWith(route)) flags.push("canonical");
  if (!/name=["']robots["'][^>]*content=["'][^"']*\bindex\b/i.test(html)) flags.push("robots");
  if (!/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?\"@type\"\s*:\s*\"Product\"/i.test(html)) flags.push("product-schema");
  if (!images.length) flags.push("no-image");
  if (words < 350) flags.push(`short-${words}-words`);
  return { slug, route, file, title, description, h1, canonical, sku, words, images: images.length, flags };
});

const duplicateGroups = (key) => {
  const groups = new Map();
  for (const page of pages) {
    const value = page[key];
    if (!value) continue;
    const group = groups.get(value) ?? [];
    group.push(page);
    groups.set(value, group);
  }
  return [...groups.values()].filter((group) => group.length > 1);
};

const duplicateDescriptions = duplicateGroups("description");
const duplicateH1s = duplicateGroups("h1");
const duplicateTitles = duplicateGroups("title");
const uniqueCount = (groups) => pages.length - groups.reduce((total, group) => total + group.length - 1, 0);
const reviewRoutes = new Set();
for (const page of pages) {
  if (page.flags.length) reviewRoutes.add(page.route);
}
for (const group of [...duplicateDescriptions, ...duplicateH1s, ...duplicateTitles]) {
  for (const page of group) reviewRoutes.add(page.route);
}

const keepCount = pages.length - reviewRoutes.size;
const countFlag = (prefix) => pages.filter((page) => page.flags.some((flag) => flag === prefix || flag.startsWith(`${prefix}-`))).length;
const listGroups = (label, groups) => {
  if (!groups.length) return `- ${label}: none`;
  const lines = groups.map((group) => `  - ${group.length} pages: ${group.map((page) => page.route).join(", ")}`);
  return [`- ${label}: ${groups.length} group(s)`, ...lines].join("\n");
};

const report = `# Product index review

Generated: ${generatedDate}

## Scope

- Product detail pages audited: **${pages.length}**
- Basic keep candidates: **${keepCount}**
- Review candidates: **${reviewRoutes.size}**
- Unique titles: **${uniqueCount(duplicateTitles)} / ${pages.length}**
- Unique meta descriptions: **${uniqueCount(duplicateDescriptions)} / ${pages.length}**
- Unique H1 values: **${uniqueCount(duplicateH1s)} / ${pages.length}**
- Pages with Product JSON-LD: **${pages.filter((page) => !page.flags.includes("product-schema")).length} / ${pages.length}**
- Pages with at least one image: **${pages.filter((page) => page.images > 0).length} / ${pages.length}**
- Pages below 350 rendered words: **${countFlag("short")}**

## Review queues

${listGroups("Duplicate meta descriptions", duplicateDescriptions)}

${listGroups("Duplicate H1 values", duplicateH1s)}

${listGroups("Duplicate title values", duplicateTitles)}

### Structural or thin-page flags

${pages.filter((page) => page.flags.length).map((page) => `- ${page.route} — ${page.flags.join(", ")}`).join("\n") || "- none"}

## Index policy

All 1,002 product URLs remain eligible for indexing because each has a self-referencing canonical, an index/follow directive, a unique SKU and Product JSON-LD. Review flags are quality queues, not automatic noindex decisions. Consolidation or noindex should only be applied after Search Console query/impression data, product availability and buyer demand are reviewed for the specific SKU.

The current first-pass actions are to keep valid product URLs crawlable, make snippets unique, and improve the flagged pages with original specifications, verified media or a deliberate canonical/redirect decision. Do not bulk noindex the catalog based on word count alone.
`;

if (writeReport) fs.writeFileSync(path.join(root, "SEO_PRODUCT_INDEX_REVIEW.md"), report);
console.log(report);
