// Modelos 3D: arquivos STL/3MF. Grátis = link de download (Drive etc.); pagos = link da plataforma de venda.
import { $, esc, safeUrl, fmtPrice, debounce } from '../utils.js';
import { icon } from '../icons.js';
import { getSupabase } from '../supa.js';
import { CONFIG } from '../config.js';
import { modal, initReveal } from '../app.js';
import { catOf } from '../catalog.js';

const grid = $('#grid'), filters = $('#filters'), q = $('#q'), sort = $('#sort');
const params = new URLSearchParams(location.search);
let all = [], kind = ['gratis', 'pagos'].includes(params.get('tipo')) ? params.get('tipo') : 'todos';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const LICENSE = {
  pessoal: { short: 'Uso pessoal', long: 'Uso pessoal: imprima para você ou para presentear. Não é permitido vender as peças impressas.' },
  comercial: { short: 'Venda das peças liberada', long: 'Uso comercial: você pode imprimir e vender as peças impressas.' },
};
const lic = (m) => LICENSE[m.license] || LICENSE.pessoal;
const priceLabel = (m) => (m.is_free ? 'Grátis' : m.price != null ? fmtPrice(m.price) : 'Pago');
const dl = (n) => `${n.toLocaleString('pt-BR')} download${n === 1 ? '' : 's'}`;

