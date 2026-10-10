// Loads the three JSON files once and exposes lookup helpers.
// Paths are RELATIVE so the site works at /, /shop/, or a custom domain.

let cache;

export function loadData() {
  cache ??= Promise.all([
    fetch('data/products.json').then(ok),
    fetch('data/categories.json').then(ok),
    fetch('data/brands.json').then(ok),
  ]).then(([products, categories, brands]) => {
    const catBySlug = new Map(categories.map((c) => [c.slug, c]));
    const brandBySlug = new Map(brands.map((b) => [b.slug, b]));
    const byOrder = (a, b) => a.order - b.order;
    return {
      products,
      categories,
      brands,
      productBySlug: new Map(products.map((p) => [p.slug, p])),
      productBySku: new Map(products.map((p) => [p.sku, p])),
      category: (slug) => catBySlug.get(slug),
      brand: (slug) => brandBySlug.get(slug),
      topLevel: () => categories.filter((c) => c.parent === null).sort(byOrder),
      children: (slug) => categories.filter((c) => c.parent === slug).sort(byOrder),
      // top-level categories first (in their order), then the featured subcategories
      tiles: () => categories.filter((c) => c.tile).sort((a, b) => (b.parent === null) - (a.parent === null) || a.order - b.order),
      bySubcategory: (slug) => products.filter((p) => p.subcategory === slug),
    };
  });
  return cache;
}

function ok(res) {
  if (!res.ok) throw new Error(`${res.url} → ${res.status}`);
  return res.json();
}
