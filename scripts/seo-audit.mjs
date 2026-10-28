import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const htmlPath = path.join(root, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

const findings = [];
const add = (severity, code, message) => findings.push({ severity, code, message });
const count = (pattern) => [...html.matchAll(pattern)].length;
const robotsTokens = (value) => new Set(String(value).toLowerCase().split(/[\s,]+/).filter(Boolean));
const organizationIdentityKeys = ["@id", "name", "legalName", "url", "telephone", "email", "address"];
const extractStructuredNodes = (source) => {
  const nodes = [];
  for (const match of source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      nodes.push(data, ...(Array.isArray(data?.["@graph"]) ? data["@graph"] : []));
    } catch {
      // The page-level audit reports invalid JSON-LD with file context.
    }
  }
  return nodes;
};
const normalizeOrganizationIdentity = (organization) => ({
  "@id": organization?.["@id"] ?? "",
  name: organization?.name ?? "",
  legalName: organization?.legalName ?? "",
  url: organization?.url ?? "",
  telephone: (Array.isArray(organization?.telephone)
    ? organization.telephone
    : organization?.telephone ? [organization.telephone] : [])
    .map(String).sort(),
  email: organization?.email ?? "",
  address: organization?.address && typeof organization.address === "object"
    ? {
        addressLocality: organization.address.addressLocality ?? "",
        addressRegion: organization.address.addressRegion ?? "",
        addressCountry: organization.address.addressCountry ?? "",
      }
    : { addressLocality: "", addressRegion: "", addressCountry: "" },
});
const homepageOrganization = extractStructuredNodes(html).find((node) => node?.["@type"] === "Organization");
const homepageOrganizationIdentity = homepageOrganization
  ? normalizeOrganizationIdentity(homepageOrganization)
  : null;

