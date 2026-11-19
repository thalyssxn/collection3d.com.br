// =====================================================================
//  PAINEL DO DONO — só contas da tabela "admins", sempre com 2FA.
//  Visão geral, acessos, clientes, pedidos, produtos, configurações,
//  lista da calculadora, LGPD, consentimentos e histórico.
// =====================================================================
import { $, $$, esc, fmtDate, fmtPrice, safeUrl, toast, withLoading, downloadFile, toCSV, debounce } from '../utils.js';
import { icon } from '../icons.js';
import { isSupabaseConfigured } from '../config.js';
import { getSupabase } from '../supa.js';
import { onAuth, signOut, PROFILE_COLS } from '../auth-store.js';
import { modal } from '../app.js';
import { productArt, catOf, CATEGORIES } from '../catalog.js';
import { STATUS, waPhone } from '../status.js';

const root = $('#admin-root');
let sb, started = false, gateShown = false;
let tab = (location.hash || '#geral').slice(1);
const cache = {};

const TABS = [
  { id: 'geral', label: 'Visão geral', ic: 'chart' },
  { id: 'acessos', label: 'Acessos ao site', ic: 'eye' },
  { id: 'clientes', label: 'Clientes', ic: 'users' },
  { id: 'pedidos', label: 'Pedidos', ic: 'list' },
  { id: 'produtos', label: 'Produtos', ic: 'box' },
  { id: 'banners', label: 'Banners', ic: 'image' },
  { id: 'config', label: 'Configurações', ic: 'gear' },
  { id: 'lista', label: 'Lista calculadora', ic: 'calc' },
  { id: 'lgpd', label: 'Solicitações LGPD', ic: 'shield' },
  { id: 'consentimentos', label: 'Consentimentos', ic: 'file' },
  { id: 'historico', label: 'Histórico', ic: 'clock' },
];
const PROV = { email: 'E-mail', google: 'Google', apple: 'Apple' };
const REQ = { acesso: 'Acesso', correcao: 'Correção', exclusao: 'Exclusão', portabilidade: 'Portabilidade', revogacao_consentimento: 'Revogação', informacao: 'Informação', outro: 'Outro' };
const REQ_ST = { aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', recusada: 'Recusada' };
const CONSENT_T = { termos_privacidade: 'Termos e Privacidade', marketing: 'E-mails de novidades', cookies: 'Cookies', lista_calculadora: 'Lista da calculadora' };

/* ------------------------------------------------------------------ */
/* Acesso: conta de admin + verificação em 2 etapas                    */
/* ------------------------------------------------------------------ */
onAuth(async (a) => {
  if (started || !a.ready) return;
  if (!isSupabaseConfigured()) { root.innerHTML = `<div class="card" style="margin-top:30px"><p class="notice notice-warn">${icon('info')}<span><strong>Modo prévia:</strong> conecte o Supabase em <code>config.js</code> para usar o painel.</span></p></div>`; return; }
  if (!a.user) { location.replace('entrar.html?next=admin.html'); return; }
  sb = await getSupabase();
  if (!a.adminAccount) {
    root.innerHTML = `<div class="card" style="margin-top:30px"><h2>${icon('lock')} Acesso restrito</h2><p class="muted">Esta área é exclusiva do dono do site.</p><a class="btn btn-ink" href="index.html">Voltar ao site</a></div>`;
    return;
  }
  if (!a.admin) { if (!gateShown) { gateShown = true; mfaGate(); } return; }
  started = true;
  start();
});

// o Supabase devolve o QR como "data:image/svg+xml;utf-8,<svg…>": codifica para funcionar em qualquer navegador
const qrSrc = (q) => {
  const m = /^data:image\/svg\+xml;(?:utf-8|charset=utf-8),(.*)$/s.exec(q || '');
  return m && m[1].trim().startsWith('<') ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m[1]) : q;
};

async function mfaGate() {
  const shell = (inner) => {
    root.innerHTML = `<div class="card mfa-card" style="max-width:560px;margin:40px auto;box-shadow:var(--sh-lg)">
      <div class="gate-icon">${icon('shield')}</div>${inner}</div>`;
  };
  const { data: f, error } = await sb.auth.mfa.listFactors();
  if (error) { shell(`<p class="muted">Não foi possível verificar o 2FA: ${esc(error.message)}</p>`); return; }
  const verified = (f.totp || []).filter((x) => x.status === 'verified');

  const codeForm = (title, text, extra = '') => {
    shell(`<h1 style="font-size:2rem">${title}</h1><p class="muted">${text}</p>${extra}
      <form class="stack" id="mfa-form" novalidate>
        <div class="field"><label for="mfa-code">Código de 6 dígitos do aplicativo</label>
          <input id="mfa-code" class="input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" style="font-size:1.6rem;letter-spacing:.4em;text-align:center"></div>
        <div class="form-msg" role="alert"></div>
        <button class="btn btn-ink btn-lg btn-block" type="submit">${icon('check')} Confirmar</button>
        <button type="button" class="link-btn" data-out style="justify-self:center">Sair da conta</button>
      </form>`);
    $('[data-out]').onclick = () => signOut().then(() => (location.href = 'index.html'));
    $('#mfa-code').focus();
    return $('#mfa-form');
  };
  const verify = (form, factorId) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = $('#mfa-code').value.replace(/\D/g, '');
    const m = $('.form-msg', form);
    if (code.length !== 6) { m.textContent = 'Digite os 6 números.'; m.className = 'form-msg show err'; return; }
    await withLoading($('[type=submit]', form), async () => {
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) { m.textContent = 'Código incorreto ou expirado. Confira o horário do celular e tente de novo.'; m.className = 'form-msg show err'; return; }
      location.reload();
    });
  });

  if (verified.length) {
    const form = codeForm('Verificação em 2 etapas', 'Abra o aplicativo autenticador no seu celular e digite o código da <strong>Collection 3D</strong>.');
    verify(form, verified[0].id);
    return;
  }
  // primeira vez: cadastrar o autenticador
  for (const x of (f.all || []).filter((x) => x.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: x.id });
  const { data: en, error: enErr } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Collection 3D Admin', issuer: 'Collection 3D' });
  if (enErr) { shell(`<h1 style="font-size:2rem">Ativar 2FA</h1><p class="muted">Erro ao iniciar: ${esc(enErr.message)}. Confira se o MFA (TOTP) está ativo no Supabase.</p>`); return; }
  const form = codeForm('Proteja seu painel',
    'Para que <strong>só você</strong> entre no painel, ative a verificação em 2 etapas. Instale o <strong>Google Authenticator</strong> (ou Microsoft Authenticator, Authy) e leia o QR code:',
    `<div class="mfa-qr"><img src="${esc(qrSrc(en.totp.qr_code))}" alt="QR code para o aplicativo autenticador" width="200" height="200"></div>
     <p class="muted center" style="font-size:.85rem">Não consegue ler? Digite a chave no app:<br><code class="mfa-secret">${esc(en.totp.secret)}</code></p>`);
  verify(form, en.id);
}

