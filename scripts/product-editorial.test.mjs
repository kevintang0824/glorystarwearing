import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {productEditorial,renderProductEditorial} from './product-editorial.mjs';
import {cloneEnglishPage} from './prepare-multilingual.mjs';
import {languages} from './locales.mjs';
const snapshot=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../catalog-data/multilingual-catalog.json.gz',import.meta.url))));
const decode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
const graph=html=>JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
test('authored details preserve SKU identity and exact visible/structured answers without invented offers',()=>{
 for(const [relative,entry] of Object.entries(productEditorial)){
  const source=snapshot.files[relative],html=renderProductEditorial(relative,source),nodes=graph(html);
  const before=graph(source).find(n=>n['@type']==='Product'),product=nodes.find(n=>n['@type']==='Product');
  assert.equal(product.sku,before.sku);assert.equal(product.url,before.url);assert.deepEqual(product.image,before.image);
  assert.equal(product.material,entry.material);if (entry.size) assert.equal(product.size,entry.size); else { assert(!Object.hasOwn(product,"size")); assert(!product.additionalProperty.some(p=>p.name==="Size range")); assert(html.includes("Size range not listed; request a size chart.")); }assert(!product.offers&&!product.aggregateRating&&!product.review&&!product.manufacturer);
  assert.equal(nodes.find(n=>n['@type']==='WebPage').dateModified,entry.dateModified);
  const visible=[...html.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/g)];
  const faq=nodes.find(n=>n['@type']==='FAQPage').mainEntity;assert.equal(visible.length,4);assert.equal(faq.length,4);
  faq.forEach((f,i)=>{assert.equal(f.name,decode(visible[i][1]));assert.equal(f.acceptedAnswer.text,decode(visible[i][2]))});
  const quote=decode(html.match(/href="([^"]+)"\s*>Get a quote for this SKU/)[1]);const params=new URL(quote,'https://glorystarwearing.com').searchParams;
  assert.equal(params.get('sku'),entry.sku);assert.equal(params.get('source'),'/'+relative.replace(/index\.html$/,''));assert.equal(params.get('interest'),entry.interest);
  assert.equal((html.match(/<h1>/g)||[]).length,1);assert.equal((html.match(/id="product-buying-guide"/g)||[]).length,1);
 }
});
test('English enhancements never enter the reviewed locale snapshot or its FAQ markup',()=>{
 for(const [relative,entry] of Object.entries(productEditorial)){
  const source=snapshot.files[relative];assert(!source.includes('id="product-buying-guide"'));
  assert(entry.localizedLastmod<entry.dateModified);
  const product=snapshot.products.find(p=>p.route===('/'+relative.replace(/index\.html$/,'')));
  for(const language of languages.slice(1)){
   const html=cloneEnglishPage(language,product.route,source,{product,products:snapshot.products});
   assert(!html.includes('id="product-buying-guide"'));assert(!graph(html).some(n=>n['@type']==='FAQPage'));
  }
 }
});
test('wrong SKU or repeated overlay fails closed; unrelated products stay unchanged',()=>{
 const relative=Object.keys(productEditorial)[0],source=snapshot.files[relative];
 assert.throws(()=>renderProductEditorial(relative,source.replaceAll(productEditorial[relative].sku,'WRONG-SKU')),/SKU mismatch/);
 assert.throws(()=>renderProductEditorial(relative,renderProductEditorial(relative,source)),/original catalog source/);
 assert.equal(renderProductEditorial('products/not-edited/index.html','original'),'original');
});
