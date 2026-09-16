// localStorage cart. Every storage access is wrapped in try/catch: Safari Private Mode
// and "block site data" both throw, and an unhandled throw here would kill every script
// that runs after it.

import { formatPrice, formatUnit } from './format.js';
import { html, icon } from './render.js';
import { openDrawer } from './drawer.js';

const KEY = 'cart:v1';
export const FREE_SHIPPING_CENTS = 4900;

/* ---------------- storage ---------------- */
export function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
export function write(lines) {
  try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* non-fatal */ }
  document.dispatchEvent(new CustomEvent('cart:changed', { detail: lines }));
}

/* ---------------- mutations ---------------- */
export function add(product, qty = 1) {
  const lines = read();
  const line = lines.find((l) => l.sku === product.sku);
  if (line) line.qty += qty;
  else lines.push({ sku: product.sku, qty, price: product.price, title: product.title, image: product.images[0], unit: product.unit, slug: product.slug });
  write(lines);
}
export function setQty(sku, qty) {
  const lines = read().map((l) => (l.sku === sku ? { ...l, qty } : l)).filter((l) => l.qty > 0);
  write(lines);
}
export function remove(sku) { write(read().filter((l) => l.sku !== sku)); }

export const count = (lines = read()) => lines.reduce((n, l) => n + l.qty, 0);
export const subtotal = (lines = read()) => lines.reduce((n, l) => n + l.qty * l.price, 0);

/**
 * Re-validate stored lines against the live catalogue: drop products that no longer exist,
 * update prices that changed. Returns human-readable notices for the drawer.
 */
export function reconcile(data) {
  const notices = [];
  const lines = read();
  const next = [];
  for (const l of lines) {
    const p = data.productBySku.get(l.sku);
    if (!p) { notices.push(`"${l.title}" is no longer available and was removed.`); continue; }
    if (p.price !== l.price) {
      notices.push(`Price of "${p.title}" changed from ${formatPrice(l.price)} to ${formatPrice(p.price)}.`);
      l.price = p.price;
    }
    if (!p.inStock) notices.push(`"${p.title}" is currently sold out.`);
    l.title = p.title; l.image = p.images[0]; l.unit = p.unit; l.slug = p.slug;
    next.push(l);
  }
  if (notices.length) write(next); else document.dispatchEvent(new CustomEvent('cart:changed', { detail: next }));
  return notices;
}