const requiredSingles = [
  ["title", /<title\b[^>]*>[\s\S]*?<\/title>/gi],
  ["meta-description", /<meta\b[^>]*name=["']description["'][^>]*>/gi],
  ["canonical", /<link\b[^>]*rel=["']canonical["'][^>]*>/gi],
  ["viewport", /<meta\b[^>]*name=["']viewport["'][^>]*>/gi],
];

for (const [name, pattern] of requiredSingles) {
  const total = count(pattern);
  if (total !== 1) add("error", `single-${name}`, `Expected exactly one ${name}; found ${total}.`);
}

const h1Count = count(/<h1\b[^>]*>/gi);
if (h1Count !== 1) add("error", "h1-count", `Expected exactly one H1; found ${h1Count}.`);

const titleText = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/\s+/g, " ").trim() ?? "";
const descriptionTag = html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)?.[0] ?? "";
const descriptionText = descriptionTag.match(/\bcontent=["']([^"']*)["']/i)?.[1].trim() ?? "";
if (titleText.length > 60) add("warning", "title-length", `Title is ${titleText.length} characters; review SERP truncation.`);
if (descriptionText.length > 160) add("warning", "description-length", `Meta description is ${descriptionText.length} characters; review SERP truncation.`);

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) {
  add("error", "duplicate-ids", `Duplicate IDs: ${duplicateIds.join(", ")}`);
}

const idSet = new Set(ids);
const missingAnchors = new Set();
for (const match of html.matchAll(/\bhref=["'](?:\/)?#([^"']+)["']/gi)) {
  if (!idSet.has(match[1])) missingAnchors.add(match[1]);
}
if (missingAnchors.size) add("error", "missing-anchors", `Links target missing IDs: ${[...missingAnchors].join(", ")}`);

const forms = count(/<form\b[^>]*class=["'][^"']*elementor-form[^"']*["']/gi);
if (forms && !html.includes('id="glorystarwearing-inquiry-handler"')) {
  add("error", "inquiry-handler", `${forms} inquiry forms exist without the static WhatsApp submit handler.`);
}

for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
  try {
    JSON.parse(match[1]);
  } catch (error) {
    add("error", "invalid-json-ld", error.message);
  }
}

const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
const missingAlt = images.filter((tag) => !/\balt=["'][^"']*["']/i.test(tag)).length;
const missingDimensions = images.filter((tag) => !/\bwidth=["'][^"']+["']/i.test(tag) || !/\bheight=["'][^"']+["']/i.test(tag)).length;
if (missingAlt) add("warning", "image-alt", `${missingAlt} of ${images.length} images have no alt attribute.`);
if (missingDimensions) add("warning", "image-dimensions", `${missingDimensions} of ${images.length} images lack width or height.`);

const assetAttributes = /\b(?:src|href|data-lazy-src|data-rocket-src)=["']([^"']+)["']/gi;
const missingAssets = new Set();
for (const match of html.matchAll(assetAttributes)) {
  const raw = match[1].replaceAll("&amp;", "&");
  if (/^(?:https?:|\/\/|data:|mailto:|tel:|#|\/\/?#|\/_vercel\/)/i.test(raw)) continue;
  const pathname = decodeURIComponent(raw.split(/[?#]/, 1)[0]).replace(/^\/+/, "");
  if (!pathname || pathname === ".") continue;
  const candidate = path.resolve(root, pathname);
  const generated = path.resolve(root, "public", pathname);
  if (!candidate.startsWith(`${root}${path.sep}`) || (!fs.existsSync(candidate) && !fs.existsSync(generated))) missingAssets.add(pathname);
}
if (missingAssets.size) {
  add("error", "missing-assets", `${missingAssets.size} local references are missing: ${[...missingAssets].slice(0, 20).join(", ")}`);
}

const cssFiles = [];
const htmlFiles = [];
const specialHtmlFiles = [];
const noindexHtmlFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".catalog-build", ".git", ".vercel", ".wrangler", "public"].includes(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory() && directory === path.join(root, "scripts") && entry.name === "templates") continue;
    if (entry.isDirectory()) walk(entryPath);
    else if (entry.name.endsWith(".css")) cssFiles.push(entryPath);
    else if (entry.name === "404.html" && directory === root) specialHtmlFiles.push(entryPath);
    else if (entry.name.endsWith(".html")) {
      const source = fs.readFileSync(entryPath, "utf8");
      const robots = source.match(/<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i);
      if (robots) noindexHtmlFiles.push(entryPath);
      else htmlFiles.push(entryPath);
    }
  }
};
walk(root);

const notFoundPath = path.join(root, "404.html");
if (!fs.existsSync(notFoundPath)) {
  add("error", "custom-404", "404.html is missing.");
} else {
  const notFound = fs.readFileSync(notFoundPath, "utf8");
  const notFoundRobots = [...notFound.matchAll(/<meta\b[^>]*name=["']robots["'][^>]*>/gi)]
    .map((match) => match[0].match(/\bcontent=["']([^"']+)["']/i)?.[1]).filter(Boolean);
  const notFoundTokens = robotsTokens(notFoundRobots[0] ?? "");
  if (notFoundRobots.length !== 1 || !notFoundTokens.has("noindex") || !notFoundTokens.has("follow") || notFoundTokens.has("index") || notFoundTokens.has("nofollow") || notFoundTokens.has("none")) {
    add("error", "404-robots", "404.html must contain noindex,follow.");
  }
  if (/<link\b[^>]*rel=["']canonical["']/i.test(notFound)) add("error", "404-canonical", "404.html must not declare a canonical URL.");
  if ((notFound.match(/<h1\b[^>]*>/gi) ?? []).length !== 1) add("error", "404-h1", "404.html must contain exactly one H1.");
  if (!/href=["']\/["']/i.test(notFound)) add("error", "404-home-link", "404.html must link to the homepage.");
  if (!/href=["']\/activewear-manufacturing-guides\/["']/i.test(notFound)) add("error", "404-guide-link", "404.html must link to the buyer guides.");
  if (/\b(?:spark|sparky|sparkle)\b|cropped-16-scaled-1/i.test(notFound)) add("error", "404-legacy-brand", "404.html contains a legacy Spark brand reference or asset.");
  if (!/rel=["']icon["'][^>]*href=["']\/assets\/brand\/glorystarwear-favicon-32\.png["']/i.test(notFound)) add("error", "404-brand-icon", "404.html must use the official Glory Star Wear favicon.");
}

const missingCssAssets = new Set();
const legacyFontFallbacks = new Set();
for (const cssPath of cssFiles) {
  const css = fs.readFileSync(cssPath, "utf8");
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const raw = match[1].trim().replaceAll("\\ ", " ");
    if (/^(?:https?:|\/\/|data:|#)/i.test(raw)) continue;
    const clean = decodeURIComponent(raw.split(/[?#]/, 1)[0]);
    const candidate = clean.startsWith("/")
      ? path.resolve(root, clean.replace(/^\/+/, ""))
      : path.resolve(path.dirname(cssPath), clean);
    if (!candidate.startsWith(`${root}${path.sep}`) || !fs.existsSync(candidate)) {
      if (/\.eot$/i.test(candidate)) {
        const fallbackExists = [".woff", ".ttf", ".svg"].some((extension) =>
          fs.existsSync(candidate.replace(/\.eot$/i, extension))
        );
        if (fallbackExists) {
          legacyFontFallbacks.add(`${path.relative(root, cssPath)} -> ${raw}`);
          continue;
        }
      }
      missingCssAssets.add(`${path.relative(root, cssPath)} -> ${raw}`);
    }
  }
}
if (missingCssAssets.size) {
  add("error", "missing-css-assets", `${missingCssAssets.size} CSS asset references are missing: ${[...missingCssAssets].slice(0, 20).join(", ")}`);
}

const pageCanonicals = new Map();
const articleModifiedByCanonical = new Map();
const declaredModifiedByCanonical = new Map();
const internalGraph = new Map();
const pageLabelForPath = new Map(
  htmlFiles.map((pagePath) => [path.resolve(pagePath), path.relative(root, pagePath)])
);
for (const pagePath of htmlFiles) {
  const page = fs.readFileSync(pagePath, "utf8");
  const label = path.relative(root, pagePath);
  if (/\b(?:spark|sparky|sparkle)\b|cropped-16-scaled-1|YUmxDWR9iaA/i.test(page)) {
    add("error", "legacy-brand", `${label}: legacy Spark brand text or asset remains.`);
  }
  if (!/rel=["']icon["'][^>]*href=["']\/assets\/brand\/glorystarwear-favicon-32\.png["']/i.test(page)) {
    add("error", "brand-icon", `${label}: official Glory Star Wear favicon is missing.`);
  }
  internalGraph.set(label, new Set());
  const htmlLanguage = page.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] ?? "";
  if (!/^en(?:-US)?$/i.test(htmlLanguage)) add("error", "document-language", `${label}: expected an English html lang attribute; found ${htmlLanguage || "(missing)"}.`);
  const mainElements = [...page.matchAll(/<main\b[^>]*>/gi)];
  if (mainElements.length !== 1) add("error", "main-landmark", `${label}: expected exactly one main landmark; found ${mainElements.length}.`);
  const allIds = new Set([...page.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
  const skipTarget = [...page.matchAll(/<a\b[^>]*class=["'][^"']*(?:skip-link|\bskip\b)[^"']*["'][^>]*href=["']#([^"']+)["'][^>]*>/gi)][0]?.[1]
    ?? [...page.matchAll(/<a\b[^>]*href=["']#([^"']+)["'][^>]*class=["'][^"']*(?:skip-link|\bskip\b)[^"']*["'][^>]*>/gi)][0]?.[1];
  if (!skipTarget || !allIds.has(skipTarget)) add("error", "skip-link", `${label}: skip link is missing or targets a missing landmark.`);
  if (!/<nav\b[^>]*\baria-label=["'][^"']+["']/i.test(page)) add("error", "nav-label", `${label}: primary navigation needs an accessible label.`);
  if (/\btabindex=["']?[1-9]\d*/i.test(page)) add("error", "positive-tabindex", `${label}: positive tabindex disrupts the document focus order.`);
  const labels = new Set([...page.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["']/gi)].map((match) => match[1]));
  for (const control of page.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const tag = control[0];
    if (/\btype=["']hidden["']/i.test(tag)) continue;
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    if (!id || (!labels.has(id) && !/\baria-label(?:ledby)?=["'][^"']+["']/i.test(tag))) {
      add("error", "form-label", `${label}: form control ${id ? `#${id}` : "without an id"} has no associated accessible label.`);
    }
  }
  for (const button of page.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const attributes = button[1];
    const text = button[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text && !/\baria-label(?:ledby)?=["'][^"']+["']/i.test(attributes)) add("error", "button-name", `${label}: button has no accessible name.`);
  }
  const pageTitle = [...page.matchAll(/<title\b[^>]*>[\s\S]*?<\/title>/gi)];
  const pageDescription = [...page.matchAll(/<meta\b[^>]*name=["']description["'][^>]*>/gi)];
  const pageCanonical = [...page.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
  const pageH1 = [...page.matchAll(/<h1\b[^>]*>/gi)];
  for (const [name, values] of [["title", pageTitle], ["description", pageDescription], ["canonical", pageCanonical], ["H1", pageH1]]) {
    if (values.length !== 1) add("error", "page-basics", `${label}: expected one ${name}; found ${values.length}.`);
  }
  const cleanTitle = pageTitle[0]?.[0].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim() ?? "";
  const cleanDescription = pageDescription[0]?.[0].match(/\bcontent=["']([^"']*)["']/i)?.[1].trim() ?? "";
  const analyticsTargets = [...page.matchAll(/<script\b[^>]*src=["']\/assets\/privacy-controls\.js["'][^>]*data-measurement-id=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  if (analyticsTargets.length !== 1 || analyticsTargets[0] !== "GT-W6K5676W") {
    add("error", "analytics-target", `${label}: expected one GT-W6K5676W config; found ${analyticsTargets.join(", ") || "none"}.`);
  }
  if (label === "index.html") {
    const cleanH1 = page.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase() ?? "";
    if (!/^custom activewear manufacturer in (?:china|xiamen, china)$/i.test(cleanH1)) {
      add("error", "homepage-intent", `Homepage H1 must identify the custom activewear manufacturer and China location; found ${cleanH1 || "(missing)"}.`);
    }
    const unsupportedClaims = [
      ["1000-brand-partners", /1000\+?[^<]{0,60}brand partners|brand partners[^<]{0,60}1000\+?/i],
      ["after-sales-rate", /0\.004\s*%|data-to-value=["']0\.004["']/i],
      ["orders-cases", /6496\s+orders|28\s+after-sales/i],
      ["unsupported-tenure", /over\s+8\s+years/i],
      ["unsupported-brands", /many\s+famous\s+brands/i],
      ["unsupported-price", /professional\s+and\s+competitive\s+price/i],
    ];
    for (const [claim, pattern] of unsupportedClaims) {
      if (pattern.test(page)) add("error", "unsupported-homepage-claim", `Homepage contains blocked unsupported claim: ${claim}.`);
    }

    const homepageForms = [...page.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)]
      .filter((match) => /class=["'][^"']*\belementor-form\b/i.test(match[0]));
    if (homepageForms.length !== 2) add("error", "homepage-form-count", `Homepage should contain two governed enquiry forms; found ${homepageForms.length}.`);
    homepageForms.forEach((match, index) => {
      const form = match[0];
      const formTag = form.match(/^<form\b[^>]*>/i)?.[0] ?? "";
      const formLabel = `homepage form ${index + 1}`;
      if (!/\bmethod=["']get["']/i.test(formTag) || !/\baction=["']\/request-a-quote\/["']/i.test(formTag)) {
        add("error", "homepage-form-fallback", `${formLabel} must fall back to GET /request-a-quote/.`);
      }
      if (!/<noscript\b/i.test(form)) add("error", "homepage-form-noscript", `${formLabel} needs a no-JavaScript contact path.`);
      if (!/whatsapp\.com\/legal\/privacy-policy/i.test(form) || !/href=["']\/privacy-policy\//i.test(form)) add("error", "homepage-form-disclosure", `${formLabel} must disclose WhatsApp/Meta processing and link to the local Privacy Policy.`);
      for (const control of form.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
        const tag = control[0];
        if (/\bname=["'][^"']+["']/i.test(tag)) add("error", "homepage-form-pii-url", `${formLabel} controls must not have name attributes.`);
        if (/\btype=["']hidden["']/i.test(tag)) continue;
        if (!/\bdata-field=["'][^"']+["']/i.test(tag)) add("error", "homepage-form-data", `${formLabel} has a visible control without data-field.`);
        if (/^<(?:input|textarea)\b/i.test(tag) && !/\bmaxlength=["']\d+["']/i.test(tag)) add("error", "homepage-form-length", `${formLabel} has a text control without maxlength.`);
        if (/^<input\b/i.test(tag) && !/\bautocomplete=["'][^"']+["']/i.test(tag)) add("error", "homepage-form-autocomplete", `${formLabel} has an input without autocomplete.`);
        if (/\btype=["']tel["']/i.test(tag) && /\bpattern=/i.test(tag)) add("error", "homepage-form-phone", `${formLabel} uses a brittle telephone pattern.`);
      }
      for (const select of form.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
        if (!/\brequired(?:\s*=|\s|>)/i.test(select[1])) continue;
        const firstOption = select[2].match(/<option\b[^>]*>/i)?.[0] ?? "";
        if (!/\bvalue=["']["']/i.test(firstOption) || !/\bselected\b/i.test(firstOption) || !/\bdisabled\b/i.test(firstOption)) {
          add("error", "homepage-select-placeholder", `${formLabel} has a required select without an empty disabled selected first option.`);
        }
      }
    });

    const optionalSourceFields = [
      ["form-field-field_105daad", "field_105daad"],
      ["contact-form-source", "field_16d213f"],
    ];
    for (const [fieldId, groupClass] of optionalSourceFields) {
      const escapedFieldId = fieldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedGroupClass = groupClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const selectBlock = page.match(new RegExp(`<select\\b[^>]*\\bid=["']${escapedFieldId}["'][^>]*>[\\s\\S]*?<\\/select>`, "i"))?.[0] ?? "";
      const selectTag = selectBlock.match(/^<select\b[^>]*>/i)?.[0] ?? "";
      if (!selectBlock) {
        add("error", "homepage-source-field", `Homepage optional source field #${fieldId} is missing.`);
        continue;
      }
      if (/\brequired\b/i.test(selectTag)) {
        add("error", "homepage-source-optional", `Homepage source field #${fieldId} must remain optional.`);
      }
      const requiredChoices = [
        ["empty choice", /<option\b[^>]*\bvalue=["']["']/i],
        ["Bing/search", /Bing or another search engine/i],
        ["AI assistant", /AI assistant/i],
        ["direct/other", /Direct or other/i],
      ];
      for (const [choice, pattern] of requiredChoices) {
        if (!pattern.test(selectBlock)) add("error", "homepage-source-options", `Homepage source field #${fieldId} is missing its ${choice} option.`);
      }
      const groupTag = page.match(new RegExp(`<div\\b[^>]*class=["'][^"']*elementor-field-group-${escapedGroupClass}[^"']*["'][^>]*>`, "i"))?.[0] ?? "";
      if (/elementor-(?:field-required|mark-required)/i.test(groupTag)) {
        add("error", "homepage-source-marker", `Homepage source field group .elementor-field-group-${groupClass} must not be marked required.`);
      }
    }

    const modalTag = page.match(/<div\b[^>]*id=["']modal-12667["'][^>]*>/i)?.[0] ?? "";
    const triggerTag = page.match(/<button\b[^>]*class=["'][^"']*\buael-trigger\b[^"']*["'][^>]*>/i)?.[0] ?? "";
    if (!/\brole=["']dialog["']/i.test(modalTag) || !/\baria-modal=["']true["']/i.test(modalTag) || !/\baria-labelledby=["'][^"']+["']/i.test(modalTag) || !/\baria-hidden=["']true["']/i.test(modalTag)) {
      add("error", "homepage-dialog", "Homepage catalogue modal needs dialog semantics and an accessible title.");
    }
    if (!triggerTag || !/\baria-controls=["']modal-12667["']/i.test(triggerTag)) add("error", "homepage-dialog-trigger", "Homepage catalogue trigger must be an accessible button linked to the dialog.");
    if (!/<button\b[^>]*class=["'][^"']*\buael-modal-close\b[^"']*["'][^>]*\baria-label=["'][^"']+["']/i.test(page)) add("error", "homepage-dialog-close", "Homepage catalogue dialog needs a named close button.");
    if (!/<button\b[^>]*class=["'][^"']*\buael-modal-close\b[^"']*["'][^>]*>[\s\S]*?<\/button>\s*<\/div>\s*<div\b[^>]*class=["'][^"']*\buael-overlay\b/i.test(page)) add("error", "homepage-dialog-structure", "Homepage catalogue close button must remain inside the dialog container.");
    if (!/data-close-on-esc=["']yes["']/i.test(page)) add("error", "homepage-dialog-escape", "Homepage catalogue dialog must close on Escape.");
  }
  if (cleanTitle.length > 60) add("warning", "title-length", `${label}: title is ${cleanTitle.length} characters.`);
  if (cleanDescription.length > 160) add("warning", "description-length", `${label}: description is ${cleanDescription.length} characters.`);
  if (!/src=["']\/assets\/privacy-controls\.js["']/i.test(page)) {
    add("error", "analytics-consent", `${label}: consent-controlled analytics loader is missing.`);
  }
  if (/src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js/i.test(page) || /data-rocket-src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js/i.test(page)) {
    add("error", "analytics-before-consent", `${label}: Google Analytics is loaded directly before a visitor choice.`);
  }
  for (const policyRoute of ["/privacy-policy/", "/terms-of-use/", "/cookie-policy/"]) {
    if (!new RegExp(`href=["']${policyRoute.replaceAll("/", "\\/")}["']`, "i").test(page)) {
      add("error", "policy-navigation", `${label}: footer or page content does not link to ${policyRoute}.`);
    }
  }
  const canonical = pageCanonical[0]?.[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (canonical) {
    if (pageCanonicals.has(canonical)) add("error", "duplicate-canonical", `${label} shares ${canonical} with ${pageCanonicals.get(canonical)}.`);
    pageCanonicals.set(canonical, label);
    const route = label === "index.html" ? "" : label.replace(/\/index\.html$/, "/");
    const expectedCanonical = `https://glorystarwearing.com/${route}`;
    if (canonical !== expectedCanonical) add("error", "canonical-route", `${label}: canonical should be ${expectedCanonical}; found ${canonical}.`);
  }
  const ogUrls = [...page.matchAll(/<meta\b[^>]*property=["']og:url["'][^>]*>/gi)]
    .map((match) => match[0].match(/\bcontent=["']([^"']+)["']/i)?.[1])
    .filter(Boolean);
  if (ogUrls.length !== 1) add("error", "og-url-count", `${label}: expected one og:url; found ${ogUrls.length}.`);
  else if (canonical && ogUrls[0] !== canonical) add("error", "og-url-canonical", `${label}: og:url does not match canonical.`);
  const robotsContent = [...page.matchAll(/<meta\b[^>]*name=["']robots["'][^>]*>/gi)]
    .map((match) => match[0].match(/\bcontent=["']([^"']+)["']/i)?.[1].toLowerCase())
    .filter(Boolean);
  const pageRobotsTokens = robotsTokens(robotsContent[0] ?? "");
  if (robotsContent.length !== 1 || !pageRobotsTokens.has("index") || !pageRobotsTokens.has("follow") || pageRobotsTokens.has("noindex") || pageRobotsTokens.has("nofollow") || pageRobotsTokens.has("none")) {
    add("error", "robots-directive", `${label}: expected one robots meta containing index and follow.`);
  }
  const pageIds = new Set([...page.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
  for (const match of page.matchAll(/\bhref=["']#([^"']+)["']/gi)) {
    if (!pageIds.has(match[1])) add("error", "missing-anchors", `${label}: #${match[1]} does not exist.`);
  }
  for (const match of page.matchAll(/<a\b[^>]*\bhref=["'](\/[^"'#?]*)["']/gi)) {
    const route = match[1].replace(/^\/+|\/+$/g, "");
    const expected = route ? path.join(root, route, "index.html") : htmlPath;
    const generated = route ? path.join(root, "public", route, "index.html") : htmlPath;
    if (!fs.existsSync(expected) && !fs.existsSync(generated)) add("error", "internal-link", `${label}: ${match[1]} has no matching HTML page.`);
  }
  for (const match of page.matchAll(/<a\b[^>]*\bhref=["'](\/[^"']*)["']/gi)) {
    const pathname = match[1].split(/[?#]/, 1)[0];
    const route = pathname.replace(/^\/+|\/+$/g, "");
    const expected = path.resolve(route ? path.join(root, route, "index.html") : htmlPath);
    const targetLabel = pageLabelForPath.get(expected);
    if (targetLabel && targetLabel !== label) internalGraph.get(label).add(targetLabel);
  }
  for (const anchor of page.matchAll(/<a\b[^>]*>/gi)) {
    const tag = anchor[0];
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? "";
    if (/https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(href) && !/data-analytics-event=["']whatsapp_click["']/i.test(tag)) {
      add("error", "lead-tracking", `${label}: direct WhatsApp link is not tagged as whatsapp_click.`);
    }
    if (/https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(href) && !/data-analytics-method=["']whatsapp["']/i.test(tag)) {
      add("error", "lead-method", `${label}: WhatsApp link is not tagged with the whatsapp method.`);
    }
    if (/https:\/\/(?:www\.)?glory-star-(?:sample\.com|sampleorder\.myshopify\.com)\//i.test(href) && !/data-analytics-event=["']sample_store_click["']/i.test(tag)) {
      add("error", "sample-tracking", `${label}: sample-store link is not tagged as sample_store_click.`);
    }
    if (/https:\/\/(?:www\.)?glory-star-(?:sample\.com|sampleorder\.myshopify\.com)\//i.test(href) && !/data-analytics-method=["']outbound["']/i.test(tag)) {
      add("error", "sample-method", `${label}: sample-store link is not tagged with the outbound method.`);
    }
  }
  if (/data-whatsapp-form/i.test(page)) {
    if (!/src=["']\/assets\/seo-pages\.js(?:\?v=[^"']+)?["']/i.test(page)) {
      add("error", "quote-form-handler", `${label}: WhatsApp form does not load the shared submit handler.`);
    }
    if (!/<button\b[^>]*type=["']submit["']/i.test(page)) {
      add("error", "quote-form-submit", `${label}: WhatsApp form has no explicit submit button.`);
    }
    if (!/href=["']\/privacy-policy\//i.test(page)) add("error", "quote-form-privacy", `${label}: WhatsApp form must link to the local Privacy Policy.`);
    const quoteForm = page.match(/<form\b[^>]*data-whatsapp-form[^>]*>([\s\S]*?)<\/form>/i);
    const quoteFormTag = page.match(/<form\b[^>]*data-whatsapp-form[^>]*>/i)?.[0] ?? "";
    if (!/\bmethod=["']get["']/i.test(quoteFormTag) || !/\baction=["']\/request-a-quote\/["']/i.test(quoteFormTag)) {
      add("error", "quote-form-fallback", `${label}: static WhatsApp form must have an explicit non-PII fallback route.`);
    }
    if (!quoteForm || !/<noscript\b/i.test(quoteForm[1])) add("error", "quote-form-noscript", `${label}: WhatsApp form needs a no-JavaScript contact path.`);
    if (quoteForm) {
      for (const control of quoteForm[1].matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
        const tag = control[0];
        if (/\btype=["']hidden["']/i.test(tag)) continue;
        if (/\bname=["'][^"']+["']/i.test(tag)) add("error", "quote-form-pii-url", `${label}: WhatsApp form controls must not be successful GET controls with name attributes.`);
        if (!/\bdata-field=["'][^"']+["']/i.test(tag)) add("error", "quote-form-data", `${label}: WhatsApp form control is missing data-field.`);
        if (!/^<select\b/i.test(tag) && !/\bmaxlength=["']\d+["']/i.test(tag)) add("error", "quote-form-length", `${label}: WhatsApp text control is missing maxlength.`);
      }
    }
  }
  for (const match of page.matchAll(assetAttributes)) {
    const raw = match[1].replaceAll("&amp;", "&");
    if (/^(?:https?:|\/\/|data:|mailto:|tel:|#|\/\??#|\/$|\/_vercel\/)/i.test(raw)) continue;
    const clean = decodeURIComponent(raw.split(/[?#]/, 1)[0]);
    if (!clean) continue;
    const candidate = clean.startsWith("/")
      ? path.resolve(root, clean.replace(/^\/+/, ""))
      : path.resolve(path.dirname(pagePath), clean);
    const generated = clean.startsWith("/") ? path.resolve(root, "public", clean.replace(/^\/+/, "")) : "";
    if (!candidate.startsWith(`${root}${path.sep}`) || (!fs.existsSync(candidate) && !(generated && fs.existsSync(generated)))) {
      add("error", "page-assets", `${label}: missing ${raw}.`);
    }
  }
  for (const image of page.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(image[0])) add("warning", "image-alt", `${label}: image lacks alt.`);
    if (!/\bwidth=["'][^"']+["']/i.test(image[0]) || !/\bheight=["'][^"']+["']/i.test(image[0])) add("warning", "image-dimensions", `${label}: image lacks width or height.`);
  }
  const structuredNodes = [];
  for (const match of page.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      structuredNodes.push(data, ...(Array.isArray(data["@graph"]) ? data["@graph"] : []));
    } catch (error) { add("error", "invalid-json-ld", `${label}: ${error.message}`); }
  }
  const structuredIds = structuredNodes.map((node) => node?.["@id"]).filter(Boolean);
  const duplicateStructuredIds = [...new Set(structuredIds.filter((id, index) => structuredIds.indexOf(id) !== index))];
  if (duplicateStructuredIds.length) {
    add("error", "duplicate-json-ld-ids", `${label}: duplicate structured-data @id values: ${duplicateStructuredIds.join(", ")}.`);
  }
  if (canonical) {
    const declaredDates = [];
    for (const property of ["og:updated_time", "article:modified_time"]) {
      const value = page.match(new RegExp(`<meta\\b[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"))?.[1];
      if (value) declaredDates.push(String(value).slice(0, 10));
    }
    for (const webPage of structuredNodes.filter((node) => node?.["@type"] === "WebPage" && node.dateModified)) {
      declaredDates.push(String(webPage.dateModified).slice(0, 10));
    }
    const uniqueDates = [...new Set(declaredDates)];
    if (uniqueDates.length > 1) add("error", "modified-date-conflict", `${label}: declared modification dates disagree: ${uniqueDates.join(", ")}.`);
    if (uniqueDates.length === 1) declaredModifiedByCanonical.set(canonical, uniqueDates[0]);
  }
  if (label === "activewear-manufacturing-guides/index.html") {
    const hubSection = page.match(/<section\b[^>]*id=["']guides["'][^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? "";
    const visibleGuideUrls = [...hubSection.matchAll(/<a\b[^>]*href=["'](\/[^"']+)["']/gi)]
      .map((match) => match[1].split(/[?#]/, 1)[0])
      .filter((route) => route !== "/request-a-quote/")
      .map((route) => `${"https://glorystarwearing.com"}${route}`);
    const collection = structuredNodes.find((node) => node?.["@type"] === "CollectionPage");
    const schemaItems = collection?.mainEntity?.itemListElement ?? [];
    const schemaGuideUrls = schemaItems.map((item) => item?.url).filter(Boolean);
    const positions = schemaItems.map((item) => item?.position);
    if (JSON.stringify(schemaGuideUrls) !== JSON.stringify(visibleGuideUrls)) {
      add("error", "guide-itemlist", `${label}: ItemList must match the visible guide links in order.`);
    }
    if (positions.some((position, index) => position !== index + 1)) {
      add("error", "guide-itemlist-position", `${label}: ItemList positions must be sequential.`);
    }
  }
  const organization = structuredNodes.find((node) => node?.["@type"] === "Organization");
  if (!organization) {
    add("error", "organization-schema", `${label}: Organization structured data is missing.`);
  } else {
    if (!homepageOrganizationIdentity) {
      add("error", "organization-identity", "index.html: homepage Organization identity is missing.");
    } else {
      const identity = normalizeOrganizationIdentity(organization);
      const differences = organizationIdentityKeys.filter((key) =>
        JSON.stringify(identity[key]) !== JSON.stringify(homepageOrganizationIdentity[key])
      );
      if (differences.length) {
        add("error", "organization-identity", `${label}: Organization differs from the homepage in: ${differences.join(", ")}.`);
      }
    }
    const logo = organization.logo;
    if (logo?.["@type"] !== "ImageObject" || logo?.["@id"] !== "https://glorystarwearing.com/#logo" || logo?.url !== "https://glorystarwearing.com/assets/brand/glorystarwear-logo.png" || logo?.contentUrl !== "https://glorystarwearing.com/assets/brand/glorystarwear-logo.png" || logo?.width !== 670 || logo?.height !== 540) {
      add("error", "organization-logo", `${label}: Organization must use the governed official Glory Star Wear logo entity.`);
    }
  }
  if (label !== "index.html") {
    const breadcrumb = structuredNodes.find((node) => node?.["@type"] === "BreadcrumbList");
    if (!breadcrumb) add("error", "breadcrumb-schema", `${label}: BreadcrumbList structured data is missing.`);
    else {
      const items = Array.isArray(breadcrumb.itemListElement) ? breadcrumb.itemListElement : [];
      const finalItem = items.at(-1)?.item;
      if (canonical && finalItem !== canonical) add("error", "breadcrumb-canonical", `${label}: final breadcrumb item does not match canonical.`);
    }
  }
  const visibleText = page
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim().toLowerCase();
  const visibleFaqQuestions = [...page.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().toLowerCase());
  for (const article of structuredNodes.filter((node) => node?.["@type"] === "Article")) {
    for (const field of ["headline", "datePublished", "dateModified", "mainEntityOfPage"]) {
      if (!article[field]) add("error", "article-schema", `${label}: Article is missing ${field}.`);
    }
    if (canonical && article.mainEntityOfPage !== canonical) add("error", "article-canonical", `${label}: Article mainEntityOfPage does not match canonical.`);
    if (canonical && article.dateModified) articleModifiedByCanonical.set(canonical, String(article.dateModified).slice(0, 10));
    for (const field of ["author", "publisher"]) {
      if (article[field]?.["@id"] !== "https://glorystarwearing.com/#organization") {
        add("error", "article-entity", `${label}: Article ${field} must reference the canonical Organization entity.`);
      }
    }
    for (const field of ["datePublished", "dateModified"]) {
      const value = article[field];
      if (value && !new RegExp(`<time\\b[^>]*datetime=["']${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i").test(page)) {
        add("error", "article-date-visibility", `${label}: Article ${field} ${value} is not visible in a matching time element.`);
      }
    }
    if (!/published by glory star wear/i.test(visibleText)) add("error", "article-byline", `${label}: Article publisher is not visible.`);
  }
  const questionTokens = (value) => new Set(value.match(/[a-z0-9]+/g) ?? []);
  for (const faq of structuredNodes.filter((node) => node?.["@type"] === "FAQPage")) {
    for (const entity of faq.mainEntity ?? []) {
      const question = String(entity?.name ?? "").replace(/\s+/g, " ").trim().toLowerCase();
      const schemaTokens = questionTokens(question);
      const hasVisibleEquivalent = visibleFaqQuestions.some((visibleQuestion) => {
        const visibleTokens = questionTokens(visibleQuestion);
        const shared = [...schemaTokens].filter((token) => visibleTokens.has(token)).length;
        return shared / Math.max(1, Math.min(schemaTokens.size, visibleTokens.size)) >= 0.8;
      });
      if (!question || (!visibleText.includes(question) && !hasVisibleEquivalent)) {
        add("error", "faq-visibility", `${label}: FAQ question is not visible on the page: ${entity?.name ?? "(missing name)"}`);
      }
    }
  }
}

const catalogPagePath = path.join(root, "products", "index.html");
const catalogIndexPath = path.join(root, "products", "catalog-index.json");
const catalogManifestPath = path.join(root, "products", "catalog-manifest.json");
try {
  const catalogPage = fs.readFileSync(catalogPagePath, "utf8");
  const catalogBytes = fs.statSync(catalogPagePath).size;
  const initialCards = [...catalogPage.matchAll(/\bdata-catalog-item\b/g)].length;
  const crawlSection = catalogPage.match(/<details class="catalog-crawl-index">([\s\S]*?)<\/details>/)?.[1] ?? "";
  const crawlRoutes = [...crawlSection.matchAll(/href="(\/products\/[a-z0-9-]+\/)"/g)].map((match) => match[1]);
  const catalogIndex = JSON.parse(fs.readFileSync(catalogIndexPath, "utf8"));
  const feedRoutes = catalogIndex.map((product) => product?.route);
  const manifest = JSON.parse(fs.readFileSync(catalogManifestPath, "utf8"));
  if (catalogBytes > 350_000) add("error", "catalog-html-budget", `products/index.html is ${catalogBytes} bytes; maximum is 350000.`);
  if (initialCards !== 24) add("error", "catalog-initial-cards", `products/index.html renders ${initialCards} initial cards; expected 24.`);
  if (!/data-catalog-feed="\/products\/catalog-index\.json"/.test(catalogPage) || !/data-catalog-total="1002"/.test(catalogPage)) {
    add("error", "catalog-feed-attributes", "products/index.html is missing the governed on-demand feed attributes.");
  }
  if (catalogIndex.length !== 1002 || new Set(feedRoutes).size !== 1002 || feedRoutes.some((route) => !/^\/products\/[a-z0-9-]+\/$/.test(route ?? ""))) {
    add("error", "catalog-feed", `products/catalog-index.json has ${catalogIndex.length} entries and ${new Set(feedRoutes).size} unique routes; expected 1002.`);
  }
  if (crawlRoutes.length !== 1002 || new Set(crawlRoutes).size !== 1002 || feedRoutes.some((route) => !crawlRoutes.includes(route))) {
    add("error", "catalog-crawl-index", `Compact crawl index has ${crawlRoutes.length} links and ${new Set(crawlRoutes).size} unique routes; expected full feed parity.`);
  }
  for (const route of feedRoutes) {
    const productPath = path.join(root, route.replace(/^\/|\/$/g, ""), "index.html");
    if (!fs.existsSync(productPath)) add("error", "catalog-feed-target", `${route}: catalog feed target is missing.`);
  }
  if (manifest.catalogIndexEntries !== 1002 || manifest.initialCatalogCards !== 24) {
    add("error", "catalog-manifest-delivery", `Catalog manifest reports ${manifest.catalogIndexEntries ?? "missing"} feed entries and ${manifest.initialCatalogCards ?? "missing"} initial cards.`);
  }
} catch (error) {
  add("error", "catalog-delivery", `Catalog delivery files are missing or invalid: ${error.message}`);
}

const incomingLinks = new Map(htmlFiles.map((pagePath) => [path.relative(root, pagePath), new Set()]));
for (const [source, targets] of internalGraph) {
  for (const target of targets) incomingLinks.get(target)?.add(source);
}
for (const [label, sources] of incomingLinks) {
  if (label !== "index.html" && sources.size === 0) {
    add("error", "orphan-page", `${label}: no internal HTML page links to this page.`);
  }
}

const clickDepth = new Map([["index.html", 0]]);
const queue = ["index.html"];
while (queue.length) {
  const source = queue.shift();
  for (const target of internalGraph.get(source) ?? []) {
    if (clickDepth.has(target)) continue;
    clickDepth.set(target, clickDepth.get(source) + 1);
    queue.push(target);
  }
}
for (const pagePath of htmlFiles) {
  const label = path.relative(root, pagePath);
  if (label === "index.html") continue;
  if (!clickDepth.has(label)) add("error", "homepage-reachability", `${label}: cannot be reached from the homepage.`);
  else if (clickDepth.get(label) > 3) add("error", "click-depth", `${label}: ${clickDepth.get(label)} clicks from the homepage; maximum is 3.`);
}

const sitemapPath = path.join(root, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  add("error", "missing-sitemap", "sitemap.xml is missing.");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  const sitemapModified = new Map([...sitemap.matchAll(/<url>\s*<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/gs)].map((match) => [match[1], match[2]]));
  const expectedSitemapUrls = new Set(urls);
  try {
    const posts = JSON.parse(fs.readFileSync(path.join(root, "blog", "posts.json"), "utf8"));
    if (!Array.isArray(posts)) throw new Error("blog/posts.json must contain an array.");
    if (posts.length) {
      const blogUrl = "https://glorystarwearing.com/blog/";
      expectedSitemapUrls.add(blogUrl);
      sitemapModified.set(blogUrl, posts.map((post) => post.date).sort().at(-1));
      const blogIndex = fs.readFileSync(path.join(root, "blog", "index.html"), "utf8");
      if (/<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i.test(blogIndex)) {
        add("error", "published-blog-noindex", "The blog archive must be indexable once it lists published articles.");
      }
    } else if (urls.includes("https://glorystarwearing.com/blog/")) {
      add("error", "empty-blog-sitemap", "The empty blog archive must stay out of sitemap.xml until an article is published.");
    }
    for (const post of posts) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(post?.date || "") || !/^[a-z0-9-]+$/.test(post?.slug || "")) {
        add("error", "blog-manifest", "blog/posts.json contains an invalid publication date or slug.");
        continue;
      }
      const articleUrl = `https://glorystarwearing.com/blog/${post.date}-${post.slug}/`;
      const articlePath = path.join(root, "blog", `${post.date}-${post.slug}`, "index.html");
      if (post.path !== `/blog/${post.date}-${post.slug}/` || !fs.existsSync(articlePath)) {
        add("error", "blog-article-target", `${articleUrl} is missing its generated article page or manifest path.`);
      } else {
        const article = fs.readFileSync(articlePath, "utf8");
        if (/<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i.test(article)) {
          add("error", "published-article-noindex", `${articleUrl} is marked noindex despite being in the published manifest.`);
        }
      }
      expectedSitemapUrls.add(articleUrl);
      sitemapModified.set(articleUrl, post.date);
    }
  } catch (error) {
    add("error", "blog-manifest", `Could not read blog/posts.json: ${error.message}`);
  }
  if (!urls.includes("https://glorystarwearing.com/")) {
    add("error", "homepage-sitemap", "The canonical homepage is absent from sitemap.xml.");
  }
  for (const url of urls) {
    const pathname = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
    const expected = pathname ? path.join(root, pathname, "index.html") : htmlPath;
    if (!fs.existsSync(expected)) add("error", "sitemap-target", `${url} has no matching static HTML file.`);
  }
  for (const pagePath of noindexHtmlFiles) {
    const page = fs.readFileSync(pagePath, "utf8");
    const canonical = page.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
    if (canonical && urls.includes(canonical)) {
      add("error", "noindex-sitemap", `${path.relative(root, pagePath)} is noindex but appears in sitemap.xml.`);
    }
  }
  for (const canonical of pageCanonicals.keys()) {
    if (!expectedSitemapUrls.has(canonical)) add("error", "sitemap-coverage", `${canonical} is canonical but absent from the core sitemap and blog release overlay.`);
  }
  for (const [canonical, modified] of articleModifiedByCanonical) {
    if (sitemapModified.get(canonical) !== modified) add("error", "sitemap-article-date", `${canonical}: sitemap lastmod must match Article dateModified ${modified}.`);
  }
  for (const [canonical, modified] of declaredModifiedByCanonical) {
    if (sitemapModified.get(canonical) !== modified) add("error", "sitemap-page-date", `${canonical}: sitemap lastmod must match declared page modification date ${modified}.`);
  }
}

const order = { error: 0, warning: 1 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.code.localeCompare(b.code));

console.log(`SEO audit: ${path.relative(process.cwd(), htmlPath)}`);
const maxClickDepth = Math.max(...clickDepth.values());
console.log(`Pages: ${htmlFiles.length} | homepage: ${html.length} bytes | images: ${images.length} | IDs: ${ids.length} | forms: ${forms} | max depth: ${maxClickDepth} | legacy font fallbacks: ${legacyFontFallbacks.size}`);
if (!findings.length) {
  console.log("PASS: no audited issues found.");
  process.exit(0);
}

for (const finding of findings) {
  console.log(`${finding.severity.toUpperCase()} [${finding.code}] ${finding.message}`);
}
process.exit(findings.some((finding) => finding.severity === "error") ? 1 : 0);
