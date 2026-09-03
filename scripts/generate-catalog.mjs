import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { installMultilingual } from "./prepare-multilingual.mjs";

const root = path.resolve(process.env.SITE_OUTPUT_ROOT || path.resolve(import.meta.dirname, ".."));
const sourceRoot = path.resolve(process.argv[2] || "/Users/kevintang/Documents/HERMES/sparkgymwear");
const productsSource = path.join(sourceRoot, "products.json");
const imagePlanSource = path.join(sourceRoot, "image_plan.json");
const productsOutput = path.join(root, "products");
const mediaOutput = path.join(root, "wp-content", "uploads", "catalog");
const canonicalBase = "https://glorystarwearing.com";
const releaseDate = "2026-08-28";
const initialCatalogSize = 24;

if (!fs.existsSync(productsSource) || !fs.existsSync(imagePlanSource)) {
  console.error(`Catalog source is incomplete: ${sourceRoot}`);
  process.exit(1);
}

const sourceProducts = JSON.parse(fs.readFileSync(productsSource, "utf8"));
const imagePlan = JSON.parse(fs.readFileSync(imagePlanSource, "utf8"));

const decodeEntities = (value) => String(value ?? "")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, "\"")
  .replace(/&#0?39;|&apos;/gi, "'")
  .replace(/&nbsp;/gi, " ")
  .replace(/&ndash;/gi, "–")
  .replace(/&mdash;/gi, "—")
  .replace(/&times;/gi, "×")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

const stripMarkup = (value) => decodeEntities(value)
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ");

const scrubBrands = (value) => stripMarkup(value)
  .replace(/https?:\/\/(?:www\.)?sparkgymwear\.com\/?\S*/gi, " ")
  .replace(/\b(?:www\.)?(?:the\s*)?sparkwear\s*\.?\s*com\b/gi, " ")
  .replace(/\b(?:spakr|spark(?:ed|ing|ly|le|y|s)?)(?:\s+(?:sportswear|sports?\s*wear|gymwear|gym\s*wear|clothing|apparel|brand))?\b/gi, " ")
  .replace(/\bpinspark\b/gi, " ")
  .replace(/\b(?:gymshark|lululemon|lulu|athleta|skims|alo\s+yoga|vuori|fabletics|nike|adidas|puma|under\s+armour)\b/gi, " ")
  .replace(/\bshark(?:\s+(?:athletic|workout|sportswear|apparel|clothing))?\b/gi, " ")
  .replace(/\b(?:flexibloom|asporteyewear)\b/gi, " ")
  .replace(/\baq\s+sport(?:\s+(?:fashion\s+wear|clothing))?\b/gi, " ")
  .replace(/\belite\s+collection\b/gi, " ")
  .replace(/\b(?:wholesale(?:rs?)?|bulk|manufacturers?|suppliers?|vendors?|distributors?)\b/gi, " ")
  .replace(/\btheglorystarwear\s*\.?\s*com\b/gi, "Glory Star Wear")
  .replace(/\b(?:www\.)?[^\s]+\.com\b/gi, " ")
  .replace(/\s+([,.;:!?])/g, "$1")
  .replace(/([,.;:!?])(?=[A-Za-z])/g, "$1 ")
  .replace(/[ \t]+/g, " ")
  .replace(/\s*\n\s*/g, "\n")
  .trim();

const html = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const jsonScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const truncate = (value, maximum) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maximum) return text;
  const clipped = text.slice(0, maximum - 1);
  return `${clipped.slice(0, Math.max(clipped.lastIndexOf(" "), maximum - 22)).trim()}…`;
};

const clipWords = (value, maximum) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maximum) return text;
  const clipped = text.slice(0, maximum + 1);
  const wordBoundary = clipped.lastIndexOf(" ");
  return clipped.slice(0, wordBoundary > maximum * 0.65 ? wordBoundary : maximum).trim();
};

const slugify = (value) => scrubBrands(value)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .replace(/-{2,}/g, "-");

const cleanSku = (value, id) => {
  const cleaned = scrubBrands(value)
    .normalize("NFKC")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
  return cleaned || `GSW-${id}`;
};

