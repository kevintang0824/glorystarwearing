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
const localeScript=fs.readFileSync(path.join(root,'assets/localized-site.js'),'utf8');
const read=file=>fs.readFileSync(path.join(root,'public',file),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));

function domFor(file,url) {
  return new JSDOM(read(file),{url,runScripts:'outside-only'});
}
function runMenu(dom) {
  dom.window.eval(menuScript);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded',{bubbles:true}));
}

test('every language has independent authored pages and no runtime translation provider',()=>{
  const manifest=JSON.parse(read('multilingual-manifest.json'));
  assert.equal(manifest.localizedPages,5130);
  assert.equal(manifest.translationService,false);
  const product=JSON.parse(read('products/catalog-index.json'))[0];
  for(const language of languages) {
    const prefix=language.prefix?`${language.prefix}/`:'';
    for(const file of [`${prefix}index.html`,`${prefix}products/index.html`,`${prefix}${product.route.slice(1)}index.html`,`${prefix}request-a-quote/index.html`]) {
      const html=read(file);
      const documentLanguage=language.code==='en'?'en-US':language.code;
      assert.match(html,new RegExp(`<html lang="${documentLanguage.replace('-','\\-')}"`));
      assert.doesNotMatch(html,/translate\.google|TranslateElement|gtranslate|googtrans/i);
      assert.equal((html.match(/data-language=/g)||[]).length,6);
    }
  }
  assert.match(read('zh-cn/index.html'),/为您的品牌，打造运动服系列/);
  assert.match(read('fr/index.html'),/Votre collection, votre identité/);
  assert.match(read('es/index.html'),/Tu colección, tu identidad/);
  assert.match(read('pt/index.html'),/A sua coleção, a sua identidade/);
  assert.match(read('ru/index.html'),/Ваша коллекция. Ваш бренд/);
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

test('localized catalogue filters its own saved-language records',async()=>{
  const dom=domFor('zh-cn/products/index.html','https://glorystarwearing.com/zh-cn/products/?q=SP8793');
  const feed=JSON.parse(read('zh-cn/products/catalog-index.json'));
  dom.window.fetch=async()=>({ok:true,json:async()=>feed});
  dom.window.eval(localeScript);
  await tick();
  const cards=[...dom.window.document.querySelectorAll('[data-native-product]')];
  assert.equal(cards.length,1);
  assert.match(cards[0].textContent,/SP8793/);
  assert.ok(cards[0].querySelector('a').pathname.startsWith('/zh-cn/products/'));
  dom.window.close();
});

test('localized inquiry creates a native-language WhatsApp draft and retains product context',()=>{
  const dom=domFor('fr/request-a-quote/index.html','https://glorystarwearing.com/fr/request-a-quote/?sku=GS123&product=Brassi%C3%A8re&source=%2Ffr%2Fproducts%2Fmodele-123%2F');
  let openedUrl='';
  dom.window.open=()=>({opener:null,location:{replace:url=>{openedUrl=url;}}});
  dom.window.eval(localeScript);
  const form=dom.window.document.querySelector('[data-native-inquiry]');
  for(const field of form.querySelectorAll('[required]')) field.value=field.name==='email'?'buyer@example.com':'Test';
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.match(decodeURIComponent(openedUrl),/Bonjour Glory Star Wear/);
  assert.match(decodeURIComponent(openedUrl),/GS123/);
  assert.match(decodeURIComponent(openedUrl),/\/fr\/products\/modele-123\//);
  dom.window.close();
});
