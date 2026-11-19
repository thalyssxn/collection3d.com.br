import { $, $$, esc, safeUrl, prefersReducedMotion } from '../utils.js';
import { icon } from '../icons.js';
import { getSupabase } from '../supa.js';
import { fetchProducts, productCard, bindGrid } from '../catalog.js';

/* ---------------- Banners do painel (se houver) ---------------- */
const THEME = { claro: 's-cream', verde: 's-lime', escuro: 's-tiktok', areia: 's-sand' };
const safeLink = (u) => (/^[\w-]+\.html([?#][\w=&%.-]*)?$/.test(u || '') ? u : safeUrl(u));

async function loadBanners(root) {
  try {
    const sb = await getSupabase(); if (!sb) return;
    const { data, error } = await sb.from('site_banners').select('*').eq('active', true).order('sort_order').order('created_at');
    if (error || !data?.length) return;
    $('.slides', root).innerHTML = data.map((b, i) => {
      const img = safeUrl(b.image_url), link = safeLink(b.button_link);
      const ext = /^https:/.test(link) ? ' target="_blank" rel="noopener"' : '';
      const H = i === 0 ? 'h1' : 'h2';
      return `<article class="slide ${THEME[b.theme] || 's-cream'}${i === 0 ? ' active' : ''}" aria-roledescription="slide" aria-label="${i + 1} de ${data.length}">
        <div class="slide-copy">
          <${H}>${esc(b.title)}</${H}>
          ${b.subtitle ? `<p>${esc(b.subtitle)}</p>` : ''}
          ${b.button_text && link ? `<div class="slide-ctas"><a class="btn ${b.theme === 'escuro' ? 'btn-light' : 'btn-ink'} btn-lg" href="${esc(link)}"${ext}>${esc(b.button_text)}</a></div>` : ''}
        </div>
        <div class="slide-visual${img ? ' has-photo' : ''}">${img ? `<img src="${esc(img)}" alt="" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>` : '<div class="v-mark"><img src="assets/img/mark-c3d-512.png" alt="" width="512" height="512"></div>'}</div>
      </article>`;
    }).join('');
  } catch (e) { console.warn(e); }
}

/* ---------------- Carrossel ---------------- */
function carousel(root, { interval = 6500 } = {}) {
  const slides = $$('.slide', root);
  const dotsWrap = $('.dots', root);
  const count = $('.slide-count', root);
  const pauseBtn = $('.pause', root);
  let i = 0, timer = null, userPaused = prefersReducedMotion(), paused = userPaused;
  root.style.setProperty('--dur', `${interval}ms`);
  if (slides.length < 2) { $('.carousel-ui', root).hidden = true; return; }

  dotsWrap.innerHTML = slides.map((s, n) => `<button class="dot" role="tab" aria-label="Banner ${n + 1}" aria-selected="${n === 0}"><span></span></button>`).join('');
  const dots = $$('.dot', dotsWrap);

  const go = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle('active', k === i); s.setAttribute('aria-hidden', String(k !== i)); s.inert = k !== i; });
    dots.forEach((d, k) => {
      d.classList.toggle('done', k < i);
      d.classList.remove('active'); void d.offsetWidth;
      d.classList.toggle('active', k === i);
      d.setAttribute('aria-selected', String(k === i));
    });
    root.classList.toggle('on-dark', slides[i].classList.contains('s-tiktok'));
    count.textContent = `${i + 1} / ${slides.length}`;
    schedule();
  };
  const schedule = () => { clearTimeout(timer); if (!paused) timer = setTimeout(() => go(i + 1), interval); };
  const setPaused = (p) => { paused = p; root.classList.toggle('paused', p); p ? clearTimeout(timer) : schedule(); };
  const syncPauseBtn = () => {
    pauseBtn.innerHTML = icon(userPaused ? 'play' : 'pause');
    pauseBtn.setAttribute('aria-label', userPaused ? 'Retomar banners' : 'Pausar banners');
  };

  dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
  $('.next', root).addEventListener('click', () => go(i + 1));
  $('.prev', root).addEventListener('click', () => go(i - 1));
  pauseBtn.addEventListener('click', () => { userPaused = !userPaused; setPaused(userPaused); syncPauseBtn(); });
  syncPauseBtn();

  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setPaused(true); });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !userPaused) setPaused(false); });
  root.addEventListener('focusin', () => setPaused(true));
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget) && !userPaused) setPaused(false); });
  document.addEventListener('visibilitychange', () => setPaused(document.hidden || userPaused));
  root.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); });

  let x0 = null, y0 = null;
  root.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button')) return; x0 = e.clientX; y0 = e.clientY; });
  root.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
  });

  root.setAttribute('tabindex', '0');
  if (paused) root.classList.add('paused');
  go(0);
}

const car = $('.carousel');
if (car) loadBanners(car).then(() => carousel(car));

/* ---------------- Destaques ---------------- */
const grid = $('#featured');
if (grid) {
  grid.innerHTML = Array.from({ length: 4 }, () => '<div class="skeleton"></div>').join('');
  fetchProducts().then((list) => {
    const featured = list.filter((p) => p.featured).slice(0, 4);
    const show = featured.length ? featured : list.slice(0, 4);
    grid.innerHTML = show.length ? show.map(productCard).join('')
      : `<div class="empty" style="grid-column:1/-1">${icon('box')}<p>Os primeiros produtos aparecem aqui em breve.</p></div>`;
    bindGrid(grid, show);
  });
}