const cleanTitle = (product) => {
  const sku = cleanSku(product.sku, product.id);
  let title = scrubBrands(String(product.name ?? "").split("|")[0]);
  if (sku) title = title.replace(new RegExp(escapeRegExp(sku), "ig"), " ");
  title = title
    .replace(/\bdo\s+sports?\s+bras?\s+have\s+padding\b/gi, "Padded Sports Bra")
    .replace(/\bwhy\s+do\s+(?:sports?\s+)?bras?\s+have\s+removable\s+(?:padding|pads?)\b/gi, "Removable Pad Sports Bra")
    .replace(/\bwhat\s+is\s+(?:a\s+)?sports?\s+bra\b/gi, "Sports Bra")
    .replace(/\bwhat\s+are\s+flared?\s+leggings\b/gi, "Flared Leggings")
    .replace(/\bwhat\s+is\s+(?:a\s+)?(?:support|supportive)(?:\s+activewear)?(?:\s+seamless)?\s+(?:sports?\s+)?bra\b/gi, "Support Sports Bra")
    .replace(/\bwhat\s+is\s+medium\s+impact\s+sports?\s+bra\b/gi, "Medium Impact Sports Bra")
    .replace(/\bwhat\s+is\s+(?:\w+\s+)?in\s+fashion\b/gi, " ")
    .replace(/\bwhat\s+is\s+active\s+wear\s+in\s+washing\s+machine\s+seeatpants\b/gi, "Sweatpants")
    .replace(/\bdifference\s+between\b/gi, " ")
    .replace(/\bbenefits?\s+of\s+compression\s+shirts?\b/gi, "Compression Shirt")
    .replace(/\b(?:private\s+label|white\s+label|wholesale(?:rs?)?|custom(?:\s+made|ized|isable)?|oem|odm|mfg|manufacturers?|manufacture|manufacturing|suppliers?|suppilers?|distributors?|vendors?|providers?|factory|bulk|brands?|branded|trademark|crossword(?:\s+clue)?|personalized|personalised|unbranded|articles?|definition|description|function|materials?|fabrics?|hot(?:\s+sale)?|new\s+arrival|startup|near\s+me|worldwide(?:\s+inc)?|company(?:\s+type\s+or)?|the\s+shop|best\s+for|types?|affordable|options|elite\s+collection|usa|united\s+states|uk|italy|korean|chinese|australia|china)\b/gi, " ")
    .replace(/\bSP[A-Z0-9+./-]{4,}\b/gi, " ")
    .replace(/\b(?:wunder(?:\s+(?:train|under))?|align)\b/gi, " ")
    .replace(/\bvs\.?\b/gi, " ")
    .replace(/\bsports\s+wear\b/gi, "Sportswear")
    .replace(/\bactive\s+wear\b/gi, "Activewear")
    .replace(/\bgym\s+wear\b/gi, "Gymwear")
    .replace(/\bwork\s+out\b/gi, "Workout")
    .replace(/\s+/g, " ")
    .replace(/^[|,.;:\-–—\s]+|[|,.;:\-–—\s]+$/g, "")
    .trim();

  const genericAliases = new Map(Object.entries({
    activewear: "activewear", apparel: "apparel", athletic: "athletic", band: "band", bands: "band", bodysuit: "bodysuit", bodysuits: "bodysuit",
    bra: "bra", bras: "bra", clothes: "clothing", clothing: "clothing", dress: "dress", dresses: "dress",
    crop: "crop", elastic: "elastic", fitness: "fitness", flared: "flared", gym: "gym", gymwear: "gym", high: "high", hoodie: "hoodie", hoodies: "hoodie",
    jacket: "jacket", jackets: "jacket", jogger: "jogger", joggers: "jogger", jumpsuit: "jumpsuit", jumpsuits: "jumpsuit", legging: "legging", leggings: "legging",
    lightweight: "lightweight", long: "long", loose: "loose", manwear: "mens", men: "mens", mens: "mens", one: "one", pant: "pant", pants: "pant", piece: "piece", resistance: "resistance",
    seamless: "seamless", set: "set", sets: "set", shirt: "shirt", shirts: "shirt", short: "short", shorts: "short",
    skirt: "skirt", skirts: "skirt", sleeve: "sleeve", sleeveless: "sleeveless", sleeves: "sleeve", sock: "sock", socks: "sock", sport: "sport", sports: "sport",
    sportswear: "sportswear", tank: "tank", tennis: "tennis", top: "top", tops: "top", tshirt: "shirt", tshirts: "shirt", waist: "waist", waisted: "waist", wear: "wear", women: "womens", womens: "womens", workout: "workout", yoga: "yoga",
  }));
  const seenGeneric = new Set();
  const words = title.split(" ").filter(Boolean).reverse().filter((word) => {
    const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
    const canonicalWord = genericAliases.get(normalized);
    if (!canonicalWord) return true;
    if (seenGeneric.has(canonicalWord)) return false;
    seenGeneric.add(canonicalWord);
    return true;
  }).reverse();
  title = words.join(" ")
    .replace(/\b(?:best\s+for|best|affordable|options)\b/gi, " ")
    .replace(/^(?:best|hot|new|popular)\s+/i, "")
    .replace(/^(?:and|for|from|in|of|on|the|to|with)\s+/i, "")
    .replace(/\b(?:and|for|from|in|of|on|the|to|with)\s*$/i, "")
    .replace(/^[|,.;:\-–—\s]+|[|,.;:\-–—\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (title.length > 76) title = clipWords(title, 76);
  if (title.split(/\s+/).length < 2) title = `${title} Style`;
  return title.length >= 4 ? title : `Custom Activewear Style ${product.id}`;
};

const catalogTaxonomy = [
  { id: "non-seamless", label: "Non-seamless", source: "Non-seamless", interest: "private-label-activewear", children: [
    { id: "non-seamless-fitness-set", label: "Fitness Set", source: "Fitness set", interest: "activewear-sets" },
    { id: "non-seamless-sports-bra", label: "Sports Bra", source: "Sports Bra", interest: "sports-bras" },
    { id: "non-seamless-tops", label: "Tops", source: "Tops", interest: "gym-wear", children: [
      { id: "non-seamless-long-sleeve-shirts", label: "Long Sleeve Shirts", source: "Long Sleeve Shirts", interest: "gym-wear" },
      { id: "non-seamless-short-sleeve-shirts", label: "Short Sleeve Shirts", source: "Short Sleeve Shirts", interest: "gym-wear" },
    ] },
    { id: "non-seamless-tank-top", label: "Tank Top", source: "Tank Top", interest: "gym-wear" },
    { id: "non-seamless-leggings", label: "Leggings", source: "Leggings", interest: "leggings" },
    { id: "non-seamless-shorts", label: "Shorts", source: "Shorts", interest: "gym-wear" },
    { id: "non-seamless-jumpsuit", label: "Jumpsuit", source: "Jumpsuit", interest: "gym-wear" },
    { id: "non-seamless-tennis-skirts", label: "Tennis Skirts", source: "Tennis Skirts", interest: "gym-wear" },
    { id: "non-seamless-jackets", label: "Jackets", source: "Jackets", interest: "gym-wear" },
  ] },
  { id: "seamless", label: "Seamless", source: "Seamless", interest: "private-label-activewear", children: [
    { id: "seamless-gym-set", label: "Gym Set", source: "Gym Set", interest: "activewear-sets" },
    { id: "seamless-sports-bra", label: "Sports Bra", source: "Sports Bra", interest: "sports-bras" },
    { id: "seamless-top", label: "Top", source: "Top", interest: "gym-wear" },
    { id: "seamless-leggings", label: "Leggings", source: "Leggings", interest: "leggings" },
    { id: "seamless-shorts", label: "Shorts", source: "Shorts", interest: "gym-wear" },
    { id: "seamless-jumpsuit", label: "Jumpsuit", source: "Jumpsuit", interest: "gym-wear" },
  ] },
  { id: "casual", label: "Casual", source: "Casual Wear", interest: "private-label-activewear", children: [
    { id: "casual-tops", label: "Tops", source: "Tops", interest: "gym-wear" },
    { id: "casual-pants", label: "Pants", source: "Pants", interest: "gym-wear" },
    { id: "casual-shorts", label: "Shorts", source: "Shorts", interest: "gym-wear" },
    { id: "casual-set", label: "Set", source: "Set", interest: "activewear-sets" },
    { id: "casual-hoodies-jackets", label: "Hoodies / Jackets", source: "Hoodies/Jackets", interest: "gym-wear" },
  ] },
  { id: "man-wear", label: "Man Wear", source: "Man Wear", interest: "gym-wear", children: [
    { id: "man-wear-tops", label: "Tops", source: "Tops", interest: "gym-wear" },
    { id: "man-wear-bottoms", label: "Bottoms", source: "Bottoms", interest: "gym-wear" },
    { id: "man-wear-set", label: "Set", source: "Set", interest: "activewear-sets" },
  ] },
  { id: "glory-star-collection", label: "GLORY STAR Collection", source: "SPARK Collection", interest: "private-label-activewear", children: [
    { id: "glory-star-elite-soft", label: "Elite Collection – Soft", source: "Elite Collection-Soft", interest: "private-label-activewear" },
    { id: "glory-star-new-collection", label: "S&S New Collection", source: "S&S New Collection", interest: "private-label-activewear" },
    { id: "glory-star-showroom", label: "Showroom Collection", source: "showroom collection", interest: "private-label-activewear" },
  ] },
  { id: "fitness-accessories", label: "Fitness Accessories", source: "Accessories", interest: "other", children: [
    { id: "fitness-accessories-bag", label: "Bag", source: "Bag", interest: "other" },
    { id: "fitness-accessories-socks", label: "Socks", source: "Socks", interest: "other" },
  ] },
];

const flattenTaxonomy = (nodes, depth = 0, parentId = "") => nodes.flatMap((node) => [
  { ...node, depth, parentId, children: undefined },
  ...flattenTaxonomy(node.children ?? [], depth + 1, node.id),
]);
const groupDefinitions = flattenTaxonomy(catalogTaxonomy);

const groupById = new Map(groupDefinitions.map((group) => [group.id, group]));
const cleanCategoryName = (value) => stripMarkup(value).replace(/\s+/g, " ").trim();

const inferGroups = (product, title) => {
  const groups = new Set();
  const categories = new Set((product.categories ?? []).map(cleanCategoryName).filter(Boolean));
  const addChildren = (nodes) => {
    for (const node of nodes) {
      const matched = categories.has(node.source);
      if (matched) groups.add(node.id);
      if (node.children?.length) addChildren(node.children);
    }
  };
  for (const parent of catalogTaxonomy) {
    if (!categories.has(parent.source)) continue;
    groups.add(parent.id);
    addChildren(parent.children ?? []);
  }

  if (!groups.size) {
    groups.add("non-seamless");
    const fallbackMatchers = [
      [/\b(?:sports bra|bra)\b/i, "non-seamless-sports-bra"],
      [/\b(?:long sleeve)\b/i, "non-seamless-long-sleeve-shirts"],
      [/\b(?:short sleeve)\b/i, "non-seamless-short-sleeve-shirts"],
      [/\b(?:tank top|tank)\b/i, "non-seamless-tank-top"],
      [/\b(?:top|shirt|tee)\b/i, "non-seamless-tops"],
      [/\b(?:legging|pants?|joggers?)\b/i, "non-seamless-leggings"],
      [/\bshorts?\b/i, "non-seamless-shorts"],
      [/\b(?:set|two piece|2 piece)\b/i, "non-seamless-fitness-set"],
      [/\b(?:jumpsuit|bodysuit|romper)\b/i, "non-seamless-jumpsuit"],
      [/\b(?:tennis skirt|skirt)\b/i, "non-seamless-tennis-skirts"],
      [/\b(?:jacket|outerwear)\b/i, "non-seamless-jackets"],
    ];
    const fallback = fallbackMatchers.find(([pattern]) => pattern.test(title));
    if (fallback) groups.add(fallback[1]);
  }
  return [...groups];
};

const primaryGroupFor = (groups) => {
  const preference = groupDefinitions.filter((group) => group.depth > 0).map((group) => group.id);
  preference.push(...catalogTaxonomy.map((group) => group.id));
  return preference.find((group) => groups.includes(group)) ?? "non-seamless";
};

const stopDescription = /^(?:contact(?:\s+us|\s+the\s+popular)|custom require|for product pricing|manufacturers? by|we will get back|related products?|oem\s*&\s*odm|personalized customization|we can make your logo|clients? display|key words?|what is faq|lorem ipsum|上一页|下一页)/i;
const stopSentinel = /(?:^|\n)(?:contact the popular customer care team|custom require|we will get back|related products?|key words?|oem\s*&\s*odm)(?:\b|\s*[:：])/i;
const skipDescription = /^(?:product\s*(?:code|sku)\s*:|awesome\s+(?:set\s+)?collection\s*[–—-]|video of the product details)/i;

const translateCatalogTerms = (value) => scrubBrands(value)
  .replace(/(\d+)\s*色/g, "$1 colors")
  .replace(/(\d+(?:\.\d+)?)%\s*尼龙/g, "$1% nylon")
  .replace(/(\d+(?:\.\d+)?)%\s*氨纶/g, "$1% spandex")
  .replace(/运动连体衣/g, "workout jumpsuit")
  .replace(/背心/g, "tank top")
  .replace(/无垫/g, "unpadded")
  .replace(/带垫/g, "padded")
  .replace(/\s*\+\s*/g, " + ")
  .replace(/\s+/g, " ")
  .trim();

const cleanDescription = (product, title, primaryLabel) => {
  const descriptionSku = cleanSku(product.sku, product.id);
  let source = scrubBrands(product.description_text ?? "").replace(/\r/g, "");
  source = source
    .replace(/video\s+of\s+the\s+product\s+details?/gi, " ")
    .replace(/\b(?:fully\s+customized|private\s+label\s+on\s+ready\s+product)\s+moq\b[\s\S]*$/i, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

  for (const prefix of [scrubBrands(String(product.name ?? "").split("|")[0]), title]) {
    if (!prefix) continue;
    source = source.replace(new RegExp(`^\\s*${escapeRegExp(prefix)}\\s*`, "i"), "");
  }

  const labelToken = "color|颜色|size|尺寸|type|类型|material|fabric|材质|feature|特点|function|功能";
  source = source.replace(new RegExp(`^\\s*(?:product\\s*)?sku\\s*[:：]\\s*.*?(?=\\s+(?:${labelToken})\\s*[:：])`, "i"), "");
  const structuredPattern = new RegExp(`(?:^|\\s)(${labelToken})\\s*[:：]\\s*(.*?)(?=\\s+(?:${labelToken})\\s*[:：]|$)`, "giu");
  const structuredHeadings = new Map([
    ["color", "Color options"], ["颜色", "Color options"],
    ["size", "Size range"], ["尺寸", "Size range"],
    ["type", "Product type"], ["类型", "Product type"],
    ["material", "Material"], ["fabric", "Material"], ["材质", "Material"],
    ["feature", "Feature"], ["特点", "Feature"],
    ["function", "Function"], ["功能", "Function"],
  ]);
  const structured = new Map();
  for (const match of source.matchAll(structuredPattern)) {
    const heading = structuredHeadings.get(match[1].toLowerCase());
    const body = translateCatalogTerms(match[2])
      .replace(/\b(?:fully\s+customized|private\s+label\s+on\s+ready\s+product)\s+moq\b[\s\S]*$/i, " ")
      .replace(/\b(?:moq|minimum\s+order\s+quantity|unit\s+price)\b[\s\S]*$/i, " ")
      .replace(/^[,.;:\-–—\s]+|[,.;:\-–—\s]+$/g, "")
      .trim();
    if (heading && body && !structured.has(heading)) structured.set(heading, truncate(body, 300));
  }

  if (structured.size >= 2) {
    const features = [...structured].map(([heading, body]) => ({ heading, body }));
    const material = structured.get("Material");
    const productType = structured.get("Product type");
    const performance = structured.get("Feature") || structured.get("Function");
    const summaryParts = [`${title} is a ${primaryLabel.toLowerCase()} style.`];
    if (material) summaryParts.push(`Material: ${material}.`);
    else if (productType) summaryParts.push(`Product type: ${productType}.`);
    if (performance) summaryParts.push(`Feature: ${performance}.`);
    return {
      features: features.slice(0, 8),
      summary: truncate(summaryParts.join(" "), 235),
      material: truncate(material || "Fabric composition and performance details can be confirmed for the selected colorway during sampling.", 300),
    };
  }

  const sentinelIndex = source.search(stopSentinel);
  const commercialIndex = source.search(/\b(?:fully\s+customized\s+moq|private\s+label\s+on\s+ready\s+product\s+moq|moq\s*[:：]|for\s+product\s+pricing)\b/i);
  const cutoff = [sentinelIndex, commercialIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  const productSource = cutoff === undefined ? source : source.slice(0, cutoff);
  const blocks = productSource
    .split(/\n+/)
    .map((block) => scrubBrands(block).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const segments = [];
  for (const block of blocks) {
    if (stopDescription.test(block)) break;
    if (skipDescription.test(block)) continue;
    if (/\b(?:product\s*(?:code|sku)|sku)\s*[:：]/i.test(block)) continue;
    if (/^awesome\b.*\bcollection\b/i.test(block)) continue;
    if (descriptionSku && block.toLowerCase().includes(descriptionSku.toLowerCase())) continue;
    if (slugify(block) === slugify(title)) continue;
    if (/^(?:facebook|instagram|youtube|whatsapp)$/i.test(block)) continue;
    if (block.length < 24) continue;
    segments.push(truncate(block, 720));
    if (segments.length >= 8 || segments.join(" ").length >= 3_400) break;
  }

  if (!segments.length) {
    segments.push(`${title} is a ${primaryLabel.toLowerCase()} style for custom and private-label activewear collections. Share your preferred fabric, color, size range, branding and order quantity so the construction can be confirmed during sampling.`);
  }

  const featurePattern = /^(?:【([^】]{2,50})】\s*[:：]?|([A-Za-z][A-Za-z0-9 &/+\-]{2,42})\s*[:：])\s*(.+)$/s;
  const features = segments.map((segment) => {
    const match = segment.match(featurePattern);
    if (!match) return { heading: "", body: segment };
    return { heading: scrubBrands(match[1] || match[2]), body: scrubBrands(match[3]) };
  }).filter((feature) => feature.body.length >= 20);

  const material = features.find((feature) => /material|fabric/i.test(feature.heading))
    ?? features.find((feature) => /\b\d{1,3}%\s*(?:nylon|polyester|spandex|cotton|lycra|elastane)/i.test(feature.body));
  const performance = features.find((feature) => /feature|function|design|support|waist|stretch|wick/i.test(feature.heading));
  const hasStructuredSpecs = features.filter((feature) => /^(?:color|size|type|material|fabric|feature|function)/i.test(feature.heading)).length >= 2;
  const summaryFeature = features.find((feature) => !/^(?:occasion|care|note|color|size|type)s?$/i.test(feature.heading)) ?? features[0];
  const summary = hasStructuredSpecs
    ? truncate(`${title} is a ${primaryLabel.toLowerCase()} style. ${[material?.body, performance?.body].filter(Boolean).join(" ")}`, 235)
    : truncate(summaryFeature?.body || segments[0], 235);

  return {
    features: features.slice(0, 8),
    summary,
    material: truncate(material?.body || "Fabric composition and performance details can be confirmed for the selected colorway during sampling.", 300),
  };
};

const organization = {
  "@type": "Organization",
  "@id": `${canonicalBase}/#organization`,
  name: "Glory Star Wear",
  legalName: "厦门广兴恒进出口有限公司",
  url: `${canonicalBase}/`,
  telephone: ["+86 180 2075 5949"],
  email: "kevin@glorystarwears.com",
  address: { "@type": "PostalAddress", addressLocality: "Xiamen", addressRegion: "Fujian Province", addressCountry: "CN" },
  logo: {
    "@type": "ImageObject",
    "@id": `${canonicalBase}/#logo`,
    url: `${canonicalBase}/assets/brand/glorystarwear-logo.png`,
    contentUrl: `${canonicalBase}/assets/brand/glorystarwear-logo.png`,
    width: 670,
    height: 540,
    caption: "Glory Star Wear official logo",
  },
};

const imagesRoot = path.join(sourceRoot, "images");
const allowedImageExtension = /\.(?:jpe?g|png|webp)$/i;
const galleryFailures = [];
for (const product of sourceProducts) {
  const galleryUrls = product.gallery_urls ?? [];
  if (!galleryUrls.length) galleryFailures.push(`${product.id}: no gallery URLs`);
  for (const sourceUrl of galleryUrls) {
    const planned = imagePlan[sourceUrl];
    const sourcePath = planned?.path ? path.resolve(sourceRoot, planned.path) : "";
    if (!sourcePath || !sourcePath.startsWith(`${imagesRoot}${path.sep}`) || !allowedImageExtension.test(sourcePath) || !fs.existsSync(sourcePath)) {
      galleryFailures.push(`${product.id}: missing mapped gallery asset for ${sourceUrl}`);
    }
  }
}
if (galleryFailures.length) {
  console.error(`Catalog generation stopped before replacing outputs: ${galleryFailures.length} gallery issue(s).`);
  for (const failure of galleryFailures.slice(0, 20)) console.error(`- ${failure}`);
  process.exit(1);
}

fs.rmSync(productsOutput, { recursive: true, force: true });
fs.rmSync(mediaOutput, { recursive: true, force: true });
fs.mkdirSync(productsOutput, { recursive: true });
fs.mkdirSync(mediaOutput, { recursive: true });

const copiedMedia = new Map();
const imageSizeCache = new Map();
const readImageSize = (sourcePath) => {
  const cached = imageSizeCache.get(sourcePath);
  if (cached) return cached;
  let width = 900;
  let height = 900;
  try {
    const data = fs.readFileSync(sourcePath);
    const extension = path.extname(sourcePath).toLowerCase();
    if (extension === ".png" && data.length >= 24) {
      width = data.readUInt32BE(16);
      height = data.readUInt32BE(20);
    } else if ([".jpg", ".jpeg"].includes(extension) && data.length >= 10) {
      const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
      let offset = 2;
      while (offset + 9 < data.length) {
        if (data[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = data[offset + 1];
        if (sofMarkers.has(marker)) {
          height = data.readUInt16BE(offset + 5);
          width = data.readUInt16BE(offset + 7);
          break;
        }
        if (marker === 0xd9 || marker === 0xda) break;
        if (marker >= 0xd0 && marker <= 0xd8) {
          offset += 2;
          continue;
        }
        const segmentLength = data.readUInt16BE(offset + 2);
        if (segmentLength < 2) break;
        offset += segmentLength + 2;
      }
    } else if (extension === ".webp" && data.length >= 30 && data.toString("ascii", 8, 12) === "WEBP") {
      const chunk = data.toString("ascii", 12, 16);
      if (chunk === "VP8X") {
        width = 1 + data.readUIntLE(24, 3);
        height = 1 + data.readUIntLE(27, 3);
      } else if (chunk === "VP8 ") {
        width = data.readUInt16LE(26) & 0x3fff;
        height = data.readUInt16LE(28) & 0x3fff;
      } else if (chunk === "VP8L") {
        const bits = data.readUInt32LE(21);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
    }
  } catch {
    // Keep a square fallback only when an asset header cannot be parsed.
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 30_000 || height > 30_000) {
    width = 900;
    height = 900;
  }
  const dimensions = { width, height };
  imageSizeCache.set(sourcePath, dimensions);
  return dimensions;
};

const registerMedia = (sourcePath) => {
  let publicPath = copiedMedia.get(sourcePath);
  if (publicPath) return publicPath;
  const extension = path.extname(sourcePath).toLowerCase() === ".jpeg" ? ".jpg" : path.extname(sourcePath).toLowerCase();
  const digest = crypto.createHash("sha1").update(path.relative(sourceRoot, sourcePath)).digest("hex").slice(0, 20);
  const shard = digest.slice(0, 2);
  const outputDirectory = path.join(mediaOutput, shard);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.copyFileSync(sourcePath, path.join(outputDirectory, `${digest}${extension}`));
  publicPath = `/wp-content/uploads/catalog/${shard}/${digest}${extension}`;
  copiedMedia.set(sourcePath, publicPath);
  return publicPath;
};

const copyGallery = (product, title) => {
  const media = [];
  const seen = new Set();
  for (const sourceUrl of product.gallery_urls ?? []) {
    const planned = imagePlan[sourceUrl];
    if (!planned?.path) continue;
    const sourcePath = path.resolve(sourceRoot, planned.path);
    // image_plan is keyed by the exact source URL and intentionally stores a
    // shared upload once. A valid gallery image may therefore live in another
    // product folder; keep it as long as it remains inside the mirror's images
    // root rather than rejecting it by folder ownership.
    if (!sourcePath.startsWith(`${imagesRoot}${path.sep}`) || !allowedImageExtension.test(sourcePath) || !fs.existsSync(sourcePath) || seen.has(sourcePath)) continue;
    seen.add(sourcePath);
    const publicPath = registerMedia(sourcePath);
    media.push({ path: publicPath, alt: `${title}${media.length ? ` – alternate view ${media.length + 1}` : " – product view"}`, ...readImageSize(sourcePath) });
  }
  return media;
};

const catalog = sourceProducts.map((product) => {
  const title = cleanTitle(product);
  const sku = cleanSku(product.sku, product.id);
  const groups = inferGroups(product, title);
  const primaryGroup = primaryGroupFor(groups);
  const primary = groupById.get(primaryGroup);
  const baseSlug = slugify(title).slice(0, 72).replace(/-+$/g, "") || "activewear-style";
  const routeSlug = `${baseSlug}-${product.id}`;
  const route = `/products/${routeSlug}/`;
  const description = cleanDescription(product, title, primary.label);
  const media = copyGallery(product, title);
  const mediaReview = !media.length;
  if (mediaReview) media.push({ path: "/assets/product-image-review.svg", alt: `${title} – product image pending verification`, width: 900, height: 900 });
  const pills = [primary.label];
  if (groups.includes("seamless") && primaryGroup !== "seamless") pills.push("Seamless");
  if (groups.includes("man-wear") && primaryGroup !== "man-wear") pills.push("Men's");
  return {
    id: Number(product.id),
    sku,
    title,
    routeSlug,
    route,
    canonical: `${canonicalBase}${route}`,
    groups,
    primary,
    pills: [...new Set(pills)],
    summary: description.summary,
    features: description.features,
    material: description.material,
    media,
    mediaReview,
  };
}).sort((a, b) => b.id - a.id);

const productsById = new Map(catalog.map((product) => [String(product.id), product]));
const productsByPrimary = new Map();
for (const product of catalog) {
  const list = productsByPrimary.get(product.primary.id) ?? [];
  list.push(product);
  productsByPrimary.set(product.primary.id, list);
}

const header = ({ current = "", interest = "private-label-activewear", showcase = false } = {}) => `
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header${showcase ? " site-header--catalog-showcase" : ""}">
    <div class="wrap nav">
      <a class="brand" href="/" aria-label="Glory Star Wear home"><img src="/assets/brand/glorystarwear-mark-360.png" width="44" height="44" alt=""><span>GLORY STAR WEAR</span></a>
      <nav class="nav-links" aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/products/"${current === "products" ? " aria-current=\"page\"" : ""}>Products</a>
        <a href="/private-label-activewear/">Customize Service</a>
        <a href="/about-glory-star-wear/">About Us</a>
        <a href="/support/">Support</a>
        <a href="/contact-us/">Contact Us</a>
        <a class="button" href="/request-a-quote/?interest=${html(interest)}">Request a quote</a>
      </nav>
    </div>
  </header>`;

const footer = `
  <footer class="site-footer">
    <div class="wrap footer-grid">
      <div class="footer-brand">
        <a href="/" aria-label="Glory Star Wear home"><img src="/assets/brand/glorystarwear-mark-360.png" width="44" height="44" alt=""><strong>GLORY STAR WEAR</strong></a>
        <p>Private-label activewear development, sampling and bulk production support from Xiamen, China.</p>
      </div>
      <nav class="footer-links" aria-label="Footer navigation">
        <div><strong>Explore</strong><a href="/products/">Products</a><a href="/private-label-activewear/">Customize Service</a><a href="/about-glory-star-wear/">About Us</a></div>
        <div><strong>Support</strong><a href="/support/">Support hub</a><a href="/faq/">FAQ</a><a href="/contact-us/">Contact Us</a></div>
      </nav>
    </div>
    <div class="footer-legal"><div class="wrap"><span>© 2026 Glory Star Wear. All rights reserved.</span><span><a href="/privacy-policy/">Privacy</a> · <a href="/terms-of-use/">Terms</a> · <a href="/cookie-policy/">Cookies</a> · <a href="/cookie-policy/" data-cookie-settings>Cookie settings</a></span></div></div>
  </footer>`;

const analytics = `
  <script defer src="/assets/privacy-controls.js" data-measurement-id="GT-W6K5676W"></script>`;

const card = (product, index = 100) => `
        <article class="catalog-card${index >= 24 ? " catalog-card--deferred" : ""}" data-catalog-item data-category="${html(product.groups.join(","))}" data-search="${html(`${product.title} ${product.sku} ${product.pills.join(" ")}`.toLowerCase())}">
          <a class="catalog-card__link" href="${product.route}">
            <div class="catalog-card__media"><img ${index < 4 ? "fetchpriority=\"high\"" : "loading=\"lazy\""} decoding="async" src="${product.media[0].path}" width="${product.media[0].width}" height="${product.media[0].height}" alt="${html(product.media[0].alt)}"><span class="catalog-card__badge">${html(product.mediaReview ? "Image review" : product.primary.label)}</span></div>
            <div class="catalog-card__body">
              <p class="catalog-card__meta"><span>${html(product.primary.label)}</span><span>${html(product.sku)}</span></p>
              <h2 class="catalog-card__title">${html(product.title)}</h2>
              <span class="catalog-card__arrow">View style</span>
            </div>
          </a>
        </article>`;

const catalogCanonical = `${canonicalBase}/products/`;
const catalogDescription = `Browse ${catalog.length} custom activewear styles for private-label collections, including sports bras, tops, leggings, shorts, sets, jumpsuits and outerwear.`;
const filterCounts = new Map(groupDefinitions.map((group) => [group.id, catalog.filter((product) => product.groups.includes(group.id)).length]));
const activeFilters = groupDefinitions.filter((group) => (filterCounts.get(group.id) ?? 0) > 0);
const activeTaxonomy = (nodes) => nodes.map((node) => ({
  ...node,
  count: filterCounts.get(node.id) ?? 0,
  children: activeTaxonomy(node.children ?? []),
})).filter((node) => node.count > 0);
const catalogFilterGroups = activeTaxonomy(catalogTaxonomy);
const renderSubcategoryFilters = (nodes, depth = 1) => nodes.map((filter) => `
              <button type="button" class="catalog-sidebar__button${depth > 1 ? " catalog-sidebar__button--nested" : ""}" data-catalog-filter="${filter.id}" data-filter-depth="${depth}" aria-pressed="false" aria-label="Show ${html(filter.label)} products (${filter.count})"><span>${html(filter.label)}</span></button>
              ${renderSubcategoryFilters(filter.children ?? [], depth + 1)}`).join("");
const collectionSchema = {
  "@context": "https://schema.org",
  "@graph": [
    organization,
    { "@type": "CollectionPage", "@id": `${catalogCanonical}#webpage`, url: catalogCanonical, name: "Custom Activewear Product Catalog", description: catalogDescription, about: { "@id": organization["@id"] }, inLanguage: "en-US" },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalBase}/` },
      { "@type": "ListItem", position: 2, name: "Products", item: catalogCanonical },
    ] },
    { "@type": "ItemList", name: "Latest catalog styles", numberOfItems: initialCatalogSize, itemListElement: catalog.slice(0, initialCatalogSize).map((product, index) => ({ "@type": "ListItem", position: index + 1, name: product.title, url: product.canonical })) },
  ],
};

const catalogIndex = catalog.map((product) => ({
  title: product.title,
  sku: product.sku,
  route: product.route,
  groups: product.groups,
  primaryLabel: product.primary.label,
  pills: product.pills,
  image: product.media[0],
  mediaReview: product.mediaReview,
}));
fs.writeFileSync(path.join(productsOutput, "catalog-index.json"), `${JSON.stringify(catalogIndex)}\n`);

const catalogPage = `<!doctype html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script>document.documentElement.classList.add("js")</script>
  <title>Custom Activewear Product Catalog | Glory Star Wear</title>
  <meta name="description" content="${html(catalogDescription)}">
  <link rel="canonical" href="${catalogCanonical}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Custom Activewear Product Catalog">
  <meta property="og:description" content="${html(catalogDescription)}">
  <meta property="og:url" content="${catalogCanonical}">
  <meta property="og:image" content="${canonicalBase}${catalog[0].media[0].path}">
  <meta property="og:image:alt" content="${html(catalog[0].media[0].alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/brand/glorystarwear-favicon-32.png" sizes="32x32">
  <link rel="stylesheet" href="/assets/seo-pages.css?v=20260828-3">
  <link rel="stylesheet" href="/assets/catalog.css?v=20260828-10">
  ${analytics}
  <script defer src="/assets/seo-pages.js?v=20260828-2"></script>
  <script defer src="/assets/catalog.js?v=20260828-11"></script>
  <script type="application/ld+json">${jsonScript(collectionSchema)}</script>
</head>
<body class="catalog-page catalog-index-page">
${header({ current: "products", showcase: true })}
  <main id="main" data-catalog data-catalog-default-filter="" data-catalog-feed="/products/catalog-index.json" data-catalog-total="${catalog.length}">
    <section class="catalog-hero">
      <div class="wrap catalog-hero__content">
        <p class="eyebrow">Private-label activewear collection</p>
        <h1>Are You New to Activewear?</h1>
        <p class="lead">Search the catalogue or choose a category to explore ready-to-customize sportswear styles.</p>
        <div class="catalog-hero__search catalog-search">
          <label class="catalog-visually-hidden" for="catalog-search">Search products or SKU</label>
          <input id="catalog-search" type="search" autocomplete="off" placeholder="Search all products or SKU" data-catalog-search>
        </div>
        <p class="catalog-hero__status" data-catalog-status aria-live="polite">Showing ${initialCatalogSize} of ${catalog.length} products</p>
      </div>
    </section>
    <section class="catalog-index-section">
      <div class="wrap catalog-index-layout">
        <details class="catalog-sidebar" open>
          <summary><span>Product Categories</span><strong data-catalog-sidebar-label>Non-seamless</strong></summary>
          <div class="catalog-sidebar__list" aria-label="Filter products by category">
            ${catalogFilterGroups.map((filter, index) => `<details class="catalog-sidebar__group">
              <summary class="catalog-sidebar__group-toggle" data-catalog-filter="${filter.id}" aria-pressed="false" aria-label="Show ${html(filter.label)} products (${filter.count}) and toggle subcategories"><span>${html(filter.label)}</span></summary>
              <div class="catalog-sidebar__submenu">${renderSubcategoryFilters(filter.children)}</div>
            </details>`).join("")}
          </div>
        </details>
        <div class="catalog-results">
          <div class="catalog-grid" id="catalog-product-grid">${catalog.slice(0, initialCatalogSize).map(card).join("")}
          </div>
          <div class="catalog-empty" data-catalog-empty hidden><h2>No matching styles</h2><p>Try another category or a shorter search term.</p></div>
          <div class="catalog-more"><button class="button" type="button" data-catalog-more hidden>Load more products</button></div>
          <details class="catalog-crawl-index">
            <summary>Browse the complete ${catalog.length}-style catalog</summary>
            <p>Use this compact index when you know the style name or SKU. Product filters and search load the same catalog on demand.</p>
            <ul>${catalog.map((product) => `<li><a href="${product.route}">${html(product.title)}</a><span>${html(product.sku)} · ${html(product.primary.label)}</span></li>`).join("")}</ul>
          </details>
        </div>
      </div>
    </section>
    <section class="cta"><div class="wrap cta-grid"><div><h2>Have a style shortlist?</h2><p>Send the SKUs, target quantities, colors, size range and logo requirements for a project review.</p></div><a class="button" href="/request-a-quote/?interest=private-label-activewear">Request a catalog quote</a></div></section>
  </main>
${footer}
</body>
</html>`;

fs.writeFileSync(path.join(productsOutput, "index.html"), catalogPage);

for (const product of catalog) {
  const relatedPool = productsByPrimary.get(product.primary.id) ?? catalog;
  const start = Math.max(0, relatedPool.findIndex((candidate) => candidate.id === product.id));
  const related = [];
  for (let offset = 1; related.length < 3 && offset < relatedPool.length; offset += 1) {
    const candidate = relatedPool[(start + offset) % relatedPool.length];
    if (candidate.id !== product.id) related.push(candidate);
  }

  const metaTitle = `${clipWords(product.title, 32)} · ${product.id} | Glory Star Wear`;
  const metaDescription = truncate(`${product.title} for custom and private-label activewear collections. Review product details, SKU ${product.sku}, customization options and request a quote.`, 154);
  const productSchema = {
    "@type": "Product",
    "@id": `${product.canonical}#product`,
    name: product.title,
    description: product.summary,
    sku: product.sku,
    category: product.primary.label,
    manufacturer: { "@id": organization["@id"] },
    brand: { "@type": "Brand", name: "Glory Star Wear" },
    url: product.canonical,
  };
  if (!product.mediaReview) productSchema.image = product.media.map((image) => `${canonicalBase}${image.path}`);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      { "@type": "WebPage", "@id": `${product.canonical}#webpage`, url: product.canonical, name: metaTitle, description: metaDescription, about: { "@id": `${product.canonical}#product` }, inLanguage: "en-US" },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalBase}/` },
        { "@type": "ListItem", position: 2, name: "Products", item: catalogCanonical },
        { "@type": "ListItem", position: 3, name: product.title, item: product.canonical },
      ] },
      productSchema,
    ],
  };
  const quoteUrl = `/request-a-quote/?${new URLSearchParams({
    interest: product.primary.interest,
    sku: product.sku,
    product: product.title,
    source: product.route,
  }).toString()}`;
  const whatsappText = encodeURIComponent(`Hello Glory Star Wear, I would like to ask about ${product.title} (SKU: ${product.sku}). Please share customization, sampling and bulk order details. Product page: ${product.canonical}`);
  const galleryFigures = product.media.map((image, index) => `<figure class="product-gallery__item${index === 0 ? " product-gallery__item--main" : ""}"><img ${index === 0 ? "fetchpriority=\"high\"" : "loading=\"lazy\""} decoding="async" src="${image.path}" width="${image.width}" height="${image.height}" alt="${html(image.alt)}"></figure>`);
  const galleryPrimary = galleryFigures[0];
  const gallerySecondary = galleryFigures.slice(1).join("");
  const featureCopy = product.features.map((feature) => feature.heading
    ? `<section class="product-description__feature"><h3>${html(feature.heading)}</h3><p>${html(feature.body)}</p></section>`
    : `<p>${html(feature.body)}</p>`).join("");
  const page = `<!doctype html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${html(metaTitle)}</title>
  <meta name="description" content="${html(metaDescription)}">
  <link rel="canonical" href="${product.canonical}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${html(product.title)}">
  <meta property="og:description" content="${html(product.summary)}">
  <meta property="og:url" content="${product.canonical}">
  <meta property="og:image" content="${canonicalBase}${product.media[0].path}">
  <meta property="og:image:alt" content="${html(product.media[0].alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/brand/glorystarwear-favicon-32.png" sizes="32x32">
  <link rel="stylesheet" href="/assets/seo-pages.css?v=20260828-3">
  <link rel="stylesheet" href="/assets/catalog.css?v=20260828-5">
  ${analytics}
  <script defer src="/assets/seo-pages.js?v=20260828-2"></script>
  <script type="application/ld+json">${jsonScript(schema)}</script>
</head>
<body class="catalog-page">
${header({ current: "products", interest: product.primary.interest })}
  <main id="main">
    <div class="wrap breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/products/">Products</a> / ${html(product.title)}</div>
    <section class="product-detail-shell">
      <div class="wrap product-detail">
        <div class="product-gallery product-gallery--primary" role="region" aria-label="Primary product image">${galleryPrimary}</div>
        <article class="product-summary">
          <p class="eyebrow">Custom &amp; private-label activewear</p>
          <h1>${html(product.title)}</h1>
          <div class="product-pills">${product.pills.map((pill) => `<span class="product-pill">${html(pill)}</span>`).join("")}<span class="product-pill">SKU ${html(product.sku)}</span></div>
          <p class="product-summary__lead">${html(product.summary)}</p>
          <div class="product-summary__actions"><a class="button" href="https://wa.me/8618020755949?text=${whatsappText}" data-analytics-event="whatsapp_click" data-analytics-method="whatsapp">Ask about this SKU</a><a class="button secondary" href="${html(quoteUrl)}">Request a quote</a></div>
          <p class="product-summary__microcopy">${product.mediaReview ? "The downloaded media for this SKU could not be matched safely and is pending image verification. " : ""}Fabric, measurements, colors and performance claims are reconfirmed on the approved sample. Review the <a href="/activewear-moq-sampling/">MOQ and sampling guide</a> before requesting project-specific terms.</p>
        </article>
        ${gallerySecondary ? `<div class="product-gallery product-gallery--secondary" role="region" aria-label="Additional product views">${gallerySecondary}</div>` : ""}
      </div>
    </section>
    <section class="product-information"><div class="wrap product-information__grid"><div class="product-description"><p class="eyebrow">Style brief</p><h2>Product information</h2><p>Use these details to shortlist the style, then confirm measurements, fabric, construction, color standards and branding requirements during sampling.</p><div class="product-description__copy">${featureCopy}</div></div><aside class="product-specs"><h2>At a glance</h2><dl><div><dt>Style code</dt><dd>${html(product.sku)}</dd></div><div><dt>Category</dt><dd>${html(product.primary.label)}</dd></div><div><dt>Material direction</dt><dd>${html(product.material)}</dd></div><div><dt>Customization</dt><dd>Logo, labels, colors, size range and packaging can be reviewed for your project.</dd></div><div><dt>MOQ &amp; sampling</dt><dd><a href="/activewear-moq-sampling/">Confirmed from the style, material, colors, sizes, branding and quantity split.</a></dd></div><div><dt>Project process</dt><dd><a href="/custom-activewear-process/">Brief, specification, sampling, approval and shipment.</a></dd></div></dl></aside></div></section>
    <section class="trust-strip" aria-label="Customization workflow"><div class="wrap trust-grid"><div class="trust-item"><strong>01 · Select</strong>Reference the SKU and target colorways</div><div class="trust-item"><strong>02 · Customize</strong>Confirm fabric, logo, labels and packaging</div><div class="trust-item"><strong>03 · Sample</strong>Review fit, measurements and construction</div><div class="trust-item"><strong>04 · Produce</strong>Approve the sample before bulk production</div></div></section>
    <section class="related-products"><div class="wrap"><div class="section-head"><div><p class="eyebrow">More ${html(product.primary.label)}</p><h2>Related product styles</h2></div><p class="section-intro">Compare adjacent styles and include multiple SKUs in one project inquiry.</p></div><div class="catalog-grid">${related.map((relatedProduct) => card(relatedProduct, 100)).join("")}</div><p class="related-products__all"><a class="button secondary" href="/products/?category=${product.primary.id}">View all ${html(product.primary.label)}</a></p></div></section>
    <section class="cta"><div class="wrap cta-grid"><div><h2>Quote this style for your collection.</h2><p>Send SKU ${html(product.sku)} with colors, sizes, logo placement and estimated quantities.</p></div><a class="button" href="https://wa.me/8618020755949?text=${whatsappText}" data-analytics-event="whatsapp_click" data-analytics-method="whatsapp">Start on WhatsApp</a></div></section>
  </main>
${footer}
</body>
</html>`;
  const outputDirectory = path.join(productsOutput, product.routeSlug);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "index.html"), page);
}

const sitemapPath = path.join(root, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPath, "utf8");
sitemap = sitemap.replace(/\s*<url>\s*<loc>https:\/\/glorystarwearing\.com\/products\/[^<]*<\/loc>[\s\S]*?<\/url>/g, "");
const catalogSitemap = [
  `  <url>\n    <loc>${catalogCanonical}</loc>\n    <lastmod>${releaseDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`,
  ...catalog.map((product) => `  <url>\n    <loc>${product.canonical}</loc>\n    <lastmod>${releaseDate}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`),
].join("\n");
sitemap = sitemap.replace(/\s*<\/urlset>\s*$/, `\n${catalogSitemap}\n</urlset>\n`);
fs.writeFileSync(sitemapPath, sitemap);

const homepagePath = path.join(root, "index.html");
let homepage = fs.readFileSync(homepagePath, "utf8");
const homepageRoutes = new Map([
  ["/#products", "/products/"],
  ["/#sports-bras", "/products/?category=sports-bras"],
  ["/#tops", "/products/?category=tops"],
  ["/#shorts", "/products/?category=shorts"],
  ["/#leggings", "/products/?category=leggings"],
  ["/#sets", "/products/?category=sets"],
  ["/#jumpsuits", "/products/?category=jumpsuits"],
  ["/#athleisure", "/products/?category=lifestyle"],
]);
for (const [from, to] of homepageRoutes) homepage = homepage.replaceAll(`href="${from}"`, `href="${to}"`);
const homepageLabelRoutes = new Map([
  ["Jackets", "/products/?category=outerwear"],
  ["Hoodies/Jackets", "/products/?category=outerwear"],
  ["Tennis Skirts", "/products/?category=skirts-dresses"],
  ["Man Wear", "/products/?category=mens"],
  ["Bags", "/products/?category=accessories"],
  ["Socks", "/products/?category=accessories"],
]);
for (const [label, route] of homepageLabelRoutes) {
  homepage = homepage.replace(new RegExp(`href="/products/[^"]*"(?=[^>]*>${escapeRegExp(label)}<\\/a>)`, "g"), `href="${route}"`);
}
homepage = homepage
  .replace(/\bGymshark\b/gi, "activewear")
  .replace(/\btheglorystarwear\s*\.\s*com\b/gi, "Glory Star Wear")
  .replace(/Flexibloom Yoga Collection/gi, "Yoga Movement Collection")
  .replace(/Elite Collection-Soft/gi, "Soft-Touch Collection")
  .replace(/Elite Collection-Cool/gi, "Cooling Collection");
homepage = homepage
  .replace(/<script[^>]*id="google_gtagjs-js"[^>]*>[\s\S]*?<\/script>\s*<script[^>]*id="google_gtagjs-js-after"[^>]*>[\s\S]*?<\/script>/i, '<script defer src="/assets/privacy-controls.js" data-measurement-id="GT-W6K5676W"></script>')
  .replace("WHAT OUR CUSTOMERS SAYS", "HOW WE REVIEW YOUR PROJECT")
  .replace("GLORY STAR GYM WEAR", "CLEAR CHECKPOINTS BEFORE BULK PRODUCTION")
  .replace(/<img[^>]+src="wp-content\/uploads\/2024\/07\/1-945x1024\.webp"[^>]*>\s*<noscript>[\s\S]*?<\/noscript>/i, '<div class="glory-process-proof"><p class="glory-process-proof__step">01 · Specification review</p><h3>Align the product brief before sampling</h3><p>We review the selected SKU, target fabric, measurements, color standards, branding, packaging and quantity split so open questions are visible early.</p><a href="/custom-activewear-process/">Review the custom process</a></div>')
  .replace(/<img[^>]+src="wp-content\/uploads\/2024\/07\/review2-945x1024\.webp"[^>]*>\s*<noscript>[\s\S]*?<\/noscript>/i, '<div class="glory-process-proof"><p class="glory-process-proof__step">02 · Approval control</p><h3>Use the approved sample as the reference</h3><p>Measurements, construction, artwork placement and packaging are checked against the agreed specification before bulk production is released.</p><a href="/activewear-quality-control/">See the quality-control framework</a></div>')
  .replace("Copyright © 2026 Glory Star Wear. All rights reserved.</span>", 'Copyright © 2026 Glory Star Wear. All rights reserved.<br><a href="/privacy-policy/">Privacy</a> · <a href="/terms-of-use/">Terms</a> · <a href="/cookie-policy/">Cookies</a> · <a href="/cookie-policy/" data-cookie-settings>Cookie settings</a></span>');
if (!homepage.includes('/assets/home-trust.css')) homepage = homepage.replace("</head>", '<link rel="stylesheet" href="/assets/home-trust.css">\n</head>');
homepage = homepage.replace(/(<div class="qodef-e swiper-slide[\s\S]*?)(?=<div class="qodef-e swiper-slide|\n\t<\/div>\s*\n\t\t<div class="swiper-button-prev")/g, (block) => {
  const id = block.match(/\bpost-(\d+)\b/)?.[1];
  const product = productsById.get(id);
  return product ? block.replace(/href="(?:\/#contact|\/products\/[^\"]+\/)"/g, `href="${product.route}"`) : block;
});
fs.writeFileSync(homepagePath, homepage);

const standardPageNav = `<nav class="nav-links" aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/products/">Products</a>
        <a href="/private-label-activewear/">Customize Service</a>
        <a href="/about-glory-star-wear/">About Us</a>
        <a href="/support/">Support</a>
        <a href="/contact-us/">Contact Us</a>
        <a class="button" href="/request-a-quote/">Request a quote</a>
      </nav>`;
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || ["products", ".git", ".vercel", "wp-content", "wp-includes", "assets", "scripts"].includes(entry.name)) continue;
  const pagePath = path.join(root, entry.name, "index.html");
  if (!fs.existsSync(pagePath)) continue;
  let page = fs.readFileSync(pagePath, "utf8");
  page = page
    .replace(/\/assets\/seo-pages\.css(?:\?v=[^"']*)?/g, "/assets/seo-pages.css?v=20260828-3")
    .replace(/\/assets\/seo-pages\.js(?:\?v=[^"']*)?/g, "/assets/seo-pages.js?v=20260828-2")
    .replace(/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=GT-W6K5676W"><\/script>\s*<script>window\.dataLayer=window\.dataLayer\|\|\[\];function gtag\(\)\{dataLayer\.push\(arguments\)\}gtag\("js",new Date\(\)\);gtag\("config","GT-W6K5676W"\);<\/script>/gi, analytics.trim())
    .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/i, footer.trim());
  if (page.includes('class="nav-links"')) {
    page = page.replace(/<nav class="nav-links" aria-label="Primary navigation">[\s\S]*?<\/nav>/, standardPageNav);
    fs.writeFileSync(pagePath, page);
  }
}

const manifest = {
  generatedAt: `${releaseDate}T00:00:00+08:00`,
  products: catalog.length,
  mediaFiles: copiedMedia.size,
  mediaReviewProducts: catalog.filter((product) => product.mediaReview).map((product) => product.id),
  catalogIndexEntries: catalogIndex.length,
  initialCatalogCards: initialCatalogSize,
  groups: Object.fromEntries(activeFilters.map((group) => [group.id, filterCounts.get(group.id)])),
};
fs.writeFileSync(path.join(productsOutput, "catalog-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
installMultilingual(root);

console.log(`Generated ${catalog.length} product pages and ${copiedMedia.size} local gallery assets.`);