async function fetchModels() {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('models3d')
    .select('id,slug,name,description,print_notes,category,image_url,formats,is_free,price,download_url,buy_url,license,badge,downloads,sort_order,created_at')
    .eq('active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) { console.warn(error); return []; }
  return data;
}

/** Link final do botão: grátis abre o download, pago abre a plataforma de venda */
const target = (m) => safeUrl(m.is_free ? m.download_url : m.buy_url);

function countDownload(m) {
  if (!m.is_free) return;
  getSupabase().then((sb) => sb?.rpc('count_model_download', { p_id: m.id })).catch(() => {});
}

function art(m) {
  const img = safeUrl(m.image_url);
  if (img) return `<div class="p-art has-img"><img src="${esc(img)}" alt="${esc(m.name)}" loading="lazy" decoding="async"></div>`;
  return `<div class="p-art p-art-empty" aria-hidden="true"><img class="p-ph" src="assets/img/mark-192.png" alt="" width="192" height="192"><span class="p-ph-label">Imagem em breve</span></div>`;
}
const formatTags = (m) => (m.formats || []).map((f) => `<span class="fmt">${esc(f)}</span>`).join('');

function actionBtn(m, big = false) {
  const href = target(m);
  if (!href) return '';
  const cls = big ? 'btn btn-lg btn-block' : 'btn btn-sm';
  return m.is_free
    ? `<a class="${cls} btn-ink" data-go="${esc(m.slug)}" href="${esc(href)}" target="_blank" rel="noopener">${icon('download')}<span>Baixar grátis</span></a>`
    : `<a class="${cls} btn-ink" data-go="${esc(m.slug)}" href="${esc(href)}" target="_blank" rel="noopener">${icon('cart')}<span>Comprar${big && m.price != null ? ` por ${fmtPrice(m.price)}` : ''}</span></a>`;
}

function card(m) {
  return `
  <article class="p-card m-card" data-slug="${esc(m.slug)}" data-reveal>
    <button class="p-open" aria-label="Ver detalhes de ${esc(m.name)}">
      ${art(m)}
      ${m.badge ? `<span class="p-badge">${esc(m.badge)}</span>` : ''}
      <span class="m-price ${m.is_free ? 'free' : ''}">${esc(priceLabel(m))}</span>
    </button>
    <div class="p-info">
      <div class="m-meta"><span class="p-cat">${esc(catOf(m.category).label)}</span><span class="fmts">${formatTags(m)}</span></div>
      <h3 class="p-name">${esc(m.name)}</h3>
      <p class="m-sub">${esc(lic(m).short)}${m.is_free && m.downloads > 0 ? ` · ${dl(m.downloads)}` : ''}</p>
      <div class="p-actions">${actionBtn(m)}</div>
    </div>
  </article>`;
}

function openModel(m) {
  const notes = (m.print_notes || '').trim();
  const mo = modal(`
    <div class="pm">
      <div class="pm-art">${art(m)}${m.badge ? `<span class="p-badge">${esc(m.badge)}</span>` : ''}</div>
      <div class="pm-info">
        <div class="m-meta"><span class="p-cat">${esc(catOf(m.category).label)}</span><span class="fmts">${formatTags(m)}</span></div>
        <h2 class="pm-title">${esc(m.name)}</h2>
        <p class="pm-price">${esc(priceLabel(m))}</p>
        ${m.description ? `<p class="pm-desc">${esc(m.description)}</p>` : ''}
        ${notes ? `<div class="m-notes"><h3>${icon('sliders')} Como imprimir</h3><p>${esc(notes)}</p></div>` : ''}
        <p class="m-license">${icon('file')}<span>${esc(lic(m).long)} Em qualquer caso, o arquivo não pode ser revendido nem compartilhado.</span></p>
        ${actionBtn(m, true)}
        <p class="pm-hint">${m.is_free
          ? `O download abre em uma nova aba (Google Drive ou outro serviço).${m.downloads > 0 ? ` ${dl(m.downloads)} até agora.` : ''}`
          : 'A compra é feita numa plataforma de pagamento parceira, que entrega o arquivo depois do pagamento. Dúvidas? Fale com a gente pelo WhatsApp.'}</p>
      </div>
    </div>`, { label: m.name, wide: true });
  mo.el.addEventListener('click', (e) => { if (e.target.closest('[data-go]')) countDownload(m); });
  const url = new URL(location.href); url.searchParams.set('m', m.slug); history.replaceState(null, '', url);
  const obs = new MutationObserver(() => {
    if (!document.contains(mo.el)) { const u = new URL(location.href); u.searchParams.delete('m'); history.replaceState(null, '', u); obs.disconnect(); }
  });
  obs.observe(document.body, { childList: true });
}

function renderFilters() {
  const free = all.filter((m) => m.is_free).length;
  const opts = [['todos', 'Todos', all.length], ['gratis', 'Grátis', free], ['pagos', 'Pagos', all.length - free]];
  filters.innerHTML = opts.map(([id, label, n]) =>
    `<button class="filter" data-kind="${id}" aria-pressed="${kind === id}">${esc(label)} <span class="count">${n}</span></button>`).join('');
}

function render() {
  const term = norm(q.value.trim());
  let list = all.filter((m) => (kind === 'todos' || (kind === 'gratis') === m.is_free) &&
    (!term || norm(`${m.name} ${m.description} ${catOf(m.category).label} ${(m.formats || []).join(' ')}`).includes(term)));
  if (sort.value === 'baixados') list = [...list].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  if (sort.value === 'novos') list = [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  if (sort.value === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (!all.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('cube')}<h3>Os primeiros modelos chegam em breve</h3>
      <p class="muted">Siga <a href="${esc(CONFIG.instagramUrl)}" target="_blank" rel="noopener">${esc(CONFIG.instagramHandle)}</a> no Instagram para saber quando sair.</p></div>`;
    return;
  }
  grid.innerHTML = list.length ? list.map(card).join('')
    : `<div class="empty" style="grid-column:1/-1">${icon('search')}<h3>Nada encontrado</h3><p class="muted">Tente outra palavra ou mude o filtro.</p></div>`;
  initReveal(grid);
}

grid.addEventListener('click', (e) => {
  const c = e.target.closest('.m-card'); if (!c) return;
  const m = all.find((x) => x.slug === c.dataset.slug); if (!m) return;
  if (e.target.closest('[data-go]')) { countDownload(m); return; }
  if (e.target.closest('.p-open')) openModel(m);
});
filters.addEventListener('click', (e) => {
  const b = e.target.closest('[data-kind]'); if (!b) return;
  kind = b.dataset.kind;
  filters.querySelectorAll('.filter').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const u = new URL(location.href); kind === 'todos' ? u.searchParams.delete('tipo') : u.searchParams.set('tipo', kind); history.replaceState(null, '', u);
  render();
});
q.addEventListener('input', debounce(render, 150));
sort.addEventListener('change', render);

grid.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton"></div>').join('');
fetchModels().then((list) => {
  all = list;
  if (all.length) renderFilters(); else filters.closest('.toolbar').hidden = true;
  render();
  const slug = params.get('m');
  const m = slug && all.find((x) => x.slug === slug);
  if (m) openModel(m);
});
