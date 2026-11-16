// Painel admin: cadastros, pedidos, produtos, lista da calculadora, LGPD e consentimentos.
import { $, $$, esc, fmtDate, fmtPrice, safeUrl, toast, withLoading, downloadFile, toCSV, debounce } from '../utils.js';
import { icon } from '../icons.js';
import { isSupabaseConfigured } from '../config.js';
import { getSupabase } from '../supa.js';
import { onAuth } from '../auth-store.js';
import { modal } from '../app.js';
import { productArt, catOf, CATEGORIES } from '../catalog.js';
import { STATUS, waPhone } from '../status.js';

const root = $('#admin-root');
let sb, started = false;
let tab = (location.hash || '#geral').slice(1);
const cache = {};

const TABS = [
  { id: 'geral', label: 'Visão geral', ic: 'chart' },
  { id: 'cadastros', label: 'Cadastros', ic: 'users' },
  { id: 'pedidos', label: 'Pedidos', ic: 'list' },
  { id: 'produtos', label: 'Produtos', ic: 'box' },
  { id: 'lista', label: 'Lista calculadora', ic: 'calc' },
  { id: 'lgpd', label: 'Solicitações LGPD', ic: 'shield' },
  { id: 'consentimentos', label: 'Consentimentos', ic: 'file' },
];
const PROV = { email: 'E-mail', google: 'Google', apple: 'Apple' };
const REQ = { acesso: 'Acesso', correcao: 'Correção', exclusao: 'Exclusão', portabilidade: 'Portabilidade', revogacao_consentimento: 'Revogação', informacao: 'Informação', outro: 'Outro' };
const REQ_ST = { aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', recusada: 'Recusada' };

onAuth(async (a) => {
  if (started || !a.ready) return;
  if (!isSupabaseConfigured()) { root.innerHTML = `<div class="card" style="margin-top:30px"><p class="notice notice-warn">${icon('info')}<span><strong>Modo prévia:</strong> conecte o Supabase em <code>config.js</code> para usar o painel.</span></p></div>`; return; }
  if (!a.user) { location.replace('entrar.html?next=admin.html'); return; }
  if (!a.admin) {
    root.innerHTML = `<div class="card" style="margin-top:30px"><h2>${icon('lock')} Acesso restrito</h2><p class="muted">Esta área é só para administradores. Para se tornar admin, rode o comando do final do <code>schema.sql</code> no Supabase.</p><a class="btn btn-ink" href="index.html">Voltar ao site</a></div>`;
    return;
  }
  started = true;
  sb = await getSupabase();
  root.innerHTML = `
    <div class="admin-wrap">
      <nav class="side-nav" role="tablist" aria-label="Seções do painel">
        ${TABS.map((t) => `<button role="tab" data-t="${t.id}">${icon(t.ic)} ${t.label}<span class="badge" data-badge="${t.id}" hidden></span></button>`).join('')}
        <a href="index.html">${icon('home')} Ver site</a>
      </nav>
      <div id="panel"></div>
    </div>`;
  $('.side-nav').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); });
  addEventListener('hashchange', () => go(location.hash.slice(1), false));
  go(tab, false);
  badges();
});

async function badges() {
  const { data } = await sb.rpc('admin_stats');
  if (!data) return;
  const set = (id, n) => { const b = $(`[data-badge=${id}]`); if (b && n) { b.hidden = false; b.textContent = n; } };
  set('pedidos', data.pedidos_novos); set('lgpd', data.lgpd_abertas);
}

