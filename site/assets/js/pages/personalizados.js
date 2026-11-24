// Personalizados: a pessoa descreve a peça e o pedido segue pelo WhatsApp (onde ela manda as fotos).
import { $, $$, esc, waLink, randomCode, toast } from '../utils.js';
import { getSupabase } from '../supa.js';
import { auth, onAuth } from '../auth-store.js';

const TYPES = ['Chaveiro', 'Miniatura ou boneco', 'Placa ou letreiro', 'Suporte', 'Peça para setup', 'Presente', 'Outro'];
const form = $('#custom-form');
const types = $('#types');
const msgBox = $('.form-msg', form);
let type = new URLSearchParams(location.search).get('tipo');
if (!TYPES.includes(type)) type = null;

types.innerHTML = TYPES.map((t) => `<button type="button" class="opt" data-v="${esc(t)}" aria-pressed="${t === type}">${esc(t)}</button>`).join('');
types.addEventListener('click', (e) => {
  const b = e.target.closest('.opt'); if (!b) return;
  type = b.getAttribute('aria-pressed') === 'true' ? null : b.dataset.v;
  $$('.opt', types).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === type)));
});

const desc = form.desc;
const count = () => { $('#c-count').textContent = desc.value.length; };
desc.addEventListener('input', () => { count(); desc.removeAttribute('aria-invalid'); msgBox.className = 'form-msg'; });
count();

// data mínima = hoje
const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
form.date.min = today.toISOString().slice(0, 10);

onAuth(() => {
  if (auth.user) {
    $('#c-note').innerHTML = 'Você está na sua conta: o pedido também fica salvo em <a href="pedidos.html">Meus pedidos</a>.';
    const n = auth.profile?.full_name;
    if (n && !form.name.value) form.name.value = n.slice(0, 60);
  }
});

const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
const fmtDate = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

function buildMessage(code) {
  const qty = Math.max(1, Math.min(999, parseInt(form.qty.value, 10) || 1));
  const d = String(desc.value || '').trim().slice(0, 1000);
  return {
    qty, d,
    text: [
      'Olá, Collection 3D! Quero uma peça *personalizada*.',
      '',
      type ? `*Tipo:* ${type}` : null,
      `*Descrição:* ${d}`,
      clean(form.size.value, 60) ? `*Tamanho:* ${clean(form.size.value, 60)}` : null,
      clean(form.colors.value, 80) ? `*Cores:* ${clean(form.colors.value, 80)}` : null,
      `*Quantidade:* ${qty}`,
      form.date.value ? `*Preciso até:* ${fmtDate(form.date.value)}` : null,
      clean(form.city.value, 60) ? `*Cidade:* ${clean(form.city.value, 60)}` : null,
      clean(form.name.value, 60) ? `*Nome:* ${clean(form.name.value, 60)}` : null,
      code ? `*Código do pedido:* #${code}` : null,
      '',
      form.photos.checked ? 'Vou mandar as fotos de referência aqui na conversa.' : null,
      'Vi no site collection3d.com.br',
    ].filter((x) => x !== null).join('\n'),
  };
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (String(desc.value).trim().length < 10) {
    desc.setAttribute('aria-invalid', 'true');
    msgBox.textContent = 'Conte um pouco mais sobre a peça (pelo menos uma frase).';
    msgBox.className = 'form-msg show err';
    desc.focus();
    return;
  }
  const code = auth.user ? randomCode() : null;
  const { text, qty, d } = buildMessage(code);
  const url = waLink(text);
  // abre o WhatsApp já no clique (celular e computador)
  const win = window.open(url, '_blank');
  if (win) win.opener = null;
  showDone(url);
  if (!win) location.href = url;  // navegador bloqueou a nova aba: abre na mesma
  if (code) {
    getSupabase().then(async (sb) => {
      if (!sb) return;
      const { error } = await sb.from('interest_requests').insert({
        code, user_id: auth.user.id, product_id: null,
        product_name: `Personalizado${type ? ` (${type})` : ''}: ${clean(d, 120)}`.slice(0, 160), quantity: qty,
      });
      if (error) console.warn(error);
      else toast(`Pedido #${code} salvo em Meus pedidos.`);
    });
  }
});

function showDone(url) {
  let box = $('#c-done');
  if (!box) {
    box = document.createElement('div');
    box.id = 'c-done';
    box.className = 'custom-done';
    box.setAttribute('role', 'status');
    form.append(box);
  }
  box.innerHTML = `
    <h2>Agora é no WhatsApp</h2>
    <p>Abrimos a conversa com a sua mensagem pronta. Toque em <strong>enviar</strong> e depois mande as fotos de referência: toque no <strong>clipe</strong> ou na <strong>câmera</strong>.</p>
    <a class="btn btn-wa" href="${esc(url)}" target="_blank" rel="noopener">Abrir o WhatsApp de novo</a>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
