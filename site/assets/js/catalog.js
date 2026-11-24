// Catálogo: busca produtos (Supabase ou lista de exemplo), desenha cards e o botão "Adquirir".
import { CONFIG } from './config.js';
import { icon } from './icons.js';
import { esc, safeUrl, waLink, randomCode, fmtPrice, toast, $ } from './utils.js';
import { getSupabase } from './supa.js';
import { auth } from './auth-store.js';
import { modal, initTilt } from './app.js';

export const CATEGORIES = {
  chaveiros: { label: 'Chaveiros', ic: 'key', hue: 'lime' },
  miniaturas: { label: 'Miniaturas', ic: 'cube', hue: 'teal' },
  gamer: { label: 'Gamer e setup', ic: 'bolt', hue: 'violet' },
  casa: { label: 'Casa', ic: 'home', hue: 'sand' },
  natal: { label: 'Natal', ic: 'gift', hue: 'berry' },
  brinquedos: { label: 'Jogos e brinquedos', ic: 'puzzle', hue: 'teal' },
  outros: { label: 'Outros', ic: 'box', hue: 'sand' },
};
export const catOf = (c) => CATEGORIES[c] || { label: c ? c[0].toUpperCase() + c.slice(1) : 'Outros', ic: 'box', hue: 'sand' };

// Lista reserva (cópia dos anúncios): só aparece se o banco estiver fora do ar.
async function fallback() {
  try { return (await import('./produtos-data.js')).PRODUCTS; } catch { return []; }
}

let cache = null;
export async function fetchProducts() {
  if (cache) return cache;
  const sb = await getSupabase();
  if (!sb) return (cache = await fallback());
  const { data, error } = await sb.from('products').select('*').eq('active', true)
    .order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) { console.warn(error); return (cache = await fallback()); }
  return (cache = data);
}

/** Variações do produto (cor, modelo, kit...) — ou null se tiver uma opção só */
export function optionsOf(p) {
  const v = p && p.variations;
  if (!v || !Array.isArray(v.opcoes) || v.opcoes.length < 2) return null;
  const opcoes = v.opcoes.filter((o) => o && typeof o.nome === 'string' && Number(o.preco) >= 0);
  if (opcoes.length < 2) return null;
  const grupos = Array.isArray(v.grupos) && v.grupos.length ? v.grupos.map(String) : ['Opção'];
  const vals = (o) => (Array.isArray(o.valores) && o.valores.length === grupos.length ? o.valores.map(String) : grupos.length === 1 ? [o.nome] : o.nome.split(' / '));
  return { grupos, opcoes: opcoes.map((o) => ({ ...o, preco: Number(o.preco), valores: vals(o) })) };
}

/** "R$ 24,90" ou "a partir de R$ 24,90" quando há opções com preços diferentes */
export function priceText(p) {
  if (p.price == null) return null;
  const from = p.price_max != null && Number(p.price_max) > Number(p.price);
  return { from, value: fmtPrice(Number(p.price)) };
}

/** Capa do produto: foto, ou um espaço neutro com a marca enquanto a foto não chega */
export function productArt(p) {
  const img = safeUrl(p.image_url);
  if (img) return `<div class="p-art has-img"><img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" decoding="async"></div>`;
  return `<div class="p-art p-art-empty" aria-hidden="true"><img class="p-ph" src="assets/img/mark-c3d-192.png" alt="" width="192" height="192"><span class="p-ph-label">Foto em breve</span></div>`;
}

