import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// End-to-end checks against the local dev server (npm run serve must be running).
// Run: npm run e2e        Override the browser with CHROME_PATH=... if Chrome is elsewhere.

const BASE = process.env.E2E_URL ?? 'http://localhost:5173/';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = new URL('../.e2e/', import.meta.url);
mkdirSync(SHOTS, { recursive: true });
const shot = (name) => fileURLToPath(new URL(name, SHOTS));
const out = (k, v) => console.log(`${String(v).startsWith('FAIL') ? '✖' : '✔'} ${k}: ${v}`);
const failures = [];
const check = (k, cond, detail = '') => { const v = cond ? `ok ${detail}` : `FAIL ${detail}`; out(k, v); if (!cond) failures.push(k); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run'] });

async function newPage(viewport) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });
  await page.setViewport(viewport);
  return { page, errors };
}
const settle = (ms = 400) => new Promise((r) => setTimeout(r, ms));

/* ---------------- desktop ---------------- */
{
  const { page, errors } = await newPage({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-sku]');

  check('desktop: no console/network errors', errors.length === 0, errors.join(' | '));
  check('desktop: 15 product cards', (await page.$$('[data-sku]')).length === 15);
  check('desktop: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), await page.evaluate(() => `${document.documentElement.scrollWidth}/${window.innerWidth}`));
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, document.body.scrollHeight); });
  await settle(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  check('desktop: all visible images loaded', await page.evaluate(() => [...document.images].filter((i) => i.offsetParent !== null && !i.closest('.drawer')).every((i) => i.complete && i.naturalWidth > 0)), await page.evaluate(() => `${[...document.images].filter((i) => i.offsetParent !== null && !i.closest('.drawer')).length} visible imgs`));
  check('desktop: landmarks', await page.evaluate(() => !!(document.querySelector('header') && document.querySelector('main') && document.querySelector('footer') && document.querySelector('nav'))));
  check('desktop: every img has alt attr', await page.evaluate(() => [...document.images].every((i) => i.hasAttribute('alt'))));

  // mega menu via hover
  await page.hover('[data-mega="rice"]');
  await settle(300);
  check('mega: opens on hover', await page.evaluate(() => document.getElementById('mega-rice').hasAttribute('data-open') && document.querySelector('[data-mega="rice"]').getAttribute('aria-expanded') === 'true'));
  await page.mouse.move(600, 700); await settle(400);
  check('mega: closes on leave', await page.evaluate(() => !document.getElementById('mega-rice').hasAttribute('data-open')));
  // keyboard
  await page.focus('[data-mega="atta-flours"]'); await settle(100);
  check('mega: opens on focus', await page.evaluate(() => document.getElementById('mega-atta-flours').hasAttribute('data-open')));
  await page.keyboard.press('Escape'); await settle(100);
  check('mega: Escape closes + focus returns', await page.evaluate(() => !document.getElementById('mega-atta-flours').hasAttribute('data-open') && document.activeElement === document.querySelector('[data-mega="atta-flours"]')));

  // hero — reset to slide 1 first (autoplay may have advanced during the scroll sweep) and let the fade finish
  await page.click('.hero-dot:first-child'); await settle(900);
  check('hero: dots rendered', (await page.$$('.hero-dot')).length === 3);
  check('hero: inactive slides invisible', await page.evaluate(() => [...document.querySelectorAll('.hero-slide:not([data-active])')].every((s) => getComputedStyle(s).visibility === 'hidden')));
  await page.click('[data-hero-next]'); await settle(150);
  check('hero: next advances', await page.evaluate(() => document.querySelectorAll('.hero-slide')[1].hasAttribute('data-active') && document.querySelector('[data-hero-status]').textContent.includes('2 of 3')));

  // product row arrows
  check('row: arrows visible on desktop', await page.evaluate(() => !document.querySelector('[data-row-arrows]').hidden));
  check('row: prev disabled at start', await page.evaluate(() => document.querySelector('[data-row-prev]').disabled === true));

  // cart
  const firstAdd = await page.$('[data-add]:not([disabled])');
  await firstAdd.click(); await settle(300);
  check('cart: drawer opens on add', await page.evaluate(() => document.getElementById('cart-drawer').hasAttribute('data-open') && document.body.hasAttribute('data-lock')));
  check('cart: badge = 1', await page.evaluate(() => document.getElementById('cart-count').textContent === '1' && !document.getElementById('cart-count').hidden));
  check('cart: free-shipping bar present', await page.evaluate(() => !!document.querySelector('#cart-shipping [role=progressbar]')));
  await page.click('#cart-lines [data-inc]'); await settle(100);
  check('cart: increment → 2', await page.evaluate(() => document.getElementById('cart-count').textContent === '2'));
  const subtotal = await page.evaluate(() => document.getElementById('cart-subtotal').textContent);
  check('cart: subtotal formatted de-DE', /^\d+,\d{2}\s?€$/.test(subtotal), subtotal);
  check('cart: focus inside drawer', await page.evaluate(() => document.getElementById('cart-drawer').contains(document.activeElement)));
  await page.keyboard.press('Escape'); await settle(400);
  check('cart: Escape closes + unlocks body', await page.evaluate(() => !document.getElementById('cart-drawer').hasAttribute('data-open') && !document.body.hasAttribute('data-lock')));
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForSelector('[data-sku]'); await settle(200);
  check('cart: persists across reload', await page.evaluate(() => document.getElementById('cart-count').textContent === '2'));
  // remove
  await page.click('#cart-open'); await settle(300);
  await page.click('#cart-lines [data-remove]'); await settle(100);
  check('cart: remove → empty state', await page.evaluate(() => document.getElementById('cart-count').hidden && document.getElementById('cart-lines').textContent.includes('empty')));
  await page.keyboard.press('Escape'); await settle(300);

  // search
  await page.type('#search-input', 'basmati'); await settle(200);
  const nRes = await page.evaluate(() => document.querySelectorAll('#search-results [role=option]').length);
  const top5 = await page.evaluate(() => [...document.querySelectorAll('#search-results [role=option]')].slice(0,5).every((li) => /basmati/i.test(li.textContent) && !/non-basmati/i.test(li.textContent)));
  check('search: suggestions for "basmati" (title matches ranked first)', nRes >= 5 && top5, `${nRes} results`);
  await page.click('#search-reset'); await settle(100);
  check('search: reset clears', await page.evaluate(() => document.getElementById('search-input').value === '' && document.getElementById('search-results').hidden));

  // announcement dismiss persists
  await page.click('#announce-close');
  await page.reload({ waitUntil: 'networkidle0' });
  check('announce: dismissal persists', await page.evaluate(() => getComputedStyle(document.getElementById('announce')).display === 'none' && document.documentElement.classList.contains('announce-dismissed')));

  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForSelector('[data-sku]'); await settle(800);
  await page.screenshot({ path: shot('desktop.png'), fullPage: true });
  // mega open screenshot
  await page.hover('[data-mega="rice"]'); await settle(300);
  await page.screenshot({ path: shot('desktop-mega.png'), clip: { x: 0, y: 0, width: 1280, height: 520 } });
  await page.close();
}

