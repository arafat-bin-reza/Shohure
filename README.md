# Shohure — শহুরে

**Shohure — শহুরে** (Bengali for "urban") is the South Asian pantry for city life — a static grocery storefront — hand-written HTML, Tailwind CSS (CLI build), vanilla JavaScript, JSON data — hosted on GitHub Pages. Modelled on the structure of [desigros.com](https://desigros.com); brand, products and vendors are fictional placeholders.

**Milestone 1 (this repo today):** the home page. Live at **https://arafat-bin-reza.github.io/Shohure/**.

## Run locally

```bash
npm install          # once — Tailwind CLI + font files only; nothing ships to the browser from node_modules
npm run dev          # rebuilds assets/css/main.css on every change (leave running)
npm run serve        # http://localhost:5173/  — a static server; fetch() is blocked over file://
```

Before every push:

```bash
npm run check        # validates data/*.json — fails on bad slugs, missing images, non-integer prices, dangling references
npm run build        # minified CSS → assets/css/main.css  (this file IS committed; GitHub Pages has no build step)
```

## Add a product

1. Append an object to `data/products.json`. Copy an existing one. Rules the checker enforces:
   - `price` / `comparePrice` are **integer cents** (`1499` = 14,99 €). `comparePrice` must be greater than `price`, or `null`.
   - `brand`, `category`, `subcategory` must be existing slugs, and `subcategory.parent` must equal `category`.
   - `unit.uom` ∈ `g | kg | ml | l | piece | pack`. The per-kg / per-litre unit price is **derived**, never stored.
   - `images` paths must exist on disk; the first is the card image, the second is the hover image.
2. Drop the photos in `assets/img/products/` (WebP, ~600 px, under 60 KB), or run `npm run placeholders` to generate SVG stand-ins for any product that has none. The generator never overwrites a non-`.svg` file.
3. `npm run check`.

Categories and brands work the same way via `data/categories.json` (`tile: true` puts a category in the home-page "Shop by category" grid) and `data/brands.json`.

## Layout

```
index.html                 the home page
assets/css/main.css        BUILT — do not edit; edit src/input.css
assets/js/
  main.js                  entry — wires everything below together
  data.js                  loads the three JSON files, lookup helpers
  render.js                JSON → DOM: product card, skeletons, catalogue grid, brand strip
  nav.js                   desktop mega-menu + mobile drawer, from categories.json
  carousel.js              hero (autoplay, dots, swipe, reduced-motion) + scroll-snap rows
  cart.js                  localStorage cart with try/catch on every access, drawer UI
  search.js                header search suggestions (M4 swaps in Fuse.js + a results page)
  drawer.js                shared slide-over: backdrop, scroll lock, Escape, focus trap
  format.js                money + unit-price helpers (de-DE, EUR)
assets/img/                hero/ categories/ products/ brands/ payment/ + favicon.svg
assets/fonts/              self-hosted Poppins + Inter (woff2) — no Google Fonts (GDPR)
data/                      products.json · categories.json · brands.json
src/input.css              Tailwind source: @theme tokens, fonts, hand-written components
scripts/
  check.mjs                data validation
  placeholders.mjs         SVG placeholder generator
  serve.mjs                zero-dependency dev server (gzip, like Pages)
```

## Conventions

- **Relative links only** (`category.html?slug=…`, `assets/…`). The site must work at `/`, at `/Shohure/`, and on a custom domain.
- **No colour or font name in markup.** Tokens live in `@theme` in `src/input.css`.
- **Every `localStorage` access is wrapped in `try/catch`.** Safari Private Mode and blocked site data throw.
- **Every image has `width`/`height` attributes** and everything below the fold is `loading="lazy"`.
- JS-filled containers reserve their final height in the HTML (skeletons / `min-h-*`) so the page has zero layout shift.

## Deploy

GitHub Pages, **Deploy from a branch → `main` / `(root)`**. No CI: `npm run build` locally, commit `assets/css/main.css`, push. Allow up to a minute, then hard-refresh. Canonical/OG URLs in `index.html` assume `https://arafat-bin-reza.github.io/Shohure/` — the only place to change for a custom domain.

## Fonts

Copied from `node_modules/@fontsource/{poppins,inter}/files/*-latin-{weight}-normal.woff2` into `assets/fonts/`. Weights in use: Poppins 600/700 (headings), Inter 400/500/600 (body). Add a weight by copying its file and adding an `@font-face` in `src/input.css`.
