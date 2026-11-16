import { $, $$, esc, fmtDate, withLoading, toast, downloadFile, passwordOk } from '../utils.js';
import { icon } from '../icons.js';
import { CONFIG, isSupabaseConfigured } from '../config.js';
import { getSupabase, authErrorPT } from '../supa.js';
import { onAuth, refreshProfile, displayName, signOut } from '../auth-store.js';
import { modal } from '../app.js';

const root = $('#account-root');
const PROVIDERS = { email: 'E-mail e senha', google: 'Google', apple: 'Apple' };
const REQ = { acesso: 'Acesso aos meus dados', correcao: 'Correção de dados', exclusao: 'Exclusão de dados', portabilidade: 'Portabilidade', revogacao_consentimento: 'Revogar consentimento', informacao: 'Informação sobre compartilhamento', outro: 'Outro assunto' };
const REQ_ST = { aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', recusada: 'Recusada' };
let section = (location.hash || '#perfil').slice(1);
let rendered = false;

onAuth((a) => {
  if (!a.ready) return;
  if (!a.user) {
    if (!isSupabaseConfigured()) {
      root.innerHTML = `<div class="card"><p class="notice notice-warn">${icon('info')}<span><strong>Modo prévia:</strong> conecte o Supabase em <code>config.js</code> para usar a área do cliente.</span></p><a class="btn btn-ink" href="entrar.html">Ver tela de login</a></div>`;
      return;
    }
    location.replace('entrar.html?next=conta.html'); return;
  }
  $('#hello').textContent = `Olá, ${displayName(a).split(' ')[0]}! 🐢`;
  if (!rendered) { rendered = true; layout(a); }
});

function layout(a) {
  root.innerHTML = `
    <div class="account-grid">
      <nav class="side-nav" role="tablist" aria-label="Seções da conta">
        <button role="tab" data-s="perfil">${icon('user')} Perfil</button>
        <a href="pedidos.html">${icon('list')} Meus pedidos</a>
        <button role="tab" data-s="privacidade">${icon('shield')} Privacidade e dados</button>
        <button role="tab" data-s="seguranca">${icon('lock')} Segurança</button>
        ${a.admin ? `<a href="admin.html">${icon('gear')} Painel admin</a>` : ''}
        <button class="logout-btn">${icon('logout')} Sair</button>
      </nav>
      <div id="sec"></div>
    </div>`;
  $('.side-nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]');
    if (b) { section = b.dataset.s; history.replaceState(null, '', '#' + section); renderSection(a); }
    if (e.target.closest('.logout-btn')) signOut().then(() => location.href = 'index.html');
  });
  addEventListener('hashchange', () => { section = location.hash.slice(1) || 'perfil'; renderSection(a); });
  renderSection(a);
}

function renderSection(a) {
  if (!['perfil', 'privacidade', 'seguranca'].includes(section)) section = 'perfil';
  $$('.side-nav [data-s]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.s === section)));
  ({ perfil, privacidade, seguranca })[section](a, $('#sec'));
}

/* ---------------- Perfil ---------------- */
function perfil(a, el) {
  const p = a.profile || {};
  const provider = a.user.app_metadata?.provider || 'email';
  el.innerHTML = `
    <div class="card">
      <h2>${icon('user')} Meus dados</h2>
      <form class="form-grid" id="profile-form" novalidate>
        <div class="field"><label for="pf-name">Nome</label><input id="pf-name" name="full_name" maxlength="120" value="${esc(p.full_name || '')}" autocomplete="name"></div>
        <div class="field"><label for="pf-phone">WhatsApp <small>(opcional)</small></label><input id="pf-phone" name="phone" maxlength="30" inputmode="tel" value="${esc(p.phone || '')}" placeholder="(15) 99999-9999" autocomplete="tel"></div>
        <div class="field full"><label>E-mail</label><input value="${esc(a.user.email || '')}" disabled><small>Entrou com: <strong>${esc(PROVIDERS[provider] || provider)}</strong>. Para trocar o e-mail, vá em Segurança.</small></div>
        <div class="full"><div class="form-msg" role="alert"></div></div>
        <div class="full"><button class="btn btn-ink" type="submit">${icon('check')} Salvar</button></div>
      </form>
    </div>
    <div class="card">
      <h2>${icon('info')} Informações da conta</h2>
      <dl class="kv">
        <dt>Conta criada em</dt><dd>${fmtDate(a.user.created_at)}</dd>
        <dt>Último acesso</dt><dd>${fmtDate(a.user.last_sign_in_at)}</dd>
        <dt>Termos aceitos em</dt><dd>${fmtDate(p.accepted_terms_at)} ${p.terms_version ? `(versão ${esc(p.terms_version)})` : ''}</dd>
      </dl>
    </div>`;
  const f = $('#profile-form');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = $('.form-msg', f);
    const phone = f.phone.value.trim();
    if (phone && !/^[\d\s()+-]{8,30}$/.test(phone)) { m.textContent = 'Telefone inválido.'; m.className = 'form-msg show err'; return; }
    await withLoading($('[type=submit]', f), async () => {
      const sb = await getSupabase();
      const { error } = await sb.from('profiles').update({ full_name: f.full_name.value.trim().slice(0, 120) || null, phone: phone || null }).eq('id', a.user.id);
      if (error) { m.textContent = 'Não foi possível salvar.'; m.className = 'form-msg show err'; return; }
      toast('Dados atualizados!'); refreshProfile();
    });
  });
}

