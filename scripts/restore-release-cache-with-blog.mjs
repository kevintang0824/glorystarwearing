import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const blogRoot = path.join(root, "blog");
const outputBlogRoot = path.join(publicRoot, "blog");
const restore = spawnSync(process.execPath, [path.join(root, "scripts", "restore-release-cache.mjs")], {
  cwd: root,
  stdio: "inherit",
});
if (restore.status !== 0) process.exit(restore.status || 1);
if (path.dirname(outputBlogRoot) !== publicRoot || path.basename(outputBlogRoot) !== "blog") {
  throw new Error("Refusing to write the blog outside the Vercel output directory.");
}

fs.rmSync(outputBlogRoot, { recursive: true, force: true });
fs.mkdirSync(outputBlogRoot, { recursive: true });
fs.copyFileSync(path.join(blogRoot, "index.html"), path.join(outputBlogRoot, "index.html"));
const posts = JSON.parse(fs.readFileSync(path.join(blogRoot, "posts.json"), "utf8"));
if (!Array.isArray(posts)) throw new Error("blog/posts.json must contain an array.");
const urls = ["https://glorystarwearing.com/blog/"];
for (const post of posts) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date || "") || !/^[a-z0-9-]+$/.test(post.slug || "")) {
    throw new Error("A blog manifest entry has an invalid date or slug.");
  }
  const relative = post.date + "-" + post.slug + "/index.html";
  const source = path.join(blogRoot, relative);
  const output = path.join(outputBlogRoot, relative);
  if (!fs.existsSync(source) || path.relative(outputBlogRoot, output).startsWith("..")) {
    throw new Error("A blog article path is missing or unsafe: " + relative);
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(source, output);
  urls.push("https://glorystarwearing.com/blog/" + post.date + "-" + post.slug + "/");
}

const sitemapPath = path.join(publicRoot, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPath, "utf8");
if (!/<urlset\b/.test(sitemap) || !/<\/urlset>\s*$/.test(sitemap)) {
  throw new Error("The restored sitemap is missing a complete urlset.");
}
const existing = new Set([...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => match[1]));
const additions = [...new Set(urls)].filter((url) => !existing.has(url));
if (additions.length) {
  const xml = additions.map((url) => "  <url><loc>" + url + "</loc></url>").join("\n");
  sitemap = sitemap.replace(/<\/urlset>\s*$/, xml + "\n</urlset>\n");
  fs.writeFileSync(sitemapPath, sitemap);
}
console.log("Blog deployment overlay ready: " + posts.length + " article(s), " + additions.length + " sitemap URL(s) added.");
