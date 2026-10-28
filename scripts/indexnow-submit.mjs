import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const origin = "https://glorystarwearing.com";
const args = process.argv.slice(2);
const submit = args.includes("--submit");
const verifyProduction = submit || args.includes("--verify-production");
const timeoutMs = Number(process.env.INDEXNOW_FETCH_TIMEOUT_MS ?? 15000);
const concurrency = Math.max(1, Number(process.env.INDEXNOW_URL_CONCURRENCY ?? 24));
const requestedUrls = [];

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--url") {
    if (!args[index + 1]) {
      console.error("ERROR: --url requires an absolute canonical URL.");
      process.exit(1);
    }
    requestedUrls.push(args[index + 1]);
    index += 1;
  } else if (!["--submit", "--verify-production"].includes(args[index])) {
    console.error(`ERROR: unknown argument ${args[index]}.`);
    process.exit(1);
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1]);
if (!sitemapUrls.length || sitemapUrls.length > 10000) {
  console.error(`ERROR: sitemap contains ${sitemapUrls.length} URLs; IndexNow bulk posts require 1–10,000 URLs.`);
  process.exit(1);
}

const keyCandidates = fs.readdirSync(root)
  .filter((name) => /^[A-Za-z0-9-]{8,128}\.txt$/.test(name))
  .filter((name) => fs.readFileSync(path.join(root, name), "utf8").trim() === name.slice(0, -4));
if (keyCandidates.length !== 1) {
  console.error(`ERROR: expected exactly one valid root IndexNow key file; found ${keyCandidates.length}.`);
  process.exit(1);
}

const keyFile = keyCandidates[0];
const key = keyFile.slice(0, -4);
const allowed = new Set(sitemapUrls);
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};
const urlList = requestedUrls.length ? [...new Set(requestedUrls)] : sitemapUrls;
const invalidUrls = urlList.filter((value) => {
  try {
    const url = new URL(value);
    return url.origin !== origin || !allowed.has(value);
  } catch {
    return true;
  }
});
if (invalidUrls.length) {
  console.error(`ERROR: submit only canonical URLs currently declared in sitemap.xml: ${invalidUrls.join(", ")}`);
  process.exit(1);
}

const payload = {
  host: new URL(origin).host,
  key,
  keyLocation: `${origin}/${keyFile}`,
  urlList,
};

console.log(`IndexNow release: ${urlList.length} URL(s)`);
console.log(`Key location: ${payload.keyLocation}`);
console.log(`Mode: ${submit ? "SUBMIT" : verifyProduction ? "VERIFY ONLY" : "DRY RUN"}`);
for (const url of urlList) console.log(`- ${url}`);

if (!verifyProduction) {
  console.log("DRY RUN: no network request was made. Use --verify-production after deployment, then --submit only for URLs just added or changed.");
  process.exit(0);
}

const keyResponse = await fetchWithTimeout(payload.keyLocation, {
  headers: { "user-agent": "GloryStarWear-IndexNow/1.0" },
});
const productionKey = (await keyResponse.text()).trim();
if (keyResponse.status !== 200 || productionKey !== key) {
  console.error(`ERROR: production key verification failed (HTTP ${keyResponse.status}). Deploy the matching key file before submission.`);
  process.exit(1);
}

const unavailable = [];
let nextUrlIndex = 0;
const checkUrl = async () => {
  while (nextUrlIndex < urlList.length) {
    const currentIndex = nextUrlIndex;
    nextUrlIndex += 1;
    const url = urlList[currentIndex];
    try {
      const response = await fetchWithTimeout(url, {
        redirect: "follow",
        headers: { "user-agent": "GloryStarWear-IndexNow/1.0" },
      });
      const finalUrl = response.url;
      if (response.body) await response.body.cancel();
      if (response.status !== 200 || finalUrl.replace(/\/$/, "") !== url.replace(/\/$/, "")) {
        unavailable.push(url + " (HTTP " + response.status + " → " + finalUrl + ")");
      }
    } catch (error) {
      unavailable.push(url + " (" + error.message + ")");
    }
    if ((currentIndex + 1) % 100 === 0 || currentIndex + 1 === urlList.length) {
      console.log("Verified " + (currentIndex + 1) + "/" + urlList.length + " production URLs...");
    }
  }
};
await Promise.all(Array.from({ length: Math.min(concurrency, urlList.length) }, checkUrl));
if (unavailable.length) {
  console.error(`ERROR: refusing IndexNow submission because ${unavailable.length} canonical URL(s) are not live at their final 200 URL:`);
  for (const item of unavailable) console.error(`- ${item}`);
  process.exit(1);
}
console.log("PASS: production key and selected canonical URLs are live.");

if (!submit) {
  console.log("VERIFY ONLY: no IndexNow submission was made.");
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8", "user-agent": "GloryStarWear-IndexNow/1.0" },
  body: JSON.stringify(payload),
});
const responseBody = (await response.text()).trim();
if (![200, 202].includes(response.status)) {
  console.error(`ERROR: IndexNow returned HTTP ${response.status}${responseBody ? `: ${responseBody}` : ""}.`);
  process.exit(1);
}
console.log(`PASS: IndexNow accepted ${urlList.length} URL(s) with HTTP ${response.status}. This proves receipt, not crawling, indexing, or ranking.`);
