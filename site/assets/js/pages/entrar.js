import { $, $$, emailOk, passwordOk, passwordScore, withLoading, toast } from '../utils.js';
import { icon } from '../icons.js';
import { CONFIG, isSupabaseConfigured } from '../config.js';
import { getSupabase, authErrorPT, redirectTo } from '../supa.js';
import { onAuth } from '../auth-store.js';
import { demoNotice } from '../app.js';

const params = new URLSearchParams(location.search);
const safeNext = (n) => (/^[a-z0-9-]+\.html(#[\w-]*)?$/i.test(n || '') ? n : 'conta.html');
const next = safeNext(params.get('next'));

demoNotice($('#auth-notice'));

// Já logado? vai direto para o destino
let redirected = false;
onAuth((a) => { if (a.user && !redirected) { redirected = true; location.replace(next); } });

/* ---------- Navegação entre abas e painéis ---------- */
const panels = { login: $('#p-login'), signup: $('#p-signup'), code: $('#p-code'), forgot: $('#p-forgot'), confirm: $('#p-confirm') };
const tabs = { login: $('#t-login'), signup: $('#t-signup'), code: $('#t-code') };
function show(name) {
  Object.entries(panels).forEach(([k, el]) => (el.hidden = k !== name));
  Object.entries(tabs).forEach(([k, el]) => el.setAttribute('aria-selected', String(k === name || (name === 'forgot' && k === 'login'))));
  const social = !['forgot', 'confirm'].includes(name);
  $('#social').hidden = !social; $('#social-div').hidden = !social;
  $$('.form-msg').forEach((m) => m.classList.remove('show'));
  const first = $('input:not([type=checkbox])', panels[name]); first?.focus({ preventScroll: true });
}
Object.entries(tabs).forEach(([k, el]) => el.addEventListener('click', () => show(k)));
$('.tabs').addEventListener('keydown', (e) => {
  const order = ['login', 'signup', 'code'];
  const cur = order.findIndex((k) => tabs[k].getAttribute('aria-selected') === 'true');
  if (e.key === 'ArrowRight') { show(order[(cur + 1) % 3]); tabs[order[(cur + 1) % 3]].focus(); }
  if (e.key === 'ArrowLeft') { show(order[(cur + 2) % 3]); tabs[order[(cur + 2) % 3]].focus(); }
});
document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) show(g.dataset.go); });
if (params.get('tab') && panels[params.get('tab')]) show(params.get('tab'));

// Login social: esconde o que não estiver ativado no config.js
if (!CONFIG.enableGoogle) $('[data-provider=google]').remove();
if (!CONFIG.enableApple) $('[data-provider=apple]').remove();
if (!CONFIG.enableGoogle && !CONFIG.enableApple) { $('#social').remove(); $('#social-div').remove(); }

/* ---------- Utilidades ---------- */
const msg = (form, text, ok = false) => {
  const m = $('.form-msg', form); m.textContent = text; m.className = `form-msg show ${ok ? 'ok' : 'err'}`;
};
async function client(form) {
  const sb = await getSupabase();
  if (!sb) { msg(form, 'Modo prévia: o login funciona depois de conectar o Supabase em config.js.'); return null; }
  return sb;
}
$$('.toggle-pw').forEach((b) => b.addEventListener('click', () => {
  const input = b.previousElementSibling; const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  b.innerHTML = icon(showing ? 'eye' : 'eyeOff'); b.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
}));

function buildOtp(container) {
  const n = CONFIG.otpLength;
  container.innerHTML = Array.from({ length: n }, (_, i) =>
    `<input inputmode="numeric" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" maxlength="1" aria-label="Dígito ${i + 1}" pattern="[0-9]*">`).join('');
  const inputs = $$('input', container);
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '');
      if (inp.value.length > 1) { // colou ou autocompletou o código inteiro
        const digits = inp.value.split(''); inputs.forEach((x, k) => (x.value = digits[k] || '')); inputs[Math.min(digits.length, n) - 1].focus(); return;
      }
      if (inp.value && i < n - 1) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus(); });
    inp.addEventListener('paste', (e) => {
      const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, n);
      if (!t) return; e.preventDefault(); inputs.forEach((x, k) => (x.value = t[k] || '')); inputs[Math.min(t.length, n) - 1].focus();
    });
  });
  inputs.forEach((x) => x.removeAttribute('maxlength'));
  return () => inputs.map((x) => x.value).join('');
}
const getSignupCode = buildOtp($('[data-otp=signup]'));
const getLoginCode = buildOtp($('[data-otp=email]'));

/* ---------- Entrar com e-mail e senha ---------- */
panels.login.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget;
  const email = f.email.value.trim().toLowerCase(), password = f.password.value;
  if (!emailOk(email) || !password) return msg(f, 'Preencha e-mail e senha.');
  const sb = await client(f); if (!sb) return;
  await withLoading($('[type=submit]', f), async () => {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      msg(f, authErrorPT(error));
      if (error.code === 'email_not_confirmed') { pendingEmail = email; }
      return;
    }
    toast('Login feito.');
  });
});

/* ---------- Esqueci minha senha ---------- */
panels.forgot.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget;
  const email = f.email.value.trim().toLowerCase();
  if (!emailOk(email)) return msg(f, 'Digite um e-mail válido.');
  const sb = await client(f); if (!sb) return;
  await withLoading($('[type=submit]', f), async () => {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo('redefinir-senha.html') });
    if (error && /rate|security/i.test(error.message)) return msg(f, authErrorPT(error));
    // mensagem neutra: não revela se o e-mail tem conta
    msg(f, 'Se houver uma conta com este e-mail, você vai receber o link em instantes. Confira também o spam.', true);
  });
});