/* ---------------- Privacidade (LGPD) ---------------- */
async function privacidade(a, el) {
  const p = a.profile || {};
  el.innerHTML = `
    <div class="card">
      <h2>${icon('bell')} Comunicações</h2>
      <label class="ck-row" style="border-style:dashed">
        <div><strong>Novidades e lançamentos por e-mail</strong><small>Você pode ativar ou desativar quando quiser. Cada mudança fica registrada.</small></div>
        <span class="switch"><input type="checkbox" id="mkt" ${p.marketing_opt_in ? 'checked' : ''}><span></span></span>
      </label>
    </div>
    <div class="card">
      <h2>${icon('download')} Seus dados</h2>
      <p class="muted">Baixe uma cópia de tudo o que guardamos sobre você (perfil, pedidos, consentimentos e solicitações), em formato JSON.</p>
      <button class="btn" id="export">${icon('download')} Baixar meus dados</button>
    </div>
    <div class="card">
      <h2>${icon('file')} Solicitações LGPD</h2>
      <p class="muted">Peça correção, informações sobre compartilhamento, revogação de consentimento ou qualquer outro direito do art. 18 da LGPD. Respondemos em até 15 dias.</p>
      <form class="form-grid" id="req-form" novalidate>
        <div class="field"><label for="rq-type">Tipo</label><select id="rq-type" name="type">${Object.entries(REQ).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="field full"><label for="rq-msg">Detalhes</label><textarea id="rq-msg" name="message" maxlength="2000" placeholder="Conte o que você precisa"></textarea></div>
        <div class="full"><div class="form-msg" role="alert"></div></div>
        <div class="full"><button class="btn btn-ink" type="submit">${icon('send')} Enviar solicitação</button></div>
      </form>
      <div id="req-list" style="margin-top:18px"></div>
    </div>
    <div class="card">
      <h2>${icon('shield')} Histórico de consentimentos</h2>
      <div id="consents" class="muted">Carregando…</div>
    </div>
    <div class="card danger-zone">
      <h2>${icon('trash')} Excluir minha conta</h2>
      <p class="muted">Apaga sua conta, seu perfil e seus pedidos do site de forma definitiva. Registros de consentimento ficam anonimizados para fins legais.</p>
      <button class="btn" id="delete" style="--bg:var(--berry-soft)">${icon('trash')} Excluir minha conta</button>
    </div>`;

  const sb = await getSupabase();

  $('#mkt').addEventListener('change', async (e) => {
    const { error } = await sb.from('profiles').update({ marketing_opt_in: e.target.checked }).eq('id', a.user.id);
    if (error) { e.target.checked = !e.target.checked; return toast('Não foi possível salvar.', 'err'); }
    toast(e.target.checked ? 'Você vai receber novidades por e-mail.' : 'Você não vai mais receber e-mails de novidades.');
    refreshProfile();
  });

  $('#export').addEventListener('click', (e) => withLoading(e.currentTarget, async () => {
    const [prof, orders, consents, reqs, wl] = await Promise.all([
      sb.from('profiles').select('*').eq('id', a.user.id).maybeSingle(),
      sb.from('interest_requests').select('*').eq('user_id', a.user.id),
      sb.from('consent_logs').select('consent_type,granted,policy_version,details,created_at').eq('user_id', a.user.id),
      sb.from('data_requests').select('*').eq('user_id', a.user.id),
      Promise.resolve({ data: 'A lista de espera não é exibida por segurança; peça por e-mail se precisar.' }),
    ]);
    const dump = {
      gerado_em: new Date().toISOString(), controlador: CONFIG.siteName, contato: CONFIG.email,
      conta: { id: a.user.id, email: a.user.email, criado_em: a.user.created_at, ultimo_acesso: a.user.last_sign_in_at, provedor_login: a.user.app_metadata?.provider },
      perfil: prof.data, pedidos: orders.data, consentimentos: consents.data, solicitacoes_lgpd: reqs.data, lista_calculadora: wl.data,
      dados_no_navegador: { preferencias_cookies: JSON.parse(localStorage.getItem('c3d_cookie_consent') || 'null') },
    };
    downloadFile(`collection3d-meus-dados-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(dump, null, 2));
    toast('Arquivo gerado!');
  }));

  const loadReqs = async () => {
    const { data } = await sb.from('data_requests').select('*').eq('user_id', a.user.id).order('created_at', { ascending: false });
    $('#req-list').innerHTML = data?.length ? `<div class="orders">${data.map((r) => `
      <div class="order" style="grid-template-columns:1fr auto">
        <div><h3>${esc(REQ[r.request_type] || r.request_type)}</h3><small>${fmtDate(r.created_at)}</small>${r.response ? `<p style="margin:6px 0 0;font-size:.9rem"><strong>Resposta:</strong> ${esc(r.response)}</p>` : ''}</div>
        <span class="status st-${esc(r.status)}">${esc(REQ_ST[r.status] || r.status)}</span>
      </div>`).join('')}</div>` : '';
  };
  loadReqs();
  $('#req-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.currentTarget; const m = $('.form-msg', f);
    await withLoading($('[type=submit]', f), async () => {
      const { error } = await sb.from('data_requests').insert({ user_id: a.user.id, email: a.user.email, request_type: f.type.value, message: f.message.value.trim().slice(0, 2000) || null });
      if (error) { m.textContent = 'Não foi possível enviar.'; m.className = 'form-msg show err'; return; }
      f.reset(); m.textContent = 'Solicitação enviada! Responderemos em até 15 dias.'; m.className = 'form-msg show ok'; loadReqs();
    });
  });

  const TYPES = { termos_privacidade: 'Termos e Privacidade', marketing: 'E-mails de novidades', cookies: 'Cookies', lista_calculadora: 'Lista da calculadora' };
  const { data: logs } = await sb.from('consent_logs').select('consent_type,granted,policy_version,created_at').eq('user_id', a.user.id).order('created_at', { ascending: false }).limit(50);
  $('#consents').innerHTML = logs?.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Data</th><th>Item</th><th>Situação</th><th>Versão</th></tr></thead><tbody>
    ${logs.map((l) => `<tr><td>${fmtDate(l.created_at)}</td><td>${esc(TYPES[l.consent_type] || l.consent_type)}</td><td class="${l.granted ? 'tag-yes' : 'tag-no'}">${l.granted ? 'Autorizado' : 'Não autorizado'}</td><td>${esc(l.policy_version || '—')}</td></tr>`).join('')}
    </tbody></table></div>` : '<p>Nenhum registro ainda.</p>';

  $('#delete').addEventListener('click', () => {
    const m = modal(`
      <div class="gate-icon" style="background:var(--berry-soft)">${icon('trash')}</div>
      <h2 class="modal-title">Excluir conta definitivamente?</h2>
      <p class="muted">Isso não pode ser desfeito. Para confirmar, digite <strong>EXCLUIR</strong>.</p>
      <input class="input" id="confirm-del" autocomplete="off" aria-label="Digite EXCLUIR">
      <div class="modal-actions"><button class="btn btn-ghost" data-x>Cancelar</button><button class="btn" style="--bg:var(--berry);--fg:#fff" data-del disabled>${icon('trash')} Excluir</button></div>`, { label: 'Excluir conta' });
    const inp = $('#confirm-del', m.el), del = $('[data-del]', m.el);
    inp.addEventListener('input', () => (del.disabled = inp.value.trim().toUpperCase() !== 'EXCLUIR'));
    $('[data-x]', m.el).addEventListener('click', m.close);
    del.addEventListener('click', () => withLoading(del, async () => {
      const { error } = await sb.rpc('delete_my_account');
      if (error) return toast('Não foi possível excluir agora. Escreva para ' + CONFIG.email, 'err', 7000);
      await sb.auth.signOut({ scope: 'local' }).catch(() => {});
      localStorage.removeItem('c3d_anon_id');
      location.href = 'index.html?conta=excluida';
    }));
  });
}

/* ---------------- Segurança ---------------- */
function seguranca(a, el) {
  const isEmail = (a.user.app_metadata?.providers || [a.user.app_metadata?.provider]).includes('email');
  el.innerHTML = `
    <div class="card">
      <h2>${icon('key')} ${isEmail ? 'Alterar senha' : 'Criar uma senha'}</h2>
      <p class="muted">${isEmail ? 'Escolha uma senha nova e forte.' : 'Você entrou com Google/Apple. Se quiser, crie uma senha para entrar também com e-mail.'}</p>
      <form class="form-grid" id="pw-form" novalidate>
        <div class="field"><label for="np1">Nova senha</label><input id="np1" name="p1" type="password" autocomplete="new-password"></div>
        <div class="field"><label for="np2">Confirme</label><input id="np2" name="p2" type="password" autocomplete="new-password"></div>
        <div class="full"><div class="form-msg" role="alert"></div></div>
        <div class="full"><button class="btn btn-ink" type="submit">${icon('check')} Salvar senha</button></div>
      </form>
    </div>
    <div class="card">
      <h2>${icon('mail')} Trocar e-mail</h2>
      <p class="muted">Enviaremos um link de confirmação para o novo endereço.</p>
      <form class="form-grid" id="em-form" novalidate>
        <div class="field full"><label for="nem">Novo e-mail</label><input id="nem" name="email" type="email" autocomplete="email"></div>
        <div class="full"><div class="form-msg" role="alert"></div></div>
        <div class="full"><button class="btn" type="submit">${icon('send')} Enviar confirmação</button></div>
      </form>
    </div>
    <div class="card">
      <h2>${icon('logout')} Sessões</h2>
      <p class="muted">Perdeu o celular ou entrou num computador de outra pessoa? Desconecte todos os aparelhos.</p>
      <button class="btn" id="global-out">${icon('logout')} Sair de todos os aparelhos</button>
    </div>`;
  const msg = (f, t, ok) => { const m = $('.form-msg', f); m.textContent = t; m.className = `form-msg show ${ok ? 'ok' : 'err'}`; };
  $('#pw-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.currentTarget;
    if (!passwordOk(f.p1.value)) return msg(f, 'Mínimo de 8 caracteres, com letras e números.');
    if (f.p1.value !== f.p2.value) return msg(f, 'As senhas não conferem.');
    await withLoading($('[type=submit]', f), async () => {
      const sb = await getSupabase();
      const { error } = await sb.auth.updateUser({ password: f.p1.value });
      if (error) return msg(f, authErrorPT(error));
      f.reset(); msg(f, 'Senha salva!', true);
    });
  });
  $('#em-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.currentTarget;
    const email = f.email.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return msg(f, 'E-mail inválido.');
    await withLoading($('[type=submit]', f), async () => {
      const sb = await getSupabase();
      const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: new URL('conta.html', location.href).href });
      if (error) return msg(f, authErrorPT(error));
      msg(f, 'Enviamos um link de confirmação. Confira as caixas de entrada.', true);
    });
  });
  $('#global-out').addEventListener('click', (e) => withLoading(e.currentTarget, async () => {
    await signOut('global'); location.href = 'entrar.html';
  }));
}