/* ---------------- mobile 360 ---------------- */
{
  const { page, errors } = await newPage({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-sku]'); await settle(300);

  check('mobile: no console/network errors', errors.length === 0, errors.join(' | '));
  check('mobile: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), await page.evaluate(() => `${document.documentElement.scrollWidth}/${window.innerWidth}`));
  check('mobile: desktop nav hidden', await page.evaluate(() => getComputedStyle(document.getElementById('cat-nav')).display === 'none'));
  check('mobile: row arrows hidden on touch', await page.evaluate(() => [...document.querySelectorAll('[data-row-arrows]')].every((a) => a.hidden || getComputedStyle(a).display === 'none')));
  check('mobile: hero arrows hidden', await page.evaluate(() => getComputedStyle(document.querySelector('[data-hero-next]')).display === 'none'));

  await page.tap('#nav-open'); await settle(400);
  check('mobile: nav drawer opens + lock', await page.evaluate(() => document.getElementById('nav-drawer').hasAttribute('data-open') && document.body.hasAttribute('data-lock')));
  check('mobile: drawer has 8 top-level', (await page.$$('#nav-drawer-body > ul > li')).length === 8);
  await page.tap('[data-acc="rice"]'); await settle(150);
  check('mobile: accordion expands', await page.evaluate(() => !document.getElementById('acc-rice').hidden && document.querySelector('[data-acc="rice"]').getAttribute('aria-expanded') === 'true'));
  await page.screenshot({ path: shot('mobile-drawer.png') });
  await page.keyboard.press('Escape'); await settle(400);
  check('mobile: Escape closes drawer', await page.evaluate(() => !document.getElementById('nav-drawer').hasAttribute('data-open') && !document.body.hasAttribute('data-lock')));

  // tap targets: all buttons/links >= 24px (WCAG 2.5.8 minimum)
  const small = await page.evaluate(() => [...document.querySelectorAll('a,button')].filter((el) => el.offsetParent !== null && !el.classList.contains('skip-link') && !el.closest('h3')).map((el) => ({ r: el.getBoundingClientRect(), t: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 30) })).filter(({ r }) => r.width > 0 && (r.width < 24 || r.height < 24)).map(({ t, r }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`));
  check('mobile: no tap targets under 24px', small.length === 0, small.join(', '));

  await page.screenshot({ path: shot('mobile.png'), fullPage: true });
  await page.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} FAILED: ${failures.join('; ')}` : '\nALL PASSED');
process.exit(failures.length ? 1 : 0);
