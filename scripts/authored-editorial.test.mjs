import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { authoredEditorialPage } from './authored-editorial.mjs';
import { cloneEnglishPage } from './prepare-multilingual.mjs';
import { editorialSource, editorialLastmod } from './editorial-localization.mjs';
import { languages } from './locales.mjs';

test('French editorial copy survives regeneration while other languages keep their prior source', () => {
  const relative = 'custom-leggings-manufacturer/index.html';
  const fr = languages.find(language => language.code === 'fr');
  const authored = authoredEditorialPage(fr, relative);
  const oldSource = editorialSource(relative, () => { throw new Error('Missing translation hold'); });
  assert.equal(cloneEnglishPage(fr, '/custom-leggings-manufacturer/', oldSource, { pageKey: 'custom-leggings-manufacturer' }), authored.html);
  assert.equal(authored.lastmod, '2026-10-30');
  assert.notEqual(editorialLastmod(relative, '2026-10-30'), '2026-10-30');
  for (const language of languages.slice(1).filter(language => language.code !== 'fr')) {
    assert.equal(authoredEditorialPage(language, relative), null);
  }
});

test('every leggings FAQ answer matches its visible answer in English and French', () => {
  for (const relative of ['custom-leggings-manufacturer/index.html', 'scripts/templates/editorial/fr/custom-leggings-manufacturer/index.html']) {
    const html = fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
    const faq = graph.find(node => node['@type'] === 'FAQPage').mainEntity;
    const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
    const visible = [...html.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs)].map(([, q, a]) => [decode(q), decode(a)]);
    assert.equal(visible.length, 8);
    assert.deepEqual(faq.map(item => [item.name, item.acceptedAnswer.text]), visible);
    assert.equal(new Set(visible.map(([, answer]) => answer)).size, 8, 'Questions must not collapse to a repeated generic answer');
    assert.equal(graph.find(node => node['@type'] === 'WebPage').dateModified, '2026-10-30');
  }
});