/* ------------------------------------------------------------------ */
/* Estrutura                                                           */
/* ------------------------------------------------------------------ */
function start() {
  root.innerHTML = `
    <div class="admin-wrap">
      <nav class="side-nav" role="tablist" aria-label="Seções do painel">
        <p class="side-title">${icon('shield')} Painel do dono</p>
        ${TABS.map((t) => `<button role="tab" data-t="${t.id}">${icon(t.ic)} ${t.label}<span class="badge" data-badge="${t.id}" hidden></span></button>`).join('')}
        <a href="index.html">${icon('home')} Ver site</a>
      </nav>
      <div id="panel"></div>
    </div>`;
  $('.side-nav').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); });
  addEventListener('hashchange', () => go(location.hash.slice(1), false));
  go(tab, false);
  badges();
}

async function badges() {
  const { data } = await sb.rpc('admin_stats');
  if (!data) return;
  const set = (id, n) => { const b = $(`[data-badge=${id}]`); if (b) { b.hidden = !n; b.textContent = n; } };
  set('pedidos', data.pedidos_novos); set('lgpd', data.lgpd_abertas);
}

function go(t, push = true) {
  tab = TABS.some((x) => x.id === t) ? t : 'geral';
  if (push) history.replaceState(null, '', '#' + tab);
  $$('.side-nav [data-t]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === tab)));
  const panel = $('#panel');
  panel.innerHTML = `<div class="card"><p class="muted">Carregando…</p></div>`;
  ({ geral, acessos, clientes, pedidos, produtos, banners, config, lista, lgpd, consentimentos, historico })[tab](panel);
}

const err = (panel, e) => { console.error(e); panel.innerHTML = `<div class="card"><p class="notice notice-warn">${icon('warn')}<span>Erro ao carregar: ${esc(e.message || e)}</span></p></div>`; };

/** Tabela com busca, filtro opcional e exportação CSV */
function table(panel, { title, ic, rows, columns, csvName, searchKeys, toolsExtra = '', after, intro = '' }) {
  panel.innerHTML = `
    <div class="card">
      <h2>${icon(ic)} ${title} <span class="chip" data-count>${rows.length}</span></h2>
      ${intro}
      <div class="table-tools">
        <label class="search" style="flex:1 1 260px">${icon('search')}<span class="sr-only">Buscar</span><input type="search" placeholder="Buscar…"></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${toolsExtra}<button class="btn btn-sm" data-csv>${icon('download')} Exportar CSV</button></div>
      </div>
      <div class="table-wrap"><table class="data"><thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead><tbody></tbody></table></div>
    </div>`;
  const tbody = $('tbody', panel); const input = $('input[type=search]', panel);
  let base = rows, shown = rows;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    shown = q ? base.filter((r) => searchKeys.some((k) => String(typeof k === 'function' ? k(r) : r[k] ?? '').toLowerCase().includes(q))) : base;
    $('[data-count]', panel).textContent = shown.length;
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
  return { setRows: (r) => { base = r; draw(); } };
}

async function users(force = false) {
  if (!cache.users || force) {
    const { data, error } = await sb.rpc('admin_list_users');
    if (error) throw error;
    cache.users = data;
  }
  return cache.users;
}
const kpi = (n, label, hot) => `<div class="kpi ${hot ? 'hot' : ''}"><strong>${n ?? 0}</strong><span>${label}</span></div>`;

/* ------------------------------------------------------------------ */
/* Visão geral                                                         */
/* ------------------------------------------------------------------ */
async function geral(panel) {
  try {
    const [{ data: s, error }, us, { data: recent }] = await Promise.all([
      sb.rpc('admin_stats'), users(true),
      sb.from('interest_requests').select('*').order('created_at', { ascending: false }).limit(6),
    ]);
    if (error) throw error;
    const byId = Object.fromEntries(us.map((u) => [u.id, u]));
    panel.innerHTML = `
      <div class="kpis">
        ${kpi(s.visitas_hoje, 'visitas hoje', s.visitas_hoje > 0)}${kpi(s.visitas_30d, 'visitas em 30 dias')}
        ${kpi(s.usuarios, 'clientes cadastrados')}${kpi(s.usuarios_7d, 'novos em 7 dias', s.usuarios_7d > 0)}
        ${kpi(s.pedidos_novos, 'pedidos aguardando', s.pedidos_novos > 0)}${kpi(s.pedidos, 'pedidos no total')}
        ${kpi(s.produtos, 'produtos no site')}${kpi(s.lista_calculadora, 'na lista da calculadora')}
        ${kpi(s.lgpd_abertas, 'solicitações LGPD abertas', s.lgpd_abertas > 0)}${kpi(s.bloqueados, 'contas bloqueadas')}
      </div>
      <div class="card">
        <h2>${icon('list')} Últimos pedidos</h2>
        ${recent?.length ? `<div class="orders">${recent.map((o) => { const u = byId[o.user_id] || {}; return `
          <div class="order"><span class="order-code">#${esc(o.code)}</span>
            <div><h3>${esc(o.product_name)} ${o.quantity > 1 ? `× ${o.quantity}` : ''}</h3><small>${esc(u.full_name || u.email || '—')} · ${fmtDate(o.created_at)}</small></div>
            <span class="status st-${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span></div>`; }).join('')}</div>` : '<p class="muted">Nenhum pedido ainda.</p>'}
        <p style="margin:14px 0 0"><button class="btn btn-sm" data-go="pedidos">Ver todos os pedidos ${icon('arrowRight')}</button></p>
      </div>
      <div class="card">
        <h2>${icon('users')} Clientes recentes</h2>
        ${us.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Nome</th><th>E-mail</th><th>Login</th><th>Cadastro</th><th></th></tr></thead><tbody>
          ${us.slice(0, 6).map((u) => `<tr><td>${esc(u.full_name || '—')}</td><td>${esc(u.email)}</td><td>${esc(PROV[u.provider] || u.provider)}</td><td>${fmtDate(u.created_at)}</td><td><button class="btn btn-sm" data-client="${esc(u.id)}">Ficha</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nenhum cadastro ainda.</p>'}
      </div>`;
    panel.onclick = (e) => {
      const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go);
      const c = e.target.closest('[data-client]'); if (c) clientSheet(c.dataset.client);
    };
  } catch (e) { err(panel, e); }
}

/* ------------------------------------------------------------------ */
/* Acessos ao site                                                     */
/* ------------------------------------------------------------------ */
async function acessos(panel, days = 30) {
  try {
    const { data: s, error } = await sb.rpc('admin_visit_stats', { p_days: days });
    if (error) throw error;
    // completa os dias sem visita
    const byDay = Object.fromEntries((s.por_dia || []).map((d) => [d.dia, d]));
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      const key = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      series.push({ dia: key, visitas: byDay[key]?.visitas || 0, visitantes: byDay[key]?.visitantes || 0 });
    }
    const max = Math.max(1, ...series.map((d) => d.visitas));
    const lbl = (k) => { const [y, m, d] = k.split('-'); return `${d}/${m}`; };
    const every = days <= 14 ? 1 : days <= 31 ? 5 : 15;
    const list = (title, ic, items, fmt = (x) => x) => {
      const top = Math.max(1, ...items.map((x) => x.total));
      return `<div class="card"><h2 style="font-size:1.3rem">${icon(ic)} ${title}</h2>
        ${items.length ? `<div class="hbars">${items.map((x) => `
          <div class="hbar" title="${esc(fmt(x.nome))}: ${x.total}"><span class="hbar-label">${esc(fmt(x.nome))}</span>
            <span class="hbar-track"><span class="hbar-fill" style="width:${(x.total / top * 100).toFixed(1)}%"></span></span><b>${x.total}</b></div>`).join('')}</div>`
          : '<p class="muted">Sem dados ainda.</p>'}</div>`;
    };
    const page = (p) => ({ '/': 'Início', '/index.html': 'Início', '/produtos.html': 'Produtos', '/lojas.html': 'Lojas', '/pedidos.html': 'Pedidos', '/calculadora.html': 'Calculadora', '/contato.html': 'Contato', '/entrar.html': 'Entrar', '/conta.html': 'Minha conta' }[p] || p.replace(/^\//, ''));
    const dev = (d) => ({ mobile: 'Celular', desktop: 'Computador', tablet: 'Tablet' }[d] || d);
    panel.innerHTML = `
      <div class="card">
        <div class="toolbar" style="margin-bottom:16px">
          <h2 style="margin:0">${icon('eye')} Acessos ao site</h2>
          <div class="filters" role="group" aria-label="Período">
            ${[7, 30, 90].map((d) => `<button class="filter" data-days="${d}" aria-pressed="${d === days}">${d} dias</button>`).join('')}
          </div>
        </div>
        <div class="kpis" style="margin-bottom:10px">
          ${kpi(s.hoje, 'visitas hoje', s.hoje > 0)}${kpi(s.visitas, `visitas em ${days} dias`)}${kpi(s.visitantes, 'visitantes diferentes')}${kpi(s.logados, 'visitas de clientes logados')}
        </div>
        <figure class="vchart" aria-label="Visitas por dia">
          <figcaption class="muted">Visitas por dia</figcaption>
          <div class="vchart-plot" style="--n:${series.length}">
            <span class="vchart-max">${max}</span>
            ${series.map((d) => `<div class="vbar" tabindex="0" data-tip="${lbl(d.dia)}: ${d.visitas} visita${d.visitas === 1 ? '' : 's'} · ${d.visitantes} visitante${d.visitantes === 1 ? '' : 's'}"><span style="height:${(d.visitas / max * 100).toFixed(1)}%"></span></div>`).join('')}
          </div>
          <div class="vchart-x" style="--n:${series.length}">${series.map((d, i) => `<span>${i % every === 0 || i === series.length - 1 ? lbl(d.dia) : ''}</span>`).join('')}</div>
        </figure>
        <details class="vchart-table"><summary>Ver em tabela</summary>
          <div class="table-wrap"><table class="data"><thead><tr><th>Dia</th><th>Visitas</th><th>Visitantes</th></tr></thead>
          <tbody>${series.slice().reverse().map((d) => `<tr><td>${lbl(d.dia)}</td><td>${d.visitas}</td><td>${d.visitantes}</td></tr>`).join('')}</tbody></table></div>
        </details>
        <p class="muted" style="font-size:.85rem;margin:14px 0 0">${icon('info')} Pela LGPD, só contamos visitantes que aceitaram cookies de <strong>Estatísticas</strong>. O número real de visitas é maior. Não guardamos IP, nome nem e-mail dos visitantes.</p>
      </div>
      <div class="admin-cols">
        ${list('Páginas mais vistas', 'file', s.paginas || [], page)}
        ${list('De onde vêm', 'external', s.origens || [])}
        ${list('Aparelhos', 'phone', s.aparelhos || [], dev)}
      </div>
      <div class="card"><h2 style="font-size:1.3rem">${icon('sparkles')} Dica: descubra quais posts trazem visitas</h2>
        <p class="muted" style="margin:0">Use <code>?utm_source=</code> nos links que você divulga. Ex.: na bio do Instagram, <code>https://collection3d.com.br/?utm_source=instagram-bio</code>; num post de meme, <code>?utm_source=meme-bob</code>. Eles aparecem em “De onde vêm”.</p></div>`;
    panel.onclick = (e) => { const b = e.target.closest('[data-days]'); if (b) acessos(panel, Number(b.dataset.days)); };
  } catch (e) { err(panel, e); }
}

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */
async function clientes(panel) {
  try {
    const rows = await users(true);
    const filter = `<select class="input select-pill" data-f style="padding:8px 14px">
      <option value="">Todos</option><option value="ativos">Ativos</option><option value="bloqueados">Bloqueados</option>
      <option value="novidades">Aceitam novidades</option><option value="pendente">Termos pendentes</option><option value="pedidos">Com pedidos</option></select>`;
    const t = table(panel, {
      title: 'Clientes', ic: 'users', rows, csvName: 'clientes', toolsExtra: filter,
      intro: '<p class="muted" style="margin-top:-6px">Clique em <strong>Ficha</strong> para ver pedidos, editar dados, anotar ou bloquear.</p>',
      searchKeys: ['full_name', 'email', 'phone', 'provider', 'admin_note'],
      columns: [
        { label: 'Cliente', html: (r) => `<strong>${esc(r.full_name || '—')}</strong>${r.is_admin ? ' <span class="chip chip-lime">admin</span>' : ''}<br><small class="muted">${esc(r.email)}</small>`, get: (r) => r.full_name, csvGet: (r) => r.full_name },
        { label: 'E-mail', key: 'email', html: (r) => `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` },
        { label: 'WhatsApp', key: 'phone', html: (r) => r.phone ? `<a target="_blank" rel="noopener" href="${esc(waPhone(r.phone))}">${icon('whatsapp')} ${esc(r.phone)}</a>` : '—' },
        { label: 'Situação', get: (r) => (r.blocked ? 'Bloqueado' : 'Ativo'), html: (r) => r.blocked ? '<span class="status st-cancelado">Bloqueado</span>' : '<span class="status st-concluido">Ativo</span>' },
        { label: 'Login', get: (r) => PROV[r.provider] || r.provider },
        { label: 'Novidades', get: (r) => (r.marketing_opt_in ? 'Sim' : 'Não') },
        { label: 'Pedidos', key: 'pedidos' },
        { label: 'Cadastro', get: (r) => fmtDate(r.created_at, false) },
        { label: 'Último acesso', get: (r) => fmtDate(r.last_sign_in_at) },
        { label: 'Anotação', key: 'admin_note', html: (r) => r.admin_note ? `<small>${esc(r.admin_note.slice(0, 60))}${r.admin_note.length > 60 ? '…' : ''}</small>` : '—' },
        { label: '', csv: false, html: (r) => `<button class="btn btn-sm" data-client="${esc(r.id)}">${icon('user')} Ficha</button>` },
      ],
      after: (tbody) => $$('[data-client]', tbody).forEach((b) => b.addEventListener('click', () => clientSheet(b.dataset.client))),
    });
    $('[data-f]', panel).addEventListener('change', (e) => {
      const v = e.target.value;
      const fn = { ativos: (r) => !r.blocked, bloqueados: (r) => r.blocked, novidades: (r) => r.marketing_opt_in, pendente: (r) => !r.accepted_terms_at, pedidos: (r) => r.pedidos > 0 }[v];
      t.setRows(fn ? rows.filter(fn) : rows);
    });
  } catch (e) { err(panel, e); }
}

async function clientSheet(id) {
  const us = await users(true);
  const u = us.find((x) => x.id === id);
  if (!u) return toast('Cliente não encontrado.', 'err');
  const [{ data: orders }, { data: consents }, { data: reqs }] = await Promise.all([
    sb.from('interest_requests').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    sb.from('consent_logs').select('consent_type,granted,policy_version,created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
    sb.from('data_requests').select('*').eq('user_id', id).order('created_at', { ascending: false }),
  ]);
  const m = modal(`
    <div class="client-head">
      <span class="avatar" style="width:56px;height:56px;font-size:1.4rem">${esc((u.full_name || u.email)[0].toUpperCase())}</span>
      <div><h2 class="modal-title" style="margin:0">${esc(u.full_name || 'Sem nome')}</h2>
        <p class="muted" style="margin:0">${esc(u.email)} · ${esc(PROV[u.provider] || u.provider)} · desde ${fmtDate(u.created_at, false)}</p>
        <p style="margin:6px 0 0;display:flex;gap:6px;flex-wrap:wrap">
          ${u.blocked ? '<span class="status st-cancelado">Bloqueado</span>' : '<span class="status st-concluido">Ativo</span>'}
          ${u.is_admin ? '<span class="chip chip-lime">admin</span>' : ''}
          ${u.marketing_opt_in ? '<span class="chip">aceita novidades</span>' : ''}
          ${u.accepted_terms_at ? `<span class="chip">termos v${esc(u.terms_version || '')}</span>` : '<span class="chip" style="background:var(--warn-soft)">termos pendentes</span>'}
          ${u.email_confirmed_at ? '' : '<span class="chip" style="background:var(--warn-soft)">e-mail não confirmado</span>'}
        </p></div>
    </div>
    <div class="client-actions">
      ${u.phone ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waPhone(u.phone, `Olá, ${u.full_name || ''}! Aqui é da Collection 3D.`))}">${icon('whatsapp')} WhatsApp</a>` : ''}
      <a class="btn btn-sm" href="mailto:${esc(u.email)}">${icon('mail')} E-mail</a>
      <button class="btn btn-sm" data-export>${icon('download')} Exportar dados (LGPD)</button>
    </div>
    <form class="form-grid" id="cf" novalidate>
      <div class="field"><label for="c-name">Nome</label><input id="c-name" name="name" maxlength="120" value="${esc(u.full_name || '')}"></div>
      <div class="field"><label for="c-phone">WhatsApp</label><input id="c-phone" name="phone" maxlength="30" value="${esc(u.phone || '')}"></div>
      <div class="field full"><label for="c-note">Anotação interna <small>(só você vê)</small></label><textarea id="c-note" name="note" maxlength="2000" placeholder="Ex.: cliente fiel, prefere retirar em mãos…">${esc(u.admin_note || '')}</textarea></div>
      <label class="ck-row full" style="border-color:var(--berry)">
        <div><strong>Bloquear conta</strong><small>Impede login e novos pedidos. Use para fraude ou abuso. ${u.is_admin ? '(não é possível bloquear um admin por aqui)' : ''}</small></div>
        <span class="switch"><input type="checkbox" name="blocked" ${u.blocked ? 'checked' : ''} ${u.is_admin ? 'disabled' : ''}><span></span></span>
      </label>
      <div class="full"><div class="form-msg" role="alert"></div></div>
      <div class="full modal-actions" style="margin-top:0;justify-content:space-between">
        ${u.is_admin ? '<span></span>' : `<button type="button" class="btn btn-sm" data-del style="--bg:var(--berry-soft)">${icon('trash')} Excluir cadastro</button>`}
        <button class="btn btn-ink" type="submit">${icon('check')} Salvar</button>
      </div>
    </form>
    <h3 style="margin-top:22px">${icon('list')} Pedidos (${orders?.length || 0})</h3>
    ${orders?.length ? `<div class="orders">${orders.map((o) => `<div class="order"><span class="order-code">#${esc(o.code)}</span>
      <div><h3>${esc(o.product_name)} ${o.quantity > 1 ? `× ${o.quantity}` : ''}</h3><small>${fmtDate(o.created_at)}</small></div>
      <span class="status st-${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span></div>`).join('')}</div>` : '<p class="muted">Nenhum pedido.</p>'}
    <h3 style="margin-top:22px">${icon('shield')} Consentimentos</h3>
    ${consents?.length ? `<div class="table-wrap"><table class="data"><tbody>${consents.map((c) => `<tr><td>${fmtDate(c.created_at)}</td><td>${esc(CONSENT_T[c.consent_type] || c.consent_type)}</td><td class="${c.granted ? 'tag-yes' : 'tag-no'}">${c.granted ? 'Autorizado' : 'Não autorizado'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nenhum registro.</p>'}
    ${reqs?.length ? `<h3 style="margin-top:22px">${icon('file')} Solicitações LGPD</h3><div class="orders">${reqs.map((r) => `<div class="order" style="grid-template-columns:1fr auto"><div><h3>${esc(REQ[r.request_type])}</h3><small>${fmtDate(r.created_at)} · ${esc(r.message || '')}</small></div><span class="status st-${esc(r.status)}">${esc(REQ_ST[r.status])}</span></div>`).join('')}</div>` : ''}
  `, { label: 'Ficha do cliente', wide: true });

  const f = $('#cf', m.el);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('.form-msg', f);
    const blocked = f.blocked.checked;
    if (blocked && !u.blocked && !window.confirm(`Bloquear ${u.email}? A pessoa não vai conseguir entrar nem fazer pedidos.`)) return;
    await withLoading($('[type=submit]', f), async () => {
      const { error } = await sb.rpc('admin_update_client', { p_user: id, p_full_name: f.name.value, p_phone: f.phone.value, p_blocked: blocked, p_note: f.note.value });
      if (error) { msg.textContent = error.message; msg.className = 'form-msg show err'; return; }
      toast(blocked && !u.blocked ? 'Conta bloqueada.' : !blocked && u.blocked ? 'Conta desbloqueada.' : 'Cliente atualizado.');
      m.close(); cache.users = null; if (tab === 'clientes' || tab === 'geral') go(tab, false);
    });
  });
  $('[data-export]', m.el).addEventListener('click', () => {
    downloadFile(`cliente-${(u.email || id).replace(/[^\w.-]/g, '_')}.json`, JSON.stringify({
      gerado_em: new Date().toISOString(), cliente: { ...u, admin_note: undefined }, pedidos: orders, consentimentos: consents, solicitacoes_lgpd: reqs,
    }, null, 2));
  });
  $('[data-del]', m.el)?.addEventListener('click', async (e) => {
    if (!window.confirm(`Excluir DEFINITIVAMENTE ${u.email}, o perfil e os pedidos? Use para atender pedidos de exclusão (LGPD).`)) return;
    await withLoading(e.currentTarget, async () => {
      const { error } = await sb.rpc('admin_delete_user', { p_user: id });
      if (error) return toast(error.message, 'err');
      m.close(); toast('Cadastro excluído.'); cache.users = null; go(tab, false);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Pedidos                                                             */
/* ------------------------------------------------------------------ */
async function pedidos(panel) {
  try {
    const [us, { data, error }] = await Promise.all([users(), sb.from('interest_requests').select('*').order('created_at', { ascending: false }).limit(1000)]);
    if (error) throw error;
    const byId = Object.fromEntries(us.map((u) => [u.id, u]));
    const rows = data.map((o) => ({ ...o, cliente: byId[o.user_id]?.full_name || '', email: byId[o.user_id]?.email || '', phone: byId[o.user_id]?.phone || '' }));
    const filter = `<select class="input select-pill" style="padding:8px 14px" data-st><option value="">Todos os status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>`;
    const t = table(panel, {
      title: 'Pedidos de interesse', ic: 'list', rows, csvName: 'pedidos', toolsExtra: filter,
      searchKeys: ['code', 'product_name', 'cliente', 'email', 'phone'],
      columns: [
        { label: 'Código', html: (r) => `<span class="order-code">#${esc(r.code)}</span>`, get: (r) => r.code },
        { label: 'Produto', key: 'product_name' },
        { label: 'Qtd', key: 'quantity' },
        { label: 'Cliente', html: (r) => `<button class="link-btn" data-client="${esc(r.user_id)}"><strong>${esc(r.cliente || 'Sem nome')}</strong></button><br><small>${esc(r.email)}</small>`, get: (r) => `${r.cliente} <${r.email}>` },
        { label: 'WhatsApp', key: 'phone', html: (r) => r.phone ? `<a target="_blank" rel="noopener" href="${esc(waPhone(r.phone, `Olá! Sobre o seu pedido #${r.code} (${r.product_name}) na Collection 3D.`))}">${icon('whatsapp')} ${esc(r.phone)}</a>` : '—' },
        { label: 'Data', get: (r) => fmtDate(r.created_at) },
        { label: 'Status', get: (r) => STATUS[r.status], html: (r) => `<select data-order="${r.id}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v}</option>`).join('')}</select>` },
      ],
      after: (tbody) => {
        $$('[data-order]', tbody).forEach((s) => s.addEventListener('change', async () => {
          const { error } = await sb.from('interest_requests').update({ status: s.value }).eq('id', s.dataset.order);
          if (error) return toast('Erro ao salvar status.', 'err');
          const r = rows.find((x) => String(x.id) === s.dataset.order); if (r) r.status = s.value;
          toast('Status atualizado. O cliente vê a mudança em Meus pedidos.'); badges();
        }));
        $$('[data-client]', tbody).forEach((b) => b.addEventListener('click', () => clientSheet(b.dataset.client)));
      },
    });
    $('[data-st]', panel).addEventListener('change', (e) => { const v = e.target.value; t.setRows(v ? rows.filter((r) => r.status === v) : rows); });
  } catch (e) { err(panel, e); }
}

/* ------------------------------------------------------------------ */
/* Produtos                                                            */
/* ------------------------------------------------------------------ */
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
        { label: 'Visível', get: (r) => (r.active ? 'Sim' : 'Não'), html: (r) => `<label class="switch" title="Mostrar no site"><input type="checkbox" data-vis="${r.id}" ${r.active ? 'checked' : ''} aria-label="Visível no site"><span></span></label>` },
        { label: 'Ordem', key: 'sort_order' },
        { label: 'Ações', csv: false, html: (r) => `<div style="display:flex;gap:6px"><button class="btn btn-sm" data-edit="${r.id}" aria-label="Editar">${icon('edit')}</button><a class="btn btn-sm" href="produtos.html?p=${esc(r.slug)}" target="_blank" aria-label="Ver no site">${icon('external')}</a><button class="btn btn-sm" data-del="${r.id}" aria-label="Excluir" style="--bg:var(--berry-soft)">${icon('trash')}</button></div>` },
      ],
      after: (tbody) => {
        $$('[data-edit]', tbody).forEach((b) => b.addEventListener('click', () => productForm(data.find((p) => p.id === b.dataset.edit), data)));
        $$('[data-vis]', tbody).forEach((c) => c.addEventListener('change', async () => {
          const { error } = await sb.from('products').update({ active: c.checked }).eq('id', c.dataset.vis);
          if (error) { c.checked = !c.checked; return toast('Erro ao salvar.', 'err'); }
          const p = data.find((x) => x.id === c.dataset.vis); if (p) p.active = c.checked;
          toast(c.checked ? 'Produto visível no site.' : 'Produto escondido do site.');
        }));
        $$('[data-del]', tbody).forEach((b) => b.addEventListener('click', async () => {
          const p = data.find((x) => x.id === b.dataset.del);
          if (!window.confirm(`Excluir "${p.name}"? Dica: para só esconder do site, desligue "Visível".`)) return;
          const { error } = await sb.from('products').delete().eq('id', p.id);
          if (error) return toast('Erro ao excluir.', 'err');
          toast('Produto excluído.'); go('produtos', false);
        }));
      },
    });
    $('[data-new]', panel).addEventListener('click', () => productForm(null, data));
  } catch (e) { err(panel, e); }
}

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function compressImage(file, max = 1400) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use JPG, PNG ou WebP.');
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
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
      <div class="field"><label for="p-slug">Endereço (slug) *</label><input id="p-slug" name="slug" maxlength="80" required value="${esc(p.slug)}"><small>Link: produtos.html?p=<b class="slug-prev">${esc(p.slug)}</b></small></div>
      <div class="field"><label for="p-cat">Categoria</label><input id="p-cat" name="category" list="cat-list" maxlength="40" value="${esc(p.category)}"><datalist id="cat-list">${cats.map((c) => `<option value="${esc(c)}">${esc(catOf(c).label)}</option>`).join('')}</datalist><small>Escolha uma ou digite uma nova.</small></div>
      <div class="field"><label for="p-price">Preço (R$) <small>vazio = "sob consulta"</small></label><input id="p-price" name="price" inputmode="decimal" placeholder="19,90" value="${p.price != null ? String(p.price).replace('.', ',') : ''}"></div>
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
      const { error } = await (isNew ? sb.from('products').insert(row) : sb.from('products').update(row).eq('id', p.id));
      if (error) return msg(error.code === '23505' ? 'Já existe um produto com esse slug.' : 'Erro ao salvar: ' + error.message);
      m.close(); toast(isNew ? 'Produto criado!' : 'Produto atualizado!'); go('produtos', false);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Banners da página inicial                                           */
/* ------------------------------------------------------------------ */
const BTHEME = { claro: 'Cinza claro', verde: 'Verde claro', areia: 'Areia', escuro: 'Escuro' };
async function banners(panel) {
  try {
    const { data, error } = await sb.from('site_banners').select('*').order('sort_order').order('created_at');
    if (error) throw error;
    table(panel, {
      title: 'Banners da página inicial', ic: 'image', rows: data, csvName: 'banners',
      intro: '<p class="muted" style="margin-top:-6px">Enquanto não houver banner visível aqui, o site mostra os 4 banners padrão. Use fotos horizontais dos produtos, com fundo limpo (mínimo 1200 px de largura).</p>',
      toolsExtra: `<button class="btn btn-ink btn-sm" data-new>${icon('plus')} Novo banner</button>`,
      searchKeys: ['title', 'subtitle'],
      columns: [
        { label: 'Imagem', csv: false, html: (r) => `<div class="banner-thumb">${safeUrl(r.image_url) ? `<img src="${esc(r.image_url)}" alt="">` : ''}</div>` },
        { label: 'Título', html: (r) => `<strong>${esc(r.title)}</strong><br><small class="muted">${esc(r.subtitle || '')}</small>`, get: (r) => r.title },
        { label: 'Botão', get: (r) => (r.button_text ? `${r.button_text} → ${r.button_link || ''}` : '—') },
        { label: 'Fundo', get: (r) => BTHEME[r.theme] || r.theme },
        { label: 'Ordem', key: 'sort_order' },
        { label: 'Visível', get: (r) => (r.active ? 'Sim' : 'Não'), html: (r) => `<label class="switch"><input type="checkbox" data-bvis="${r.id}" ${r.active ? 'checked' : ''} aria-label="Visível no site"><span></span></label>` },
        { label: 'Ações', csv: false, html: (r) => `<div style="display:flex;gap:6px"><button class="btn btn-sm" data-bedit="${r.id}" aria-label="Editar">${icon('edit')}</button><button class="btn btn-sm" data-bdel="${r.id}" aria-label="Excluir">${icon('trash')}</button></div>` },
      ],
      after: (tbody) => {
        $$('[data-bedit]', tbody).forEach((b) => b.addEventListener('click', () => bannerForm(data.find((x) => x.id === b.dataset.bedit), data)));
        $$('[data-bvis]', tbody).forEach((c) => c.addEventListener('change', async () => {
          const { error } = await sb.from('site_banners').update({ active: c.checked }).eq('id', c.dataset.bvis);
          if (error) { c.checked = !c.checked; return toast('Erro ao salvar.', 'err'); }
          toast(c.checked ? 'Banner visível no site.' : 'Banner escondido.');
        }));
        $$('[data-bdel]', tbody).forEach((b) => b.addEventListener('click', async () => {
          if (!window.confirm('Excluir este banner?')) return;
          const { error } = await sb.from('site_banners').delete().eq('id', b.dataset.bdel);
          if (error) return toast('Erro ao excluir.', 'err');
          toast('Banner excluído.'); go('banners', false);
        }));
      },
    });
    $('[data-new]', panel).addEventListener('click', () => bannerForm(null, data));
  } catch (e) { err(panel, e); }
}

function bannerForm(b, all) {
  const isNew = !b;
  b = b || { title: '', subtitle: '', image_url: '', button_text: 'Ver produtos', button_link: 'produtos.html', theme: 'claro', sort_order: (all.at(-1)?.sort_order || 0) + 1, active: true };
  const m = modal(`
    <h2 class="modal-title">${isNew ? 'Novo banner' : 'Editar banner'}</h2>
    <form class="form-grid" id="bf" novalidate>
      <div class="field full"><label for="b-title">Título *</label><input id="b-title" name="title" maxlength="90" value="${esc(b.title)}" placeholder="Coleção de Natal"><small>Curto: até umas 6 palavras fica melhor.</small></div>
      <div class="field full"><label for="b-sub">Texto de apoio</label><textarea id="b-sub" name="subtitle" maxlength="220" style="min-height:80px">${esc(b.subtitle || '')}</textarea></div>
      <div class="field full"><label>Foto</label>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div class="banner-thumb img-prev">${safeUrl(b.image_url) ? `<img src="${esc(b.image_url)}" alt="">` : ''}</div>
          <label class="btn btn-sm" style="cursor:pointer">${icon('upload')} Enviar foto<input type="file" accept="image/jpeg,image/png,image/webp" hidden name="file"></label>
          <input class="input" name="image_url" placeholder="ou cole o link https://..." value="${esc(b.image_url || '')}" style="flex:1 1 220px">
        </div><small>Aparece na metade direita do banner (no celular, em cima).</small></div>
      <div class="field"><label for="b-bt">Texto do botão</label><input id="b-bt" name="button_text" maxlength="40" value="${esc(b.button_text || '')}"></div>
      <div class="field"><label for="b-bl">Link do botão</label><input id="b-bl" name="button_link" maxlength="600" value="${esc(b.button_link || '')}" placeholder="produtos.html?cat=natal ou https://..."></div>
      <div class="field"><label for="b-theme">Cor de fundo</label><select id="b-theme" name="theme">${Object.entries(BTHEME).map(([k, v]) => `<option value="${k}" ${k === b.theme ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label for="b-order">Ordem</label><input id="b-order" name="sort_order" type="number" value="${b.sort_order ?? 0}"></div>
      <label class="check full"><input type="checkbox" name="active" ${b.active ? 'checked' : ''}><span>Visível no site</span></label>
      <div class="full"><div class="form-msg" role="alert"></div></div>
      <div class="full modal-actions" style="margin-top:0"><button type="button" class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-ink" type="submit">Salvar banner</button></div>
    </form>`, { label: 'Banner', wide: true });
  const f = $('#bf', m.el);
  let file = null;
  f.file.addEventListener('change', () => {
    file = f.file.files[0] || null;
    if (file) $('.img-prev', f).innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`;
  });
  $('[data-x]', f).onclick = m.close;
  const msg = (t) => { const x = $('.form-msg', f); x.textContent = t; x.className = 'form-msg show err'; };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = f.title.value.trim();
    if (title.length < 2) return msg('Escreva um título.');
    const link = f.button_link.value.trim();
    if (link && !/^(https:\/\/|[\w-]+\.html)/.test(link)) return msg('Use um link https:// ou uma página do site (ex.: produtos.html).');
    if (f.image_url.value.trim() && !safeUrl(f.image_url.value)) return msg('O link da foto precisa começar com https://');
    await withLoading($('[type=submit]', f), async () => {
      let image_url = f.image_url.value.trim() || null;
      if (file) {
        try {
          const { blob, ext, type } = await compressImage(file, 1800);
          const path = `banners/banner-${Date.now()}.${ext}`;
          const up = await sb.storage.from('produtos').upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
          if (up.error) throw up.error;
          image_url = sb.storage.from('produtos').getPublicUrl(path).data.publicUrl;
        } catch (er) { return msg('Falha no envio da foto: ' + (er.message || er)); }
      }
      const row = { title: title.slice(0, 90), subtitle: f.subtitle.value.trim() || null, image_url, button_text: f.button_text.value.trim() || null,
        button_link: link || null, theme: f.theme.value, sort_order: parseInt(f.sort_order.value, 10) || 0, active: f.active.checked };
      const { error } = await (isNew ? sb.from('site_banners').insert(row) : sb.from('site_banners').update(row).eq('id', b.id));
      if (error) return msg('Erro ao salvar: ' + error.message);
      m.close(); toast(isNew ? 'Banner criado.' : 'Banner atualizado.'); go('banners', false);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Configurações do site + segurança                                   */
/* ------------------------------------------------------------------ */
async function config(panel) {
  try {
    const [{ data: rows, error }, { data: admins }, { data: aal }, { data: factors }] = await Promise.all([
      sb.from('site_settings').select('key,value'), sb.rpc('admin_list_admins'),
      sb.auth.mfa.getAuthenticatorAssuranceLevel(), sb.auth.mfa.listFactors(),
    ]);
    if (error) throw error;
    const st = Object.fromEntries((rows || []).map((r) => [r.key, r.value]));
    const field = (k, label, ph, hint = '') => `<div class="field full"><label for="s-${k}">${label}</label><input id="s-${k}" name="${k}" maxlength="600" placeholder="${ph}" value="${esc(st[k] || '')}">${hint ? `<small>${hint}</small>` : ''}</div>`;
    panel.innerHTML = `
      <div class="card">
        <h2>${icon('store')} Links das lojas</h2>
        <p class="muted">Mudou o link de alguma loja? Troque aqui e o site inteiro atualiza. Deixe vazio para usar o padrão do <code>config.js</code>.</p>
        <form class="form-grid" id="links-form" novalidate>
          ${field('shopeeUrl', `${icon('shopee')} Loja na Shopee`, 'https://shopee.com.br/sua-loja')}
          ${field('tiktokUrl', `${icon('tiktok')} TikTok Shop`, 'https://www.tiktok.com/@collection_3d')}
          ${field('instagramUrl', `${icon('instagram')} Instagram`, 'https://www.instagram.com/collection_3d_/')}
          ${field('calculatorSalesUrl', `${icon('calc')} Link de venda da Calculadora`, 'https://pay.hotmart.com/...', 'Preenchido = botão “Comprar agora” aparece na aba Calculadora.')}
          <div class="full"><div class="form-msg" role="alert"></div></div>
          <div class="full"><button class="btn btn-ink" type="submit">${icon('check')} Salvar links</button></div>
        </form>
      </div>
      <div class="card">
        <h2>${icon('bell')} Barra de aviso no topo do site</h2>
        <p class="muted">Para promoções, frete grátis, lançamentos ou recados (ex.: “Pedidos de Natal até 15/12!”).</p>
        <form class="form-grid" id="ann-form" novalidate>
          <label class="ck-row full"><div><strong>Mostrar barra de aviso</strong><small>Aparece no topo de todas as páginas.</small></div>
            <span class="switch"><input type="checkbox" name="announcementOn" ${st.announcementOn === 'true' ? 'checked' : ''}><span></span></span></label>
          <div class="field full"><label for="s-ann">Texto</label><input id="s-ann" name="announcement" maxlength="140" value="${esc(st.announcement || '')}" placeholder="Encomendas de Natal abertas até 15/12"></div>
          <div class="field full"><label for="s-annl">Link ao clicar <small>(opcional)</small></label><input id="s-annl" name="announcementLink" maxlength="600" value="${esc(st.announcementLink || '')}" placeholder="produtos.html?cat=natal ou https://..."></div>
          <div class="full"><div class="ann-preview">${icon('bell')} <span>${esc(st.announcement || 'Prévia do aviso')}</span></div></div>
          <div class="full"><div class="form-msg" role="alert"></div></div>
          <div class="full"><button class="btn btn-ink" type="submit">${icon('check')} Salvar aviso</button></div>
        </form>
      </div>
      <div class="card">
        <h2>${icon('shield')} Segurança do painel</h2>
        <dl class="kv">
          <dt>Verificação em 2 etapas</dt><dd>${aal?.currentLevel === 'aal2' ? '<span class="tag-yes">Ativa nesta sessão ✓</span>' : 'Não confirmada nesta sessão'} · ${(factors?.totp || []).filter((x) => x.status === 'verified').length} autenticador(es) cadastrado(s)</dd>
          <dt>Administradores</dt><dd>${(admins || []).map((a) => `${esc(a.email)} <small>(desde ${fmtDate(a.desde, false)})</small>`).join('<br>') || '—'}</dd>
        </dl>
        <p class="muted" style="font-size:.88rem;margin-top:14px">${icon('lock')} Por segurança, <strong>não existe botão</strong> para criar outro admin: só pelo SQL no Supabase. Assim, mesmo que alguém invada uma conta comum, nunca vira admin.</p>
        <button class="btn btn-sm" data-global>${icon('logout')} Sair de todos os aparelhos</button>
      </div>`;
    const save = async (form, keys) => {
      const msg = $('.form-msg', form);
      const vals = keys.map((k) => ({ key: k, value: form[k].type === 'checkbox' ? String(form[k].checked) : form[k].value.trim() }));
      for (const v of vals) {
        if (/Url$/.test(v.key) && v.value && !/^https:\/\//.test(v.value)) { msg.textContent = 'Os links precisam começar com https://'; msg.className = 'form-msg show err'; return; }
        if (v.key === 'announcementLink' && v.value && !/^(https:\/\/|[\w-]+\.html)/.test(v.value)) { msg.textContent = 'Use um link https:// ou uma página do site (ex.: produtos.html).'; msg.className = 'form-msg show err'; return; }
      }
      await withLoading($('[type=submit]', form), async () => {
        const del = vals.filter((v) => !v.value || v.value === 'false' && v.key !== 'announcementOn').map((v) => v.key);
        const up = vals.filter((v) => !del.includes(v.key)).map((v) => ({ ...v, updated_at: new Date().toISOString() }));
        if (up.length) { const { error } = await sb.from('site_settings').upsert(up); if (error) { msg.textContent = error.message; msg.className = 'form-msg show err'; return; } }
        if (del.length) await sb.from('site_settings').delete().in('key', del);
        try { localStorage.removeItem('c3d_settings'); } catch {}
        msg.textContent = 'Salvo! Já está valendo no site.'; msg.className = 'form-msg show ok';
      });
    };
    const lf = $('#links-form', panel), af = $('#ann-form', panel);
    lf.addEventListener('submit', (e) => { e.preventDefault(); save(lf, ['shopeeUrl', 'tiktokUrl', 'instagramUrl', 'calculatorSalesUrl']); });
    af.addEventListener('submit', (e) => { e.preventDefault(); save(af, ['announcementOn', 'announcement', 'announcementLink']); });
    af.announcement.addEventListener('input', () => { $('.ann-preview span', af).textContent = af.announcement.value || 'Prévia do aviso'; });
    $('[data-global]', panel).addEventListener('click', (e) => withLoading(e.currentTarget, async () => { await signOut('global'); location.href = 'entrar.html'; }));
  } catch (e) { err(panel, e); }
}

/* ------------------------------------------------------------------ */
/* Lista da calculadora                                                */
/* ------------------------------------------------------------------ */
async function lista(panel) {
  try {
    const { data, error } = await sb.from('calculator_waitlist').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    table(panel, {
      title: 'Lista de espera da calculadora', ic: 'calc', rows: data, csvName: 'lista-calculadora', searchKeys: ['email'],
      intro: '<p class="muted" style="margin-top:-6px">Exporte em CSV para avisar no lançamento. Essas pessoas autorizaram <strong>só</strong> o aviso da calculadora.</p>',
      columns: [
        { label: 'E-mail', key: 'email' },
        { label: 'Tem conta', get: (r) => (r.user_id ? 'Sim' : 'Não') },
        { label: 'Inscrição', get: (r) => fmtDate(r.created_at) },
        { label: 'Ações', csv: false, html: (r) => `<button class="btn btn-sm" data-rm="${r.id}" style="--bg:var(--berry-soft)" aria-label="Remover">${icon('trash')}</button>` },
      ],
      after: (tbody) => $$('[data-rm]', tbody).forEach((b) => b.addEventListener('click', async () => {
        if (!window.confirm('Remover este e-mail da lista (ex.: pedido de descadastro)?')) return;
        const { error } = await sb.from('calculator_waitlist').delete().eq('id', b.dataset.rm);
        if (error) return toast('Erro ao remover.', 'err');
        toast('Removido da lista.'); go('lista', false);
      })),
    });
  } catch (e) { err(panel, e); }
}

/* ------------------------------------------------------------------ */
/* LGPD                                                                */
/* ------------------------------------------------------------------ */
async function lgpd(panel) {
  try {
    const { data, error } = await sb.from('data_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    table(panel, {
      title: 'Solicitações LGPD', ic: 'shield', rows: data, csvName: 'solicitacoes-lgpd', searchKeys: ['email', 'message', 'request_type'],
      intro: '<p class="muted" style="margin-top:-6px">Prazo para responder: 15 dias. Para exportar ou excluir os dados de alguém, abra a ficha do cliente em <strong>Clientes</strong>.</p>',
      columns: [
        { label: 'Data', get: (r) => fmtDate(r.created_at) },
        { label: 'Prazo', html: (r) => { const d = new Date(new Date(r.created_at).getTime() + 15 * 864e5); const late = d < new Date() && ['aberta', 'em_andamento'].includes(r.status); return `<span class="${late ? 'status st-cancelado' : ''}">${fmtDate(d, false)}</span>`; }, get: (r) => fmtDate(new Date(new Date(r.created_at).getTime() + 15 * 864e5), false) },
        { label: 'Cliente', html: (r) => r.user_id ? `<button class="link-btn" data-client="${esc(r.user_id)}">${esc(r.email)}</button>` : esc(r.email), get: (r) => r.email },
        { label: 'Tipo', get: (r) => REQ[r.request_type] || r.request_type },
        { label: 'Mensagem', key: 'message' },
        { label: 'Status / resposta', get: (r) => `${REQ_ST[r.status]} ${r.response || ''}`, html: (r) => `
          <div style="display:grid;gap:6px;min-width:240px">
            <select data-rs="${r.id}">${Object.entries(REQ_ST).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
            <textarea class="input" data-rr="${r.id}" rows="2" maxlength="2000" placeholder="Resposta ao titular (ele vê na conta)">${esc(r.response || '')}</textarea>
            <button class="btn btn-sm" data-rsave="${r.id}">${icon('check')} Salvar</button>
          </div>` },
      ],
      after: (tbody) => {
        $$('[data-rsave]', tbody).forEach((b) => b.addEventListener('click', () => withLoading(b, async () => {
          const id = b.dataset.rsave, status = $(`[data-rs="${id}"]`, tbody).value;
          const { error } = await sb.from('data_requests').update({
            status, response: $(`[data-rr="${id}"]`, tbody).value.trim() || null,
            resolved_at: ['concluida', 'recusada'].includes(status) ? new Date().toISOString() : null,
          }).eq('id', id);
          if (error) return toast('Erro ao salvar.', 'err');
          toast('Solicitação atualizada.'); badges();
        })));
        $$('[data-client]', tbody).forEach((b) => b.addEventListener('click', () => clientSheet(b.dataset.client)));
      },
    });
  } catch (e) { err(panel, e); }
}

/* ------------------------------------------------------------------ */
/* Consentimentos                                                      */
/* ------------------------------------------------------------------ */
async function consentimentos(panel) {
  try {
    const [us, { data, error }] = await Promise.all([users(), sb.from('consent_logs').select('*').order('created_at', { ascending: false }).limit(2000)]);
    if (error) throw error;
    const byId = Object.fromEntries(us.map((u) => [u.id, u.email]));
    table(panel, {
      title: 'Registros de consentimento', ic: 'file', rows: data, csvName: 'consentimentos',
      intro: '<p class="muted" style="margin-top:-6px">Prova de quem autorizou o quê e quando (LGPD art. 8º). Ninguém consegue alterar estes registros.</p>',
      searchKeys: [(r) => byId[r.user_id], 'consent_type', 'anon_id'],
      columns: [
        { label: 'Data', get: (r) => fmtDate(r.created_at) },
        { label: 'Titular', get: (r) => byId[r.user_id] || (r.anon_id ? `Visitante ${String(r.anon_id).slice(0, 8)}` : 'Anônimo') },
        { label: 'Tipo', get: (r) => CONSENT_T[r.consent_type] || r.consent_type },
        { label: 'Situação', get: (r) => (r.granted ? 'Autorizado' : 'Não autorizado'), html: (r) => r.granted ? '<span class="tag-yes">Autorizado</span>' : '<span class="tag-no">Não autorizado</span>' },
        { label: 'Versão', key: 'policy_version' },
        { label: 'Detalhes', get: (r) => Object.entries(r.details || {}).map(([k, v]) => `${k}: ${v}`).join(', ') },
      ],
    });
  } catch (e) { err(panel, e); }
}

/* ------------------------------------------------------------------ */
/* Histórico do painel                                                 */
/* ------------------------------------------------------------------ */
async function historico(panel) {
  try {
    const [us, { data, error }] = await Promise.all([users(), sb.from('admin_audit').select('*').order('created_at', { ascending: false }).limit(1000)]);
    if (error) throw error;
    const byId = Object.fromEntries(us.map((u) => [u.id, u.email]));
    const ACT = { insert: 'Criou', update: 'Alterou', delete: 'Excluiu', bloquear: 'Bloqueou', desbloquear: 'Desbloqueou' };
    const ENT = { site_banners: 'banner', products: 'produto', interest_requests: 'pedido', data_requests: 'solicitação LGPD', site_settings: 'configuração', calculator_waitlist: 'e-mail da lista', cliente: 'cliente' };
    const what = (r) => {
      const d = r.details || {};
      if (r.entity === 'products') return d.name?.para || d.name || d.slug || '';
      if (r.entity === 'interest_requests') return d.code ? `#${d.code}` : `pedido ${r.entity_id}`;
      if (r.entity === 'cliente') return d.email || d.nome || byId[r.entity_id] || '';
      if (r.entity === 'site_settings') return r.entity_id;
      if (r.entity === 'site_banners') return d.title?.para || d.title || '';
      if (r.entity === 'calculator_waitlist') return d.email || '';
      return r.entity_id;
    };
    const changes = (r) => {
      const d = r.details || {};
      if (r.action !== 'update') return '';
      return Object.entries(d).filter(([, v]) => v && typeof v === 'object' && 'para' in v)
        .map(([k, v]) => `${k}: ${v.de ?? '—'} → ${v.para ?? '—'}`).join(' · ') || Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ');
    };
    table(panel, {
      title: 'Histórico do painel', ic: 'clock', rows: data, csvName: 'historico',
      intro: '<p class="muted" style="margin-top:-6px">Tudo que foi alterado no painel fica registrado aqui e não pode ser apagado.</p>',
      searchKeys: [(r) => what(r), 'entity', 'action', (r) => changes(r)],
      columns: [
        { label: 'Quando', get: (r) => fmtDate(r.created_at) },
        { label: 'Quem', get: (r) => byId[r.admin_id] || '—' },
        { label: 'Ação', get: (r) => `${ACT[r.action] || r.action} ${ENT[r.entity] || r.entity}` },
        { label: 'Item', get: what },
        { label: 'Mudanças', get: (r) => changes(r).slice(0, 300) },
      ],
    });
  } catch (e) { err(panel, e); }
}
