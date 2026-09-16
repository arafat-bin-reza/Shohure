// Entry point. Static parts (hero, announcement) start immediately;
// everything data-driven starts once the JSON has loaded.

import { loadData } from './data.js';
import { initHero, initScrollRow } from './carousel.js';
import { initNav } from './nav.js';
import { renderSkeletons, renderProductRow, renderCatalogue, renderBrands } from './render.js';
import { initCartUI } from './cart.js';
import { initSearch } from './search.js';

/* ---- announcement bar (dismissal remembered) ---- */
(() => {
  const bar = document.getElementById('announce');
  const KEY = 'announce:dismissed:v1';
  // initial visibility is decided by the inline <head> script (html.announce-dismissed) to avoid CLS
  document.getElementById('announce-close').addEventListener('click', () => {
    bar.hidden = true;
    try { localStorage.setItem(KEY, '1'); } catch { /* non-fatal */ }
  });
})();

/* ---- hero ---- */
initHero(document.querySelector('[data-hero]'));

/* ---- footer year ---- */
document.getElementById('year').textContent = new Date().getFullYear();

/* ---- skeletons while JSON loads ---- */
const rows = [...document.querySelectorAll('[data-product-row]')];
rows.forEach((s) => renderSkeletons(s.querySelector('[data-row-track]')));

/* ---- data-driven ---- */
loadData()
  .then((data) => {
    initNav(data);
    renderCatalogue(document.getElementById('catalogue-grid'), data);
    rows.forEach((s) => { renderProductRow(s, data); initScrollRow(s); });
    renderBrands(document.getElementById('brand-strip'), data);
    initScrollRow(document.getElementById('brand-strip').closest('section'));
    initCartUI(data);
    initSearch(data);
  })
  .catch((err) => {
    console.error(err);
    rows.forEach((s) => {
      s.querySelector('[data-row-track]').innerHTML =
        `<li class="text-sm text-sale py-6">Couldn't load products. If you opened this file directly, run <code>npm run serve</code> and open <code>http://localhost:5173/</code> — browsers block <code>fetch()</code> over <code>file://</code>.</li>`;
    });
  });
