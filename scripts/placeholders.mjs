// Generates lightweight SVG placeholder artwork from the data files.
// Run: npm run placeholders
// Replace any generated file with a real photo (WebP, ~600px, <60 KB) and the
// data file's path — this script never overwrites a non-.svg file.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const products   = read('data/products.json');
const categories = read('data/categories.json');
const brands     = read('data/brands.json');

// Warm, brand-adjacent palette. Deterministic per slug so re-runs are stable.
const PALETTE = [
  ['#fdebc8', '#a85504'], ['#fbd48f', '#6d380d'], ['#dbf0de', '#1f5a2c'],
  ['#f7e1cf', '#8a3b12'], ['#ffe9d6', '#b4530a'], ['#ede4d3', '#5b4632'],
  ['#f9d9c4', '#9c3d1b'], ['#e8f0d8', '#3f5a1f'],
];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pal  = (s) => PALETTE[hash(s) % PALETTE.length];
const esc  = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// Word-wrap into <= n lines of <= w chars.
function wrap(text, w, n) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > w && cur) { lines.push(cur); cur = word; }
    else cur = (cur + ' ' + word).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > n) { lines.length = n; lines[n - 1] = lines[n - 1].replace(/\s*\S*$/, '…'); }
  return lines;
}

function write(rel, svg) {
  const abs = join(root, rel);
  if (existsSync(abs) && !abs.endsWith('.svg')) return; // never clobber real assets
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, svg.trim() + '\n');
}

const FONT = `font-family="Poppins, Inter, system-ui, sans-serif"`;

// ---------- products: a stylised bag/pack, two "angles" ----------
function productSvg(p, variant) {
  const [bg, fg] = pal(p.slug);
  const brand = brands.find((b) => b.slug === p.brand)?.name ?? p.brand;
  const lines = wrap(p.title, 20, 3);
  const skew  = variant === 2 ? 'skewY(-4) translate(0 30)' : '';
  const tint  = variant === 2 ? 0.92 : 1;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${esc(p.title)}">
  <rect width="600" height="600" fill="${bg}" opacity="${tint}"/>
  <g transform="${skew}">
    <rect x="150" y="90" width="300" height="420" rx="26" fill="#fff" stroke="${fg}" stroke-width="6"/>
    <rect x="150" y="90" width="300" height="70" rx="26" fill="${fg}"/>
    <rect x="150" y="130" width="300" height="30" fill="${fg}"/>
    <text x="300" y="138" text-anchor="middle" ${FONT} font-size="22" font-weight="700" fill="#fff" letter-spacing="1">${esc(brand.toUpperCase())}</text>
    ${lines.map((l, i) => `<text x="300" y="${250 + i * 40}" text-anchor="middle" ${FONT} font-size="28" font-weight="600" fill="${fg}">${esc(l)}</text>`).join('\n    ')}
    <rect x="215" y="400" width="170" height="44" rx="22" fill="${bg}" stroke="${fg}" stroke-width="3"/>
    <text x="300" y="429" text-anchor="middle" ${FONT} font-size="22" font-weight="700" fill="${fg}">${p.unit.amount} ${p.unit.uom}</text>
  </g>
  <text x="300" y="570" text-anchor="middle" ${FONT} font-size="14" fill="${fg}" opacity=".6">placeholder · replace with product photo</text>
</svg>`;
}

// ---------- categories: circle badge ----------
function categorySvg(c) {
  const [bg, fg] = pal(c.slug);
  const initials = c.name.split(/\s|&/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="${esc(c.name)}">
  <rect width="400" height="400" fill="${bg}"/>
  <circle cx="200" cy="200" r="120" fill="#fff" stroke="${fg}" stroke-width="6"/>
  <text x="200" y="228" text-anchor="middle" ${FONT} font-size="92" font-weight="700" fill="${fg}">${esc(initials)}</text>
</svg>`;
}

// ---------- brands: wordmark ----------
function brandSvg(b) {
  const [, fg] = pal(b.slug);
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 100" width="240" height="100" role="img" aria-label="${esc(b.name)}">
  <rect width="240" height="100" rx="12" fill="#fff"/>
  <rect x="18" y="30" width="40" height="40" rx="8" fill="${fg}"/>
  <text x="70" y="59" ${FONT} font-size="22" font-weight="700" fill="${fg}" letter-spacing="-.5">${esc(b.name)}</text>
</svg>`;
}

// ---------- hero banners ----------
const HEROES = [
  { id: 1, title: 'Basmati week', sub: 'Up to 20% off aged basmati', a: '#a85504', b: '#e8850c' },
  { id: 2, title: 'Fresh atta, every Friday', sub: 'Stone-ground and delivered within 48h', a: '#1f5a2c', b: '#2f7a3e' },
  { id: 3, title: 'Free delivery over 49 €', sub: 'Across Germany · next-day in Berlin', a: '#6d380d', b: '#cf6f06' },
];
function heroSvg(h) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 640" width="1600" height="640" role="img" aria-label="${esc(h.title)}">
  <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${h.a}"/><stop offset="1" stop-color="${h.b}"/></linearGradient></defs>
  <rect width="1600" height="640" fill="url(#g)"/>
  <circle cx="1300" cy="320" r="260" fill="#fff" opacity=".08"/>
  <circle cx="1420" cy="120" r="140" fill="#fff" opacity=".08"/>
  <circle cx="1180" cy="520" r="90" fill="#fff" opacity=".06"/>
</svg>`;
}

// ---------- payment marks: generic, deliberately NOT real logos ----------
const PAYMENTS = ['Visa', 'Mastercard', 'Maestro', 'PayPal', 'Apple Pay', 'Google Pay', 'SEPA', 'Klarna'];
function paymentSvg(name) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40" width="64" height="40" role="img" aria-label="${esc(name)}">
  <rect x=".5" y=".5" width="63" height="39" rx="6" fill="#fff" stroke="#ebe5dc"/>
  <text x="32" y="25" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${name.length > 7 ? 9 : 11}" font-weight="700" fill="#1c1917">${esc(name)}</text>
</svg>`;
}

let n = 0;
for (const p of products) { write(p.images[0], productSvg(p, 1)); write(p.images[1], productSvg(p, 2)); n += 2; }
for (const c of categories) { write(c.image, categorySvg(c)); n++; }
for (const b of brands) { write(b.logo, brandSvg(b)); n++; }
for (const h of HEROES) { write(`assets/img/hero/hero-${h.id}.svg`, heroSvg(h)); n++; }
for (const name of PAYMENTS) { write(`assets/img/payment/${name.toLowerCase().replace(/\s+/g, '-')}.svg`, paymentSvg(name)); n++; }
console.log(`placeholders: wrote ${n} SVG files`);
