import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.resolve(process.argv[2] || "/Users/kevintang/Documents/HERMES/sparkgymwear");
const outputRoot = path.join(root, "catalog-data");
const productsPath = path.join(sourceRoot, "products.json");
const imagePlanPath = path.join(sourceRoot, "image_plan.json");
const imagesRoot = path.join(sourceRoot, "images");

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
const imagePlan = JSON.parse(fs.readFileSync(imagePlanPath, "utf8"));
const required = new Set();
for (const product of products) {
  for (const url of product.gallery_urls || []) {
    const plannedPath = imagePlan[url]?.path;
    const sourcePath = plannedPath ? path.resolve(sourceRoot, plannedPath) : "";
    const parsed = new URL(url);
    if (!plannedPath || !sourcePath.startsWith(`${imagesRoot}${path.sep}`) || parsed.protocol !== "https:" || parsed.hostname !== "www.sparkgymwear.com") {
      throw new Error(`Invalid gallery mapping for product ${product.id}: ${url}`);
    }
    required.add(plannedPath);
  }
}

const integrity = {};
for (const plannedPath of [...required].sort()) {
  const sourcePath = path.join(sourceRoot, plannedPath);
  const data = fs.readFileSync(sourcePath);
  integrity[plannedPath] = {
    bytes: data.length,
    sha256: crypto.createHash("sha256").update(data).digest("hex"),
  };
}

fs.mkdirSync(outputRoot, { recursive: true });
for (const [name, data] of [
  ["products.json", fs.readFileSync(productsPath)],
  ["image_plan.json", fs.readFileSync(imagePlanPath)],
  ["media_integrity.json", Buffer.from(JSON.stringify(integrity))],
]) {
  fs.writeFileSync(path.join(outputRoot, `${name}.gz`), zlib.gzipSync(data, { level: 9, mtime: 0 }));
}

console.log(`Catalog snapshot: ${products.length} products, ${required.size} governed gallery assets.`);