/* ---------------- UI ---------------- */
export function initCartUI(data) {
  const drawer = document.getElementById('cart-drawer');
  const openBtn = document.getElementById('cart-open');
  const badge = document.getElementById('cart-count');
  const titleCount = document.getElementById('cart-title-count');
  const linesEl = document.getElementById('cart-lines');
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const noticeEl = document.getElementById('cart-notice');
  const footer = document.getElementById('cart-footer');

  function render(lines) {
    const n = count(lines), sub = subtotal(lines);

    // Re-rendering innerHTML destroys the focused stepper button; remember it to restore below.
    const focused = document.activeElement;
    const focusLine = focused?.closest?.('[data-line]')?.dataset.line;
    const focusCtl = ['data-inc', 'data-dec', 'data-remove'].find((a) => focused?.hasAttribute?.(a));

    badge.textContent = n;
    badge.hidden = n === 0;
    titleCount.textContent = n ? `(${n} ${n === 1 ? 'item' : 'items'})` : '';
    subtotalEl.textContent = formatPrice(sub);
    footer.hidden = n === 0;

    // free-shipping progress
    if (n === 0) shippingEl.innerHTML = '';
    else {
      const left = Math.max(FREE_SHIPPING_CENTS - sub, 0);
      const pct = Math.min(100, Math.round((sub / FREE_SHIPPING_CENTS) * 100));
      shippingEl.innerHTML = `
        <p class="text-sm ${left ? 'text-ink-muted' : 'text-success font-medium'}">${left
          ? `Add <strong class="text-ink">${formatPrice(left)}</strong> more for free delivery`
          : `${icon('check', 'inline size-4 -mt-0.5')} You've unlocked free delivery`}</p>
        <div class="mt-2 h-1.5 w-full rounded-pill bg-line overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progress to free delivery">
          <div class="h-full rounded-pill ${left ? 'bg-brand-500' : 'bg-success'} transition-all" style="width:${pct}%"></div>
        </div>`;
    }

    // lines / empty state
    linesEl.innerHTML = n === 0
      ? `<li class="flex flex-col items-center justify-center gap-3 py-16 text-center">
           <span class="inline-flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">${icon('cart', 'size-8')}</span>
           <p class="font-medium">Your basket is empty</p>
           <p class="text-sm text-ink-muted max-w-[16rem]">Browse the categories or search for rice, atta, dal and more.</p>
           <button type="button" class="btn btn-primary mt-2" data-drawer-close>Start shopping</button>
         </li>`
      : lines.map((l) => `
        <li class="flex gap-3 py-3" data-line="${html(l.sku)}">
          <a href="product.html?slug=${html(l.slug)}" class="shrink-0 size-20 rounded-md overflow-hidden border border-line bg-cream">
            <img src="${html(l.image)}" width="80" height="80" alt="" class="size-full object-cover">
          </a>
          <div class="flex-1 min-w-0">
            <a href="product.html?slug=${html(l.slug)}" class="block text-sm font-medium leading-snug line-clamp-2 hover:text-brand-700">${html(l.title)}</a>
            <p class="text-xs text-ink-muted mt-0.5">${html(formatUnit(l.unit))} · ${formatPrice(l.price)} each</p>
            <div class="mt-2 flex items-center justify-between gap-2">
              <div class="stepper" role="group" aria-label="Quantity for ${html(l.title)}">
                <button type="button" data-dec aria-label="Decrease quantity">${icon('minus', 'size-4')}</button>
                <output aria-live="polite">${l.qty}</output>
                <button type="button" data-inc aria-label="Increase quantity">${icon('plus', 'size-4')}</button>
              </div>
              <strong class="text-sm tabular-nums">${formatPrice(l.qty * l.price)}</strong>
              <button type="button" class="btn-icon size-8 text-ink-faint hover:text-sale" data-remove aria-label="Remove ${html(l.title)}">${icon('trash', 'size-4')}</button>
            </div>
          </div>
        </li>`).join('');

    // restore focus: same control on the same line, else the line's remaining control, else the drawer title
    if (focusLine && drawer.hasAttribute('data-open')) {
      const target = linesEl.querySelector(`[data-line="${focusLine}"] [${focusCtl}]`)
        ?? linesEl.querySelector(`[data-line="${focusLine}"] [data-inc]`)
        ?? drawer.querySelector('[data-drawer-close]');
      target?.focus({ preventScroll: true });
    }
  }

  // line controls
  linesEl.addEventListener('click', (e) => {
    const li = e.target.closest('[data-line]');
    if (!li) return;
    const sku = li.dataset.line;
    const line = read().find((l) => l.sku === sku);
    if (!line) return;
    if (e.target.closest('[data-inc]')) setQty(sku, line.qty + 1);
    else if (e.target.closest('[data-dec]')) setQty(sku, line.qty - 1);
    else if (e.target.closest('[data-remove]')) remove(sku);
  });

  // "Add" buttons anywhere on the page (product cards are rendered later — delegate)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b || b.disabled) return;
    const p = data.productBySku.get(b.dataset.add);
    if (!p) return;
    add(p, 1);
    // brief confirmation on the button itself
    const label = b.querySelector('span');
    const prev = label.textContent;
    label.textContent = 'Added ✓';
    b.disabled = true;
    setTimeout(() => { label.textContent = prev; b.disabled = false; }, 900);
    openDrawer(drawer, openBtn);
  });

  openBtn.addEventListener('click', () => openDrawer(drawer, openBtn));

  document.getElementById('cart-checkout').addEventListener('click', () => {
    // Placeholder until M6. Track A: this becomes a mock confirmation page.
    alert('Checkout is not connected yet — this is the Milestone 1 demo build.');
  });

  document.addEventListener('cart:changed', (e) => render(e.detail));

  // initial: reconcile against the catalogue, surface notices, render
  const notices = reconcile(data);
  if (notices.length) {
    noticeEl.hidden = false;
    noticeEl.innerHTML = `<div class="mt-3 rounded-md border border-brand-200 bg-brand-50 p-3 text-xs text-brand-900" role="status">
      <ul class="list-disc pl-4 space-y-1">${notices.map((s) => `<li>${html(s)}</li>`).join('')}</ul></div>`;
  }
  render(read());
}
