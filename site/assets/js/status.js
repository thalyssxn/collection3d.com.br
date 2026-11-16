export const STATUS = {
  novo: 'Recebido', em_atendimento: 'Em atendimento', confirmado: 'Confirmado',
  enviado: 'Enviado', concluido: 'Concluído', cancelado: 'Cancelado',
};
/** Link de WhatsApp para um telefone digitado pelo cliente (assume Brasil se faltar o DDI) */
export const waPhone = (phone, text = '') => {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
