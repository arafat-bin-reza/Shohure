// Validates the data files the way a typed content layer would at build time.
// Run: npm run check   — exits 1 on the first class of error so bad data never ships.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const products   = read('data/products.json');
const categories = read('data/categories.json');
const brands     = read('data/brands.json');

const errors = [];
const err = (msg) => errors.push(msg);
const UOMS = new Set(['g', 'kg', 'ml', 'l', 'piece', 'pack']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// --- categories ---
const catSlugs = new Set();
for (const c of categories) {
  if (!SLUG.test(c.slug)) err(`category "${c.slug}": bad slug`);
  if (catSlugs.has(c.slug)) err(`category "${c.slug}": duplicate slug`);
  catSlugs.add(c.slug);
  if (!c.name) err(`category "${c.slug}": missing name`);
  if (!Number.isInteger(c.order)) err(`category "${c.slug}": order must be an integer`);
  if (typeof c.tile !== 'boolean') err(`category "${c.slug}": tile must be boolean`);
  if (!c.image || !existsSync(join(root, c.image))) err(`category "${c.slug}": image missing on disk (${c.image})`);
}
for (const c of categories) {
  if (c.parent !== null && !catSlugs.has(c.parent)) err(`category "${c.slug}": parent "${c.parent}" does not exist`);
}

// --- brands ---
const brandSlugs = new Set();
for (const b of brands) {
  if (!SLUG.test(b.slug)) err(`brand "${b.slug}": bad slug`);
  if (brandSlugs.has(b.slug)) err(`brand "${b.slug}": duplicate slug`);
  brandSlugs.add(b.slug);
  if (!b.name) err(`brand "${b.slug}": missing name`);
  if (!b.logo || !existsSync(join(root, b.logo))) err(`brand "${b.slug}": logo missing on disk (${b.logo})`);
}

// --- products ---
const skus = new Set(), slugs = new Set();
for (const p of products) {
  const id = p.slug ?? p.sku ?? '?';
  if (!p.sku) err(`product ${id}: missing sku`);
  if (skus.has(p.sku)) err(`product ${id}: duplicate sku ${p.sku}`);
  skus.add(p.sku);
  if (!SLUG.test(p.slug ?? '')) err(`product ${id}: bad slug`);
  if (slugs.has(p.slug)) err(`product ${id}: duplicate slug`);
  slugs.add(p.slug);
  if (!p.title) err(`product ${id}: missing title`);
  if (!brandSlugs.has(p.brand)) err(`product ${id}: brand "${p.brand}" does not exist`);
  if (!catSlugs.has(p.category)) err(`product ${id}: category "${p.category}" does not exist`);
  if (!catSlugs.has(p.subcategory)) err(`product ${id}: subcategory "${p.subcategory}" does not exist`);
  else {
    const sub = categories.find((c) => c.slug === p.subcategory);
    if (sub.parent !== p.category) err(`product ${id}: subcategory "${p.subcategory}" is not a child of "${p.category}"`);
  }
  if (!Number.isInteger(p.price) || p.price < 0) err(`product ${id}: price must be integer cents (got ${p.price})`);
  if (p.comparePrice !== null && p.comparePrice !== undefined) {
    if (!Number.isInteger(p.comparePrice)) err(`product ${id}: comparePrice must be integer cents or null`);
    else if (p.comparePrice <= p.price) err(`product ${id}: comparePrice (${p.comparePrice}) must be greater than price (${p.price})`);
  }
  if (!p.unit || !UOMS.has(p.unit.uom)) err(`product ${id}: unit.uom must be one of ${[...UOMS].join(', ')}`);
  if (!p.unit || !(p.unit.amount > 0)) err(`product ${id}: unit.amount must be > 0`);
  if (!Array.isArray(p.images) || p.images.length < 1) err(`product ${id}: needs at least one image`);
  else for (const img of p.images) if (!existsSync(join(root, img))) err(`product ${id}: image missing on disk (${img})`);
  if (typeof p.inStock !== 'boolean') err(`product ${id}: inStock must be boolean`);
  if (typeof p.featured !== 'boolean') err(`product ${id}: featured must be boolean`);
  if (!Array.isArray(p.tags)) err(`product ${id}: tags must be an array`);
}

// --- format.js smoke test (the M1.2 spot-check from track.md) ---
const { formatPrice, unitPrice, discountPercent } = await import('../assets/js/format.js');
const norm = (s) => s.replace(/ /g, ' ');
const up = unitPrice(1499, { amount: 5, uom: 'kg' });
if (norm(formatPrice(1499)) !== '14,99 €') err(`formatPrice(1499) → "${formatPrice(1499)}", expected "14,99 €"`);
if (up.cents !== 300 || norm(up.label) !== '3,00 € / kg') err(`unitPrice(1499, 5kg) → ${JSON.stringify(up)}, expected 300 cents "3,00 € / kg"`);
if (discountPercent(1499, 1799) !== 17) err(`discountPercent(1499,1799) → ${discountPercent(1499, 1799)}, expected 17`);
if (discountPercent(1499, null) !== 0) err('discountPercent(1499,null) should be 0');

if (errors.length) {
  console.error(`\n✖ data check failed with ${errors.length} error(s):\n`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
const top = categories.filter((c) => c.parent === null).length;
console.log(`✔ data check passed — ${products.length} products, ${categories.length} categories (${top} top-level), ${brands.length} brands, format.js OK`);
