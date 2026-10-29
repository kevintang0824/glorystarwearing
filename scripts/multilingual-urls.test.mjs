import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import test from 'node:test';
import { cloneEnglishPage, replaceTextContent } from './prepare-multilingual.mjs';
import { languages } from './locales.mjs';

test('material translation changes visible copy without changing scripts, styles or attributes', () => {
  const script = '<script type="application/ld+json">{"url":"https://glorystarwearing.com/products/slouch-cotton/","name":"cotton"}</script>';
  const style = '<style>.cotton { font-family: cotton; }</style>';
  const input = `${script}${style}<p title="cotton">95% cotton</p><script>const url = "/cotton/";</script>`;
  assert.equal(replaceTextContent(input, [[/\bcotton\b/gi, 'хлопок']]), input.replace('95% cotton', '95% хлопок'));
});

test('localized material product schema keeps canonical URL references in every language', () => {
  const snapshot = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../catalog-data/multilingual-catalog.json.gz', import.meta.url))));
  const products = snapshot.products.filter(item => item.route.endsWith('-40715/') || item.route.endsWith('-40070/'));
  assert.equal(products.length, 2);
  for (const product of products) {
  const source = snapshot.files[`${product.route.slice(1)}index.html`];
  for (const language of languages.slice(1)) {
    const html = cloneEnglishPage(language, product.route, source, { product });
    const url = `https://glorystarwearing.com/${language.prefix}${product.route}`;
    const nodes = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .flatMap(match => { const value = JSON.parse(match[1]); return value['@graph'] || [value]; });
    const page = nodes.find(node => node['@type'] === 'WebPage');
    const item = nodes.find(node => node['@type'] === 'Product');
    assert.equal(page.url, url, `${language.code}: WebPage URL`);
    assert.equal(page['@id'], `${url}#webpage`);
    assert.equal(item.url, url, `${language.code}: Product URL`);
    assert.equal(item['@id'], `${url}#product`);
    assert.equal(item.mainEntityOfPage['@id'], `${url}#webpage`);
    const breadcrumb = nodes.find(node => node['@type'] === 'BreadcrumbList');
    assert.equal(breadcrumb.itemListElement.at(-1).item, url);
  }
  }
});
