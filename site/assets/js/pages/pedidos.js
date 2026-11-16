import { $, esc, fmtDate, waLink } from '../utils.js';
import { icon } from '../icons.js';
import { onAuth } from '../auth-store.js';
import { getSupabase } from '../supa.js';
import { isSupabaseConfigured } from '../config.js';
import { STATUS } from '../status.js';


const box = $('#my-orders');

onAuth(async (a) => {
  if (!a.user) {
    box.innerHTML = `
      <h2>${icon('box')} Meus pedidos</h2>
      <p class="muted">Entre na sua conta para ver o histórico dos pedidos feitos pelo site.</p>
      ${isSupabaseConfigured() ? '' : '<p class="notice notice-warn">' + icon('info') + ' Modo prévia: o login funciona depois de conectar o banco de dados.</p>'}
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn btn-ink" href="entrar.html?next=pedidos.html">${icon('login')} Entrar</a>
        <a class="btn" href="produtos.html">${icon('box')} Ver produtos</a>
      </div>`;
    return;
  }
  const sb = await getSupabase();
  const { data, error } = await sb.from('interest_requests')
    .select('code, product_name, quantity, status, created_at, updated_at').order('created_at', { ascending: false }).limit(100);
  if (error) { box.innerHTML = `<h2>${icon('box')} Meus pedidos</h2><p class="muted">Não foi possível carregar agora. Tente de novo em instantes.</p>`; return; }
  box.innerHTML = `
    <h2>${icon('box')} Meus pedidos <span class="chip">${data.length}</span></h2>
    ${data.length ? `<div class="orders">${data.map((o) => `
      <div class="order">
        <span class="order-code">#${esc(o.code)}</span>
        <div><h3>${esc(o.product_name)}${o.quantity > 1 ? ` <small>× ${o.quantity}</small>` : ''}</h3><small>${fmtDate(o.created_at)}</small></div>
        <div style="display:grid;gap:6px;justify-items:end">
          <span class="status st-${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span>
          <a class="link-btn" style="font-size:.82rem;font-weight:700" target="_blank" rel="noopener" href="${esc(waLink(`Olá! Quero falar sobre o pedido #${o.code} (${o.product_name}).`))}">Falar sobre este pedido</a>
        </div>
      </div>`).join('')}</div>`
    : `<div class="empty">${icon('box')}<p>Você ainda não fez pedidos pelo site.</p><a class="btn btn-ink" href="produtos.html">Ver produtos</a></div>`}`;
});
