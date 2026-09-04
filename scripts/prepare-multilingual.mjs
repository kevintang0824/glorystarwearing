import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { languages, copy, categoryKeys, guideRoutes } from './locales.mjs';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const origin = 'https://glorystarwearing.com';
const snapshotPath = path.join(sourceRoot, 'catalog-data/multilingual-catalog.json.gz');
const version = '20260903-2';
export const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode = (value) => String(value ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').trim();
const json = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
const localPath = (language, route) => `${language.prefix ? `/${language.prefix}` : ''}${route}`;
const canonicalRoute = (file) => file === 'index.html' ? '/' : `/${file.replace(/\/index\.html$/, '')}/`;

export function canonicalPages(root) {
  const sitemap = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  return [...new Set([...sitemap.matchAll(/<loc>\s*https:\/\/glorystarwearing\.com(\/[^<]*)\s*<\/loc>/g)].map((m) => m[1] === '/' ? 'index.html' : `${m[1].replace(/^\/|\/$/g,'')}/index.html`).concat('404.html'))];
}
export function alternates(route) {
  return languages.map((language) => `<link rel="alternate" hreflang="${language.code}" href="${origin}${localPath(language, route)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${origin}${route}">`;
}
export function switcher(language, route) {
  return `<!-- gsw-language-start --><details class="gsw-language" lang="${language.code}"><summary aria-label="${escape(language.heading)}: ${language.name}"><span class="gsw-language__flag" aria-hidden="true">${language.flag}</span><span>${language.name}</span><svg class="gsw-language__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div class="gsw-language__panel"><p class="gsw-language__heading">${language.heading}</p><ul class="gsw-language__list" aria-label="${language.heading}">${languages.map((other) => `<li><a data-language="${other.code}" href="${localPath(other,route)}" lang="${other.code}" hreflang="${other.code}"${language.code === other.code ? ' aria-current="true"' : ''}><span class="gsw-language__flag" aria-hidden="true">${other.flag}</span><span>${other.name}</span><span class="gsw-language__check" aria-hidden="true">✓</span></a></li>`).join('')}</ul></div></details><!-- gsw-language-end -->`;
}
function installEnglish(root) {
  const files = canonicalPages(root);
  for (const file of files) {
    const filename = path.resolve(root,file);
    if (!filename.startsWith(`${root}${path.sep}`)) throw new Error(`Unsafe path ${file}`);
    const before = fs.readFileSync(filename,'utf8');
    let html = before.replace(/\s*<!-- gsw-language-start -->[\s\S]*?<!-- gsw-language-end -->/g,'')
      .replace(/\s*<!-- gsw-alternates-start -->[\s\S]*?<!-- gsw-alternates-end -->/g,'')
      .replace(/\s*<link[^>]+href="\/assets\/multilingual\.css[^>]*>/g,'')
      .replace(/\s*<script[^>]+src="\/assets\/multilingual\.js[^>]*><\/script>/g,'');
    const route = file === '404.html' ? '/' : canonicalRoute(file);
    html = html.replace(/class="home-shell-header__inner(?: gsw-language-layout)?"/, 'class="home-shell-header__inner gsw-language-layout"')
      .replace(/class="wrap nav(?: gsw-language-layout)?"/, 'class="wrap nav gsw-language-layout"');
    let inserted = false;
    html = html.replace(/<\/nav>(\s*<\/div>\s*<\/header>)/, (_, ending) => { inserted = true; return `</nav>${switcher(languages[0],route)}${ending}`; });
    if (!inserted) throw new Error(`Could not place language selector: ${file}`);
    const meta = file === '404.html' ? '' : `\n<!-- gsw-alternates-start -->\n${alternates(route)}\n<!-- gsw-alternates-end -->`;
    html = html.replace('</head>', `\n<link rel="stylesheet" href="/assets/multilingual.css?v=${version}">\n<script defer src="/assets/multilingual.js?v=${version}"></script>${meta}\n</head>`);
    if (html !== before) fs.writeFileSync(filename,html);
  }
  return files.length;
}
function captureCatalog(root) {
  const products = JSON.parse(fs.readFileSync(path.join(root,'products/catalog-index.json'),'utf8'));
  const files = {};
  for (const file of ['products/index.html','products/catalog-index.json','products/catalog-manifest.json', ...products.map((p) => `${p.route.slice(1)}index.html`)]) files[file] = fs.readFileSync(path.join(root,file),'utf8');
  if (products.length !== 1002) throw new Error('Catalogue snapshot must contain 1002 products.');
  return {version:2,products,files};
}
export function installMultilingual(root = sourceRoot) {
  const count = installEnglish(root);
  if (root === sourceRoot) fs.writeFileSync(snapshotPath,zlib.gzipSync(JSON.stringify(captureCatalog(root))));
  else buildLocalized(root,captureCatalog(root));
  return count;
}
const titleFor = (t, key) => t.pages[key]?.split('|')[0];
const navRoutes = ['/','/products/','/private-label-activewear/','/about-glory-star-wear/','/support/','/contact-us/','/request-a-quote/'];
export const releaseImageAssets = [
  'wp-content/uploads/2026/08/activewear-collection-480.avif',
  'wp-content/uploads/2026/08/activewear-collection-820.avif',
  'wp-content/uploads/2026/08/activewear-collection-1280.avif',
  'wp-content/uploads/2026/08/activewear-collection-1640.avif',
  'wp-content/uploads/2026/08/activewear-collection-480.jpg',
  'wp-content/uploads/2026/08/activewear-collection-820.jpg',
  'wp-content/uploads/2026/08/activewear-collection-1280.jpg',
  'wp-content/uploads/2026/08/activewear-collection-1640.jpg',
  'wp-content/uploads/2026/08/activewear-collection-clean.png',
  'wp-content/uploads/2026/08/xiamen-guangxingheng-team.png',
];
const categoryName = (t,label) => t.categories[categoryKeys.indexOf(label)] || t.ui.product;
const attributeRules = [/\bseamless\b/i,/\bhigh[ -]waist/i,/\bwith (?:side )?pockets?\b/i,/\bflare(?:d)?\b/i,/\bribbed\b/i,/\bbackless\b|\bopen[ -]back\b/i,/\bhalter\b/i,/\bone[ -]shoulder\b/i,/\blong[ -]sleeve\b/i,/\bmen(?:'s|s)?\b/i,/\bwomen(?:'s|s)?\b/i];
export function productName(product,t) {
  const attrs = attributeRules.flatMap((rule,i) => rule.test(product.title) ? [t.attrs[i]] : []).slice(0,3);
  return [categoryName(t,product.primaryLabel), ...attrs, product.route.match(/-(\d+)\/$/)?.[1]].filter(Boolean).join(' · ');
}
function productFacts(product,snapshot,t) {
  const html = snapshot.files[`${product.route.slice(1)}index.html`];
  const features = Object.fromEntries([...html.matchAll(/<section class="product-description__feature"><h3>(.*?)<\/h3><p>(.*?)<\/p>/g)].map((m)=>[decode(m[1]),decode(m[2])]));
  const material = features.Material || '';
  // Preserve only stated fibre percentages; do not invent a composition from prose.
  const components = material.match(/\d+(?:\.\d+)?\s*%\s*(?:recycled\s+)?(?:other fibers|nylon|polyester|spandex|cotton|rayon|modal|lyocell|viscose|lycra|cotionic|sorona|tpu)/gi) || [];
  const composition = components.map((part)=>part.replace(/[A-Za-z]+/g,(word)=>t.materials[word.toLowerCase()] || word)).join(' + ');
  const colors = features['Color options']?.match(/^\s*(\d+)\s*colou?rs?\s*$/i)?.[1];
  const sizes = features['Size range'] || '';
  const facts = [[t.ui.material,composition],[t.ui.sizes,/^(?:free|f)$/i.test(sizes) ? t.ui.oneSize : sizes.toUpperCase()],[t.ui.colors,colors ? `${colors} ${t.ui.colorUnit}` : '']].filter(([,value])=>value);
  const galleryHtml = html.split('<section class="product-information"')[0];
  const seen = new Set();
  const images = [...galleryHtml.matchAll(/<img\b[^>]*\bsrc="(\/wp-content\/uploads\/catalog\/[^" ]+)"[^>]*>/g)].flatMap((m)=>{
    if (seen.has(m[1])) return []; seen.add(m[1]);
    return [{path:m[1],width:Number(m[0].match(/width="(\d+)"/)?.[1])||900,height:Number(m[0].match(/height="(\d+)"/)?.[1])||900}];
  });
  return {facts,images:images.length ? images : [product.image]};
}
function card(product,t) {
  return `<article class="catalog-card" data-native-product><a class="catalog-card__link" href="${product.route}"><div class="catalog-card__media"><img loading="lazy" decoding="async" src="${escape(product.image.path)}" width="${product.image.width}" height="${product.image.height}" alt="${escape(product.title)}"><span class="catalog-card__badge">${escape(product.primaryLabel)}</span></div><div class="catalog-card__body"><p class="catalog-card__meta">${escape(product.sku)}</p><h2 class="catalog-card__title">${escape(product.title)}</h2><span class="catalog-card__arrow">${t.ui.view} →</span></div></a></article>`;
}
function documentHtml(language,route,title,description,body,{product,robots='index,follow,max-image-preview:large'}={}) {
  const t=copy[language.code],u=t.ui, base=`/${language.prefix}`;
  const url=`${origin}${localPath(language,route)}`;
  const schema={'@context':'https://schema.org','@type':product?'ItemPage':'WebPage','@id':`${url}#webpage`,url,name:title,description,inLanguage:language.code,isPartOf:{'@type':'WebSite',name:'Glory Star Wear',url:`${origin}${base}/`}};
  if(product) schema.mainEntity={'@type':'Product',name:product.title,sku:product.sku,image:`${origin}${product.image.path}`,brand:{'@type':'Brand',name:'Glory Star Wear'}};
  const pageData={code:language.code,base,ui:u,privacy:t.privacyBanner};
  return `<!doctype html>\n<html lang="${language.code}" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | Glory Star Wear</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${url}">${robots.startsWith('noindex')?'':alternates(route)}<meta property="og:locale" content="${language.code.replace('-','_')}"><meta property="og:type" content="${product?'product':'website'}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}">${product?`<meta property="og:image" content="${origin}${product.image.path}">`:''}<link rel="icon" href="/assets/brand/glorystarwear-favicon-32.png"><link rel="stylesheet" href="/assets/seo-pages.css?v=20260828-3"><link rel="stylesheet" href="/assets/catalog.css?v=20260828-10"><link rel="stylesheet" href="/assets/multilingual.css?v=${version}"><link rel="stylesheet" href="/assets/localized-site.css?v=${version}"><script type="application/ld+json">${json(schema)}</script><script type="application/json" id="gsw-locale-data">${json(pageData)}</script><script defer src="/assets/multilingual.js?v=${version}"></script><script defer src="/assets/localized-site.js?v=${version}"></script><script defer src="/assets/privacy-controls.js" data-measurement-id="GT-W6K5676W"></script></head><body class="localized-site"><a class="skip" href="#main">${u.skip}</a><header class="site-header"><div class="wrap nav gsw-language-layout"><a class="brand" href="${base}/" aria-label="Glory Star Wear · ${t.nav[0]}"><img src="/assets/brand/glorystarwear-mark-360.png" width="40" height="40" alt=""><span>GLORY STAR WEAR</span></a><nav class="nav-links" aria-label="${u.primary}">${navRoutes.map((r,i)=>`<a href="${base}${r}"${i===6?' class="button"':''}${r===route?' aria-current="page"':''}>${t.nav[i]}</a>`).join('')}</nav>${switcher(language,robots.startsWith('noindex')?'/':route)}</div></header><main id="main">${body}</main><footer class="site-footer"><div class="wrap footer-grid"><div class="footer-brand"><a href="${base}/"><img src="/assets/brand/glorystarwear-mark-360.png" width="44" height="44" alt=""><strong>GLORY STAR WEAR</strong></a><p>${u.brandNote}</p></div><nav class="footer-links" aria-label="${u.footer}"><div><strong>${u.explore}</strong>${[1,2,3].map(i=>`<a href="${base}${navRoutes[i]}">${t.nav[i]}</a>`).join('')}</div><div><strong>${t.nav[4]}</strong><a href="${base}/activewear-manufacturing-guides/">${u.guides}</a><a href="${base}/faq/">${u.faq}</a><a href="${base}/contact-us/">${t.nav[5]}</a></div></nav></div><div class="footer-legal"><div class="wrap"><span>© 2026 Glory Star Wear. ${u.rights}</span><span><a href="${base}/privacy-policy/">${u.privacy}</a> · <a href="${base}/terms-of-use/">${u.terms}</a> · <a href="${base}/cookie-policy/">${u.cookies}</a> · <a href="${base}/cookie-policy/" data-cookie-settings>${u.cookieSettings}</a></span></div></div></footer></body></html>`;
}
const sharedText = (t) => new Map([
  ['Skip to content',t.ui.skip],['Primary navigation',t.ui.primary],['Footer navigation',t.ui.footer],
  ['Home',t.nav[0]],['Products',t.nav[1]],['Customize Service',t.nav[2]],['About Us',t.nav[3]],
  ['Support',t.nav[4]],['Contact Us',t.nav[5]],['Request a quote',t.nav[6]],['Request A Quote',t.nav[6]],
  ['Explore',t.ui.explore],['Support hub',t.nav[4]],['FAQ',t.ui.faq],['Privacy',t.ui.privacy],
  ['Terms',t.ui.terms],['Cookies',t.ui.cookies],['Cookie settings',t.ui.cookieSettings],
  ['All rights reserved.',t.ui.rights],['View style',t.ui.view],['Product information',t.ui.specs],
  ['Material',t.ui.material],['Size range',t.ui.sizes],['Color options',t.ui.colors],
  ['Style code',t.ui.reference],['Product type',t.ui.product],['Additional product views',t.ui.gallery],
  ['Primary product image',t.ui.product],['Ask about this SKU',t.nav[6]],['Start on WhatsApp',t.ui.submit],
  ['Related product styles',t.ui.related],['Style brief',t.ui.details],['At a glance',t.ui.details],
  ['Material direction',t.ui.material],['Customization',t.nav[2]],['MOQ & sampling',t.ui.sample],
  ['Project process',t.ui.workflow],['Custom & private-label activewear',t.nav[2]],
  ['Select',t.ui.steps[0]],['Customize',t.ui.steps[1]],['Sample',t.ui.steps[2]],['Produce',t.ui.steps[3]],
  ['Select language',languages.find(x=>x.code===t.code)?.heading || 'Select language'],
]);

const routePrefix = (language, value) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return value;
  if (/^\/(?:assets|wp-content|wp-includes|_vercel)(?:\/|$)/.test(value)) return value;
  if (languages.slice(1).some(({prefix}) => value === `/${prefix}` || value.startsWith(`/${prefix}/`))) return value;
  return `/${language.prefix}${value}`;
};

function cloneEnglishPage(language, route, sourceHtml, {pageKey='',product=null}={}) {
  const t=copy[language.code], page=t.pages[pageKey]?.split('|') || [];
  let html=sourceHtml
    .replace(/<html\s+lang="[^"]+"/,`<html lang="${language.code}"`)
    .replace(/"inLanguage":"en-US"/g,`"inLanguage":"${language.code}"`)
    .replace(/(<meta\s+property="og:locale"\s+content=")[^"]*(")/i,`$1${language.code.replace('-','_')}$2`)
    .replace(/\s*<!-- gsw-language-start -->[\s\S]*?<!-- gsw-language-end -->/g,'')
    .replace(/\s*<!-- gsw-alternates-start -->[\s\S]*?<!-- gsw-alternates-end -->/g,'');

  html=html.replace(/\b(href|action|data-catalog-feed|data-feed)="(\/[^"#]*)"/g,(match,attr,value)=>`${attr}="${routePrefix(language,value)}"`);
  // WordPress exported the homepage with root-relative-looking asset paths that
  // omit the leading slash. They must remain shared assets inside locale folders.
  html=html.replace(/(["'])((?:wp-content|wp-includes)\/)/g,'$1/$2');
  html=html.replace(/https:\/\/glorystarwearing\.com(\/(?!assets\/|wp-content\/|wp-includes\/|_vercel\/)[^"'<\s]*)/g,(_,value)=>`${origin}${routePrefix(language,value)}`);
  html=html.replace(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/i,'<link rel="canonical" href="$1">');

  const localizedTitle=product ? productName(product,t) : page[0];
  const localizedLead=product ? t.ui.productIntro : page[1];
  if(localizedTitle) {
    html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(localizedTitle)} | Glory Star Wear</title>`)
      .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i,`$1${escape(localizedTitle)}$2`)
      .replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i,`$1${escape(localizedTitle)}$2`);
  }
  if(localizedLead) {
    html=html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/i,`$1${escape(localizedLead)}$2`)
      .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i,`$1${escape(localizedLead)}$2`)
      .replace(/(<p\b[^>]*class="[^"]*(?:lead|intro)[^"]*"[^>]*>)[\s\S]*?(<\/p>)/i,`$1${escape(localizedLead)}$2`);
  }
  if(!product && page.length>2) {
    let point=0;
    html=html.replace(/(<main\b[\s\S]*?<\/main>)/i,(main)=>main.replace(/(<p\b(?![^>]*class="[^"]*(?:kicker|eyebrow))[^>]*>)([^<]{45,})(<\/p>)/g,(full,start,text,end)=>{
      if(point>=page.length-2) return full;
      return `${start}${escape(page[point+++2])}${end}`;
    }));
  }
  if(product) {
    const localizedName=productName(product,t);
    html=html.split(escape(product.title)).join(escape(localizedName)).split(product.title).join(localizedName);
    html=html.replace(/Use these details to shortlist the style,[^<]+/g,escape(t.ui.productIntro))
      .replace(/Fabric, measurements, colors and performance claims are reconfirmed on the approved sample\.[^<]*/g,escape(t.ui.confirm))
      .replace(/Quote this style for your collection\./g,escape(t.ui.cta))
      .replace(/Send SKU ([^<]+) with colors, sizes, logo placement and estimated quantities\./g,(_,sku)=>escape(`${t.ui.reference} ${sku}: ${t.ui.ctaText}`));
  }
  for(const [english,localized] of sharedText({...t,code:language.code})) {
    html=html.split(`>${english}<`).join(`>${localized}<`)
      .split(`aria-label="${english}"`).join(`aria-label="${escape(localized)}"`);
  }

  html=html.replace(/class="home-shell-header__inner(?: gsw-language-layout)?"/,'class="home-shell-header__inner gsw-language-layout"')
    .replace(/class="wrap nav(?: gsw-language-layout)?"/,'class="wrap nav gsw-language-layout"');
  let inserted=false;
  html=html.replace(/<\/nav>(\s*<\/div>\s*<\/header>)/,(_,ending)=>{inserted=true;return `</nav>${switcher(language,route)}${ending}`;});
  if(!inserted) throw new Error(`Could not place localized language selector: ${language.prefix}${route}`);
  const meta=route==='/' && /<meta name="robots" content="noindex/.test(html) ? '' : `\n<!-- gsw-alternates-start -->\n${alternates(route)}\n<!-- gsw-alternates-end -->`;
  html=html.replace('</head>',`${meta}\n</head>`);
  return html;
}

function buildLocalized(outputRoot,snapshot) {
  const urls=[];
  const write=(file,html)=>{const dest=path.join(outputRoot,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,html)};
  for(const language of languages.slice(1)) {
    const t=copy[language.code],u=t.ui,base=`/${language.prefix}`;
    const products=snapshot.products.map((p)=>({...p,title:productName(p,t),route:`${base}${p.route}`,primaryLabel:categoryName(t,p.primaryLabel),pills:p.pills.map(label=>label==='Seamless'?t.attrs[0]:categoryName(t,label)),image:{...p.image,alt:productName(p,t)}}));
    write(`${language.prefix}/products/catalog-index.json`,JSON.stringify(products));
    for(const [key] of Object.entries(t.pages)) {
      const route=key?`/${key}/`:'/';
      const relative=key?`${key}/index.html`:'index.html';
      const source=key==='products' ? snapshot.files['products/index.html'] : fs.readFileSync(path.join(outputRoot,relative),'utf8');
      write(`${language.prefix}/${relative}`,cloneEnglishPage(language,route,source,{pageKey:key}));
      urls.push(`${origin}${base}${route}`);
    }
    snapshot.products.forEach((product)=>{
      write(`${language.prefix}${product.route}index.html`,cloneEnglishPage(language,product.route,snapshot.files[`${product.route.slice(1)}index.html`],{product}));
      urls.push(`${origin}${base}${product.route}`);
    });
    write(`${language.prefix}/404.html`,cloneEnglishPage(language,'/',fs.readFileSync(path.join(outputRoot,'404.html'),'utf8'),{pageKey:''}));
  }
  write('sitemap-multilingual.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`<url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
  write('multilingual-manifest.json',JSON.stringify({version:3,languages:languages.map(({code,prefix})=>({code,prefix})),sourcePages:1026,localizedPages:urls.length,productsPerLanguage:snapshot.products.length,translationService:false,interfaceParity:'english-page-clone'},null,2));
  let robots=fs.readFileSync(path.join(outputRoot,'robots.txt'),'utf8');
  if(!robots.includes('/sitemap-multilingual.xml')) robots+=`\nSitemap: ${origin}/sitemap-multilingual.xml\n`;
  write('robots.txt',robots);
  console.log(`Native language pages generated: ${urls.length} across 5 languages; ${snapshot.products.length} products per language.`);
}
export function prepareMultilingualRelease() {
  const outputRoot=path.join(sourceRoot,'public');
  const snapshot=JSON.parse(zlib.gunzipSync(fs.readFileSync(snapshotPath)));
  if(snapshot.version!==2 || snapshot.products.length!==1002) throw new Error('Invalid multilingual catalogue snapshot.');
  for(const relative of canonicalPages(sourceRoot).filter(file=>!file.startsWith('products/')).concat('robots.txt','sitemap.xml')) {
    fs.mkdirSync(path.dirname(path.join(outputRoot,relative)),{recursive:true});
    fs.copyFileSync(path.join(sourceRoot,relative),path.join(outputRoot,relative));
  }
  for(const [relative,html] of Object.entries(snapshot.files)) {
    if(!/^products\/(?:[a-z0-9-]+\/index\.html|index\.html|catalog-index\.json|catalog-manifest\.json)$/.test(relative)) throw new Error(`Invalid snapshot path: ${relative}`);
    fs.mkdirSync(path.dirname(path.join(outputRoot,relative)),{recursive:true});
    fs.writeFileSync(path.join(outputRoot,relative),html);
  }
  for(const relative of releaseImageAssets) {
    fs.mkdirSync(path.dirname(path.join(outputRoot,relative)),{recursive:true});
    fs.copyFileSync(path.join(sourceRoot,relative),path.join(outputRoot,relative));
  }
  fs.cpSync(path.join(sourceRoot,'assets'),path.join(outputRoot,'assets'),{recursive:true});
  // Source HTML already contains the same generated navigation and metadata.
  buildLocalized(outputRoot,snapshot);
}
if(process.argv[1] && fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  if(process.argv.includes('--release')) prepareMultilingualRelease();
  else console.log(`Native language navigation installed in ${installMultilingual()} English pages; catalogue snapshot saved.`);
}