/* ---------- Criar conta ---------- */
let pendingEmail = '';
const sPass = $('#s-pass');
sPass.addEventListener('input', () => { $('.pw-meter').dataset.s = sPass.value ? passwordScore(sPass.value) : 0; });
panels.signup.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget;
  const name = f.name.value.trim(), email = f.email.value.trim().toLowerCase();
  if (name.length < 2) return msg(f, 'Digite seu nome.');
  if (!emailOk(email)) return msg(f, 'Digite um e-mail válido.');
  if (!passwordOk(f.password.value)) return msg(f, 'A senha precisa ter pelo menos 8 caracteres, com letras e números.');
  if (f.password.value !== f.password2.value) return msg(f, 'As senhas não conferem.');
  if (!f.terms.checked) return msg(f, 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.');
  if (!f.adult.checked) return msg(f, 'Confirme a declaração de idade.');
  const sb = await client(f); if (!sb) return;
  await withLoading($('[type=submit]', f), async () => {
    const { data, error } = await sb.auth.signUp({
      email, password: f.password.value,
      options: {
        emailRedirectTo: redirectTo('conta.html'),
        data: { full_name: name.slice(0, 120), accept_terms: 'true', adult: 'true', marketing_opt_in: f.mkt.checked ? 'true' : 'false', terms_version: CONFIG.termsVersion },
      },
    });
    if (error) return msg(f, authErrorPT(error));
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return msg(f, 'Este e-mail já tem cadastro. Entre ou use "Esqueci minha senha".');
    }
    if (data.session) { toast('Conta criada.'); return; } // confirmação de e-mail desativada
    pendingEmail = email;
    $$('.em-target').forEach((x) => (x.textContent = email));
    show('confirm');
  });
});

panels.confirm.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget;
  const token = getSignupCode();
  if (token.length < CONFIG.otpLength) return msg(f, 'Digite o código completo ou clique no link do e-mail.');
  const sb = await client(f); if (!sb) return;
  await withLoading($('[type=submit]', f), async () => {
    const { error } = await sb.auth.verifyOtp({ email: pendingEmail, token, type: 'signup' });
    if (error) return msg(f, authErrorPT(error));
    toast('E-mail confirmado.');
  });
});

/* ---------- Código por e-mail (sem senha) ---------- */
let codeEmail = '';
const codeStep = (two) => {
  $$('.code-step-1', panels.code).forEach((x) => (x.hidden = two));
  $$('.code-step-2', panels.code).forEach((x) => (x.hidden = !two));
  $('[type=submit] span', panels.code).textContent = two ? 'Entrar com o código' : 'Enviar código';
  if (two) $('[data-otp=email] input').focus();
};
$('[data-code-back]').addEventListener('click', () => codeStep(false));
async function sendCode(f, email) {
  const sb = await client(f); if (!sb) return false;
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo('conta.html') } });
  if (error) { msg(f, authErrorPT(error)); return false; }
  return true;
}
panels.code.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget;
  const btn = $('[type=submit]', f);
  if ($('.code-step-2', f).hidden) {
    const email = f.email.value.trim().toLowerCase();
    if (!emailOk(email)) return msg(f, 'Digite um e-mail válido.');
    await withLoading(btn, async () => {
      if (!(await sendCode(f, email))) return;
      codeEmail = email; $$('.em-target').forEach((x) => (x.textContent = email));
      msg(f, 'Código enviado! Confira sua caixa de entrada (e o spam).', true);
    });
    if (codeEmail === f.email.value.trim().toLowerCase()) codeStep(true);
    return;
  }
  const token = getLoginCode();
  if (token.length < CONFIG.otpLength) return msg(f, 'Digite o código completo.');
  const sb = await client(f); if (!sb) return;
  await withLoading(btn, async () => {
    const { error } = await sb.auth.verifyOtp({ email: codeEmail, token, type: 'email' });
    if (error) return msg(f, authErrorPT(error));
    toast('Login feito.');
  });
});

/* ---------- Reenviar ---------- */
$$('[data-resend]').forEach((b) => b.addEventListener('click', async () => {
  const f = b.closest('form'); const sb = await client(f); if (!sb) return;
  if (b.dataset.resend === 'signup') {
    const { error } = await sb.auth.resend({ type: 'signup', email: pendingEmail, options: { emailRedirectTo: redirectTo('conta.html') } });
    msg(f, error ? authErrorPT(error) : 'E-mail reenviado!', !error);
  } else {
    if (await sendCode(f, codeEmail)) msg(f, 'Novo código enviado!', true);
  }
}));

/* ---------- Google / Apple ---------- */
$$('[data-provider]').forEach((b) => b.addEventListener('click', async () => {
  const sb = await getSupabase();
  if (!sb) return msg($('form:not([hidden])'), 'Modo prévia: o login com ' + (b.dataset.provider === 'google' ? 'Google' : 'Apple') + ' funciona depois de configurar o Supabase.');
  await withLoading(b, async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: b.dataset.provider, options: { redirectTo: redirectTo(next) } });
    if (error) msg($('form:not([hidden])'), authErrorPT(error));
  });
}));

// erro vindo de link de e-mail expirado (#error_description=...)
const hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('error_description')) {
  show('login');
  msg(panels.login, hash.get('error_code') === 'otp_expired' ? 'Esse link expirou. Peça um novo.' : decodeURIComponent(hash.get('error_description')).replace(/\+/g, ' '));
  history.replaceState(null, '', location.pathname + location.search);
}
if (!isSupabaseConfigured()) console.info('[Collection 3D] Supabase não configurado: modo prévia.');
