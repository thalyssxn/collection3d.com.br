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
  gamer: { label: 'Gamer', ic: 'bolt', hue: 'violet' },
  casa: { label: 'Casa', ic: 'home', hue: 'sand' },
  natal: { label: 'Natal', ic: 'gift', hue: 'berry' },
  outros: { label: 'Outros', ic: 'box', hue: 'sand' },
};
export const catOf = (c) => CATEGORIES[c] || { label: c ? c[0].toUpperCase() + c.slice(1) : 'Outros', ic: 'box', hue: 'sand' };

// Lista de exemplo — usada enquanto o banco não está conectado.
export const SAMPLE_PRODUCTS = [
  { slug: 'chaveiro-arrogante', name: 'Chaveiro Arrogante', description: 'Collab oficial com @helton.neygaucho. Acabamento fosco, argola de metal e detalhes caprichados.', category: 'chaveiros', badge: 'Collab', featured: true },
  { slug: 'miniatura-neygaucho', name: 'Miniatura NeyGaucho "a mi no"', description: 'Busto colecionável com balão de fala. Collab oficial com @helton.neygaucho.', category: 'miniaturas', badge: 'Collab', featured: true },
  { slug: 'chaveiro-bob', name: 'Chaveiro Bob', description: 'O cachorro mais famoso dos memes, agora no seu chaveiro.', category: 'chaveiros', badge: 'Novo', featured: true },
  { slug: 'karambit-replica', name: 'Karambit Réplica Gamer', description: 'Réplica decorativa em tamanho real, leve e sem corte. Peça de coleção para o seu setup.', category: 'gamer', badge: 'Mais vendido', featured: true },
  { slug: 'spinner-gamer', name: 'Spinner de Dedo Gamer', description: 'Spinner com design inspirado em games. Gira liso e silencioso.', category: 'gamer' },
  { slug: 'suporte-celular-parede', name: 'Suporte de Celular de Parede', description: 'Adesivo, sem furos. Deixa o celular carregando com segurança perto da tomada.', category: 'casa', featured: true },
  { slug: 'suporte-controle-remoto', name: 'Suporte Universal de Controle Remoto', description: 'Para controles de TV e ar-condicionado. Acompanha fita dupla face (também pode ser parafusado).', category: 'casa' },
  { slug: 'enfeite-natal-urso', name: 'Enfeite de Natal Urso Polar', description: 'Urso polar com gorro e textura de crochê, ~6,5 cm. Perfeito para a árvore.', category: 'natal', badge: 'Natal' },
  { slug: 'enfeite-natal-rena', name: 'Enfeite de Natal Rena', description: 'Rena com textura de crochê, ~6,5 cm. Combina com o urso polar.', category: 'natal', badge: 'Natal' },
].map((p, i) => ({ id: null, price: null, image_url: null, shopee_url: null, tiktok_url: null, badge: null, featured: false, sort_order: i + 1, ...p }));

let cache = null;
export async function fetchProducts() {
  if (cache) return cache;
  const sb = await getSupabase();
  if (!sb) return (cache = SAMPLE_PRODUCTS);
  const { data, error } = await sb.from('products').select('*').eq('active', true)
    .order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) { console.warn(error); return (cache = SAMPLE_PRODUCTS); }
  return (cache = data);
}

/** Arte de capa: foto do produto ou ilustração com "camadas" na cor da categoria */
export function productArt(p, size = 'card') {
  const img = safeUrl(p.image_url);
  const c = catOf(p.category);
  if (img) return `<div class="p-art has-img"><img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" decoding="async"></div>`;
  return `<div class="p-art hue-${c.hue} ${size === 'big' ? 'p-art-big' : ''}" aria-hidden="true">
    <span class="p-art-layers"></span>
    <span class="p-art-token">${icon(c.ic)}</span>
    <span class="p-art-name">${esc(p.name.split(' ').slice(0, 2).join(' '))}</span>
  </div>`;
}

export function productCard(p) {
  const c = catOf(p.category);
  return `
  <article class="p-card" data-reveal data-tilt="6" data-slug="${esc(p.slug)}">
    <button class="p-open" aria-label="Ver detalhes de ${esc(p.name)}">
      ${productArt(p)}
      ${p.badge ? `<span class="p-badge">${esc(p.badge)}</span>` : ''}
    </button>
    <div class="p-info">
      <span class="p-cat">${icon(c.ic)} ${esc(c.label)}</span>
      <h3 class="p-name">${esc(p.name)}</h3>
      ${p.price != null ? `<p class="p-price">${fmtPrice(p.price)}</p>` : `<p class="p-price p-price-ask">Consulte o valor</p>`}
      <div class="p-actions">
        <a class="btn btn-wa btn-sm" data-buy="${esc(p.slug)}" href="${esc(waLink(buyMessage(p, 1)))}" target="_blank" rel="noopener">${icon('whatsapp')}<span>Adquirir</span></a>
        <button class="btn btn-ghost btn-sm p-more" aria-label="Detalhes de ${esc(p.name)}">${icon('eye')}<span>Detalhes</span></button>
      </div>
    </div>
  </article>`;
}

