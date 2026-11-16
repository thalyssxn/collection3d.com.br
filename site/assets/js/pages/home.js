import { $, $$, prefersReducedMotion } from '../utils.js';
import { icon } from '../icons.js';
import { fetchProducts, productCard, bindGrid } from '../catalog.js';
import { initReveal } from '../app.js';

/* ---------------- Carrossel de banners ---------------- */
function carousel(root, { interval = 6000 } = {}) {
  const slides = $$('.slide', root);
  const dotsWrap = $('.dots', root);
  const count = $('.slide-count', root);
  const pauseBtn = $('.pause', root);
  let i = 0, timer = null, paused = prefersReducedMotion(), userPaused = paused;
  root.style.setProperty('--dur', `${interval}ms`);

  dotsWrap.innerHTML = slides.map((s, n) =>
    `<button class="dot" role="tab" aria-label="Banner ${n + 1}" aria-selected="${n === 0}"><span></span></button>`).join('');
  const dots = $$('.dot', dotsWrap);

  const go = (n, restart = true) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle('active', k === i); s.setAttribute('aria-hidden', String(k !== i)); s.inert = k !== i; });
    dots.forEach((d, k) => {
      d.classList.toggle('done', k < i);
      d.classList.remove('active'); void d.offsetWidth; // reinicia a animação da barrinha
      d.classList.toggle('active', k === i);
      d.setAttribute('aria-selected', String(k === i));
    });
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    if (restart) schedule();
  };
  const schedule = () => { clearTimeout(timer); if (!paused) timer = setTimeout(() => go(i + 1), interval); };
  const setPaused = (p) => {
    paused = p; root.classList.toggle('paused', p);
    if (p) clearTimeout(timer); else schedule();
  };

  dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
  $('.next', root).addEventListener('click', () => go(i + 1));
  $('.prev', root).addEventListener('click', () => go(i - 1));
  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused; setPaused(userPaused);
    pauseBtn.setAttribute('aria-label', userPaused ? 'Retomar banners' : 'Pausar banners');
    pauseBtn.innerHTML = icon(userPaused ? 'arrowRight' : 'clock');
  });
  if (userPaused) pauseBtn.innerHTML = icon('arrowRight');

  // pausa ao passar o mouse/focar, retoma ao sair
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setPaused(true); });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !userPaused) setPaused(false); });
  root.addEventListener('focusin', () => setPaused(true));
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget) && !userPaused) setPaused(false); });
  document.addEventListener('visibilitychange', () => setPaused(document.hidden || userPaused));

  // teclado
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  });

  // arrastar / swipe
  let x0 = null, y0 = null;
  root.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button')) return; x0 = e.clientX; y0 = e.clientY; });
  root.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
  });

  // parallax leve no visual
  if (!prefersReducedMotion() && matchMedia('(hover: hover)').matches) {
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      const v = $('.slide.active .slide-visual', root);
      if (v) v.style.transform = `translate(${px * -18}px, ${py * -14}px)`;
    });
  }

  root.setAttribute('tabindex', '0');
  if (paused) root.classList.add('paused');
  go(0);
}

const car = $('.carousel');
if (car) carousel(car);

/* ---------------- Produtos em destaque ---------------- */
const grid = $('#featured');
if (grid) {
  grid.innerHTML = Array.from({ length: 4 }, () => '<div class="p-card" style="min-height:380px;opacity:.5"></div>').join('');
  fetchProducts().then((list) => {
    const featured = list.filter((p) => p.featured).slice(0, 4);
    const show = featured.length ? featured : list.slice(0, 4);
    grid.innerHTML = show.length
      ? show.map(productCard).join('')
      : `<div class="empty">${icon('box')}<p>Em breve, novos produtos por aqui!</p></div>`;
    bindGrid(grid, show);
    initReveal(grid);
  });
}