function go(t, push = true) {
  tab = TABS.some((x) => x.id === t) ? t : 'geral';
  if (push) history.replaceState(null, '', '#' + tab);
  $$('.side-nav [data-t]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === tab)));
  const panel = $('#panel');
  panel.innerHTML = `<div class="card"><p class="muted">Carregando…</p></div>`;
  ({ geral, cadastros, pedidos, produtos, lista, lgpd, consentimentos })[tab](panel);
}

const err = (panel, e) => { console.error(e); panel.innerHTML = `<div class="card"><p class="notice notice-warn">${icon('warn')}<span>Erro ao carregar: ${esc(e.message || e)}</span></p></div>`; };

/** Tabela com busca e exportação CSV */
function table(panel, { title, ic, rows, columns, csvName, searchKeys, toolsExtra = '', after }) {
  panel.innerHTML = `
    <div class="card">
      <h2>${icon(ic)} ${title} <span class="chip">${rows.length}</span></h2>
      <div class="table-tools">
        <label class="search" style="flex:1 1 260px">${icon('search')}<span class="sr-only">Buscar</span><input type="search" placeholder="Buscar…"></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${toolsExtra}<button class="btn btn-sm" data-csv>${icon('download')} Exportar CSV</button></div>
      </div>
      <div class="table-wrap"><table class="data"><thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead><tbody></tbody></table></div>
    </div>`;
  const tbody = $('tbody', panel); const input = $('input[type=search]', panel);
  let shown = rows;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    shown = q ? rows.filter((r) => searchKeys.some((k) => String(typeof k === 'function' ? k(r) : r[k] ?? '').toLowerCase().includes(q))) : rows;
    tbody.innerHTML = shown.length ? shown.map((r) => `<tr>${columns.map((c) => `<td>${c.html ? c.html(r) : esc(c.get ? c.get(r) : r[c.key] ?? '—')}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}" class="muted" style="text-align:center;padding:30px">Nada por aqui ainda.</td></tr>`;
    after?.(tbody, shown);
  };
  input.addEventListener('input', debounce(draw, 150));
  $('[data-csv]', panel).addEventListener('click', () => {
    const cols = columns.filter((c) => c.csv !== false).map((c) => ({ label: c.label, get: c.csvGet || c.get || ((r) => r[c.key]) }));
    downloadFile(`${csvName}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(shown, cols), 'text/csv;charset=utf-8');
  });
  draw();
  return { redraw: draw };
}

async function users(force = false) {
  if (!cache.users || force) {
    const { data, error } = await sb.rpc('admin_list_users');
    if (error) throw error;
    cache.users = data;
  }
  return cache.users;
}

/* ---------------- Visão geral ---------------- */
async function geral(panel) {
  try {
    const [{ data: s, error }, us, { data: recent }] = await Promise.all([
      sb.rpc('admin_stats'), users(true),
      sb.from('interest_requests').select('*').order('created_at', { ascending: false }).limit(6),
    ]);
    if (error) throw error;
    const byId = Object.fromEntries(us.map((u) => [u.id, u]));
    const k = (n, label, hot) => `<div class="kpi ${hot ? 'hot' : ''}"><strong>${n ?? 0}</strong><span>${label}</span></div>`;
    panel.innerHTML = `
      <div class="kpis">
        ${k(s.usuarios, 'cadastros')}${k(s.usuarios_7d, 'novos nos últimos 7 dias', s.usuarios_7d > 0)}
        ${k(s.pedidos, 'pedidos pelo site')}${k(s.pedidos_novos, 'pedidos aguardando', s.pedidos_novos > 0)}
        ${k(s.produtos, 'produtos ativos')}${k(s.lista_calculadora, 'na lista da calculadora')}
        ${k(s.marketing, 'aceitam receber novidades')}${k(s.lgpd_abertas, 'solicitações LGPD abertas', s.lgpd_abertas > 0)}
        ${k(s.cookies_aceitos, 'aceitaram cookies opcionais')}${k(s.cookies_recusados, 'recusaram cookies opcionais')}
      </div>
      <div class="card">
        <h2>${icon('list')} Últimos pedidos</h2>
        ${recent?.length ? `<div class="orders">${recent.map((o) => { const u = byId[o.user_id] || {}; return `
          <div class="order"><span class="order-code">#${esc(o.code)}</span>
            <div><h3>${esc(o.product_name)} ${o.quantity > 1 ? `× ${o.quantity}` : ''}</h3><small>${esc(u.full_name || u.email || '—')} · ${fmtDate(o.created_at)}</small></div>
            <span class="status st-${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span></div>`; }).join('')}</div>` : '<p class="muted">Nenhum pedido ainda.</p>'}
      </div>
      <div class="card">
        <h2>${icon('users')} Cadastros recentes</h2>
        ${us.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Nome</th><th>E-mail</th><th>Login</th><th>Cadastro</th></tr></thead><tbody>
          ${us.slice(0, 6).map((u) => `<tr><td>${esc(u.full_name || '—')}</td><td>${esc(u.email)}</td><td>${esc(PROV[u.provider] || u.provider)}</td><td>${fmtDate(u.created_at)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nenhum cadastro ainda.</p>'}
      </div>`;
  } catch (e) { err(panel, e); }
}

/* ---------------- Cadastros ---------------- */
async function cadastros(panel) {
  try {
    const rows = await users(true);
    table(panel, {
      title: 'Cadastros', ic: 'users', rows, csvName: 'cadastros',
      searchKeys: ['full_name', 'email', 'phone', 'provider'],
      columns: [
        { label: 'Nome', key: 'full_name' },
        { label: 'E-mail', key: 'email' },
        { label: 'Login', get: (r) => PROV[r.provider] || r.provider },
        { label: 'WhatsApp', key: 'phone', html: (r) => r.phone ? `<a target="_blank" rel="noopener" href="${esc(waPhone(r.phone))}">${esc(r.phone)}</a>` : '—' },
        { label: 'Novidades', get: (r) => (r.marketing_opt_in ? 'Sim' : 'Não'), html: (r) => r.marketing_opt_in ? '<span class="tag-yes">Sim</span>' : '<span class="tag-no">Não</span>' },
        { label: 'E-mail confirmado', get: (r) => (r.email_confirmed_at ? 'Sim' : 'Não') },
        { label: 'Termos', get: (r) => (r.accepted_terms_at ? `v${r.terms_version} em ${fmtDate(r.accepted_terms_at, false)}` : 'Pendente') },
        { label: 'Pedidos', key: 'pedidos' },
        { label: 'Cadastro', get: (r) => fmtDate(r.created_at) },
        { label: 'Último acesso', get: (r) => fmtDate(r.last_sign_in_at) },
        { label: 'Ações', csv: false, html: (r) => `<button class="btn btn-sm" data-del-user="${esc(r.id)}" data-email="${esc(r.email)}" style="--bg:var(--berry-soft)">${icon('trash')}</button>` },
      ],
      after: (tbody) => $$('[data-del-user]', tbody).forEach((b) => b.addEventListener('click', () => {
        const m = modal(`<h2 class="modal-title">${icon('trash')} Excluir cadastro?</h2>
          <p>Isto apaga definitivamente a conta <strong>${esc(b.dataset.email)}</strong>, o perfil e os pedidos dela. Use para atender pedidos de exclusão (LGPD).</p>
          <div class="modal-actions"><button class="btn btn-ghost" data-x>Cancelar</button><button class="btn" style="--bg:var(--berry);--fg:#fff" data-ok>Excluir</button></div>`, { label: 'Excluir cadastro' });
        $('[data-x]', m.el).onclick = m.close;
        $('[data-ok]', m.el).onclick = (e) => withLoading(e.currentTarget, async () => {
          const { error } = await sb.rpc('admin_delete_user', { p_user: b.dataset.delUser });
          if (error) return toast(error.message, 'err');
          m.close(); toast('Cadastro excluído.'); go('cadastros', false);
        });
      })),
    });
  } catch (e) { err(panel, e); }
}

/* ---------------- Pedidos ---------------- */
async function pedidos(panel) {
  try {
    const [us, { data, error }] = await Promise.all([users(), sb.from('interest_requests').select('*').order('created_at', { ascending: false }).limit(1000)]);
    if (error) throw error;
    const byId = Object.fromEntries(us.map((u) => [u.id, u]));
    const rows = data.map((o) => ({ ...o, cliente: byId[o.user_id]?.full_name || '', email: byId[o.user_id]?.email || '', phone: byId[o.user_id]?.phone || '' }));
    const filter = `<select class="input" style="width:auto;border-radius:999px;padding:8px 14px" data-st><option value="">Todos os status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>`;
    const render = (list) => table(panel, {
      title: 'Pedidos de interesse', ic: 'list', rows: list, csvName: 'pedidos', toolsExtra: filter,
      searchKeys: ['code', 'product_name', 'cliente', 'email', 'phone'],
      columns: [
        { label: 'Código', html: (r) => `<span class="order-code">#${esc(r.code)}</span>`, get: (r) => r.code },
        { label: 'Produto', key: 'product_name' },
        { label: 'Qtd', key: 'quantity' },
        { label: 'Cliente', html: (r) => `<strong>${esc(r.cliente || '—')}</strong><br><small>${esc(r.email)}</small>`, get: (r) => `${r.cliente} <${r.email}>` },
        { label: 'WhatsApp', key: 'phone', html: (r) => r.phone ? `<a target="_blank" rel="noopener" href="${esc(waPhone(r.phone, `Olá! Sobre o seu pedido #${r.code} (${r.product_name}) na Collection 3D 🐢`))}">${icon('whatsapp')} ${esc(r.phone)}</a>` : '—' },
        { label: 'Data', get: (r) => fmtDate(r.created_at) },
        { label: 'Status', get: (r) => STATUS[r.status], html: (r) => `<select data-order="${r.id}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v}</option>`).join('')}</select>` },
      ],
      after: (tbody) => $$('[data-order]', tbody).forEach((s) => s.addEventListener('change', async () => {
        const { error } = await sb.from('interest_requests').update({ status: s.value }).eq('id', s.dataset.order);
        if (error) return toast('Erro ao salvar status.', 'err');
        const r = rows.find((x) => String(x.id) === s.dataset.order); if (r) r.status = s.value;
        toast('Status atualizado.'); badges();
      })),
    });
    render(rows);
    panel.addEventListener('change', (e) => {
      if (!e.target.matches('[data-st]')) return;
      const v = e.target.value; render(v ? rows.filter((r) => r.status === v) : rows); $('[data-st]', panel).value = v;
    });
  } catch (e) { err(panel, e); }
}

/* ---------------- Produtos ---------------- */
async function produtos(panel) {
  try {
    const { data, error } = await sb.from('products').select('*').order('sort_order').order('created_at', { ascending: false });
    if (error) throw error;
    table(panel, {
      title: 'Produtos', ic: 'box', rows: data, csvName: 'produtos',
      toolsExtra: `<button class="btn btn-ink btn-sm" data-new>${icon('plus')} Novo produto</button>`,
      searchKeys: ['name', 'category', 'slug', 'badge'],
      columns: [
        { label: 'Foto', csv: false, html: (r) => `<div class="thumb">${productArt(r)}</div>` },
        { label: 'Nome', html: (r) => `<strong>${esc(r.name)}</strong><br><small class="muted">${esc(r.slug)}</small>`, get: (r) => r.name },
        { label: 'Categoria', get: (r) => catOf(r.category).label },
        { label: 'Preço', get: (r) => (r.price != null ? fmtPrice(r.price) : 'Sob consulta') },
        { label: 'Selo', key: 'badge' },
        { label: 'Destaque', get: (r) => (r.featured ? 'Sim' : 'Não') },
        { label: 'Visível', get: (r) => (r.active ? 'Sim' : 'Não'), html: (r) => r.active ? '<span class="tag-yes">Sim</span>' : '<span class="tag-no">Oculto</span>' },
        { label: 'Ordem', key: 'sort_order' },
        { label: 'Ações', csv: false, html: (r) => `<div style="display:flex;gap:6px"><button class="btn btn-sm" data-edit="${r.id}" aria-label="Editar">${icon('edit')}</button><button class="btn btn-sm" data-del="${r.id}" aria-label="Excluir" style="--bg:var(--berry-soft)">${icon('trash')}</button></div>` },
      ],
      after: (tbody) => {
        $$('[data-edit]', tbody).forEach((b) => b.addEventListener('click', () => productForm(data.find((p) => p.id === b.dataset.edit), data)));
        $$('[data-del]', tbody).forEach((b) => b.addEventListener('click', async () => {
          const p = data.find((x) => x.id === b.dataset.del);
          if (!confirmBox(`Excluir "${p.name}"? Dica: para só esconder do site, edite e desmarque "Visível".`)) return;
          const { error } = await sb.from('products').delete().eq('id', p.id);
          if (error) return toast('Erro ao excluir.', 'err');
          toast('Produto excluído.'); go('produtos', false);
        }));
      },
    });
    $('[data-new]', panel).addEventListener('click', () => productForm(null, data));
  } catch (e) { err(panel, e); }
}
function confirmBox(text) { return window.confirm(text); }

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function compressImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use JPG, PNG ou WebP.');
  try {
    const bmp = await createImageBitmap(file);
    const max = 1400, scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.86));
    if (blob && blob.size < file.size) return { blob, ext: 'webp', type: 'image/webp' };
  } catch {}
  return { blob: file, ext: file.type.split('/')[1].replace('jpeg', 'jpg'), type: file.type };
}

function productForm(p, all) {
  const isNew = !p;
  p = p || { name: '', slug: '', description: '', category: 'chaveiros', price: null, badge: '', image_url: '', shopee_url: '', tiktok_url: '', featured: false, active: true, sort_order: (all.at(-1)?.sort_order || 0) + 1 };
  const cats = [...new Set([...Object.keys(CATEGORIES), ...all.map((x) => x.category)])];
  const m = modal(`
    <h2 class="modal-title">${icon(isNew ? 'plus' : 'edit')} ${isNew ? 'Novo produto' : 'Editar produto'}</h2>
    <form class="form-grid" id="pf" novalidate>
      <div class="field"><label for="p-name">Nome *</label><input id="p-name" name="name" maxlength="120" required value="${esc(p.name)}"></div>
      <div class="field"><label for="p-slug">Endereço (slug) *</label><input id="p-slug" name="slug" maxlength="80" required value="${esc(p.slug)}" pattern="[a-z0-9-]+"><small>Aparece no link: produtos.html?p=<b class="slug-prev">${esc(p.slug)}</b></small></div>
      <div class="field"><label for="p-cat">Categoria</label><input id="p-cat" name="category" list="cat-list" maxlength="40" value="${esc(p.category)}"><datalist id="cat-list">${cats.map((c) => `<option value="${esc(c)}">${esc(catOf(c).label)}</option>`).join('')}</datalist></div>
      <div class="field"><label for="p-price">Preço (R$) <small>vazio = "sob consulta"</small></label><input id="p-price" name="price" inputmode="decimal" value="${p.price != null ? String(p.price).replace('.', ',') : ''}"></div>
      <div class="field full"><label for="p-desc">Descrição</label><textarea id="p-desc" name="description" maxlength="2000">${esc(p.description || '')}</textarea></div>
      <div class="field"><label for="p-badge">Selo <small>(ex.: Novo, Collab)</small></label><input id="p-badge" name="badge" maxlength="24" value="${esc(p.badge || '')}"></div>
      <div class="field"><label for="p-order">Ordem de exibição</label><input id="p-order" name="sort_order" type="number" value="${p.sort_order ?? 0}"></div>
      <div class="field full"><label>Foto</label>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div class="thumb img-prev" style="width:84px;height:84px;border:2px solid var(--line);border-radius:14px;overflow:hidden">${productArt(p)}</div>
          <label class="btn btn-sm" style="cursor:pointer">${icon('upload')} Enviar foto<input type="file" accept="image/jpeg,image/png,image/webp" hidden name="file"></label>
          <input class="input" name="image_url" placeholder="ou cole o link https://..." value="${esc(p.image_url || '')}" style="flex:1 1 220px">
        </div><small>Dica: foto quadrada, fundo claro, produto de frente. A imagem é otimizada automaticamente.</small></div>
      <div class="field"><label for="p-shopee">Link na Shopee</label><input id="p-shopee" name="shopee_url" placeholder="https://shopee.com.br/..." value="${esc(p.shopee_url || '')}"></div>
      <div class="field"><label for="p-tt">Link no TikTok Shop</label><input id="p-tt" name="tiktok_url" placeholder="https://..." value="${esc(p.tiktok_url || '')}"></div>
      <label class="check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}><span>Mostrar nos destaques da página inicial</span></label>
      <label class="check"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}><span>Visível no site</span></label>
      <div class="full"><div class="form-msg" role="alert"></div></div>
      <div class="full modal-actions" style="margin-top:0"><button type="button" class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-ink" type="submit">${icon('check')} Salvar produto</button></div>
    </form>`, { label: 'Produto', wide: true });
  const f = $('#pf', m.el);
  let file = null, slugTouched = !isNew;
  f.name.addEventListener('input', () => { if (!slugTouched) { f.slug.value = slugify(f.name.value); $('.slug-prev', f).textContent = f.slug.value; } });
  f.slug.addEventListener('input', () => { slugTouched = true; f.slug.value = slugify(f.slug.value); $('.slug-prev', f).textContent = f.slug.value; });
  f.file.addEventListener('change', () => {
    file = f.file.files[0] || null;
    if (file) { if (file.size > 15e6) { toast('Imagem muito grande (máx. 15 MB).', 'err'); file = null; return; } $('.img-prev', f).innerHTML = `<img src="${URL.createObjectURL(file)}" alt="" style="width:100%;height:100%;object-fit:cover">`; }
  });
  $('[data-x]', f).onclick = m.close;
  const msg = (t) => { const x = $('.form-msg', f); x.textContent = t; x.className = 'form-msg show err'; };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = f.name.value.trim(), slug = slugify(f.slug.value || name);
    if (name.length < 2) return msg('Dê um nome ao produto.');
    if (slug.length < 2) return msg('Slug inválido.');
    const priceRaw = f.price.value.trim().replace(/\./g, '').replace(',', '.');
    const price = priceRaw === '' ? null : Number(priceRaw);
    if (price !== null && (isNaN(price) || price < 0)) return msg('Preço inválido. Ex.: 29,90');
    for (const k of ['image_url', 'shopee_url', 'tiktok_url']) if (f[k].value.trim() && !safeUrl(f[k].value)) return msg('Os links precisam começar com https://');
    await withLoading($('[type=submit]', f), async () => {
      let image_url = f.image_url.value.trim() || null;
      if (file) {
        try {
          const { blob, ext, type } = await compressImage(file);
          const path = `${slug}-${Date.now()}.${ext}`;
          const up = await sb.storage.from('produtos').upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
          if (up.error) throw up.error;
          image_url = sb.storage.from('produtos').getPublicUrl(path).data.publicUrl;
        } catch (er) { return msg('Falha no envio da foto: ' + (er.message || er)); }
      }
      const row = {
        name: name.slice(0, 120), slug, description: f.description.value.trim() || null, category: slugify(f.category.value || 'outros') || 'outros',
        price, badge: f.badge.value.trim() || null, image_url, shopee_url: f.shopee_url.value.trim() || null, tiktok_url: f.tiktok_url.value.trim() || null,
        featured: f.featured.checked, active: f.active.checked, sort_order: parseInt(f.sort_order.value, 10) || 0,
      };
      const q = isNew ? sb.from('products').insert(row) : sb.from('products').update(row).eq('id', p.id);
      const { error } = await q;
      if (error) return msg(error.code === '23505' ? 'Já existe um produto com esse slug.' : 'Erro ao salvar: ' + error.message);
      m.close(); toast(isNew ? 'Produto criado!' : 'Produto atualizado!'); go('produtos', false);
    });
  });
}

/* ---------------- Lista da calculadora ---------------- */
async function lista(panel) {
  try {
    const { data, error } = await sb.from('calculator_waitlist').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    table(panel, {
      title: 'Lista de espera da calculadora', ic: 'calc', rows: data, csvName: 'lista-calculadora', searchKeys: ['email'],
      columns: [
        { label: 'E-mail', key: 'email' },
        { label: 'Tem conta', get: (r) => (r.user_id ? 'Sim' : 'Não') },
        { label: 'Inscrição', get: (r) => fmtDate(r.created_at) },
        { label: 'Ações', csv: false, html: (r) => `<button class="btn btn-sm" data-rm="${r.id}" style="--bg:var(--berry-soft)" aria-label="Remover">${icon('trash')}</button>` },
      ],
      after: (tbody) => $$('[data-rm]', tbody).forEach((b) => b.addEventListener('click', async () => {
        if (!confirmBox('Remover este e-mail da lista (ex.: pedido de descadastro)?')) return;
        const { error } = await sb.from('calculator_waitlist').delete().eq('id', b.dataset.rm);
        if (error) return toast('Erro ao remover.', 'err');
        toast('Removido da lista.'); go('lista', false);
      })),
    });
  } catch (e) { err(panel, e); }
}

/* ---------------- LGPD ---------------- */
async function lgpd(panel) {
  try {
    const { data, error } = await sb.from('data_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    table(panel, {
      title: 'Solicitações LGPD', ic: 'shield', rows: data, csvName: 'solicitacoes-lgpd', searchKeys: ['email', 'message', 'request_type'],
      columns: [
        { label: 'Data', get: (r) => fmtDate(r.created_at) },
        { label: 'Prazo (15 dias)', get: (r) => fmtDate(new Date(new Date(r.created_at).getTime() + 15 * 864e5), false) },
        { label: 'E-mail', key: 'email' },
        { label: 'Tipo', get: (r) => REQ[r.request_type] || r.request_type },
        { label: 'Mensagem', key: 'message' },
        { label: 'Status / resposta', get: (r) => `${REQ_ST[r.status]} ${r.response || ''}`, html: (r) => `
          <div style="display:grid;gap:6px;min-width:240px">
            <select data-rs="${r.id}">${Object.entries(REQ_ST).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
            <textarea class="input" data-rr="${r.id}" rows="2" maxlength="2000" placeholder="Resposta ao titular">${esc(r.response || '')}</textarea>
            <button class="btn btn-sm" data-rsave="${r.id}">${icon('check')} Salvar</button>
          </div>` },
      ],
      after: (tbody) => $$('[data-rsave]', tbody).forEach((b) => b.addEventListener('click', () => withLoading(b, async () => {
        const id = b.dataset.rsave, status = $(`[data-rs="${id}"]`, tbody).value;
        const { error } = await sb.from('data_requests').update({
          status, response: $(`[data-rr="${id}"]`, tbody).value.trim() || null,
          resolved_at: ['concluida', 'recusada'].includes(status) ? new Date().toISOString() : null,
        }).eq('id', id);
        if (error) return toast('Erro ao salvar.', 'err');
        toast('Solicitação atualizada.'); badges();
      }))),
    });
  } catch (e) { err(panel, e); }
}

/* ---------------- Consentimentos ---------------- */
async function consentimentos(panel) {
  try {
    const [us, { data, error }] = await Promise.all([users(), sb.from('consent_logs').select('*').order('created_at', { ascending: false }).limit(2000)]);
    if (error) throw error;
    const byId = Object.fromEntries(us.map((u) => [u.id, u.email]));
    const T = { termos_privacidade: 'Termos e Privacidade', marketing: 'E-mails de novidades', cookies: 'Cookies', lista_calculadora: 'Lista da calculadora' };
    table(panel, {
      title: 'Registros de consentimento', ic: 'file', rows: data, csvName: 'consentimentos',
      searchKeys: [(r) => byId[r.user_id], 'consent_type', 'anon_id'],
      columns: [
        { label: 'Data', get: (r) => fmtDate(r.created_at) },
        { label: 'Titular', get: (r) => byId[r.user_id] || (r.anon_id ? `Visitante ${String(r.anon_id).slice(0, 8)}` : 'Anônimo') },
        { label: 'Tipo', get: (r) => T[r.consent_type] || r.consent_type },
        { label: 'Situação', get: (r) => (r.granted ? 'Autorizado' : 'Não autorizado'), html: (r) => r.granted ? '<span class="tag-yes">Autorizado</span>' : '<span class="tag-no">Não autorizado</span>' },
        { label: 'Versão', key: 'policy_version' },
        { label: 'Detalhes', get: (r) => Object.entries(r.details || {}).map(([k, v]) => `${k}: ${v}`).join(', ') },
      ],
    });
  } catch (e) { err(panel, e); }
}
