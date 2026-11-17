// Núcleo do site: cabeçalho, rodapé, cookies (LGPD), aceite de termos e animações.
import { CONFIG, isSupabaseConfigured } from './config.js';
import { icon } from './icons.js';
import { $, $$, esc, waLink, toast, prefersReducedMotion } from './utils.js';
import { getSupabase } from './supa.js';
import { auth, onAuth, initAuth, displayName, signOut, refreshProfile } from './auth-store.js';

const page = document.body.dataset.page || '';

/* Configurações editáveis no painel (links das lojas, barra de aviso).
   Usa a última versão salva no navegador e atualiza em segundo plano. */
const SETTINGS_KEY = 'c3d_settings';
const URL_KEYS = ['shopeeUrl', 'tiktokUrl', 'instagramUrl', 'calculatorSalesUrl'];
let settings = {};
function applySettings(st) {
  settings = st || {};
  URL_KEYS.forEach((k) => { if (/^https:\/\//.test(settings[k] || '')) CONFIG[k] = settings[k]; });
}
try { applySettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch {}

const NAV = [
  { id: 'inicio', href: 'index.html', label: 'Início', ic: 'home' },
  { id: 'produtos', href: 'produtos.html', label: 'Produtos', ic: 'box' },
  { id: 'lojas', href: 'lojas.html', label: 'Lojas', ic: 'store' },
  { id: 'pedidos', href: 'pedidos.html', label: 'Pedidos', ic: 'list' },
  { id: 'calculadora', href: 'calculadora.html', label: 'Calculadora', ic: 'calc', soon: true },
  { id: 'contato', href: 'contato.html', label: 'Contato', ic: 'comments' },
];

export const CHANNELS = [
  { id: 'shopee', label: 'Shopee', href: CONFIG.shopeeUrl, key: 'shopeeUrl', ic: 'shopee', tip: 'Loja na Shopee' },
  { id: 'tiktok', label: 'TikTok Shop', href: CONFIG.tiktokUrl, key: 'tiktokUrl', ic: 'tiktok', tip: 'TikTok Shop ' + CONFIG.tiktokHandle },
  { id: 'instagram', label: 'Instagram', href: CONFIG.instagramUrl, key: 'instagramUrl', ic: 'instagram', tip: 'Instagram ' + CONFIG.instagramHandle },
  { id: 'whatsapp', label: 'WhatsApp', href: waLink('Olá, Collection 3D! Vim pelo site e queria tirar uma dúvida.'), ic: 'whatsapp', tip: 'WhatsApp' },
];

/* ------------------------------------------------------------------ */
/* Cabeçalho                                                           */
/* ------------------------------------------------------------------ */
function renderHeader() {
  const host = $('#site-header');
  if (!host) return;
  const links = NAV.map((n) => `
    <li><a href="${n.href}" data-nav="${n.id}" ${n.id === page ? 'aria-current="page"' : ''}>
      ${esc(n.label)}${n.soon ? '<span class="soon-dot" title="Em breve"></span>' : ''}
    </a></li>`).join('');
  const socials = CHANNELS.slice(0, 3).map((c) => `
    <a class="icon-btn brand-${c.id}" href="${esc(c.href)}" ${c.key ? `data-href="${c.key}"` : ''} target="_blank" rel="noopener" aria-label="${esc(c.tip)}" data-tip="${esc(c.label)}">${icon(c.ic)}</a>`).join('');

  host.outerHTML = `
  <a class="skip-link" href="#main">Pular para o conteúdo</a>
  <header class="site-header" id="top">
    <div class="container header-inner">
      <a class="brand" href="index.html" aria-label="Collection 3D — página inicial">
        <img src="assets/img/logo-900.png" alt="Collection 3D" width="900" height="362">
      </a>
      <nav class="main-nav" aria-label="Principal">
        <ul>${links}</ul>
        <span class="nav-indicator" aria-hidden="true"></span>
      </nav>
      <div class="header-actions">
        <div class="header-socials">${socials}</div>
        <div class="account-slot"><a class="btn btn-ink btn-sm" href="entrar.html">${icon('user')}<span>Entrar</span></a></div>
        <button class="icon-btn menu-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-nav">${icon('menu')}</button>
      </div>
    </div>
  </header>
  <div class="mobile-nav" id="mobile-nav" hidden>
    <div class="mobile-nav-panel" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="mobile-nav-head">
        <img src="assets/img/logo-900.png" alt="Collection 3D" width="900" height="362">
        <button class="icon-btn menu-close" aria-label="Fechar menu">${icon('close')}</button>
      </div>
      <ul class="mobile-links">
        ${NAV.map((n) => `<li><a href="${n.href}" ${n.id === page ? 'aria-current="page"' : ''}>${icon(n.ic)}<span>${esc(n.label)}</span>${n.soon ? '<em class="chip chip-soon">em breve</em>' : ''}${icon('chevronRight', 'chev')}</a></li>`).join('')}
      </ul>
      <div class="mobile-account account-slot-m"></div>
      <div class="mobile-socials">
        ${CHANNELS.map((c) => `<a class="channel-pill brand-${c.id}" href="${esc(c.href)}" ${c.key ? `data-href="${c.key}"` : ''} target="_blank" rel="noopener">${icon(c.ic)}<span>${esc(c.label)}</span></a>`).join('')}
      </div>
    </div>
  </div>`;

  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // indicador deslizante do menu
  const nav = $('.main-nav'); const ind = $('.nav-indicator');
  const moveTo = (a) => {
    if (!a) { ind.style.opacity = 0; return; }
    const r = a.getBoundingClientRect(), p = nav.getBoundingClientRect();
    ind.style.opacity = 1;
    ind.style.width = r.width + 'px';
    ind.style.transform = `translateX(${r.left - p.left}px)`;
  };
  const current = () => $('a[aria-current="page"]', nav);
  requestAnimationFrame(() => moveTo(current()));
  addEventListener('resize', () => moveTo(current()));
  $$('a', nav).forEach((a) => a.addEventListener('pointerenter', () => moveTo(a)));
  nav.addEventListener('pointerleave', () => moveTo(current()));

  // menu mobile
  const mob = $('#mobile-nav'); const tog = $('.menu-toggle');
  const open = () => { mob.hidden = false; requestAnimationFrame(() => mob.classList.add('open')); tog.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('.menu-close').focus(); };
  const close = () => { mob.classList.remove('open'); tog.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; setTimeout(() => (mob.hidden = true), 300); };
  tog.addEventListener('click', open);
  $('.menu-close').addEventListener('click', close);
  mob.addEventListener('click', (e) => { if (e.target === mob) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mob.hidden) close(); });
}

function renderAccount(a) {
  const slot = $('.account-slot'); const slotM = $('.account-slot-m');
  if (!slot) return;
  if (!a.user) {
    slot.innerHTML = `<a class="btn btn-ink btn-sm" href="entrar.html">${icon('user')}<span>Entrar</span></a>`;
    if (slotM) slotM.innerHTML = `<a class="btn btn-ink btn-block" href="entrar.html">${icon('login')} Entrar ou criar conta</a>`;
    return;
  }
  const name = displayName(a);
  const initial = esc(name.trim()[0]?.toUpperCase() || 'C');
  slot.innerHTML = `
    <div class="account-menu">
      <button class="avatar-btn" aria-haspopup="true" aria-expanded="false" aria-label="Minha conta">
        <span class="avatar">${initial}</span><span class="avatar-name">${esc(name.split(' ')[0])}</span>${icon('chevronDown')}
      </button>
      <div class="dropdown" role="menu" hidden>
        <p class="dropdown-head"><strong>${esc(name)}</strong><small>${esc(a.user.email || '')}</small></p>
        <a role="menuitem" href="conta.html">${icon('user')} Minha conta</a>
        <a role="menuitem" href="pedidos.html">${icon('list')} Meus pedidos</a>
        <a role="menuitem" href="conta.html#privacidade">${icon('shield')} Privacidade e dados</a>
        ${a.adminAccount ? `<a role="menuitem" href="admin.html">${icon('gear')} Painel admin</a>` : ''}
        <button role="menuitem" class="logout">${icon('logout')} Sair</button>
      </div>
    </div>`;
  if (slotM) slotM.innerHTML = `
    <a class="btn btn-ghost btn-block" href="conta.html">${icon('user')} ${esc(name)}</a>
    ${a.adminAccount ? `<a class="btn btn-ghost btn-block" href="admin.html">${icon('gear')} Painel admin</a>` : ''}
    <button class="btn btn-ghost btn-block logout">${icon('logout')} Sair</button>`;
  const btn = $('.avatar-btn', slot); const dd = $('.dropdown', slot);
  const toggle = (show) => { dd.hidden = !show; btn.setAttribute('aria-expanded', String(show)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(dd.hidden); });
  document.addEventListener('click', () => toggle(false));
  $$('.logout').forEach((b) => b.addEventListener('click', async () => {
    await signOut(); toast('Você saiu da sua conta.');
    if (['conta', 'admin'].includes(page)) location.href = 'index.html';
  }));
}

/* ------------------------------------------------------------------ */
/* Rodapé                                                              */
/* ------------------------------------------------------------------ */
function renderFooter() {
  const host = $('#site-footer');
  if (!host) return;
  const year = new Date().getFullYear();
  const legal = [CONFIG.razaoSocial, CONFIG.cnpj && `CNPJ ${CONFIG.cnpj}`, CONFIG.cidadeUf].filter(Boolean).map(esc).join(' · ');
  host.outerHTML = `
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a href="index.html" class="footer-logo"><img src="assets/img/logo-900.png" alt="Collection 3D" width="900" height="362" loading="lazy"></a>
        <p>Chaveiros, miniaturas e acessórios colecionáveis, com collabs oficiais e novidades toda semana.</p>
        <div class="footer-socials">
          ${CHANNELS.map((c) => `<a class="icon-btn brand-${c.id}" href="${esc(c.href)}" ${c.key ? `data-href="${c.key}"` : ''} target="_blank" rel="noopener" aria-label="${esc(c.tip)}">${icon(c.ic)}</a>`).join('')}
        </div>
      </div>
      <nav class="footer-col" aria-label="Navegação">
        <h3>Navegação</h3>
        <ul>${NAV.map((n) => `<li><a href="${n.href}">${esc(n.label)}${n.soon ? ' <em class="chip chip-soon">em breve</em>' : ''}</a></li>`).join('')}</ul>
      </nav>
      <nav class="footer-col" aria-label="Onde comprar">
        <h3>Onde comprar</h3>
        <ul>${CHANNELS.map((c) => `<li><a href="${esc(c.href)}" ${c.key ? `data-href="${c.key}"` : ''} target="_blank" rel="noopener">${esc(c.label)}</a></li>`).join('')}</ul>
      </nav>
      <nav class="footer-col" aria-label="Legal">
        <h3>Privacidade</h3>
        <ul>
          <li><a href="privacidade.html">Política de Privacidade</a></li>
          <li><a href="termos.html">Termos de Uso</a></li>
          <li><a href="cookies.html">Política de Cookies</a></li>
          <li><button type="button" class="link-btn" data-open-cookies>Preferências de cookies</button></li>
          <li><a href="privacidade.html#direitos">Seus direitos (LGPD)</a></li>
        </ul>
      </nav>
      <div class="footer-col">
        <h3>Contato</h3>
        <ul class="footer-contact">
          <li><a href="${waLink('Olá, Collection 3D! Vim pelo site.')}" target="_blank" rel="noopener">${icon('whatsapp')} ${esc(CONFIG.whatsappDisplay)}</a></li>
          <li><a href="mailto:${esc(CONFIG.email)}">${icon('mail')} ${esc(CONFIG.email)}</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© ${year} ${esc(CONFIG.siteName)}. Todos os direitos reservados.${legal ? `<br><span>${legal}</span>` : ''}</p>
      <p class="footer-note">Este site não realiza vendas: os pedidos são combinados pelo WhatsApp ou feitos nos marketplaces oficiais. Imagens meramente ilustrativas. Marcas citadas pertencem aos seus respectivos titulares.</p>
    </div>
  </footer>`;
}

/* ------------------------------------------------------------------ */
/* Cookies (LGPD) — essenciais sempre; estatística/marketing só com OK  */
/* ------------------------------------------------------------------ */
const CK = 'c3d_cookie_consent';
const COOKIE_POLICY_VERSION = CONFIG.termsVersion;

export function getCookieConsent() {
  try {
    const c = JSON.parse(localStorage.getItem(CK) || 'null');
    if (!c || c.version !== COOKIE_POLICY_VERSION) return null;
    if (Date.now() - c.at > 1000 * 60 * 60 * 24 * 180) return null; // pede de novo a cada 6 meses
    return c;
  } catch { return null; }
}

function anonId() {
  let id = localStorage.getItem('c3d_anon_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('c3d_anon_id', id); }
  return id;
}

async function saveCookieConsent(analytics, marketing) {
  const c = { version: COOKIE_POLICY_VERSION, at: Date.now(), necessary: true, analytics: !!analytics, marketing: !!marketing };
  try { localStorage.setItem(CK, JSON.stringify(c)); } catch {}
  document.cookie = `c3d_consent=${c.analytics ? 'a1' : 'a0'}${c.marketing ? 'm1' : 'm0'}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax; Secure`;
  window.c3dConsent = c;
  document.dispatchEvent(new CustomEvent('c3d:consent', { detail: c }));
  hideCookieBanner();
  // registro de prova do consentimento (sem IP, sem dados pessoais)
  try {
    const sb = await getSupabase();
    if (sb) await sb.from('consent_logs').insert({
      anon_id: anonId(), user_id: auth.user?.id ?? null, consent_type: 'cookies',
      granted: c.analytics || c.marketing, policy_version: COOKIE_POLICY_VERSION,
      details: { essenciais: true, estatisticas: c.analytics, marketing: c.marketing },
    });
  } catch {}
}

function hideCookieBanner() {
  const b = $('.cookie-banner'); if (b) { b.classList.remove('show'); setTimeout(() => b.remove(), 400); }
}

function showCookieBanner() {
  if ($('.cookie-banner')) return;
  const el = document.createElement('section');
  el.className = 'cookie-banner';
  el.setAttribute('aria-label', 'Aviso de cookies');
  el.innerHTML = `
    <div class="cookie-text">
      <h2>Sua privacidade</h2>
      <p>Usamos cookies essenciais para o site funcionar (login e segurança). Cookies de estatística e marketing só são usados se você permitir. <a href="cookies.html">Política de Cookies</a></p>
    </div>
    <div class="cookie-actions">
      <button class="btn btn-ghost btn-sm" data-ck="reject">Rejeitar não essenciais</button>
      <button class="btn btn-ghost btn-sm" data-ck="custom">Personalizar</button>
      <button class="btn btn-ink btn-sm" data-ck="accept">Aceitar todos</button>
    </div>`;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-ck]')?.dataset.ck;
    if (k === 'accept') saveCookieConsent(true, true);
    if (k === 'reject') saveCookieConsent(false, false);
    if (k === 'custom') openCookiePrefs();
  });
}

export function openCookiePrefs() {
  const cur = getCookieConsent() || { analytics: false, marketing: false };
  const m = modal(`
    <h2 class="modal-title">Preferências de cookies</h2>
    <p class="muted">Escolha o que podemos usar. Você pode mudar isso a qualquer momento no rodapé do site.</p>
    <div class="ck-list">
      <label class="ck-row"><div><strong>Essenciais</strong><small>Login, segurança e lembrar suas escolhas. Sem eles o site não funciona.</small></div>
        <span class="switch is-locked"><input type="checkbox" checked disabled><span></span></span></label>
      <label class="ck-row"><div><strong>Estatísticas</strong><small>Contagem de visitas feita pelo próprio site, sem Google nem outras empresas: página vista, de onde veio e tipo de aparelho. Nada de nome, e-mail ou IP.</small></div>
        <span class="switch"><input type="checkbox" name="analytics" ${cur.analytics ? 'checked' : ''}><span></span></span></label>
      <label class="ck-row"><div><strong>Marketing</strong><small>Medir anúncios e campanhas nas redes sociais. (Hoje não usamos nenhuma ferramenta desse tipo.)</small></div>
        <span class="switch"><input type="checkbox" name="marketing" ${cur.marketing ? 'checked' : ''}><span></span></span></label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-act="reject">Rejeitar não essenciais</button>
      <button class="btn btn-ink" data-act="save">Salvar escolhas</button>
    </div>`, { label: 'Preferências de cookies' });
  m.el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'save') { saveCookieConsent($('[name=analytics]', m.el).checked, $('[name=marketing]', m.el).checked); m.close(); toast('Preferências de cookies salvas.'); }
    if (act === 'reject') { saveCookieConsent(false, false); m.close(); toast('Somente cookies essenciais ativos.'); }
  });
}

