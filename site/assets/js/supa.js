import { CONFIG, isSupabaseConfigured } from './config.js';

let clientPromise = null;

/** Retorna o cliente Supabase (ou null se ainda não foi configurado em config.js) */
export function getSupabase() {
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('./vendor/supabase.js').then(({ createClient }) =>
      createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'implicit', // links de e-mail funcionam mesmo abertos em outro aparelho
        },
      })
    );
  }
  return clientPromise;
}

export const redirectTo = (page) => new URL(page, location.href).href.split('#')[0].split('?')[0];

/** Traduz erros do Supabase Auth para mensagens amigáveis em português */
export function authErrorPT(err) {
  if (!err) return 'Algo deu errado. Tente novamente.';
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();
  const map = {
    invalid_credentials: 'E-mail ou senha incorretos.',
    email_not_confirmed: 'Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada (e no spam).',
    user_already_exists: 'Este e-mail já tem cadastro. Tente entrar ou redefinir a senha.',
    email_exists: 'Este e-mail já tem cadastro. Tente entrar ou redefinir a senha.',
    weak_password: 'Senha fraca. Use pelo menos 8 caracteres com letras e números.',
    same_password: 'A nova senha precisa ser diferente da atual.',
    over_email_send_rate_limit: 'Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.',
    over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    otp_expired: 'Código ou link expirado. Peça um novo.',
    otp_disabled: 'Não encontramos uma conta com este e-mail. Crie sua conta primeiro.',
    signup_disabled: 'Cadastros estão temporariamente desativados.',
    email_address_invalid: 'E-mail inválido.',
    validation_failed: 'Confira os dados informados.',
    provider_disabled: 'Este tipo de login ainda não está ativado.',
    session_expired: 'Sua sessão expirou. Entre novamente.',
    reauthentication_needed: 'Por segurança, entre novamente para continuar.',
  };
  if (map[code]) return map[code];
  if (msg.includes('invalid login')) return map.invalid_credentials;
  if (msg.includes('not confirmed')) return map.email_not_confirmed;
  if (msg.includes('already registered')) return map.user_already_exists;
  if (msg.includes('signups not allowed')) return map.otp_disabled;
  if (msg.includes('expired') || msg.includes('invalid otp') || msg.includes('token has expired')) return 'Código inválido ou expirado. Confira ou peça um novo.';
  if (msg.includes('rate limit') || msg.includes('security purposes')) return map.over_request_rate_limit;
  if (msg.includes('password')) return 'Senha inválida. Use pelo menos 8 caracteres com letras e números.';
  if (msg.includes('provider is not enabled')) return map.provider_disabled;
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Sem conexão com o servidor. Verifique sua internet.';
  return err.message || 'Algo deu errado. Tente novamente.';
}
