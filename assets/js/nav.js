// Category navigation, rendered from categories.json.
// Desktop: horizontal bar + mega-menu panel (hover AND keyboard focus, Escape closes).
// Mobile:  slide-in drawer with accordions (focus trapped, body scroll locked — see drawer.js).

import { openDrawer } from './drawer.js';
import { html, icon } from './render.js';

const HOVER_OPEN_MS = 80;
const HOVER_CLOSE_MS = 180;

export function initNav(data) {
  renderDesktop(data);
  renderMobile(data);
  renderFooterShop(data);
}

/* ---------------- desktop ---------------- */
function renderDesktop(data) {
  const list = document.getElementById('cat-nav-list');
  const host = document.getElementById('mega-host');
  const nav = document.getElementById('cat-nav');
  const top = data.topLevel();

  list.innerHTML = top.map((c) => {
    const kids = data.children(c.slug);
    if (!kids.length) return `<li><a class="nav-link" href="category.html?slug=${c.slug}">${html(c.name)}</a></li>`;
    return `<li><button type="button" class="nav-link" data-mega="${c.slug}" aria-expanded="false" aria-controls="mega-${c.slug}">${html(c.name)}${icon('chevron-down', 'size-4 opacity-60')}</button></li>`;
  }).join('');

  host.innerHTML = top.filter((c) => data.children(c.slug).length).map((c) => {
    const kids = data.children(c.slug);
    return `
      <div id="mega-${c.slug}" class="mega-panel" role="region" aria-label="${html(c.name)} subcategories">
        <div class="container-x grid grid-cols-[1fr_auto] gap-10 py-6">
          <div>
            <div class="flex items-baseline gap-4 mb-3">
              <h3 class="text-base">${html(c.name)}</h3>
              <a href="category.html?slug=${c.slug}" class="text-sm text-brand-700 hover:underline">View all ${html(c.name.toLowerCase())}</a>
            </div>
            <ul class="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2">
              ${kids.map((k) => `<li><a href="category.html?slug=${k.slug}" class="group flex items-center gap-3 rounded-md py-1.5 pr-2 hover:text-brand-700">
                <img src="${k.image}" width="40" height="40" alt="" loading="lazy" class="size-10 rounded-full border border-line">
                <span><span class="block text-sm font-medium">${html(k.name)}</span><span class="block text-xs text-ink-faint group-hover:text-ink-muted">${html(k.blurb ?? '')}</span></span>
              </a></li>`).join('')}
            </ul>
          </div>
          <a href="category.html?slug=${c.slug}" class="hidden lg:block w-56 rounded-card overflow-hidden border border-line">
            <img src="${c.image}" width="400" height="400" alt="" loading="lazy" class="w-56 h-40 object-cover">
            <p class="p-3 text-sm text-ink-muted">${html(c.blurb ?? '')}</p>
          </a>
        </div>
      </div>`;
  }).join('');

  let openSlug = null, openTimer, closeTimer;
  const trigger = (slug) => list.querySelector(`[data-mega="${slug}"]`);
  const panel = (slug) => document.getElementById(`mega-${slug}`);

  function show(slug) {
    clearTimeout(closeTimer);
    if (openSlug === slug) return;
    hide();
    openSlug = slug;
    trigger(slug).setAttribute('aria-expanded', 'true');
    panel(slug).setAttribute('data-open', '');
  }
  function hide() {
    if (!openSlug) return;
    trigger(openSlug).setAttribute('aria-expanded', 'false');
    panel(openSlug).removeAttribute('data-open');
    openSlug = null;
  }
  const scheduleShow = (slug) => { clearTimeout(openTimer); openTimer = setTimeout(() => show(slug), HOVER_OPEN_MS); };
  const scheduleHide = () => { clearTimeout(openTimer); clearTimeout(closeTimer); closeTimer = setTimeout(hide, HOVER_CLOSE_MS); };

  // hover
  list.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-mega]');
    if (t) scheduleShow(t.dataset.mega);
    else if (e.target.closest('a')) scheduleHide();
  });
  nav.addEventListener('pointerleave', scheduleHide);
  host.addEventListener('pointerover', () => clearTimeout(closeTimer));

  // click toggles (touch laptops, and keyboard Enter/Space)
  list.addEventListener('click', (e) => {
    const t = e.target.closest('[data-mega]');
    if (!t) return;
    openSlug === t.dataset.mega ? hide() : show(t.dataset.mega);
  });

  // keyboard: focus on a trigger opens; Escape closes and returns focus; tabbing out closes
  list.addEventListener('focusin', (e) => {
    const t = e.target.closest('[data-mega]');
    if (t) show(t.dataset.mega); else hide();
  });
  nav.addEventListener('focusout', (e) => {
    if (!nav.contains(e.relatedTarget)) hide();
  });
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !openSlug) return;
    const t = trigger(openSlug);
    hide();
    t.focus();
  });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) hide(); });
}

/* ---------------- mobile drawer ---------------- */
function renderMobile(data) {
  const body = document.getElementById('nav-drawer-body');
  const drawer = document.getElementById('nav-drawer');
  const top = data.topLevel();

  body.innerHTML = `<ul class="divide-y divide-line">${top.map((c) => {
    const kids = data.children(c.slug);
    if (!kids.length) return `<li><a href="category.html?slug=${c.slug}" class="flex items-center gap-3 px-4 py-3.5 font-medium">${tileImg(c)}${html(c.name)}</a></li>`;
    return `<li>
      <button type="button" class="flex w-full items-center gap-3 px-4 py-3.5 font-medium text-left" aria-expanded="false" aria-controls="acc-${c.slug}" data-acc="${c.slug}">
        ${tileImg(c)}<span class="flex-1">${html(c.name)}</span>${icon('chevron-down', 'size-5 text-ink-faint transition-transform [[aria-expanded=true]>&]:rotate-180')}
      </button>
      <ul id="acc-${c.slug}" class="bg-cream/60 pb-2" hidden>
        <li><a href="category.html?slug=${c.slug}" class="block pl-[4.25rem] pr-4 py-2 text-sm font-medium text-brand-700">All ${html(c.name)}</a></li>
        ${kids.map((k) => `<li><a href="category.html?slug=${k.slug}" class="block pl-[4.25rem] pr-4 py-2 text-sm text-ink-muted hover:text-ink">${html(k.name)}</a></li>`).join('')}
      </ul>
    </li>`;
  }).join('')}</ul>`;

  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const expanded = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!expanded));
    document.getElementById(`acc-${b.dataset.acc}`).hidden = expanded;
  });

  const openBtn = document.getElementById('nav-open');
  openBtn.addEventListener('click', () => openDrawer(drawer, openBtn));
}

const tileImg = (c) => `<img src="${c.image}" width="40" height="40" alt="" class="size-10 rounded-full border border-line" loading="lazy">`;

/* ---------------- footer "Shop" column ---------------- */
function renderFooterShop(data) {
  document.getElementById('footer-shop').innerHTML = data.topLevel()
    .map((c) => `<li><a href="category.html?slug=${c.slug}" class="inline-block py-0.5 hover:text-brand-700">${html(c.name)}</a></li>`).join('');
}
