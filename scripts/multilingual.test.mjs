import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { languages } from './locales.mjs';

const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.GSW_JSDOM_PATH || 'jsdom');
const root=path.resolve(import.meta.dirname,'..');
const menuScript=fs.readFileSync(path.join(root,'assets/multilingual.js'),'utf8');
const read=file=>fs.readFileSync(path.join(root,'public',file),'utf8');

function domFor(file,url) {
  return new JSDOM(read(file),{url,runScripts:'outside-only'});
}
function runMenu(dom) {
  dom.window.eval(menuScript);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded',{bubbles:true}));
}

test('shared page initialization preserves all five localized navigation menus', () => {
  const script = fs.readFileSync(path.join(root, 'assets/seo-pages.js'), 'utf8');
  for (const language of languages.slice(1)) {
    const file = `${language.prefix}/custom-leggings-manufacturer/index.html`;
    const dom = domFor(file, `https://glorystarwearing.com/${language.prefix}/custom-leggings-manufacturer/`);
    const nav = () => [...dom.window.document.querySelectorAll('.nav-links a')].map(a => [a.textContent.trim(), a.getAttribute('href')]);
    const before = nav();
    dom.window.eval(script);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    assert.deepEqual(nav(), before, `${language.code}: preserve native labels and destinations`);
    assert.ok(nav().every(([, href]) => href.startsWith(`/${language.prefix}/`)));
    dom.window.close();
  }
});

const structure=(html)=>Object.fromEntries(['section','article','img','form','input','textarea','details','figure'].map(tag=>[tag,(html.match(new RegExp(`<${tag}\\b`,'gi'))||[]).length]));

test('every language clones the complete English interface and uses no runtime translation provider',()=>{
  const manifest=JSON.parse(read('multilingual-manifest.json'));
  assert.equal(manifest.localizedPages,5130);
  assert.equal(manifest.translationService,false);
  assert.equal(manifest.interfaceParity,'english-page-clone');
  const product=JSON.parse(read('products/catalog-index.json'))[0];
  for(const language of languages) {
    const prefix=language.prefix?`${language.prefix}/`:'';
    for(const file of [`${prefix}index.html`,`${prefix}products/index.html`,`${prefix}${product.route.slice(1)}index.html`,`${prefix}request-a-quote/index.html`]) {
      const html=read(file);
      const documentLanguage=language.code==='en'?'en-US':language.code;
      assert.match(html,new RegExp(`<html lang="${documentLanguage.replace('-','\\-')}"`));
      assert.doesNotMatch(html,/translate\.google|TranslateElement|gtranslate|googtrans/i);
      assert.equal((html.match(/data-language=/g)||[]).length,6);
      if(language.prefix) {
        const englishFile=file.slice(prefix.length);
        assert.deepEqual(structure(html),structure(read(englishFile)));
        assert.doesNotMatch(html,/class="localized-site"/);
      }
    }
  }
  const homepageHeadings = {
    'zh-cn': '中国厦门运动服定制生产商',
    fr: 'Fabricant de vêtements de sport personnalisés à Xiamen, en Chine',
    es: 'Fabricante de ropa deportiva personalizada en Xiamen, China',
    pt: 'Fabricante de roupa desportiva personalizada em Xiamen, China',
    ru: 'Производитель спортивной одежды под заказ в Сямыне, Китай',
  };
  for (const [prefix, expected] of Object.entries(homepageHeadings)) {
    const dom = new JSDOM(read(`${prefix}/index.html`));
    assert.equal(dom.window.document.querySelector('h1')?.textContent.trim(), expected, `${prefix} homepage heading`);
    dom.window.close();
  }
});

test('language selector keeps the current product, query and fragment',()=>{
  const file='zh-cn/products/activewear-athletic-wear-gym-clothing-59350/index.html';
  const dom=domFor(file,'https://glorystarwearing.com/zh-cn/products/activewear-athletic-wear-gym-clothing-59350/?sku=SP8793#details');
  runMenu(dom);
  const links=[...dom.window.document.querySelectorAll('.gsw-language a[data-language]')];
  assert.equal(links.length,6);
  const french=links.find(link=>link.dataset.language==='fr');
  assert.equal(french.pathname,'/fr/products/activewear-athletic-wear-gym-clothing-59350/');
  assert.equal(french.search,'?sku=SP8793');
  assert.equal(french.hash,'#details');
  french.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(dom.window.localStorage.getItem('gsw_locale'),'fr');
  dom.window.close();
});

test('selector supports arrow keys, End and Escape',()=>{
  const dom=domFor('es/index.html','https://glorystarwearing.com/es/');
  runMenu(dom);
  const control=dom.window.document.querySelector('.gsw-language');
  const summary=control.querySelector('summary');
  summary.focus();
  summary.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
  assert.equal(control.open,true);
  assert.equal(dom.window.document.activeElement.dataset.language,'en');
  dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End',bubbles:true}));
  assert.equal(dom.window.document.activeElement.dataset.language,'zh-CN');
  dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(control.open,false);
  assert.equal(dom.window.document.activeElement,summary);
  dom.window.close();
});

test('localized catalogue keeps the English catalogue interface and points at localized records',()=>{
  const html=read('zh-cn/products/index.html');
  const feed=JSON.parse(read('zh-cn/products/catalog-index.json'));
  assert.match(html,/data-catalog-feed="\/zh-cn\/products\/catalog-index\.json"/);
  assert.equal(feed.length,1002);
  assert.ok(feed.every(product=>product.route.startsWith('/zh-cn/products/')));
  assert.deepEqual(structure(html),structure(read('products/index.html')));
});

test('localized inquiry retains every English form field and interaction script',()=>{
  const english=read('request-a-quote/index.html');
  const french=read('fr/request-a-quote/index.html');
  assert.deepEqual(structure(french),structure(english));
  assert.equal((french.match(/<(?:input|textarea|select)\b/gi)||[]).length,(english.match(/<(?:input|textarea|select)\b/gi)||[]).length);
  assert.match(french,/\/assets\//);
  assert.match(french,/\/fr\/privacy-policy\//);
});
