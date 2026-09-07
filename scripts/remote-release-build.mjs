import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const buildMirror = path.join(root, ".catalog-build", "mirror");
const localMirror = process.env.CATALOG_SOURCE_ROOT || "/Users/kevintang/Documents/HERMES/sparkgymwear";
const priorAssetBase = (process.env.CATALOG_ASSET_BASE || "https://glorystarwearing.com").replace(/\/$/, "");
const allowedImageExtension = /\.(?:jpe?g|png|webp)$/i;
const maximumImageBytes = 15 * 1024 * 1024;

const isCatalogMirror = (directory) =>
  fs.existsSync(path.join(directory, "products.json")) &&
  fs.existsSync(path.join(directory, "image_plan.json"));

const assertManagedDirectory = (directory, expectedName) => {
  if (path.dirname(directory) !== root || path.basename(directory) !== expectedName) {
    throw new Error(`Refusing to replace unmanaged directory: ${directory}`);
  }
};

const copySiteSource = () => {
  assertManagedDirectory(publicRoot, "public");
  fs.rmSync(publicRoot, { recursive: true, force: true });
  fs.mkdirSync(publicRoot, { recursive: true });
  const excludedRoots = new Set([
    ".catalog-build", ".git", ".turbo", ".vercel", ".wrangler", "catalog-data", "products", "public", "scripts",
  ]);
  const excludedFiles = [
    /^\.env/i,
    /^\.gitignore$/i,
    /^\.vercelignore$/i,
    /^package(?:-lock)?\.json$/i,
    /^turbo\.json$/i,
    /^vercel\.json$/i,
    /^SEO_.*\.md$/i,
    /^AGENTS\.md$/i,
    /^_url_map\.json$/i,
  ];
  const filter = (source) => {
    const relative = path.relative(root, source);
    if (!relative) return true;
    const normalized = relative.split(path.sep).join("/");
    const first = normalized.split("/")[0];
    if (excludedRoots.has(first)) return false;
    if (normalized === "wp-content/uploads/catalog" || normalized.startsWith("wp-content/uploads/catalog/")) return false;
    return !excludedFiles.some((pattern) => pattern.test(normalized));
  };
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!filter(path.join(root, entry.name))) continue;
    fs.cpSync(path.join(root, entry.name), path.join(publicRoot, entry.name), {
      recursive: entry.isDirectory(),
      filter,
    });
  }
};

const inflateCatalogSnapshot = () => {
  fs.rmSync(path.join(root, ".catalog-build"), { recursive: true, force: true });
  fs.mkdirSync(buildMirror, { recursive: true });
  for (const name of ["products.json", "image_plan.json", "media_integrity.json"]) {
    const archive = path.join(root, "catalog-data", `${name}.gz`);
    if (!fs.existsSync(archive)) throw new Error(`Missing governed catalog snapshot: ${archive}`);
    fs.writeFileSync(path.join(buildMirror, name), zlib.gunzipSync(fs.readFileSync(archive)));
  }
};

const mediaPathForPlan = (plannedPath) => {
  const extension = path.extname(plannedPath).toLowerCase() === ".jpeg" ? ".jpg" : path.extname(plannedPath).toLowerCase();
  const digest = crypto.createHash("sha1").update(plannedPath).digest("hex").slice(0, 20);
  return `/wp-content/uploads/catalog/${digest.slice(0, 2)}/${digest}${extension}`;
};

const looksLikeImage = (buffer) => {
  if (buffer.length < 100) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return true;
  return false;
};

const fetchBuffer = async (url, expected, timeout = 45_000) => {
  const response = await fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; GloryStarWearRelease/1.0)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > maximumImageBytes) throw new Error(`declared image size exceeds ${maximumImageBytes} bytes`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maximumImageBytes) throw new Error(`image size exceeds ${maximumImageBytes} bytes`);
  if (!looksLikeImage(buffer)) throw new Error(`invalid image payload (${buffer.length} bytes)`);
  const digest = crypto.createHash("sha256").update(buffer).digest("hex");
  if (!expected || buffer.length !== expected.bytes || digest !== expected.sha256) {
    throw new Error(`integrity mismatch (${buffer.length} bytes, sha256 ${digest})`);
  }
  return buffer;
};

