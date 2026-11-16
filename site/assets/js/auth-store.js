import { getSupabase } from './supa.js';

/** Estado de login compartilhado por todas as páginas */
export const auth = { ready: false, session: null, user: null, profile: null, admin: false };
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
  if (auth.user) {
    const [{ data: profile }, { data: admin }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', auth.user.id).maybeSingle(),
      sb.rpc('is_admin'),
    ]);
    auth.profile = profile;
    auth.admin = !!admin;
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
  const { data } = await sb.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
  auth.profile = data; emit();
}

export async function signOut(scope = 'local') {
  const sb = await getSupabase();
  if (sb) await sb.auth.signOut({ scope });
}

export const displayName = (a = auth) =>
  a.profile?.full_name || a.user?.user_metadata?.full_name || a.user?.user_metadata?.name || a.user?.email?.split('@')[0] || 'Você';
