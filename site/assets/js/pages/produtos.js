import { $, esc, debounce } from '../utils.js';
import { icon } from '../icons.js';
import { fetchProducts, productCard, bindGrid, openProduct, catOf } from '../catalog.js';
import { initReveal, initTilt } from '../app.js';

const grid = $('#grid'), filters = $('#filters'), q = $('#q'), sort = $('#sort');
let all = [], cat = new URLSearchParams(location.search).get('cat') || 'todos';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function renderFilters() {
  const counts = all.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {});
  const cats = Object.keys(counts);
  filters.innerHTML = [
    `<button class="filter" data-cat="todos" aria-pressed="${cat === 'todos'}">${icon('sparkles')} Todos <span class="count">${all.length}</span></button>`,
    ...cats.map((c) => { const k = catOf(c); return `<button class="filter" data-cat="${esc(c)}" aria-pressed="${cat === c}">${icon(k.ic)} ${esc(k.label)} <span class="count">${counts[c]}</span></button>`; }),
  ].join('');
}

function render() {
  const term = norm(q.value.trim());
  let list = all.filter((p) => (cat === 'todos' || p.category === cat) &&
    (!term || norm(`${p.name} ${p.description} ${catOf(p.category).label}`).includes(term)));
  if (sort.value === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (sort.value === 'novos') list = [...list].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  grid.innerHTML = list.length ? list.map(productCard).join('')
    : `<div class="empty" style="grid-column:1/-1">${icon('search')}<h3>Nada encontrado</h3><p class="muted">Tente outra palavra ou fale com a gente no WhatsApp — talvez a gente faça!</p></div>`;
  bindGrid(grid, list);
  initReveal(grid); initTilt(grid);
}

filters.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  cat = b.dataset.cat;
  filters.querySelectorAll('.filter').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const u = new URL(location.href); cat === 'todos' ? u.searchParams.delete('cat') : u.searchParams.set('cat', cat); history.replaceState(null, '', u);
  render();
});
q.addEventListener('input', debounce(render, 150));
sort.addEventListener('change', render);

grid.innerHTML = Array.from({ length: 8 }, () => '<div class="p-card" style="min-height:380px;opacity:.5"></div>').join('');
fetchProducts().then((list) => {
  all = list;
  if (cat !== 'todos' && !all.some((p) => p.category === cat)) cat = 'todos';
  renderFilters(); render();
  const slug = new URLSearchParams(location.search).get('p');
  const p = slug && all.find((x) => x.slug === slug);
  if (p) openProduct(p);
});