export function productCard(p) {
  const c = catOf(p.category), pt = priceText(p);
  return `
  <article class="p-card" data-slug="${esc(p.slug)}">
    <button class="p-open" aria-label="Ver detalhes de ${esc(p.name)}">
      ${productArt(p)}
      ${p.badge ? `<span class="p-badge">${esc(p.badge)}</span>` : ''}
    </button>
    <div class="p-info">
      <span class="p-cat">${esc(c.label)}</span>
      <h3 class="p-name">${esc(p.name)}</h3>
      ${pt ? `<p class="p-price">${pt.from ? '<small>a partir de</small> ' : ''}${pt.value}</p>` : `<p class="p-price p-price-ask">Preço sob consulta</p>`}
      <div class="p-actions">
        ${optionsOf(p)
          ? `<button type="button" class="btn btn-sm p-pick">${icon('sliders')}<span>Ver opções</span></button>`
          : `<a class="btn btn-sm" data-buy="${esc(p.slug)}" href="${esc(waLink(buyMessage(p, 1)))}" target="_blank" rel="noopener">${icon('whatsapp')}<span>Adquirir</span></a>`}
      </div>
    </div>
  </article>`;
}

export function buyMessage(p, qty = 1, code = null, opt = null) {
  const pt = priceText(p);
  const unit = opt ? fmtPrice(opt.preco) : pt && !pt.from ? pt.value : null;
  return [
    'Olá, Collection 3D!',
    `Tenho interesse em: *${p.name}*`,
    opt ? `Opção: *${opt.nome}*` : null,
    qty > 1 ? `Quantidade: ${qty}` : null,
    unit ? `Valor no site: ${unit}${qty > 1 ? ' cada' : ''}` : null,
    code ? `Código do pedido: #${code}` : null,
    'Vi no site collection3d.com.br',
  ].filter(Boolean).join('\n');
}

/** Clique em "Adquirir": gera código, registra em "Meus pedidos" (se logado) e abre o WhatsApp */
export function prepareBuy(anchor, p, qty = 1, opt = null) {
  const logged = !!auth.user;
  const code = logged ? randomCode() : null;
  anchor.href = waLink(buyMessage(p, qty, code, opt)); // atualiza antes da navegação padrão
  if (!logged) return;
  getSupabase().then(async (sb) => {
    if (!sb) return;
    const { error } = await sb.from('interest_requests').insert({
      code, user_id: auth.user.id, product_id: p.id || null, product_name: (opt ? `${p.name} — ${opt.nome}` : p.name).slice(0, 160), quantity: qty,
    });
    if (error) console.warn(error);
    else toast(`Pedido #${code} registrado em Meus pedidos. Finalize a compra no WhatsApp.`);
  });
}

/** Descrição com títulos (## ...) e listas (• ...) */
export function descHtml(text) {
  const out = []; let list = null;
  const flush = () => { if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; } };
  for (const raw of String(text || '').split('\n')) {
    const l = raw.trim();
    if (/^[•\-]\s+/.test(l)) { (list = list || []).push(`<li>${esc(l.replace(/^[•\-]\s+/, ''))}</li>`); continue; }
    flush();
    if (!l) continue;
    out.push(l.startsWith('## ') ? `<h3>${esc(l.slice(3))}</h3>` : `<p>${esc(l)}</p>`);
  }
  flush();
  return out.join('');
}