export function buyMessage(p, qty = 1, code = null) {
  return [
    'Olá, Collection 3D! 🐢',
    `Tenho interesse em: *${p.name}*${qty > 1 ? ` (quantidade: ${qty})` : ''}`,
    code ? `Código do pedido: #${code}` : null,
    'Vi no site collection3d.com.br',
  ].filter(Boolean).join('\n');
}

/** Clique em "Adquirir": gera código, registra em "Meus pedidos" (se logado) e abre o WhatsApp */
export function prepareBuy(anchor, p, qty = 1) {
  const logged = !!auth.user;
  const code = logged ? randomCode() : null;
  anchor.href = waLink(buyMessage(p, qty, code)); // atualiza antes da navegação padrão
  if (!logged) return;
  getSupabase().then(async (sb) => {
    if (!sb) return;
    const { error } = await sb.from('interest_requests').insert({
      code, user_id: auth.user.id, product_id: p.id || null, product_name: p.name.slice(0, 160), quantity: qty,
    });
    if (error) console.warn(error);
    else toast(`Pedido #${code} registrado em Meus pedidos. Finalize no WhatsApp!`);
  });
}

export function openProduct(p) {
  const c = catOf(p.category);
  const shopee = safeUrl(p.shopee_url), tiktok = safeUrl(p.tiktok_url);
  const m = modal(`
    <div class="pm">
      <div class="pm-art">${productArt(p, 'big')}${p.badge ? `<span class="p-badge">${esc(p.badge)}</span>` : ''}</div>
      <div class="pm-info">
        <span class="p-cat">${icon(c.ic)} ${esc(c.label)}</span>
        <h2 class="pm-title">${esc(p.name)}</h2>
        ${p.price != null ? `<p class="pm-price">${fmtPrice(p.price)}</p>` : `<p class="pm-price p-price-ask">Valor sob consulta no WhatsApp</p>`}
        <p class="pm-desc">${esc(p.description || '')}</p>
        <div class="qty" role="group" aria-label="Quantidade">
          <button type="button" class="icon-btn" data-q="-1" aria-label="Diminuir">−</button>
          <input type="number" min="1" max="999" value="1" aria-label="Quantidade" class="qty-input">
          <button type="button" class="icon-btn" data-q="1" aria-label="Aumentar">+</button>
        </div>
        <a class="btn btn-wa btn-lg btn-block pm-buy" href="#" target="_blank" rel="noopener">${icon('whatsapp')} Adquirir pelo WhatsApp</a>
        <p class="pm-hint">${auth.user ? 'O pedido fica salvo em <a href="pedidos.html">Meus pedidos</a>.' : '<a href="entrar.html">Entre na sua conta</a> para acompanhar seus pedidos — ou peça direto, sem cadastro.'}</p>
        <div class="pm-alt">
          <span>Também disponível em:</span>
          <a class="channel-pill brand-shopee" href="${esc(shopee || CONFIG.shopeeUrl)}" target="_blank" rel="noopener">${icon('shopee')} Shopee</a>
          <a class="channel-pill brand-tiktok" href="${esc(tiktok || CONFIG.tiktokUrl)}" target="_blank" rel="noopener">${icon('tiktok')} TikTok Shop</a>
        </div>
      </div>
    </div>`, { label: p.name, wide: true });
  const input = $('.qty-input', m.el);
  const buy = $('.pm-buy', m.el);
  const q = () => Math.max(1, Math.min(999, parseInt(input.value, 10) || 1));
  const sync = () => { buy.href = waLink(buyMessage(p, q())); };
  sync();
  input.addEventListener('input', sync);
  m.el.addEventListener('click', (e) => {
    const d = e.target.closest('[data-q]')?.dataset.q;
    if (d) { input.value = q() + Number(d); input.value = q(); sync(); }
  });
  buy.addEventListener('click', () => prepareBuy(buy, p, q()));
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
      if (e.target.closest('.p-open, .p-more')) openProduct(p);
    });
  }
  initTilt(grid);
}
