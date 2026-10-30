import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
export const productEditorial = JSON.parse(fs.readFileSync(path.join(root, 'catalog-data/product-editorial.json'), 'utf8')).pages;
const origin = 'https://glorystarwearing.com';
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
for (const [relative, entry] of Object.entries(productEditorial)) {
  if (!/^products\/[a-z0-9-]+\/index\.html$/.test(relative) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.dateModified) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.localizedLastmod)) throw new Error(`Invalid product editorial identity: ${relative}`);
}
export function renderProductEditorial(relative, source) {
  const entry = productEditorial[relative];
  if (!entry) return source;
  if (source.includes('id="product-buying-guide"')) throw new Error(`Product editorial requires the original catalog source: ${relative}`);
  const route = '/' + relative.replace(/index\.html$/, '');
  const schemaMatch = source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const schema = JSON.parse(schemaMatch[1]);
  const product = schema['@graph'].find(n => n['@type'] === 'Product');
  const page = schema['@graph'].find(n => n['@type'] === 'WebPage');
  if (product.sku !== entry.sku || product.url !== origin + route) throw new Error(`Product editorial SKU mismatch: ${relative}`);
  const title = `${entry.title} · ${entry.id} | Glory Star Wear`;
  Object.assign(product, {name:entry.title,description:entry.summary,material:entry.material});
  if (entry.size) product.size = entry.size;
  else delete product.size;
  const sizeDisplay = entry.size || "Size range not listed; request a size chart.";
  // The brand and project coordinator are known; an actual manufacturing entity is not verified.
  delete product.manufacturer;
  product.additionalProperty = product.additionalProperty.filter(p => !['Material','Feature','Function','Size range','Color options'].includes(p.name)).concat([
    { '@type':'PropertyValue',name:'Material',value:entry.material },
    ...(entry.size ? [{ '@type':'PropertyValue',name:'Size range',value:entry.size }] : []),
    { '@type':'PropertyValue',name:'Color options',value:entry.colors },
    { '@type':'PropertyValue',name:'Construction reference',value:entry.construction },
  ]);
  Object.assign(page,{name:title,description:entry.description,dateModified:entry.dateModified});
  schema['@graph'].find(n=>n['@type']==='BreadcrumbList').itemListElement.at(-1).name=entry.title;
  schema['@graph'].push({'@type':'FAQPage','@id':origin+route+'#product-faq',isPartOf:{'@id':origin+route+'#webpage'},mainEntity:entry.faq.map(f=>({'@type':'Question',name:f.question,acceptedAnswer:{'@type':'Answer',text:f.answer}}))});
  let html=source.replace(schemaMatch[0],'<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>');
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(title)}</title>`)
    .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*(")/g,(_,a,b)=>a+escape(entry.description)+b)
    .replace(/(<meta property="og:title" content=")[^"]*(")/,(_,a,b)=>a+escape(title)+b)
    .replace(/<h1>[\s\S]*?<\/h1>/,`<h1>${escape(entry.title)} · ${entry.id}</h1>`)
    .replace(/(<div class="wrap breadcrumbs"[^>]*>[\s\S]*?\/ )[^<]*(<\/div>)/,(_,a,b)=>a+escape(entry.title)+b)
    .replace(/<p class="product-summary__lead">[\s\S]*?<\/p>/,`<p class="product-summary__lead">${escape(entry.summary)}</p>`);
  const quote='/request-a-quote/?'+new URLSearchParams({interest:entry.interest,sku:entry.sku,product:entry.title,source:route});
  html=html.replace(/<div class="product-summary__actions">[\s\S]*?<\/div>/,`<div class="product-summary__actions"><a class="button" href="${escape(quote)}">Get a quote for this SKU</a><a class="button secondary" href="#product-buying-guide">Review sample checklist</a></div>`);
  const facts=[['Listed fabric',entry.material],['Listed sizes',sizeDisplay],['Listed color options',entry.colors],['Construction reference',entry.construction]];
  html=html.replace(/<div class="product-description__copy">[\s\S]*?<\/div>/,`<div class="product-description__copy">${facts.map(([name,value])=>`<section class="product-description__feature"><h3>${escape(name)}</h3><p>${escape(value)}</p></section>`).join('')}<p>Catalog options require order confirmation. Ask for measurements and a color reference; photographs and composition do not establish performance ratings or certification.</p></div>`)
    .replace(/(<dt>Material direction<\/dt><dd>)[\s\S]*?(<\/dd>)/,(_,a,b)=>a+escape(entry.material)+b);
  const related=entry.related.map(r=>{const e=productEditorial[r.slice(1)+'index.html']; if(!e)throw new Error(`Missing related editorial entry: ${r}`);return `<li><a href="${r}">${escape(e.title)}</a> — ${escape(e.material)}; SKU ${escape(e.sku)}.</li>`}).join('');
  const guide=`<section class="section alt" id="product-buying-guide"><div class="wrap"><p class="eyebrow">Buying this style</p><h2>Sample checks for ${escape(entry.title)}</h2><p>Reference SKU ${escape(entry.sku)} when recording sample feedback. Agree the measurement method and acceptance criteria before approval.</p><ul class="checklist">${entry.checks.map(c=>`<li>${escape(c)}</li>`).join('')}</ul><p><a href="${entry.guide}">Read the category buying guide</a> · <a href="/activewear-quality-control/">Sample approval checklist</a> · <a href="/activewear-moq-sampling/">MOQ and sampling questions</a></p><h3>Explore related catalog styles</h3><ul>${related}</ul><p>Use these references to plan your collection. Review construction, fit, fabric and quotation scope for each selected SKU.</p></div></section><section class="section" id="product-faq"><div class="wrap faq"><h2>${escape(entry.title)}: buyer questions</h2>${entry.faq.map(f=>`<details><summary>${escape(f.question)}</summary><p>${escape(f.answer)}</p></details>`).join('')}<p>Catalog facts reviewed by <a href="/about-glory-star-wear/">Glory Star Wear</a> · <time datetime="${entry.dateModified}">October 30, 2026</time>.</p><a class="button" href="${escape(quote)}">Get a quote for this SKU</a></div></section>`;
  if(!html.includes('<section class="trust-strip"'))throw new Error(`Missing product section anchor: ${relative}`);
  return html.replace('<section class="trust-strip"',guide+'\n    <section class="trust-strip"');
}
export function installProductEditorial(outputRoot, snapshot) {
  for(const relative of Object.keys(productEditorial)) {
    const source=snapshot.files[relative];
    if(!source)throw new Error(`Missing catalog source: ${relative}`);
    fs.writeFileSync(path.join(outputRoot,relative),renderProductEditorial(relative,source));
  }
}
if(process.argv[1] && fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  const snapshot=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'catalog-data/multilingual-catalog.json.gz'))));
  installProductEditorial(path.join(root,'public'),snapshot);
  console.log(`Installed ${Object.keys(productEditorial).length} authored product details.`);
}