export function openProduct(p) {
  const c = catOf(p.category);
  const shopee = safeUrl(p.shopee_url), tiktok = safeUrl(p.tiktok_url);
  const photos = [...new Set((Array.isArray(p.images) && p.images.length ? p.images : [p.image_url]).map(safeUrl).filter(Boolean))];
  const O = optionsOf(p);
  let cur = O ? (O.opcoes.find((o) => !o.esgotado) || O.opcoes[0]) : null;
  const pt = priceText(p);

  const gallery = photos.length ? `
      <div class="pm-gal">
        <div class="pm-stage" tabindex="0" role="group" aria-roledescription="galeria" aria-label="Fotos de ${esc(p.name)} — use as setas para trocar">
          <img class="pm-main" src="${esc(photos[0])}" alt="${esc(p.name)}" decoding="async">
          ${p.badge ? `<span class="p-badge">${esc(p.badge)}</span>` : ''}
          ${photos.length > 1 ? `
          <button type="button" class="pm-nav pm-prev" aria-label="Foto anterior">${icon('chevronLeft')}</button>
          <button type="button" class="pm-nav pm-next" aria-label="Próxima foto">${icon('chevronRight')}</button>
          <span class="pm-count" aria-live="polite">1 / ${photos.length}</span>` : ''}
        </div>
        ${photos.length > 1 ? `<div class="pm-thumbs">${photos.map((u, i) => `<button type="button" class="pm-thumb" data-i="${i}" aria-label="Foto ${i + 1}" aria-pressed="${i === 0}"><img src="${esc(u)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>` : ''}
      </div>`
    : `<div class="pm-art">${productArt(p)}${p.badge ? `<span class="p-badge">${esc(p.badge)}</span>` : ''}</div>`;

  const opts = O ? `<div class="pm-opts">${O.grupos.map((g, gi) => {
    const values = [...new Set(O.opcoes.map((o) => o.valores[gi]))];
    return `<fieldset class="opt-group" data-g="${gi}"><legend>${esc(g)}: <b class="opt-cur"></b></legend><div class="opt-chips">${
      values.map((v) => `<button type="button" class="opt" data-g="${gi}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div></fieldset>`;
  }).join('')}</div>` : '';

  const m = modal(`
    <div class="pm">
      ${gallery}
      <div class="pm-info">
        <span class="p-cat">${esc(c.label)}</span>
        <h2 class="pm-title">${esc(p.name)}</h2>
        <p class="pm-price">${pt ? (pt.from && !O ? `<small>a partir de</small> ${pt.value}` : pt.value) : '<span class="p-price-ask">Preço sob consulta pelo WhatsApp</span>'}</p>
        ${opts}
        <div class="qty" role="group" aria-label="Quantidade">
          <button type="button" class="icon-btn" data-q="-1" aria-label="Diminuir">−</button>
          <input type="number" min="1" max="999" value="1" aria-label="Quantidade" class="qty-input">
          <button type="button" class="icon-btn" data-q="1" aria-label="Aumentar">+</button>
        </div>
        <a class="btn btn-wa btn-lg btn-block pm-buy" href="#" target="_blank" rel="noopener">${icon('whatsapp')} Adquirir pelo WhatsApp</a>
        <p class="pm-hint">${auth.user ? 'O pedido fica salvo em <a href="pedidos.html">Meus pedidos</a>.' : '<a href="entrar.html">Entre na sua conta</a> para acompanhar seus pedidos — ou peça direto, sem cadastro.'}</p>
        <div class="pm-alt">
          <span>Também disponível em:</span>
          <a class="channel-pill brand-tiktok" href="${esc(tiktok || CONFIG.tiktokUrl)}" target="_blank" rel="noopener">${icon('tiktok')} TikTok Shop</a>
          <a class="channel-pill brand-shopee" href="${esc(shopee || CONFIG.shopeeUrl)}" target="_blank" rel="noopener">${icon('shopee')} Shopee</a>
        </div>
        ${p.description ? `<div class="pm-desc"><h3 class="pm-desc-title">Sobre o produto</h3>${descHtml(p.description)}</div>` : ''}
      </div>
    </div>`, { label: p.name, wide: true });
  const el = m.el;
  const input = $('.qty-input', el);
  const buy = $('.pm-buy', el);
  const q = () => Math.max(1, Math.min(999, parseInt(input.value, 10) || 1));
  const sync = () => { buy.href = waLink(buyMessage(p, q(), null, cur)); };

  // ---- galeria
  const main = $('.pm-main', el);
  let idx = 0;
  const show = (i) => {
    if (!main || !photos.length) return;
    idx = (i + photos.length) % photos.length;
    main.src = photos[idx];
    el.querySelectorAll('.pm-thumb').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === idx)));
    const cnt = $('.pm-count', el); if (cnt) cnt.textContent = `${idx + 1} / ${photos.length}`;
    el.querySelector(`.pm-thumb[data-i="${idx}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  const showUrl = (u) => {                 // foto da opção escolhida
    const i = photos.indexOf(u);
    if (i >= 0) return show(i);
    if (!main || !u) return;
    main.src = u;
    el.querySelectorAll('.pm-thumb').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    const cnt = $('.pm-count', el); if (cnt) cnt.textContent = cur ? cur.nome : '';
  };
  const stage = $('.pm-stage', el);
  if (stage) {
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    });
    let x0 = null;
    stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    stage.addEventListener('pointerup', (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 40) show(idx + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  }

  // ---- opções (cor, modelo, kit...)
  const paint = () => {
    if (!O) return;
    $('.pm-price', el).textContent = fmtPrice(cur.preco);
    el.querySelectorAll('.opt-group').forEach((fs) => {
      const gi = Number(fs.dataset.g);
      $('.opt-cur', fs).textContent = cur.valores[gi];
      fs.querySelectorAll('.opt').forEach((b) => {
        const v = b.dataset.v;
        const any = O.opcoes.some((o) => !o.esgotado && o.valores[gi] === v);
        const fits = O.opcoes.some((o) => !o.esgotado && o.valores[gi] === v && o.valores.every((y, i) => i === gi || y === cur.valores[i]));
        b.setAttribute('aria-pressed', String(cur.valores[gi] === v));
        b.disabled = !any;
        b.classList.toggle('is-off', any && !fits);
        b.title = !any ? 'Esgotado' : '';
        b.setAttribute('aria-label', !any ? `${v} (esgotado)` : v);
      });
    });
  };
  const pick = (gi, v) => {
    const want = cur.valores.slice(); want[gi] = v;
    const ok = O.opcoes.filter((o) => !o.esgotado && o.valores[gi] === v);
    const score = (o) => o.valores.reduce((n, y, i) => n + (y === want[i]), 0);
    const best = ok.sort((a, b) => score(b) - score(a))[0];
    if (!best) return;
    cur = best; paint(); sync();
    if (cur.imagem && safeUrl(cur.imagem)) showUrl(safeUrl(cur.imagem));
  };

  el.addEventListener('click', (e) => {
    const d = e.target.closest('[data-q]')?.dataset.q;
    if (d) { input.value = q() + Number(d); input.value = q(); sync(); return; }
    const t = e.target.closest('.pm-thumb'); if (t) return show(Number(t.dataset.i));
    if (e.target.closest('.pm-prev')) return show(idx - 1);
    if (e.target.closest('.pm-next')) return show(idx + 1);
    const o = e.target.closest('.opt'); if (o && !o.disabled) pick(Number(o.dataset.g), o.dataset.v);
  });
  input.addEventListener('input', sync);
  buy.addEventListener('click', () => prepareBuy(buy, p, q(), cur));
  paint(); sync();

  const url = new URL(location.href); url.searchParams.set('p', p.slug); history.replaceState(null, '', url);
  const obs = new MutationObserver(() => { if (!document.contains(m.el)) { const u = new URL(location.href); u.searchParams.delete('p'); history.replaceState(null, '', u); obs.disconnect(); } });
  obs.observe(document.body, { childList: true });
}

/** Liga os eventos de uma grade de produtos (o listener é criado uma só vez por grade) */
export function bindGrid(grid, list) {
  grid._bySlug = Object.fromEntries(list.map((p) => [p.slug, p]));
  if (!grid._bound) {
    grid._bound = true;
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.p-card'); if (!card) return;
      const p = grid._bySlug[card.dataset.slug]; if (!p) return;
      const buy = e.target.closest('[data-buy]');
      if (buy) { prepareBuy(buy, p, 1); return; }
      if (e.target.closest('.p-open, .p-more, .p-pick')) openProduct(p);
    });
  }
  initTilt(grid);
}
