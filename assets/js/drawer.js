// Shared slide-over behaviour for the mobile nav and the cart:
// backdrop, body scroll lock, Escape to close, focus trap, focus restore.

const backdrop = document.getElementById('backdrop');
let open = null;
let lastFocus = null;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function openDrawer(el, trigger) {
  if (open === el) return;
  if (open) closeDrawer();
  open = el;
  lastFocus = trigger ?? document.activeElement;
  el.setAttribute('data-open', '');
  backdrop.setAttribute('data-open', '');
  document.body.setAttribute('data-lock', '');
  trigger?.setAttribute('aria-expanded', 'true');
  // focus the first focusable control, else the panel itself
  (el.querySelector(FOCUSABLE) ?? el).focus({ preventScroll: true });
  document.addEventListener('keydown', onKey);
}

export function closeDrawer() {
  if (!open) return;
  const el = open;
  open = null;
  el.removeAttribute('data-open');
  backdrop.removeAttribute('data-open');
  document.body.removeAttribute('data-lock');
  document.removeEventListener('keydown', onKey);
  lastFocus?.setAttribute?.('aria-expanded', 'false');
  lastFocus?.focus?.({ preventScroll: true });
  lastFocus = null;
}

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
  if (e.key !== 'Tab' || !open) return;
  // focus trap
  const items = [...open.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items.at(-1);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

backdrop.addEventListener('click', closeDrawer);
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-drawer-close]')) closeDrawer();
});
