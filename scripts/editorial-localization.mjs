import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// New English copy must not enter the legacy word-by-word translation fallback.
// Retain the last source with authored locale mappings until each page is translated.
const root = path.resolve(import.meta.dirname, '..');
const baseline = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, 'catalog-data/editorial-source-baseline.json.gz'))));
if (baseline.version !== 1 || !baseline.pages || typeof baseline.pages !== 'object') {
  throw new Error('Invalid editorial translation baseline.');
}
for (const [relative, entry] of Object.entries(baseline.pages)) {
  if (!/^[a-z0-9-]+\/index\.html$/.test(relative) || typeof entry.html !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod) ||
      crypto.createHash('sha256').update(entry.html).digest('hex') !== entry.sha256) {
    throw new Error(`Invalid editorial translation source: ${relative}`);
  }
}

export function editorialSource(relative, readCurrent) {
  return baseline.pages[relative]?.html ?? readCurrent();
}

export function editorialLastmod(relative, currentLastmod) {
  const date = baseline.pages[relative]?.lastmod ?? currentLastmod;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error(`Missing source modification date: ${relative}`);
  return date;
}
