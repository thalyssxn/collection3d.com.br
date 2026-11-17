import { getSupabase } from './supa.js';

/** Estado de login compartilhado por todas as páginas */
export const auth = { ready: false, session: null, user: null, profile: null, admin: false, adminAccount: false };
export const PROFILE_COLS = 'id,full_name,phone,marketing_opt_in,is_adult_declared,terms_version,accepted_terms_at,blocked,created_at,updated_at';
const listeners = new Set();
let started = false;

export function onAuth(cb) {
  listeners.add(cb);
  if (auth.ready) cb(auth);
  return () => listeners.delete(cb);
}
const emit = () => listeners.forEach((cb) => { try { cb(auth); } catch (e) { console.error(e); } });

async function load(sb, session) {
  auth.session = session;
  auth.user = session?.user ?? null;
  auth.profile = null;
  auth.admin = false;
  auth.adminAccount = false;
  if (auth.user) {
    const [{ data: profile }, { data: admin }, { data: adminAccount }] = await Promise.all([
      sb.from('profiles').select(PROFILE_COLS).eq('id', auth.user.id).maybeSingle(),
      sb.rpc('is_admin'),
      sb.rpc('is_admin_account'),
    ]);
    auth.profile = profile;
    auth.admin = !!admin;            // admin com 2FA confirmado nesta sessão
    auth.adminAccount = !!adminAccount; // é conta de admin (pode faltar o 2FA)
  }
  auth.ready = true;
  emit();
}

export async function initAuth() {
  if (started) return; started = true;
  const sb = await getSupabase();
  if (!sb) { auth.ready = true; emit(); return; }
  const { data } = await sb.auth.getSession();
  await load(sb, data.session);
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') { auth.session = session; return; }
    if (event === 'PASSWORD_RECOVERY') { auth.recovery = true; }
    // evita travar o callback do Supabase com await
    setTimeout(() => load(sb, session), 0);
  });
}

export async function refreshProfile() {
  const sb = await getSupabase();
  if (!sb || !auth.user) return;
  const { data } = await sb.from('profiles').select(PROFILE_COLS).eq('id', auth.user.id).maybeSingle();
  auth.profile = data; emit();
}

export async function signOut(scope = 'local') {
  const sb = await getSupabase();
  if (sb) await sb.auth.signOut({ scope });
}

export const displayName = (a = auth) =>
  a.profile?.full_name || a.user?.user_metadata?.full_name || a.user?.user_metadata?.name || a.user?.email?.split('@')[0] || 'Você';