const hydrateRemoteMirror = async () => {
  const products = JSON.parse(fs.readFileSync(path.join(buildMirror, "products.json"), "utf8"));
  const imagePlan = JSON.parse(fs.readFileSync(path.join(buildMirror, "image_plan.json"), "utf8"));
  const mediaIntegrity = JSON.parse(fs.readFileSync(path.join(buildMirror, "media_integrity.json"), "utf8"));
  const imagesRoot = path.join(buildMirror, "images");
  const required = new Map();
  for (const product of products) {
    for (const url of product.gallery_urls || []) {
      const plannedPath = imagePlan[url]?.path;
      const resolvedPath = plannedPath ? path.resolve(buildMirror, plannedPath) : "";
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch {
        parsedUrl = null;
      }
      if (!plannedPath || !resolvedPath.startsWith(`${imagesRoot}${path.sep}`) || !allowedImageExtension.test(plannedPath) ||
          parsedUrl?.protocol !== "https:" || parsedUrl.hostname !== "www.sparkgymwear.com" || !mediaIntegrity[plannedPath]) {
        throw new Error(`Invalid gallery mapping for product ${product.id}: ${url}`);
      }
      required.set(plannedPath, url);
    }
  }

  let completed = 0;
  let reused = 0;
  let originFallbacks = 0;
  const failures = [];
  const jobs = [...required.entries()];
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const position = cursor++;
      if (position >= jobs.length) return;
      const [plannedPath, sourceUrl] = jobs[position];
      const expected = mediaIntegrity[plannedPath];
      const destination = path.join(buildMirror, plannedPath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      try {
        let buffer;
        try {
          buffer = await fetchBuffer(`${priorAssetBase}${mediaPathForPlan(plannedPath)}`, expected);
          reused += 1;
        } catch {
          originFallbacks += 1;
          try {
            buffer = await fetchBuffer(sourceUrl, expected, 60_000);
          } catch {
            const bareUrl = sourceUrl.replace(/^https?:\/\//, "");
            buffer = await fetchBuffer(`https://wsrv.nl/?n=-1&url=${encodeURIComponent(bareUrl)}`, expected, 60_000);
          }
        }
        fs.writeFileSync(destination, buffer);
      } catch (error) {
        failures.push(`${plannedPath}: ${error.message}`);
      }
      completed += 1;
      if (completed % 500 === 0 || completed === jobs.length) {
        console.log(`Catalog media ${completed}/${jobs.length} | prior deployment ${reused} | origin fallback ${originFallbacks}`);
      }
    }
  };

  await Promise.all(Array.from({ length: 24 }, worker));
  if (failures.length) {
    throw new Error(`Could not hydrate ${failures.length} catalog image(s):\n${failures.slice(0, 20).join("\n")}`);
  }
  console.log(`Hydrated ${jobs.length} gallery assets (${reused} reused, ${originFallbacks} fetched from source).`);
};

copySiteSource();
let catalogMirror = localMirror;
if (!isCatalogMirror(catalogMirror)) {
  inflateCatalogSnapshot();
  await hydrateRemoteMirror();
  catalogMirror = buildMirror;
} else {
  console.log(`Using local catalog mirror: ${catalogMirror}`);
}

const result = spawnSync(process.execPath, [path.join(root, "scripts", "generate-catalog.mjs"), catalogMirror], {
  cwd: root,
  env: { ...process.env, SITE_OUTPUT_ROOT: publicRoot },
  encoding: "utf8",
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status || 1);

console.log(`Remote release output ready: ${publicRoot}`);
