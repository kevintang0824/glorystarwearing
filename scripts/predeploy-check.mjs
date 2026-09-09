import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];
const checks = [];
const pass = (message) => checks.push(message);
const fail = (message) => failures.push(message);

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) fail(`${command} ${args.join(" ")} failed${output ? `:\n${output}` : "."}`);
  else {
    pass(`${command} ${args.join(" ")}`);
    if (output) console.log(output);
  }
};

run(process.execPath, ["scripts/seo-audit.mjs"]);
run(process.execPath, ["--check", "scripts/seo-audit.mjs"]);
run(process.execPath, ["--check", "scripts/production-seo-check.mjs"]);
run(process.execPath, ["--check", "scripts/postbuild-check.mjs"]);
run(process.execPath, ["--check", "scripts/indexnow-submit.mjs"]);
run(process.execPath, ["--check", "scripts/generate-catalog.mjs"]);
run(process.execPath, ["--check", "scripts/build-catalog-snapshot.mjs"]);
run(process.execPath, ["--check", "scripts/remote-release-build.mjs"]);
run(process.execPath, ["--check", "scripts/cache-release-slice.mjs"]);
run(process.execPath, ["--check", "scripts/verify-release-output.mjs"]);
run(process.execPath, ["--check", "scripts/restore-release-cache.mjs"]);
run(process.execPath, ["--check", "assets/seo-pages.js"]);
run(process.execPath, ["--check", "assets/privacy-controls.js"]);
run(process.execPath, ["--check", "assets/catalog.js"]);
run(process.execPath, ["--check", "assets/multilingual.js"]);
run(process.execPath, ["--check", "scripts/prepare-multilingual.mjs"]);
run(process.execPath, ["--check", "scripts/locales.mjs"]);
run(process.execPath, ["--check", "assets/localized-site.js"]);
run("xmllint", ["--noout", "sitemap.xml"]);
run("git", ["diff", "--check"]);

