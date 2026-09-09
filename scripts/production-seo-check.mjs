import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const canonicalOrigin = "https://glorystarwearing.com";
const origin = (process.env.SEO_PRODUCTION_ORIGIN ?? canonicalOrigin).replace(/\/$/, "");
const timeoutMs = Number(process.env.SEO_FETCH_TIMEOUT_MS ?? 15000);
const failures = [];
const warnings = [];

const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);
const normalizeUrl = (value) => value.replace(/\/$/, "") || value;
const robotsTokens = (value) => new Set(String(value).toLowerCase().split(/[\s,]+/).filter(Boolean));
const organizationIdentityKeys = ["name", "legalName", "telephone", "email", "address"];
const fetchUrlForCanonical = (canonicalUrl) => {
  const parsed = new URL(canonicalUrl);
  return `${origin}${parsed.pathname}${parsed.search}`;
};

const localPathForCanonical = (canonicalUrl) => {
  const pathname = new URL(canonicalUrl).pathname;
  if (pathname === "/") return path.join(root, "index.html");
  return path.join(root, pathname.replace(/^\/+|\/+$/g, ""), "index.html");
};

const extractOrganizationIdentity = (html) => {
  const documents = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      documents.push(JSON.parse(match[1]));
    } catch {
      // JSON-LD syntax is enforced by the local audit; production parity reports a missing identity below.
    }
  }
  const nodes = documents.flatMap((document) => Array.isArray(document?.["@graph"]) ? document["@graph"] : [document]);
  const organization = nodes.find((node) => {
    const types = Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]];
    return types.includes("Organization");
  });
  if (!organization) return null;
  const telephone = Array.isArray(organization.telephone)
    ? [...organization.telephone].map(String).sort()
    : organization.telephone ? [String(organization.telephone)] : [];
  const address = organization.address && typeof organization.address === "object"
    ? {
        addressLocality: organization.address.addressLocality ?? "",
        addressRegion: organization.address.addressRegion ?? "",
        addressCountry: organization.address.addressCountry ?? "",
      }
    : { addressLocality: "", addressRegion: "", addressCountry: "" };
  return {
    name: organization.name ?? "",
    legalName: organization.legalName ?? "",
    telephone,
    email: organization.email ?? "",
    address,
  };
};

const differingIdentityKeys = (expected, actual) => organizationIdentityKeys.filter(
  (key) => JSON.stringify(expected?.[key] ?? null) !== JSON.stringify(actual?.[key] ?? null),
);

const fetchPage = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: options.redirect ?? "follow",
      headers: { "user-agent": "GloryStarWear-Production-SEO-Check/1.0" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const localSitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const localUrls = [...localSitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1]);
if (!localUrls.length) {
  console.error("ERROR: local sitemap.xml contains no URLs.");
  process.exit(1);
}

const localHomepagePath = localPathForCanonical(`${canonicalOrigin}/`);
const localReferenceOrganization = fs.existsSync(localHomepagePath)
  ? extractOrganizationIdentity(fs.readFileSync(localHomepagePath, "utf8"))
  : null;
if (!localReferenceOrganization) {
  console.error("ERROR: local homepage has no parseable Organization identity.");
  process.exit(1);
}

let productionUrls = [];
try {
  const response = await fetchPage(`${origin}/sitemap.xml`);
  if (response.status !== 200) fail(`Production sitemap returned HTTP ${response.status}.`);
  const body = await response.text();
  productionUrls = [...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1]);
  const localSet = new Set(localUrls.map(normalizeUrl));
  const productionSet = new Set(productionUrls.map(normalizeUrl));
  const missing = [...localSet].filter((url) => !productionSet.has(url));
  const unexpected = [...productionSet].filter((url) => !localSet.has(url));
  if (missing.length) fail(`Production sitemap is missing ${missing.length} local canonical URL(s): ${missing.join(", ")}`);
  if (unexpected.length) warn(`Production sitemap has ${unexpected.length} URL(s) not in the local sitemap: ${unexpected.join(", ")}`);
} catch (error) {
  fail(`Could not fetch production sitemap: ${error.message}`);
}

try {
  const response = await fetchPage(`${origin}/robots.txt`);
  const body = await response.text();
  if (response.status !== 200) fail(`Production robots.txt returned HTTP ${response.status}.`);
  if (!new RegExp(`^Sitemap:\\s*${canonicalOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml\\s*$`, "mi").test(body)) {
    fail("Production robots.txt does not advertise the canonical sitemap.");
  }
  if (/^User-agent:\s*\*\s*[\r\n]+Disallow:\s*\/\s*$/mi.test(body)) fail("Production robots.txt blocks all crawlers.");
  const blockedAiBots = [...body.matchAll(/^User-agent:\s*(OAI-SearchBot|Claude-SearchBot|Claude-User|Google-Extended|PerplexityBot|Perplexity-User)\s*[\r\n]+Disallow:\s*\/\s*$/gmi)]
    .map((match) => match[1]);
  if (blockedAiBots.length) warn(`Production robots.txt blocks AI retrieval agents: ${blockedAiBots.join(", ")}. Review this against the AI citation policy.`);
} catch (error) {
  fail(`Could not fetch production robots.txt: ${error.message}`);
}

