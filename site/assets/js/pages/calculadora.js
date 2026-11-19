import { $, $$, emailOk, withLoading, toast, prefersReducedMotion } from '../utils.js';
import { CONFIG } from '../config.js';
import { getSupabase } from '../supa.js';
import { auth } from '../auth-store.js';

// Botão de compra: fica ativo quando calculatorSalesUrl for preenchido no config.js
const buy = $('#buy-calc');
if (buy && /^https:\/\//.test(CONFIG.calculatorSalesUrl)) {
  buy.classList.remove('is-disabled'); buy.removeAttribute('aria-disabled');
  buy.classList.add('btn-lime');
  buy.href = CONFIG.calculatorSalesUrl; buy.target = '_blank'; buy.rel = 'noopener';
  buy.querySelector('span').textContent = 'Comprar agora';
}

// Animação da prévia (valores ilustrativos)
const DEMO = [
  { mk: 'Shopee', pv: 'R$ 39,90', tx: 'R$ 12,48', cu: 'R$ 7,20' },
  { mk: 'TikTok Shop', pv: 'R$ 29,90', tx: 'R$ 8,78', cu: 'R$ 5,40' },
  { mk: 'Mercado Livre', pv: 'R$ 49,90', tx: 'R$ 14,14', cu: 'R$ 8,10' },
];
if (!prefersReducedMotion()) {
  let n = 0;
  setInterval(() => {
    n = (n + 1) % DEMO.length;
    $$('#calc-mock [data-k]').forEach((b) => {
      b.style.opacity = 0;
      setTimeout(() => { b.textContent = DEMO[n][b.dataset.k]; b.style.opacity = 1; }, 250);
    });
  }, 2800);
}

// Lista de espera
const form = $('#waitlist');
const msg = $('.form-msg', form);
const show = (t, ok) => { msg.textContent = t; msg.className = `form-msg show ${ok ? 'ok' : 'err'}`; };
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim().toLowerCase();
  if (!emailOk(email)) { form.email.setAttribute('aria-invalid', 'true'); return show('Digite um e-mail válido.'); }
  form.email.removeAttribute('aria-invalid');
  if (!form.consent.checked) return show('Marque a autorização para podermos te avisar.');
  await withLoading($('button[type=submit]', form), async () => {
    const sb = await getSupabase();
    if (!sb) return show('Prévia: a lista funciona depois de conectar o banco de dados.');
    const { error } = await sb.from('calculator_waitlist').insert({ email, consent: true, user_id: auth.user?.id ?? null });
    if (error && error.code === '23505') return show('Este e-mail já está na lista de espera.', true);
    if (error) return show('Não foi possível salvar agora. Tente de novo em instantes.');
    form.reset(); show('Inscrição feita. Você receberá um e-mail no lançamento.', true);
    toast('Inscrição confirmada na lista de espera.');
  });
});