const sharedFormHandler = fs.readFileSync(path.join(root, "assets/seo-pages.js"), "utf8");
const homepageHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const [label, source] of [["shared quote handler", sharedFormHandler], ["homepage inquiry handler", homepageHtml]]) {
  if (/window\.open\s*\([^)]*,\s*["']_blank["']\s*,/i.test(source)) {
    fail(`${label} must not infer popup success from window.open when noopener-style features can force a null return.`);
  } else if (!/window\.open\s*\(\s*["']["']\s*,\s*["']_blank["']\s*\)/i.test(source) || !/\.opener\s*=\s*null/i.test(source)) {
    fail(`${label} is missing the governed single-navigation WhatsApp window pattern.`);
  } else pass(`${label} single-navigation guard`);
  if (!/dataset\.submitting/i.test(source) || !/disabled\s*=\s*true/i.test(source)) fail(`${label} is missing duplicate-submit protection.`);
  else pass(`${label} duplicate-submit guard`);
}

const vercelPath = path.join(root, "vercel.json");
try {
  const config = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
  if (config.trailingSlash !== true) fail("vercel.json must canonicalize directory routes with trailingSlash: true.");
  else pass("Vercel trailing-slash canonicalization");
  if (config.buildCommand !== "node scripts/restore-release-cache.mjs" || config.outputDirectory !== "public") {
    fail("vercel.json must use the governed immutable release restore and public output directory.");
  } else pass("Vercel governed immutable release restore");
  const redirects = Array.isArray(config.redirects) ? config.redirects : [];
  const hasHostRedirect = (source, destination) => redirects.some((redirect) =>
    redirect.source === source &&
    redirect.destination === destination &&
    redirect.permanent === true &&
    redirect.has?.some((condition) => condition.type === "host" && condition.value === "www.glorystarwearing.com")
  );
  if (!hasHostRedirect("/", "https://glorystarwearing.com/")) fail("vercel.json is missing the permanent www homepage redirect.");
  else pass("Vercel www homepage redirect");
  if (!hasHostRedirect("/:path*", "https://glorystarwearing.com/:path*")) fail("vercel.json is missing the permanent www path redirect.");
  else pass("Vercel www path redirect");

  const globalHeaders = config.headers?.find((rule) => rule.source === "/(.*)")?.headers ?? [];
  for (const required of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
    if (!globalHeaders.some((header) => header.key.toLowerCase() === required.toLowerCase())) fail(`vercel.json is missing ${required}.`);
    else pass(`Vercel ${required}`);
  }
  const assetCache = config.headers?.find((rule) => rule.source === "/wp-content/(.*)")?.headers ?? [];
  const assetCacheValue = assetCache.find((header) => header.key.toLowerCase() === "cache-control")?.value ?? "";
  const browserMaxAge = Number(assetCacheValue.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1] ?? Number.NaN);
  if (!assetCacheValue || /immutable/i.test(assetCacheValue) || !Number.isFinite(browserMaxAge) || browserMaxAge > 604800) {
    fail("Stable-name /wp-content assets need a revalidating browser cache of at most seven days and must not be immutable.");
  } else pass("Vercel revalidating asset cache");
} catch (error) {
  fail(`vercel.json cannot be parsed: ${error.message}`);
}

const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
if (!/^User-agent:\s*\*$/mi.test(robots) || !/^Allow:\s*\/$/mi.test(robots)) fail("robots.txt does not explicitly allow crawling.");
else pass("robots crawl permission");
if (!/^Sitemap:\s*https:\/\/glorystarwearing\.com\/sitemap\.xml$/mi.test(robots)) fail("robots.txt does not advertise the canonical sitemap.");
else pass("robots canonical sitemap");
for (const bot of ["OAI-SearchBot", "Claude-SearchBot", "Claude-User", "Google-Extended", "PerplexityBot", "Perplexity-User"]) {
  const policy = new RegExp(`^User-agent:\\s*${bot}\\s*[\\r\\n]+Allow:\\s*\\/\\s*$`, "mi");
  if (!policy.test(robots)) fail(`robots.txt must allow the AI retrieval agent ${bot}.`);
  else pass(`robots AI retrieval policy: ${bot}`);
}
for (const bot of ["GPTBot", "ClaudeBot", "CCBot"]) {
  const policy = new RegExp(`^User-agent:\\s*${bot}\\s*[\\r\\n]+Disallow:\\s*\\/\\s*$`, "mi");
  if (!policy.test(robots)) fail(`robots.txt must keep the training crawler ${bot} blocked.`);
  else pass(`robots training policy: ${bot}`);
}

for (const route of ["products", "private-label-activewear", "about-glory-star-wear", "support", "contact-us", "request-a-quote"]) {
  const pagePath = path.join(root, route, "index.html");
  if (!fs.existsSync(pagePath)) fail(`Primary navigation target is missing: /${route}/.`);
  else {
    const page = fs.readFileSync(pagePath, "utf8");
    if (!page.includes(`<link rel="canonical" href="https://glorystarwearing.com/${route}/">`)) {
      fail(`Primary navigation target has a missing or incorrect canonical: /${route}/.`);
    } else pass(`Primary navigation target /${route}/`);
  }
}

const indexNowKeys = fs.readdirSync(root)
  .filter((name) => /^[A-Za-z0-9-]{8,128}\.txt$/.test(name))
  .filter((name) => fs.readFileSync(path.join(root, name), "utf8").trim() === name.slice(0, -4));
if (indexNowKeys.length !== 1) fail(`Expected exactly one valid root IndexNow key file; found ${indexNowKeys.length}.`);
else pass("IndexNow root key file");

for (const snapshot of ["catalog-data/products.json.gz", "catalog-data/image_plan.json.gz", "catalog-data/media_integrity.json.gz", "catalog-data/release-cache-manifest.json", "package.json", "package-lock.json", "turbo.json"]) {
  const snapshotPath = path.join(root, snapshot);
  if (!fs.existsSync(snapshotPath) || fs.statSync(snapshotPath).size < 100) fail(`Catalog snapshot is missing or empty: ${snapshot}.`);
  else pass(`${snapshot} packaged for Git builds`);
}

try {
  const releaseManifest = JSON.parse(fs.readFileSync(path.join(root, "catalog-data", "release-cache-manifest.json"), "utf8"));
  const expectedReleaseTasks = ["cache-core", ..."0123456789abcdef".split("").map((prefix) => `cache-media-${prefix}`)];
  const artifactTasks = releaseManifest.artifacts?.map((artifact) => artifact.task) ?? [];
  const validArtifacts = releaseManifest.artifacts?.every((artifact) =>
    /^[0-9a-f]{16}$/.test(artifact.hash) && /^[0-9a-f]{64}$/.test(artifact.sha256) &&
    Number.isInteger(artifact.bytes) && artifact.bytes > 1_000_000
  );
  if (releaseManifest.version !== 1 || !/^team_[A-Za-z0-9]+$/.test(releaseManifest.teamId ?? "") ||
      JSON.stringify(artifactTasks) !== JSON.stringify(expectedReleaseTasks) || !validArtifacts ||
      new Set(releaseManifest.artifacts?.map((artifact) => artifact.hash)).size !== 17) {
    fail("Immutable release cache manifest is invalid.");
  } else pass("17 immutable release cache artifacts governed");
} catch (error) {
  fail(`Immutable release cache manifest cannot be validated: ${error.message}`);
}

try {
  const packageConfig = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const packageLock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
  const turboConfig = JSON.parse(fs.readFileSync(path.join(root, "turbo.json"), "utf8"));
  const prefixes = "0123456789abcdef".split("");
  const expectedCacheTasks = ["cache-core", ...prefixes.map((prefix) => `cache-media-${prefix}`)];
  if (packageLock.lockfileVersion !== 3 || packageLock.packages?.[""]?.name !== packageConfig.name ||
      packageLock.packages?.[""]?.version !== packageConfig.version) fail("package-lock.json does not pin the release package metadata.");
  else pass("Release package lock is deterministic");
  if (turboConfig.remoteCache?.timeout !== 600 || turboConfig.remoteCache?.uploadTimeout !== 0) fail("Turbo remote cache requests must use the governed extended and unlimited upload timeouts.");
  else pass("Turbo remote cache upload timeout is governed");
  if (packageConfig.scripts?.["cache-core"] !== "node scripts/cache-release-slice.mjs core" ||
      packageConfig.scripts?.release !== "node scripts/verify-release-output.mjs") {
    fail("package.json is missing the governed release cache and verification commands.");
  } else pass("Governed release cache commands");
  for (const prefix of prefixes) {
    const taskName = `cache-media-${prefix}`;
    const expectedCommand = `node scripts/cache-release-slice.mjs ${prefix}`;
    const task = turboConfig.tasks?.[taskName];
    const expectedOutput = `public/wp-content/uploads/catalog/${prefix}*/**`;
    if (packageConfig.scripts?.[taskName] !== expectedCommand || task?.cache !== true ||
        JSON.stringify(task.inputs) !== JSON.stringify(["catalog-data/**"]) ||
        JSON.stringify(task.outputs) !== JSON.stringify([expectedOutput])) {
      fail(`Release cache shard ${prefix} is not configured correctly.`);
    }
  }
  if (!failures.some((message) => /^Release cache shard/.test(message))) pass("16 governed media cache shards");
  const coreTask = turboConfig.tasks?.["cache-core"];
  if (coreTask?.cache !== true || JSON.stringify(coreTask.inputs) !== JSON.stringify(["catalog-data/**"]) ||
      !coreTask.outputs?.includes("public/**") || !coreTask.outputs?.includes("!public/wp-content/uploads/catalog/**")) {
    fail("Release core cache must exclude governed catalog media.");
  } else pass("Release core cache excludes catalog media");
  const releaseTask = turboConfig.tasks?.release;
  if (releaseTask?.cache !== false || JSON.stringify(releaseTask.dependsOn) !== JSON.stringify(expectedCacheTasks)) {
    fail("Release verification must depend on all 17 governed cache shards.");
  } else pass("Release verification depends on all cache shards");
} catch (error) {
  fail(`Release cache configuration cannot be validated: ${error.message}`);
}

const vercelIgnorePath = path.join(root, ".vercelignore");
if (!fs.existsSync(vercelIgnorePath)) fail(".vercelignore is missing.");
else {
  const ignored = fs.readFileSync(vercelIgnorePath, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const required of [".env*", "_url_map.json", "SEO_*.md", ".catalog-build", ".turbo", ".wrangler", "products", "public", "wp-content/uploads/catalog"]) {
    if (!ignored.includes(required)) fail(`.vercelignore must exclude ${required}.`);
    else pass(`Vercel excludes ${required}`);
  }
  if (ignored.includes("scripts") || ignored.includes("catalog-data")) fail(".vercelignore must retain scripts and catalog-data for remote builds.");
  else pass("Vercel retains governed build scripts and catalog snapshots");
}

const trackedEnvironmentFiles = spawnSync("git", ["ls-files", "*.env", ".env*"], { cwd: root, encoding: "utf8" }).stdout.trim();
if (trackedEnvironmentFiles) fail(`Environment files are tracked by git: ${trackedEnvironmentFiles.replace(/\n/g, ", ")}`);
else pass("No tracked environment files");

const aiTestPath = path.join(root, "SEO_AI_VISIBILITY_TESTS.md");
if (!fs.existsSync(aiTestPath)) fail("SEO_AI_VISIBILITY_TESTS.md is missing.");
else {
  const aiTests = fs.readFileSync(aiTestPath, "utf8");
  const rows = [...aiTests.matchAll(/^\|\s*(AEO-\d{2})\s*\|.*?\|\s*`(\/[^`]*)`\s*\|$/gm)];
  const ids = rows.map((match) => match[1]);
  if (rows.length !== 15 || new Set(ids).size !== rows.length) fail(`Expected 15 unique AEO prompt mappings; found ${rows.length} rows and ${new Set(ids).size} unique IDs.`);
  else pass("15 unique AEO prompt mappings");
  for (const [, id, route] of rows) {
    const target = route === "/" ? path.join(root, "index.html") : path.join(root, route.replace(/^\//, ""), "index.html");
    if (!fs.existsSync(target)) fail(`${id} points to missing target ${route}.`);
  }
  if (!failures.some((message) => /^AEO-\d{2} points/.test(message))) pass("All AEO prompt targets exist");
}

const htmlFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".catalog-build", ".git", ".vercel", "public"].includes(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(entryPath);
    else if (entry.name.endsWith(".html")) htmlFiles.push(entryPath);
  }
};
walk(root);
for (const htmlPath of htmlFiles) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const label = path.relative(root, htmlPath);
  if (/https?:\/\/(?:www\.)?sparkgymwear\.com/i.test(html)) fail(`${label} still references the source domain sparkgymwear.com.`);
  if (/\b(?:spark|sparky|sparkle)\b|cropped-16-scaled-1|YUmxDWR9iaA/i.test(html)) fail(`${label} still contains a legacy Spark brand reference or asset.`);
  if (/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(html)) fail(`${label} contains a local development URL.`);
  if (/rel=["']canonical["'][^>]+href=["']https:\/\/www\.glorystarwearing\.com/i.test(html)) fail(`${label} uses www in its canonical.`);
}
if (!failures.some((message) => /source domain|legacy Spark|development URL|uses www/.test(message))) pass("No source-domain, legacy-brand, localhost or www-canonical leaks");

console.log(`Predeploy checks passed: ${checks.length}`);
if (failures.length) {
  for (const message of failures) console.error(`ERROR: ${message}`);
  process.exit(1);
}
console.log("PASS: release candidate passed all local predeploy checks.");
