// JSON → DOM. The product card is the most reused component in the project.

import { formatPrice, unitPrice, discountPercent, formatUnit } from './format.js';

/** Escape for text nodes / attribute values. */
export const html = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const icon = (name, cls = 'size-5') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/* ---------------- product card ---------------- */
export function productCard(p, data) {
  const brand = data.brand(p.brand);
  const off = discountPercent(p.price, p.comparePrice);
  const up = unitPrice(p.price, p.unit);
  const [imgA, imgB = imgA] = p.images;
  const url = `product.html?slug=${p.slug}`;

  return `
  <li class="card group relative flex w-[11.5rem] sm:w-56 flex-col overflow-hidden" data-sku="${html(p.sku)}">
    <a href="${url}" class="swap-img relative block aspect-square bg-cream" tabindex="-1" aria-hidden="true">
      <img src="${html(imgA)}" width="600" height="600" alt="" loading="lazy" class="absolute inset-0 size-full object-cover">
      <img src="${html(imgB)}" width="600" height="600" alt="" loading="lazy" class="img-b absolute inset-0 size-full object-cover">
      ${off ? `<span class="badge badge-sale absolute left-2 top-2">-${off}%</span>` : ''}
      ${!p.inStock ? `<span class="badge badge-muted absolute right-2 top-2">Sold out</span>` : ''}
    </a>
    <div class="flex flex-1 flex-col p-3">
      <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">${html(brand?.name ?? p.brand)}</p>
      <h3 class="mt-0.5 text-sm font-medium leading-snug line-clamp-2 min-h-[2.6em]">
        <a href="${url}" class="hover:text-brand-700 focus-visible:outline-none after:absolute after:inset-0 after:content-['']">${html(p.title)}</a>
      </h3>
      <p class="mt-1 text-xs text-ink-muted">${html(formatUnit(p.unit))}</p>
      <div class="mt-2 flex items-baseline gap-2">
        <span class="text-base font-semibold ${off ? 'text-sale' : ''}">${formatPrice(p.price)}</span>
        ${p.comparePrice ? `<s class="text-xs text-ink-faint">${formatPrice(p.comparePrice)}</s>` : ''}
      </div>
      <p class="text-[11px] text-ink-faint">${html(up.label)}</p>
      <div class="mt-3 grid grid-cols-[1fr_auto] gap-2 relative z-10">
        <button type="button" class="btn btn-primary h-9 px-3 text-xs sm:text-sm" data-add="${html(p.sku)}" ${p.inStock ? '' : 'disabled'} aria-label="${p.inStock ? `Add ${html(p.title)} to basket` : `${html(p.title)} — sold out`}">
          ${icon('cart', 'size-4')}<span>${p.inStock ? 'Add' : 'Sold out'}</span>
        </button>
        <a href="${url}" class="btn btn-outline h-9 px-3 text-xs sm:text-sm" aria-label="View details for ${html(p.title)}">View</a>
      </div>
    </div>
  </li>`;
}

/**
 * Mirrors productCard() tag-for-tag with the same typographic classes and transparent text,
 * so the skeleton is exactly the height of a real card and the swap causes no layout shift.
 */
export function skeletonCard() {
  return `
  <li class="card flex w-[11.5rem] sm:w-56 flex-col overflow-hidden" aria-hidden="true">
    <div class="skeleton aspect-square rounded-none"></div>
    <div class="flex flex-1 flex-col p-3">
      <p class="skeleton w-1/3 text-[11px] font-semibold uppercase tracking-wide text-transparent">Brand</p>
      <h3 class="mt-0.5 text-sm font-medium leading-snug line-clamp-2 min-h-[2.6em]"><span class="skeleton block w-full text-transparent">Title</span><span class="skeleton mt-1 block w-2/3 text-transparent">Title</span></h3>
      <p class="skeleton mt-1 w-10 text-xs text-transparent">5 kg</p>
      <div class="mt-2 flex items-baseline gap-2"><span class="skeleton w-16 text-base font-semibold text-transparent">0,00 €</span></div>
      <p class="skeleton w-20 text-[11px] text-transparent">0,00 € / kg</p>
      <div class="mt-3 grid grid-cols-[1fr_auto] gap-2"><span class="skeleton h-9 rounded-pill"></span><span class="skeleton h-9 w-14 rounded-pill"></span></div>
    </div>
  </li>`;
}

export function renderSkeletons(track, n = 5) {
  track.innerHTML = Array.from({ length: n }, skeletonCard).join('');
}

/* ---------------- sections ---------------- */
export function renderProductRow(section, data) {
  const track = section.querySelector('[data-row-track]');
  const items = data.bySubcategory(section.dataset.subcategory);
  track.innerHTML = items.length
    ? items.map((p) => productCard(p, data)).join('')
    : `<li class="text-sm text-ink-muted py-6">No products in this category yet.</li>`;
}

export function renderCatalogue(ul, data) {
  // first row of tiles is above the fold on phones and is often the LCP element → eager
  ul.innerHTML = data.tiles().map((c, i) => `
    <li>
      <a href="category.html?slug=${c.slug}" class="group flex flex-col items-center gap-2 text-center">
        <span class="block size-full aspect-square rounded-full overflow-hidden border border-line bg-surface shadow-card transition-transform group-hover:-translate-y-0.5">
          <img src="${c.image}" width="400" height="400" alt="" loading="${i < 6 ? 'eager' : 'lazy'}"${i === 0 ? ' fetchpriority="high"' : ''} class="size-full object-cover">
        </span>
        <span class="text-xs sm:text-sm font-medium leading-tight group-hover:text-brand-700">${html(c.name)}</span>
      </a>
    </li>`).join('');
}

export function renderBrands(ul, data) {
  ul.innerHTML = data.brands.map((b) => `
    <li>
      <a href="category.html?brand=${b.slug}" class="card flex h-20 w-44 items-center justify-center p-3 grayscale opacity-70 transition hover:grayscale-0 hover:opacity-100 focus-visible:grayscale-0 focus-visible:opacity-100" title="${html(b.blurb ?? b.name)}">
        <img src="${b.logo}" width="240" height="100" alt="${html(b.name)}" loading="lazy" class="max-h-full w-auto">
      </a>
    </li>`).join('');
}
