import assert from 'node:assert/strict';
import test from 'node:test';
import { editorialSource, editorialLastmod } from './editorial-localization.mjs';

test('untranslated editorial changes retain the source with authored translations', () => {
  const html = editorialSource('activewear-moq-sampling/index.html', () => {
    throw new Error('New English copy must not enter the generic locale fallback');
  });
  assert.match(html, /<link rel="canonical" href="https:\/\/glorystarwearing.com\/activewear-moq-sampling\/"/);
  assert.match(html, /<main\b/);
  assert.equal(editorialLastmod('activewear-moq-sampling/index.html', '2026-10-29'), '2026-08-25');
});

test('pages without an editorial hold use their current source and actual modification date', () => {
  let reads = 0;
  assert.equal(editorialSource('activewear-shipping-guide/index.html', () => { reads += 1; return 'current page'; }), 'current page');
  assert.equal(reads, 1);
  assert.equal(editorialLastmod('activewear-shipping-guide/index.html', '2026-08-28'), '2026-08-28');
});

test('missing sitemap dates stop publication instead of inventing a fresh date', () => {
  assert.throws(() => editorialLastmod('new-page/index.html', undefined), /Missing source modification date/);
});
