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
function buildLocalized(outputRoot,snapshot) {
  const urls=[];
  const write=(file,html)=>{const dest=path.join(outputRoot,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,html)};
  for(const language of languages.slice(1)) {
    const t=copy[language.code],u=t.ui,base=`/${language.prefix}`;
    const products=snapshot.products.map((p)=>({...p,title:productName(p,t),route:`${base}${p.route}`,primaryLabel:categoryName(t,p.primaryLabel),pills:p.pills.map(label=>label==='Seamless'?t.attrs[0]:categoryName(t,label)),image:{...p.image,alt:productName(p,t)}}));
    write(`${language.prefix}/products/catalog-index.json`,JSON.stringify(products));
    const cta=()=>`<section class="cta"><div class="wrap cta-grid"><div><h2>${u.cta}</h2><p>${u.ctaText}</p></div><a class="button" href="${base}/request-a-quote/">${t.nav[6]}</a></div></section>`;
    const related=()=>`<section class="section"><div class="wrap"><h2>${u.related}</h2><div class="native-guide-grid">${guideRoutes.map(key=>`<a class="native-guide" href="${base}/${key}/"><h3>${titleFor(t,key)}</h3><p>${t.pages[key].split('|')[1]}</p><span aria-hidden="true">→</span></a>`).join('')}</div></div></section>`;
    const faq=()=>`<div class="faq">${t.faq.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;
    for(const [key,content] of Object.entries(t.pages)) {
      const [title,lead,...points]=content.split('|');
      const route=key?`/${key}/`:'/';
      let body=`<div class="wrap breadcrumbs"><a href="${base}/">${t.nav[0]}</a> / ${title}</div><section class="hero"><div class="wrap"><p class="eyebrow">GLORY STAR WEAR</p><h1>${title}</h1><p class="lead">${lead}</p></div></section>`;
      if(key==='') {
        body=`<section class="native-home-hero"><div class="wrap hero-grid"><div><p class="eyebrow">GLORY STAR WEAR · OEM / ODM</p><h1>${u.collection}</h1><p class="lead">${u.homeLead}</p><div class="hero-actions"><a class="button" href="${base}/products/">${t.nav[1]}</a><a class="button secondary" href="${base}/request-a-quote/">${t.nav[6]}</a></div></div><img src="/wp-content/uploads/2026/08/activewear-collection-1280.jpg" width="1280" height="960" alt="${t.pages['products'].split('|')[0]}" fetchpriority="high"></div></section><section class="section alt"><div class="wrap"><h2>${u.selection}</h2><div class="catalog-grid native-featured">${[0,100,230,390,650,900].map(i=>card(products[i],t)).join('')}</div><p><a class="button secondary" href="${base}/products/">${t.nav[1]} →</a></p></div></section><section class="section"><div class="wrap"><h2>${u.workflow}</h2><div class="native-steps">${u.steps.map((step,i)=>`<article><span>0${i+1}</span><h3>${step}</h3></article>`).join('')}</div></div></section>${cta()}`;
      } else if(key==='products') {
        const categories=[...new Set(products.map(p=>p.primaryLabel))];
        body+=`<section class="section native-catalog" data-native-catalog data-feed="${base}/products/catalog-index.json"><div class="wrap"><div class="native-filters"><label>${u.search}<input type="search" data-native-search placeholder="${u.search}" autocomplete="off"></label><label>${u.all}<select data-native-category><option value="">${u.all}</option>${categories.map(c=>`<option value="${escape(c)}">${escape(c)}</option>`).join('')}</select></label></div><p data-native-count role="status">${u.count.replace('{shown}',24).replace('{total}',products.length)}</p><div class="catalog-grid" data-native-grid>${products.slice(0,24).map(p=>card(p,t)).join('')}</div><p data-native-empty hidden>${u.empty}</p><button type="button" class="button" data-native-more>${u.more}</button><details class="native-crawl"><summary>${t.nav[1]} · ${products.length}</summary><ul>${products.map(p=>`<li><a href="${p.route}">${escape(p.title)} · ${escape(p.sku)}</a></li>`).join('')}</ul></details></div></section>`;
      } else if(key==='request-a-quote') {
        const fields=[['name','text','name'],['email','email','email'],['whatsapp','tel','tel'],['country','text','country-name'],['company','text','organization'],['product','text','off'],['quantity','text','off'],['timing','text','off'],['message','textarea','off']];
        body+=`<section class="section alt"><div class="wrap native-form-wrap"><p class="lead">${u.quoteIntro}</p><p data-native-product-context hidden></p><form data-native-inquiry hidden><p>${u.required} *</p><div class="native-form-grid">${fields.map(([id,type,autocomplete],i)=>`<label${type==='textarea'?' class="native-form-wide"':''} for="${id}">${u.formLabels[i]}${i===7?'':' *'}${type==='textarea'?`<textarea id="${id}" name="${id}" data-label="${u.formLabels[i]}" maxlength="1500" required></textarea>`:`<input id="${id}" name="${id}" type="${type}" data-label="${u.formLabels[i]}" autocomplete="${autocomplete}" maxlength="${type==='email'?254:200}"${i===7?'':' required'}>`}</label>`).join('')}</div><button class="button" type="submit">${u.submit}</button><p class="native-form-note">${u.formNote} <a href="${base}/privacy-policy/">${u.privacy}</a> · <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">WhatsApp · ${u.privacy}</a></p></form><noscript><p><a href="https://wa.me/8618020755949">WhatsApp: +86 180 2075 5949</a></p></noscript><p><a href="mailto:kevin@glorystarwears.com">kevin@glorystarwears.com</a></p></div></section>`;
      } else if(key==='faq') {
        body+=`<section class="section alt"><div class="wrap">${faq()}</div></section>${cta()}`;
      } else {
        if(key==='contact-us') body+=`<section class="section alt"><div class="wrap native-contact"><article><h2>${u.email}</h2><a href="mailto:kevin@glorystarwears.com">kevin@glorystarwears.com</a></article><article><h2>WhatsApp</h2><a href="https://wa.me/8618020755949">+86 180 2075 5949</a></article><article><h2>${u.office}</h2><p>${u.location}</p></article></div></section>`;
        if(key==='about-glory-star-wear') body+=`<div class="wrap native-team"><img loading="lazy" src="/wp-content/uploads/2026/08/xiamen-guangxingheng-team.png" width="1200" height="800" alt="Glory Star Wear · ${u.office}"></div>`;
        body+=`<section class="section alt"><div class="wrap native-article"><h2>${u.details}</h2>${points.map((p,i)=>`<section><span class="eyebrow">${String(i+1).padStart(2,'0')}</span><p>${p}</p></section>`).join('')}${key==='cookie-policy'?`<p><a href="${base}/cookie-policy/" data-cookie-settings>${u.cookieSettings}</a></p>`:''}</div></section>`;
        if(!['privacy-policy','terms-of-use','cookie-policy'].includes(key)) body+=related()+cta();
      }
      write(`${language.prefix}/${key?`${key}/`:''}index.html`,documentHtml(language,route,title,lead,body));
      urls.push(`${origin}${base}${route}`);
    }
    products.forEach((product,i)=>{
      const original=snapshot.products[i],route=original.route;
      const {facts,images}=productFacts(original,snapshot,t);
      const inquiry=new URLSearchParams({sku:original.sku,product:product.title,source:product.route});
      const body=`<div class="wrap breadcrumbs"><a href="${base}/">${t.nav[0]}</a> / <a href="${base}/products/">${t.nav[1]}</a> / ${escape(product.title)}</div><section class="native-product"><div class="wrap hero-grid"><div><img class="native-product-main" fetchpriority="high" src="${images[0].path}" width="${images[0].width}" height="${images[0].height}" alt="${escape(product.title)}"></div><article><p class="eyebrow">${escape(product.primaryLabel)}</p><h1>${escape(product.title)}</h1><p class="native-sku">${u.reference}: <b>${escape(product.sku)}</b></p><p class="lead">${u.productIntro}</p><h2>${u.specs}</h2><dl class="native-specs">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl><p>${u.confirm}</p><div class="hero-actions"><a class="button" href="${base}/request-a-quote/?${escape(inquiry.toString())}">${t.nav[6]}</a><a class="button secondary" href="${base}/activewear-moq-sampling/">${u.sample}</a></div></article></div></section><section class="section alt"><div class="wrap"><h2>${u.gallery}</h2><div class="native-gallery">${images.slice(1).map((image,j)=>`<a href="${image.path}" target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src="${image.path}" width="${image.width}" height="${image.height}" alt="${escape(product.title)} · ${j+2}"></a>`).join('')}</div></div></section>${cta()}`;
      write(`${language.prefix}${route}index.html`,documentHtml(language,route,product.title,`${product.title}. ${u.productIntro}`,body,{product}));
      urls.push(`${origin}${product.route}`);
    });
    write(`${language.prefix}/404.html`,documentHtml(language,'/',u.notFound,u.notFound,`<section class="hero"><div class="wrap"><p class="eyebrow">404</p><h1>${u.notFound}</h1><a class="button" href="${base}/">${u.back}</a></div></section>`,{robots:'noindex,follow'}));
  }
  write('sitemap-multilingual.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`<url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
  write('multilingual-manifest.json',JSON.stringify({version:2,languages:languages.map(({code,prefix})=>({code,prefix})),sourcePages:1026,localizedPages:urls.length,productsPerLanguage:snapshot.products.length,translationService:false},null,2));
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
  fs.cpSync(path.join(sourceRoot,'assets'),path.join(outputRoot,'assets'),{recursive:true});
  // Source HTML already contains the same generated navigation and metadata.
  buildLocalized(outputRoot,snapshot);
}
if(process.argv[1] && fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  if(process.argv.includes('--release')) prepareMultilingualRelease();
  else console.log(`Native language navigation installed in ${installMultilingual()} English pages; catalogue snapshot saved.`);
}