/* ------------------------------------------------------------------ */
/* Modal genérico                                                      */
/* ------------------------------------------------------------------ */
export function modal(html, { label = 'Janela', dismissible = true, wide = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">
    ${dismissible ? `<button class="icon-btn modal-x" aria-label="Fechar">${icon('close')}</button>` : ''}
    <div class="modal-body">${html}</div></div>`;
  const prevFocus = document.activeElement;
  document.body.append(wrap);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => wrap.classList.add('show'));
  const box = $('.modal', wrap); box.focus();
  const close = () => {
    wrap.classList.remove('show');
    document.body.classList.remove('no-scroll');
    removeEventListener('keydown', onKey);
    setTimeout(() => wrap.remove(), 250);
    prevFocus?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && dismissible) close();
    if (e.key === 'Tab') { // mantém o foco dentro do modal
      const f = $$('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])', box).filter((x) => !x.disabled && x.offsetParent);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  addEventListener('keydown', onKey);
  if (dismissible) {
    $('.modal-x', wrap).addEventListener('click', close);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  }
  return { el: wrap, close };
}

/* ------------------------------------------------------------------ */
/* Aceite de termos (quem entrou por Google/Apple/código)              */
/* ------------------------------------------------------------------ */
let gateOpen = false;
function termsGate(a) {
  if (!a.user || gateOpen) return;
  if (a.profile && a.profile.accepted_terms_at && a.profile.terms_version === CONFIG.termsVersion) return;
  if (page === 'redefinir-senha') return;
  gateOpen = true;
  const updated = !!a.profile?.accepted_terms_at;
  const m = modal(`
    <div class="gate-icon">${icon('shield')}</div>
    <h2 class="modal-title">${updated ? 'Atualizamos nossos termos' : 'Só falta um passo'}</h2>
    <p class="muted">${updated ? 'Leia as novas versões e confirme para continuar usando sua conta.' : 'Para usar sua conta, precisamos do seu aceite. Coletamos apenas o necessário: nome, e-mail e, se você quiser, telefone.'}</p>
    <form class="stack gate-form">
      <label class="check"><input type="checkbox" name="terms" required><span>Li e aceito os <a href="termos.html" target="_blank">Termos de Uso</a> e a <a href="privacidade.html" target="_blank">Política de Privacidade</a>.</span></label>
      <label class="check"><input type="checkbox" name="adult" required><span>Tenho 18 anos ou mais, ou tenho autorização do meu responsável legal.</span></label>
      <label class="check"><input type="checkbox" name="mkt" ${a.profile?.marketing_opt_in ? 'checked' : ''}><span>Quero receber novidades e lançamentos por e-mail (opcional — dá para cancelar quando quiser).</span></label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-out>Sair da conta</button>
        <button class="btn btn-ink" type="submit">Confirmar e continuar</button>
      </div>
    </form>`, { label: 'Aceite dos termos', dismissible: false });
  $('[data-out]', m.el).addEventListener('click', async () => { await signOut(); m.close(); gateOpen = false; location.href = 'index.html'; });
  $('.gate-form', m.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const sb = await getSupabase();
    const { error } = await sb.rpc('accept_terms', { p_version: CONFIG.termsVersion, p_marketing: f.mkt.checked });
    if (error) { toast('Não foi possível salvar. Tente de novo.', 'err'); return; }
    m.close(); gateOpen = false; toast('Cadastro concluído. Bem-vindo(a) à Collection 3D.');
    refreshProfile();
  });
}

/* ------------------------------------------------------------------ */
/* Animações e interações                                              */
/* ------------------------------------------------------------------ */
export function initReveal(root = document) {
  const els = $$('[data-reveal]:not(.in)', root);
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((e, i) => { e.style.setProperty('--d', `${(i % 6) * 60}ms`); io.observe(e); });
}

export function initTilt(root = document) {
  if (prefersReducedMotion() || matchMedia('(hover: none)').matches) return;
  $$('[data-tilt]', root).forEach((el) => {
    if (el.dataset.tiltOn) return; el.dataset.tiltOn = 1;
    const max = Number(el.dataset.tilt) || 8;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
}

export function initCounters(root = document) {
  $$('[data-count]', root).forEach((el) => {
    const end = parseFloat(el.dataset.count.replace(',', '.'));
    const dec = (el.dataset.count.split(/[.,]/)[1] || '').length;
    const prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '';
    const fmt = (v) => prefix + v.toFixed(dec).replace('.', ',') + suffix;
    if (prefersReducedMotion()) { el.textContent = fmt(end); return; }
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return; io.disconnect();
      const t0 = performance.now(), dur = 1200;
      const step = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = fmt(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    io.observe(el);
  });
}

function bindGlobal() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-cookies]')) { e.preventDefault(); openCookiePrefs(); }
  });
  // preenche dados do config.js em páginas estáticas (ex.: política de privacidade)
  $$('[data-cfg]').forEach((el) => {
    const v = CONFIG[el.dataset.cfg];
    if (v) el.textContent = v; else if (el.dataset.cfgHide !== undefined) el.closest(el.dataset.cfgHide || '*')?.remove();
  });
  $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });
  $$('[data-href]').forEach((a) => { const v = CONFIG[a.dataset.href]; if (v) { a.href = v; a.target = '_blank'; a.rel = 'noopener'; } });
}

export function demoNotice(where) {
  if (isSupabaseConfigured() || !where) return;
  where.insertAdjacentHTML('afterbegin', `<div class="notice notice-warn">${icon('info')}<p><strong>Modo prévia:</strong> o banco de dados ainda não foi conectado. Preencha <code>supabaseUrl</code> e <code>supabaseAnonKey</code> em <code>assets/js/config.js</code> (veja o LEIA-ME).</p></div>`);
}

/* ------------------------------------------------------------------ */
renderHeader();
renderFooter();
bindGlobal();
initReveal();
initTilt();
initCounters();
/* Conta bloqueada pelo admin */
let blockedShown = false;
function blockedGate(a) {
  if (!a.profile?.blocked || blockedShown) return false;
  blockedShown = true;
  const m = modal(`<div class="gate-icon" style="background:var(--berry-soft)">${icon('lock')}</div>
    <h2 class="modal-title">Conta suspensa</h2>
    <p class="muted">Esta conta foi suspensa. Se acha que é um engano, escreva para <a href="mailto:${esc(CONFIG.email)}">${esc(CONFIG.email)}</a>. Seus direitos da LGPD continuam valendo por e-mail.</p>
    <div class="modal-actions"><button class="btn btn-ink" data-ok>Entendi</button></div>`, { label: 'Conta suspensa', dismissible: false });
  $('[data-ok]', m.el).addEventListener('click', async () => { await signOut(); m.close(); location.href = 'index.html'; });
  return true;
}

/* Barra de aviso (editável no painel) */
function renderAnnouncement() {
  $('.announce')?.remove();
  const text = (settings.announcement || '').trim();
  if (settings.announcementOn !== 'true' || !text) return;
  try { if (sessionStorage.getItem('c3d_announce_closed') === text) return; } catch {}
  const link = /^https:\/\/|^[\w-]+\.html/.test(settings.announcementLink || '') ? settings.announcementLink : '';
  const bar = document.createElement('div');
  bar.className = 'announce';
  bar.innerHTML = `<div class="container announce-inner">${icon('bell')}${link ? `<a href="${esc(link)}">${esc(text)}</a>` : `<span>${esc(text)}</span>`}
    <button class="announce-x" aria-label="Fechar aviso">${icon('close')}</button></div>`;
  document.body.prepend(bar);
  $('.announce-x', bar).addEventListener('click', () => { try { sessionStorage.setItem('c3d_announce_closed', text); } catch {} bar.remove(); });
}

async function refreshSettings() {
  const sb = await getSupabase(); if (!sb) return;
  const { data, error } = await sb.from('site_settings').select('key,value');
  if (error || !data) return;
  const st = Object.fromEntries(data.map((r) => [r.key, r.value]));
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(st)); } catch {}
  applySettings(st);
  $$('[data-href]').forEach((el) => { const v = CONFIG[el.dataset.href]; if (v) el.href = v; });
  renderAnnouncement();
}

/* Estatística de visitas própria — só com consentimento de "Estatísticas" */
let tracked = false;
function trackVisit() {
  if (tracked || ['admin'].includes(page)) return;
  tracked = true;
  const ua = navigator.userAgent;
  const device = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
  const utm = new URLSearchParams(location.search).get('utm_source');
  let ref = null;
  try { const r = document.referrer && new URL(document.referrer); if (r && r.host !== location.host) ref = r.host.replace(/^(www|l|lm|m|out)\./, ''); } catch {}
  const referrer = (utm || ref || '').slice(0, 120) || null;
  onAuth(async (a) => {
    const sb = await getSupabase(); if (!sb) return;
    await sb.from('site_visits').insert({ visitor: anonId(), path: location.pathname.slice(0, 200) || '/', referrer, device, logged_in: !!a.user }).then(() => {}, () => {});
  });
}
document.addEventListener('c3d:consent', (e) => { if (e.detail.analytics) trackVisit(); });

onAuth((a) => { renderAccount(a); if (!blockedGate(a)) termsGate(a); });
initAuth();
renderAnnouncement();
refreshSettings();
const consent = getCookieConsent();
if (consent) { window.c3dConsent = consent; if (consent.analytics) trackVisit(); }
else setTimeout(showCookieBanner, 700);
