import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const slice = (process.argv[2] || "").toLowerCase();

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

if (slice === "core") {
  const required = [
    "index.html",
    "robots.txt",
    "sitemap.xml",
    "products/catalog-manifest.json",
    "products/catalog-index.json",
    "privacy-policy/index.html",
    "terms-of-use/index.html",
    "cookie-policy/index.html",
  ];
  const missing = required.filter((relative) => !fs.existsSync(path.join(publicRoot, relative)));
  if (missing.length) {
    throw new Error(`Release core is unavailable; refusing a cache miss build. Missing: ${missing.join(", ")}`);
  }
  const productPages = fs.readdirSync(path.join(publicRoot, "products"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(publicRoot, "products", entry.name, "index.html")));
  if (productPages.length !== 1002) throw new Error(`Expected 1002 product pages in release core; found ${productPages.length}.`);
  console.log(`Release core verified: ${productPages.length} product pages.`);
  process.exit(0);
}

if (!/^[0-9a-f]$/.test(slice)) throw new Error(`Expected release slice core or one hexadecimal prefix; received ${slice || "(empty)"}.`);

const mediaRoot = path.join(publicRoot, "wp-content", "uploads", "catalog");
const matchingDirectories = fs.existsSync(mediaRoot)
  ? fs.readdirSync(mediaRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && new RegExp(`^${slice}[0-9a-f]$`).test(entry.name))
    .map((entry) => path.join(mediaRoot, entry.name))
  : [];
const files = matchingDirectories.flatMap(listFiles);
const invalid = files.filter((file) => !/\.(?:jpe?g|png|webp)$/i.test(file) || fs.statSync(file).size < 100);

if (matchingDirectories.length !== 16 || files.length < 400 || invalid.length) {
  throw new Error(
    `Release media slice ${slice} is incomplete; directories ${matchingDirectories.length}/16, files ${files.length}, invalid ${invalid.length}. Refusing a cache miss build.`,
  );
}

const bytes = files.reduce((total, file) => total + fs.statSync(file).size, 0);
console.log(`Release media slice ${slice} verified: ${files.length} files, ${Math.round(bytes / 1024 / 1024)} MiB.`);
