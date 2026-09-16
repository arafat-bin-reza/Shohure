// Header search: live suggestions over products.json (title, brand, tags, category).
// M1 uses a simple substring/word match; M4 swaps this for Fuse.js + a results page.

import { formatPrice } from './format.js';
import { html } from './render.js';

const MAX = 6;

export function initSearch(data) {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const reset = document.getElementById('search-reset');
  const list = document.getElementById('search-results');
  if (!form) return;

  const index = data.products.map((p) => ({
    p,
    text: [p.title, data.brand(p.brand)?.name, data.category(p.subcategory)?.name, data.category(p.category)?.name, ...p.tags]
      .filter(Boolean).join(' ').toLowerCase(),
  }));

  function query(q) {
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index
      .map(({ p, text }) => ({ p, score: terms.reduce((s, t) => s + (text.includes(t) ? (p.title.toLowerCase().includes(t) ? 2 : 1) : -99), 0) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title))
      .slice(0, MAX)
      .map((r) => r.p);
  }

  let active = -1;
  function show(results, q) {
    active = -1;
    if (!q) { hide(); return; }
    list.innerHTML = results.length
      ? results.map((p) => `
        <li role="option" id="sr-${p.slug}">
          <a href="product.html?slug=${p.slug}" class="flex items-center gap-3 px-3 py-2 hover:bg-brand-50 focus:bg-brand-50 outline-none">
            <img src="${html(p.images[0])}" width="40" height="40" alt="" class="size-10 rounded-md border border-line bg-cream">
            <span class="flex-1 min-w-0"><span class="block text-sm font-medium truncate">${html(p.title)}</span><span class="block text-xs text-ink-faint">${html(data.brand(p.brand)?.name ?? '')} · ${p.unit.amount} ${p.unit.uom}</span></span>
            <span class="text-sm font-semibold tabular-nums">${formatPrice(p.price)}</span>
          </a>
        </li>`).join('') + `<li><a href="search.html?q=${encodeURIComponent(q)}" class="block px-3 py-2 text-center text-sm text-brand-700 hover:bg-brand-50">See all results for “${html(q)}”</a></li>`
      : `<li class="px-3 py-4 text-sm text-ink-muted text-center">No products match “${html(q)}”.</li>`;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  function hide() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }

  input.addEventListener('input', () => {
    const q = input.value;
    reset.hidden = !q;
    show(query(q), q.trim());
  });
  input.addEventListener('focus', () => { if (input.value.trim()) show(query(input.value), input.value.trim()); });
  reset.addEventListener('click', () => { input.value = ''; reset.hidden = true; hide(); input.focus(); });

  // keyboard: ↓/↑ move through suggestions, Enter follows, Escape closes
  form.addEventListener('keydown', (e) => {
    const links = [...list.querySelectorAll('a')];
    if (e.key === 'Escape') { hide(); input.focus(); return; }
    if (!links.length || list.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = e.key === 'ArrowDown' ? Math.min(active + 1, links.length - 1) : Math.max(active - 1, 0);
      links[active].focus();
    }
  });
  document.addEventListener('click', (e) => { if (!form.contains(e.target)) hide(); });
  form.addEventListener('submit', (e) => { if (!input.value.trim()) e.preventDefault(); });
}
