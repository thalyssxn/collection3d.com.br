import { $, passwordOk, passwordScore, withLoading, toast } from '../utils.js';
import { icon } from '../icons.js';
import { getSupabase, authErrorPT } from '../supa.js';

const state = $('#state'), form = $('#reset');
const hash = new URLSearchParams(location.hash.slice(1));
const linkError = hash.get('error_description');

const fail = (text) => {
  state.innerHTML = `<p class="notice notice-warn">${icon('warn')}<span>${text}</span></p>
    <a class="btn btn-ink btn-block" href="entrar.html?tab=login">${icon('arrowLeft')} Pedir um novo link</a>`;
};

(async () => {
  const sb = await getSupabase();
  if (!sb) return fail('Modo prévia: conecte o Supabase em <code>config.js</code> para usar esta página.');
  if (linkError) return fail(hash.get('error_code') === 'otp_expired' ? 'Este link expirou ou já foi usado. Peça um novo.' : 'Link inválido. Peça um novo.');
  const { data } = await sb.auth.getSession();
  if (!data.session) return fail('Abra esta página pelo link enviado no seu e-mail.');
  history.replaceState(null, '', location.pathname);
  state.innerHTML = `<p class="muted">Conta: <strong>${data.session.user.email.replace(/[<>&"]/g, '')}</strong></p>`;
  form.hidden = false; form.password.focus();

  const meter = $('.pw-meter', form);
  form.password.addEventListener('input', () => (meter.dataset.s = form.password.value ? passwordScore(form.password.value) : 0));
  $('.toggle-pw', form).addEventListener('click', (e) => {
    const b = e.currentTarget; const t = form.password.type === 'password';
    form.password.type = t ? 'text' : 'password'; b.innerHTML = icon(t ? 'eyeOff' : 'eye');
  });

  const msg = (t, ok) => { const m = $('.form-msg', form); m.textContent = t; m.className = `form-msg show ${ok ? 'ok' : 'err'}`; };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!passwordOk(form.password.value)) return msg('A senha precisa ter pelo menos 8 caracteres, com letras e números.');
    if (form.password.value !== form.password2.value) return msg('As senhas não conferem.');
    await withLoading($('[type=submit]', form), async () => {
      const { error } = await sb.auth.updateUser({ password: form.password.value });
      if (error) return msg(authErrorPT(error));
      if (form.global.checked) await sb.auth.signOut({ scope: 'others' });
      toast('Senha alterada com sucesso! 🔒');
      form.hidden = true;
      state.innerHTML = `<p class="notice notice-info">${icon('checkCircle')}<span>Pronto! Sua nova senha já está valendo.</span></p>
        <a class="btn btn-ink btn-block" href="conta.html">Ir para minha conta ${icon('arrowRight')}</a>`;
    });
  });
})();
