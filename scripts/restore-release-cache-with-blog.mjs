import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const blogRoot = path.join(root, "blog");
const outputBlogRoot = path.join(publicRoot, "blog");
const restore = spawnSync(process.execPath, [path.join(root, "scripts", "restore-release-cache.mjs")], {
  cwd: root,
  encoding: "utf8",
});
if (restore.stdout) process.stdout.write(restore.stdout);
if (restore.stderr) process.stderr.write(restore.stderr);
if (restore.status !== 0) {
  const restoreOutput = (restore.stdout || "") + (restore.stderr || "");
  if (!restoreOutput.includes("Release core is stale for")) process.exit(restore.status || 1);

  console.warn("Refreshing stale canonical pages from the checked-out source before release verification.");
  const sourceSitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const routes = [...sourceSitemap.matchAll(/<loc>\s*https:\/\/glorystarwearing\.com(\/[^<]*)\s*<\/loc>/gi)]
    .map((match) => match[1])
    .filter((route) => !route.startsWith("/products/"));
  for (const route of routes) {
    const relative = route === "/" ? "index.html" : path.join(route.replace(/^\/|\/$/g, ""), "index.html");
    const source = path.resolve(root, relative);
    const output = path.resolve(publicRoot, relative);
    if (!source.startsWith(root + path.sep) || !output.startsWith(publicRoot + path.sep) || !fs.existsSync(source)) {
      throw new Error("A canonical source page is missing or unsafe: " + route);
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(source, output);
  }
  const verification = spawnSync(process.execPath, [path.join(root, "scripts", "verify-release-output.mjs")], {
    cwd: root,
    stdio: "inherit",
  });
  if (verification.status !== 0) process.exit(verification.status || 1);
}
if (path.dirname(outputBlogRoot) !== publicRoot || path.basename(outputBlogRoot) !== "blog") {
  throw new Error("Refusing to write the blog outside the Vercel output directory.");
}

fs.rmSync(outputBlogRoot, { recursive: true, force: true });
fs.mkdirSync(outputBlogRoot, { recursive: true });
fs.copyFileSync(path.join(blogRoot, "index.html"), path.join(outputBlogRoot, "index.html"));
const posts = JSON.parse(fs.readFileSync(path.join(blogRoot, "posts.json"), "utf8"));
if (!Array.isArray(posts)) throw new Error("blog/posts.json must contain an array.");
for (const post of posts) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date || "") || !/^[a-z0-9-]+$/.test(post.slug || "")) {
    throw new Error("A blog manifest entry has an invalid date or slug.");
  }
}
const urls = [];
if (posts.length) {
  const latestDate = posts.map((post) => post.date).sort().at(-1);
  urls.push({ url: "https://glorystarwearing.com/blog/", lastmod: latestDate });
}
for (const post of posts) {
  const relative = post.date + "-" + post.slug + "/index.html";
  const source = path.join(blogRoot, relative);
  const output = path.join(outputBlogRoot, relative);
  if (!fs.existsSync(source) || path.relative(outputBlogRoot, output).startsWith("..")) {
    throw new Error("A blog article path is missing or unsafe: " + relative);
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(source, output);
  urls.push({
    url: "https://glorystarwearing.com/blog/" + post.date + "-" + post.slug + "/",
    lastmod: post.date,
  });
}

const sitemapPath = path.join(publicRoot, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPath, "utf8");
if (!/<urlset\b/.test(sitemap) || !/<\/urlset>\s*$/.test(sitemap)) {
  throw new Error("The restored sitemap is missing a complete urlset.");
}
const existing = new Set([...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => match[1]));
const additions = [...new Map(urls.map((entry) => [entry.url, entry])).values()]
  .filter((entry) => !existing.has(entry.url));
if (additions.length) {
  const xml = additions.map(({ url, lastmod }) => "  <url><loc>" + url + "</loc><lastmod>" + lastmod + "</lastmod></url>").join("\n");
  sitemap = sitemap.replace(/<\/urlset>\s*$/, xml + "\n</urlset>\n");
  fs.writeFileSync(sitemapPath, sitemap);
}
const releasedUrls = new Set([...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => match[1]));
const missingBlogUrls = urls.filter(({ url }) => !releasedUrls.has(url));
if (missingBlogUrls.length) {
  throw new Error("The release sitemap is missing blog URL(s): " + missingBlogUrls.map(({ url }) => url).join(", "));
}
const seoAudit = spawnSync(process.execPath, [path.join(root, "scripts", "seo-audit.mjs")], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
});
if (seoAudit.status !== 0) process.exit(seoAudit.status || 1);
console.log("Blog deployment overlay ready: " + posts.length + " article(s), " + additions.length + " sitemap URL(s) added.");
