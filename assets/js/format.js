// Money and unit helpers. All prices are INTEGER CENTS — never floats.

const LOCALE = 'de-DE';
const CURRENCY = 'EUR';

const fmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

/** 1499 → "14,99 €" */
export function formatPrice(cents) {
  if (!Number.isInteger(cents)) throw new TypeError(`price must be integer cents, got ${cents}`);
  return fmt.format(cents / 100);
}

// Base unit each uom is normalised to for the unit-price line.
const BASE = {
  g:     { to: 'kg', factor: 1 / 1000 },
  kg:    { to: 'kg', factor: 1 },
  ml:    { to: 'l',  factor: 1 / 1000 },
  l:     { to: 'l',  factor: 1 },
  piece: { to: 'piece', factor: 1 },
  pack:  { to: 'pack',  factor: 1 },
};

/**
 * Derived, never stored. { amount: 5, uom: 'kg' } + 1499 → { cents: 300, label: "3,00 € / kg" }
 * Rounds to whole cents (PAngV allows this for the displayed Grundpreis).
 */
export function unitPrice(cents, unit) {
  const base = BASE[unit?.uom];
  if (!base) throw new RangeError(`unknown uom "${unit?.uom}"`);
  const qtyInBase = unit.amount * base.factor;
  if (qtyInBase <= 0) throw new RangeError('unit amount must be > 0');
  const perBase = Math.round(cents / qtyInBase);
  return { cents: perBase, unit: base.to, label: `${formatPrice(perBase)} / ${base.to}` };
}

/** (1499, 1799) → 17   ·   (1499, null) → 0 */
export function discountPercent(price, comparePrice) {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round((1 - price / comparePrice) * 100);
}

/** "5 kg", "500 g", "1 piece" */
export function formatUnit(unit) {
  return `${unit.amount} ${unit.uom}`;
}
