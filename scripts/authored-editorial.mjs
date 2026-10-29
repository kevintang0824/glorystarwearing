import fs from 'node:fs';

// Complete, reviewed locale documents bypass the legacy phrase translator.
// Register only intentional editorial updates and their actual revision dates.
const pages = new Map([
  ['fr/custom-leggings-manufacturer/index.html', '2026-10-30'],
]);

export function authoredEditorialPage(language, relative) {
  const key = `${language.prefix}/${relative}`;
  const lastmod = pages.get(key);
  if (!lastmod) return null;
  const html = fs.readFileSync(new URL(`./templates/editorial/${key}`, import.meta.url), 'utf8');
  const route = relative === 'index.html' ? '/' : `/${relative.replace(/index\.html$/, '')}`;
  const canonical = `https://glorystarwearing.com/${language.prefix}${route}`;
  if (!html.includes(`<html lang="${language.code}"`) ||
      !html.includes(`<link rel="canonical" href="${canonical}">`) ||
      !html.includes(`"dateModified":"${lastmod}"`)) {
    throw new Error(`Invalid authored editorial identity or revision: ${key}`);
  }
  return { html, lastmod };
}