const pageResults = [];
let organizationParityCount = 0;
const checkCanonicalPage = async (canonicalUrl) => {
  const targetUrl = fetchUrlForCanonical(canonicalUrl);
  try {
    const localPagePath = localPathForCanonical(canonicalUrl);
    if (!fs.existsSync(localPagePath)) {
      fail(`Local canonical file is missing for ${canonicalUrl}: ${path.relative(root, localPagePath)}.`);
      return;
    }
    const localBody = fs.readFileSync(localPagePath, "utf8");
    const localOrganization = extractOrganizationIdentity(localBody);
    if (!localOrganization) {
      fail(`Local canonical ${canonicalUrl} has no parseable Organization identity.`);
    } else {
      const localDifferences = differingIdentityKeys(localReferenceOrganization, localOrganization);
      if (localDifferences.length) {
        fail(`Local canonical ${canonicalUrl} differs from the homepage Organization identity in: ${localDifferences.join(", ")}.`);
      }
    }
    const response = await fetchPage(targetUrl);
    const body = await response.text();
    const productionOrganization = extractOrganizationIdentity(body);
    const canonical = body.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]
      ?? body.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1];
    const headerRobots = response.headers.get("x-robots-tag") ?? "";
    const metaRobots = body.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] ?? "";
    pageResults.push({ canonicalUrl, targetUrl, status: response.status, finalUrl: response.url, canonical });
    if (response.status !== 200) fail(`${targetUrl} returned HTTP ${response.status}.`);
    if (normalizeUrl(response.url) !== normalizeUrl(targetUrl)) fail(`${targetUrl} resolved to unexpected final URL ${response.url}.`);
    if (normalizeUrl(canonical ?? "") !== normalizeUrl(canonicalUrl)) fail(`${targetUrl} has unexpected or missing canonical ${canonical ?? "(missing)"}; expected ${canonicalUrl}.`);
    if (!productionOrganization) {
      fail(`${targetUrl} has no parseable production Organization identity.`);
    } else if (localOrganization) {
      const productionDifferences = differingIdentityKeys(localOrganization, productionOrganization);
      if (productionDifferences.length) {
        fail(`${targetUrl} production Organization identity differs from the local release in: ${productionDifferences.join(", ")}.`);
      } else {
        organizationParityCount += 1;
      }
    }
    const metaTokens = robotsTokens(metaRobots);
    const headerTokens = robotsTokens(headerRobots.replace(/\w+\s*:/g, " "));
    const blockedTokens = ["noindex", "nofollow", "none"];
    if (!metaTokens.has("index") || !metaTokens.has("follow") || blockedTokens.some((token) => metaTokens.has(token) || headerTokens.has(token))) {
      fail(`${targetUrl} is not explicitly index,follow in the tested release.`);
    }
  } catch (error) {
    fail(`${targetUrl} could not be checked: ${error.message}`);
  }
};

const pageConcurrency = Math.max(1, Number(process.env.SEO_PAGE_CONCURRENCY ?? 24));
let nextPageIndex = 0;
await Promise.all(Array.from({ length: Math.min(pageConcurrency, localUrls.length) }, async () => {
  while (nextPageIndex < localUrls.length) {
    const currentIndex = nextPageIndex;
    nextPageIndex += 1;
    await checkCanonicalPage(localUrls[currentIndex]);
    if ((currentIndex + 1) % 100 === 0 || currentIndex + 1 === localUrls.length) {
      console.log(`Checked ${currentIndex + 1}/${localUrls.length} production pages...`);
    }
  }
}));

if (origin === canonicalOrigin) {
  for (const test of [
    ["https://www.glorystarwearing.com/", `${canonicalOrigin}/`],
    ["https://www.glorystarwearing.com/request-a-quote/", `${canonicalOrigin}/request-a-quote/`],
  ]) {
    try {
      const response = await fetchPage(test[0], { redirect: "manual" });
      const location = response.headers.get("location");
      if (![301, 308].includes(response.status) || normalizeUrl(location ?? "") !== normalizeUrl(test[1])) {
        fail(`${test[0]} should permanently redirect to ${test[1]}; received HTTP ${response.status} → ${location ?? "(no location)"}.`);
      }
    } catch (error) {
      fail(`Could not verify www redirect for ${test[0]}: ${error.message}`);
    }
  }
} else {
  warn(`Skipped canonical www redirect checks while testing alternate origin ${origin}.`);
}

console.log(`Production SEO check: ${origin}`);
console.log(`Local sitemap URLs: ${localUrls.length} | production sitemap URLs: ${productionUrls.length} | pages checked: ${pageResults.length} | Organization parity: ${organizationParityCount}/${localUrls.length}`);
for (const message of warnings) console.warn(`WARNING: ${message}`);
if (failures.length) {
  for (const message of failures) console.error(`ERROR: ${message}`);
  process.exit(1);
}
console.log("PASS: production matches the local canonical release and remains indexable.");
