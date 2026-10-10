// Two carousels:
//   initHero(root)      — fading hero with arrows, dots, autoplay (pauses on hover/focus,
//                         disabled under prefers-reduced-motion), touch swipe.
//   initScrollRow(sec)  — horizontal scroll-snap product/brand rows with arrows that
//                         hide at the ends and are not rendered on touch devices.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = matchMedia('(hover: none), (pointer: coarse)');

export function initHero(root, { interval = 5000 } = {}) {
  const slides = [...root.querySelectorAll('.hero-slide')];
  const dotsHost = root.querySelector('[data-hero-dots]');
  const status = root.querySelector('[data-hero-status]');
  if (slides.length < 2) return;

  let i = slides.findIndex((s) => s.hasAttribute('data-active'));
  if (i < 0) i = 0;
  let timer = null;
  let paused = false;

  dotsHost.innerHTML = slides.map((_, n) =>
    `<button type="button" class="hero-dot" role="tab" aria-label="Go to slide ${n + 1}" aria-current="${n === i}"></button>`).join('');
  const dots = [...dotsHost.children];

  function go(n, announce = true) {
    slides[i].removeAttribute('data-active');
    dots[i].setAttribute('aria-current', 'false');
    i = (n + slides.length) % slides.length;
    slides[i].setAttribute('data-active', '');
    dots[i].setAttribute('aria-current', 'true');
    if (announce) status.textContent = `Slide ${i + 1} of ${slides.length}`;
  }
  const next = () => go(i + 1);
  const prev = () => go(i - 1);

  function start() {
    stop();
    if (reduceMotion.matches || paused || document.hidden) return;
    timer = setInterval(() => go(i + 1, false), interval);
  }
  function stop() { clearInterval(timer); timer = null; }

  root.querySelector('[data-hero-next]')?.addEventListener('click', () => { next(); start(); });
  root.querySelector('[data-hero-prev]')?.addEventListener('click', () => { prev(); start(); });
  dots.forEach((d, n) => d.addEventListener('click', () => { go(n); start(); }));

  // pause on hover and on focus (any focus inside the carousel)
  root.addEventListener('pointerenter', () => { paused = true; stop(); });
  root.addEventListener('pointerleave', () => { paused = false; start(); });
  root.addEventListener('focusin', () => { paused = true; stop(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { paused = false; start(); } });
  document.addEventListener('visibilitychange', start);
  reduceMotion.addEventListener('change', start);

  // keyboard arrows when the carousel has focus
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  });

  // swipe
  let x0 = null;
  root.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') x0 = e.clientX; }, { passive: true });
  root.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); start(); }
  });

  start();
}

export function initScrollRow(section) {
  const track = section.querySelector('[data-row-track]');
  const arrows = section.querySelector('[data-row-arrows]');
  if (!track) return;

  if (!arrows) return;
  if (coarsePointer.matches) { arrows.hidden = true; return; } // native swipe is better on touch

  const prev = arrows.querySelector('[data-row-prev]');
  const next = arrows.querySelector('[data-row-next]');
  const step = () => Math.max(track.clientWidth * 0.8, 240);

  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left:  step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' }));

  // hide arrows at the ends (and both if nothing overflows)
  function update() {
    const max = track.scrollWidth - track.clientWidth - 1;
    const overflow = max > 2;
    arrows.classList.toggle('invisible', !overflow);
    prev.disabled = !overflow || track.scrollLeft <= 1;
    next.disabled = !overflow || track.scrollLeft >= max;
  }
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);
  new MutationObserver(update).observe(track, { childList: true });
  update();
}
