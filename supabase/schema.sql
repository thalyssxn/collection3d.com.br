-- =====================================================================
--  COLLECTION 3D — Banco de dados (Supabase / PostgreSQL)
--  Como usar: Supabase > SQL Editor > New query > cole TUDO e clique em RUN.
--  Pode rodar de novo sem problema (o script é idempotente na maior parte).
--
--  Princípios LGPD aplicados aqui:
--   • Minimização: só guardamos o necessário (nome, e-mail, telefone opcional).
--     Nada de CPF, endereço, data de nascimento ou IP.
--   • Segurança: RLS (Row Level Security) em TODAS as tabelas. Cada pessoa
--     só enxerga os próprios dados; só administradores veem tudo.
--   • Prova de consentimento: tabela consent_logs (o quê, quando, versão).
--   • Direitos do titular: exportar dados, pedir correção/exclusão e
--     excluir a conta (função delete_my_account).
--   • Senhas: nunca ficam nesta base; o Supabase Auth guarda só o hash.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ADMINISTRADORES
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- (sem políticas: ninguém lê/escreve pelo site; só pelo painel do Supabase)

-- Verificação em 2 etapas (2FA) obrigatória para o painel.
-- Para DESLIGAR (não recomendado), troque "select true" por "select false" e rode de novo.
create or replace function public.admin_mfa_required()
returns boolean language sql immutable as $$ select true $$;

-- É uma conta de admin? (não exige 2FA — usado só para mostrar a tela do código)
create or replace function public.is_admin_account()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()); $$;

-- Tem permissão de admin AGORA? (conta de admin + 2FA confirmado nesta sessão)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin_account()
     and (not public.admin_mfa_required()
          or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2');
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_admin_account() to authenticated;

-- ---------------------------------------------------------------------
-- 2) REGISTROS DE CONSENTIMENTO (prova exigida pela LGPD, art. 8º §2º)
-- ---------------------------------------------------------------------
create table if not exists public.consent_logs (
  id             bigint generated always as identity primary key,
  user_id        uuid references auth.users(id) on delete set null,
  anon_id        uuid,                       -- identificador aleatório do navegador (cookies)
  consent_type   text not null check (consent_type in
                   ('cookies','termos_privacidade','marketing','lista_calculadora')),
  granted        boolean not null,
  policy_version text,
  details        jsonb not null default '{}'::jsonb
                   check (pg_column_size(details) < 2000),
  created_at     timestamptz not null default now()
);
create index if not exists consent_logs_user_idx on public.consent_logs(user_id);
alter table public.consent_logs enable row level security;

drop policy if exists "consent: registrar cookies" on public.consent_logs;
create policy "consent: registrar cookies" on public.consent_logs
  for insert to anon, authenticated
  with check (consent_type = 'cookies' and (user_id is null or user_id = auth.uid()));

drop policy if exists "consent: ver os próprios" on public.consent_logs;
create policy "consent: ver os próprios" on public.consent_logs
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 3) PERFIS (1 por usuário; e-mail e senha ficam no auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text check (char_length(full_name) <= 120),
  phone             text check (char_length(phone) <= 30),
  marketing_opt_in  boolean not null default false,
  is_adult_declared boolean not null default false,
  terms_version     text,
  accepted_terms_at timestamptz,
  blocked           boolean not null default false,   -- só o admin altera
  admin_note        text check (char_length(admin_note) <= 2000), -- anotação interna do admin
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.profiles add column if not exists blocked boolean not null default false;
alter table public.profiles add column if not exists admin_note text check (char_length(admin_note) <= 2000);

create or replace function public.is_blocked()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and blocked); $$;
grant execute on function public.is_blocked() to authenticated;

drop policy if exists "perfil: ver o próprio" on public.profiles;
create policy "perfil: ver o próprio" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "perfil: editar o próprio" on public.profiles;
create policy "perfil: editar o próprio" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- O usuário só pode alterar estes 3 campos (o aceite dos termos é via função).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, marketing_opt_in) on public.profiles to authenticated;
-- a anotação interna do admin não é exposta pela API (só pelas funções de admin)
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, phone, marketing_opt_in, is_adult_declared, terms_version,
              accepted_terms_at, blocked, created_at, updated_at) on public.profiles to authenticated;

-- Cria o perfil automaticamente quando alguém se cadastra (e-mail, Google ou Apple)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  meta     jsonb   := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  accepted boolean := coalesce(meta->>'accept_terms', '') = 'true';
  mkt      boolean := coalesce(meta->>'marketing_opt_in', '') = 'true';
  ver      text    := left(coalesce(meta->>'terms_version', ''), 20);
begin
  insert into public.profiles (id, full_name, marketing_opt_in, is_adult_declared, terms_version, accepted_terms_at)
  values (
    new.id,
    nullif(left(coalesce(meta->>'full_name', meta->>'name', ''), 120), ''),
    accepted and mkt,
    accepted and coalesce(meta->>'adult', '') = 'true',
    case when accepted then ver end,
    case when accepted then now() end
  )
  on conflict (id) do nothing;

  if accepted then
    insert into public.consent_logs (user_id, consent_type, granted, policy_version, details) values
      (new.id, 'termos_privacidade', true, ver, jsonb_build_object('origem', 'cadastro')),
      (new.id, 'marketing',          mkt,  ver, jsonb_build_object('origem', 'cadastro'));
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atualiza updated_at e registra mudança de consentimento de marketing
create or replace function public.profiles_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  if new.marketing_opt_in is distinct from old.marketing_opt_in then
    insert into public.consent_logs (user_id, consent_type, granted, policy_version, details)
    values (new.id, 'marketing', new.marketing_opt_in, new.terms_version,
            jsonb_build_object('origem', 'minha_conta'));
  end if;
  return new;
end $$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- Aceite de termos (usado por quem entrou com Google/Apple/código e ainda não aceitou)
create or replace function public.accept_terms(p_version text, p_marketing boolean default false)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;

  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;

  update public.profiles
     set terms_version     = left(p_version, 20),
         accepted_terms_at = now(),
         is_adult_declared = true,
         marketing_opt_in  = coalesce(p_marketing, false)
   where id = auth.uid();

  insert into public.consent_logs (user_id, consent_type, granted, policy_version, details)
  values (auth.uid(), 'termos_privacidade', true, left(p_version, 20),
          jsonb_build_object('origem', 'aceite_pos_login'));
end $$;

revoke execute on function public.accept_terms(text, boolean) from public, anon;
grant  execute on function public.accept_terms(text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 4) PRODUTOS (catálogo — sem venda no site; botão "Adquirir" vai pro WhatsApp)
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name        text not null check (char_length(name) between 2 and 120),
  description text check (char_length(description) <= 2000),
  category    text not null default 'outros' check (char_length(category) <= 40),
  price       numeric(10,2) check (price is null or price >= 0),
  image_url   text check (char_length(image_url) <= 600),
  badge       text check (char_length(badge) <= 24),
  shopee_url  text check (char_length(shopee_url) <= 600),
  tiktok_url  text check (char_length(tiktok_url) <= 600),
  featured    boolean not null default false,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.products enable row level security;

drop policy if exists "produtos: leitura pública" on public.products;
create policy "produtos: leitura pública" on public.products
  for select to anon, authenticated
  using (active or public.is_admin());

drop policy if exists "produtos: admin gerencia" on public.products;
create policy "produtos: admin gerencia" on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 5) PEDIDOS DE INTERESSE (registro de quem clicou em "Adquirir" logado)
-- ---------------------------------------------------------------------
create table if not exists public.interest_requests (
  id           bigint generated always as identity primary key,
  code         text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null check (char_length(product_name) <= 160),
  quantity     int  not null default 1 check (quantity between 1 and 999),
  note         text check (char_length(note) <= 500),
  status       text not null default 'novo' check (status in
                 ('novo','em_atendimento','confirmado','enviado','concluido','cancelado')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists interest_user_idx on public.interest_requests(user_id);
alter table public.interest_requests enable row level security;

drop policy if exists "pedidos: criar o próprio" on public.interest_requests;
create policy "pedidos: criar o próprio" on public.interest_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'novo' and not public.is_blocked());

drop policy if exists "pedidos: ver os próprios" on public.interest_requests;
create policy "pedidos: ver os próprios" on public.interest_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "pedidos: admin atualiza" on public.interest_requests;
create policy "pedidos: admin atualiza" on public.interest_requests
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pedidos: admin exclui" on public.interest_requests;
create policy "pedidos: admin exclui" on public.interest_requests
  for delete to authenticated using (public.is_admin());

-- Anti-spam: no máximo 20 pedidos por usuário por hora
create or replace function public.interest_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.interest_requests
       where user_id = new.user_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Muitos pedidos em pouco tempo. Tente novamente mais tarde.';
  end if;
  return new;
end $$;

drop trigger if exists interest_rate_limit on public.interest_requests;
create trigger interest_rate_limit before insert on public.interest_requests
  for each row execute function public.interest_rate_limit();

drop trigger if exists interest_touch on public.interest_requests;
create trigger interest_touch before update on public.interest_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 6) SOLICITAÇÕES DO TITULAR (LGPD art. 18)
-- ---------------------------------------------------------------------
create table if not exists public.data_requests (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null check (char_length(email) <= 254),
  request_type text not null check (request_type in
                 ('acesso','correcao','exclusao','portabilidade','revogacao_consentimento','informacao','outro')),
  message      text check (char_length(message) <= 2000),
  status       text not null default 'aberta' check (status in ('aberta','em_andamento','concluida','recusada')),
  response     text check (char_length(response) <= 2000),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
alter table public.data_requests enable row level security;

drop policy if exists "lgpd: criar a própria" on public.data_requests;
create policy "lgpd: criar a própria" on public.data_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'aberta' and response is null);

drop policy if exists "lgpd: ver as próprias" on public.data_requests;
create policy "lgpd: ver as próprias" on public.data_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "lgpd: admin atualiza" on public.data_requests;
create policy "lgpd: admin atualiza" on public.data_requests
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 7) LISTA DE ESPERA DA CALCULADORA DE MARKETPLACE (aba futura)
-- ---------------------------------------------------------------------
create table if not exists public.calculator_waitlist (
  id         bigint generated always as identity primary key,
  email      text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  user_id    uuid references auth.users(id) on delete cascade,
  consent    boolean not null check (consent),
  created_at timestamptz not null default now()
);
create unique index if not exists calculator_waitlist_email_uq on public.calculator_waitlist (lower(email));
alter table public.calculator_waitlist enable row level security;

drop policy if exists "calculadora: entrar na lista" on public.calculator_waitlist;
create policy "calculadora: entrar na lista" on public.calculator_waitlist
  for insert to anon, authenticated
  with check (consent and (user_id is null or user_id = auth.uid()));

drop policy if exists "calculadora: admin vê" on public.calculator_waitlist;
create policy "calculadora: admin vê" on public.calculator_waitlist
  for select to authenticated using (public.is_admin());

drop policy if exists "calculadora: admin remove" on public.calculator_waitlist;
create policy "calculadora: admin remove" on public.calculator_waitlist
  for delete to authenticated using (public.is_admin());

create or replace function public.waitlist_log_consent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.consent_logs (user_id, consent_type, granted, details)
  values (new.user_id, 'lista_calculadora', true, jsonb_build_object('lista_id', new.id));
  return new;
end $$;

drop trigger if exists waitlist_log_consent on public.calculator_waitlist;
create trigger waitlist_log_consent after insert on public.calculator_waitlist
  for each row execute function public.waitlist_log_consent();

-- ---------------------------------------------------------------------
-- 7.1) HISTÓRICO DO PAINEL (tudo que o admin altera fica registrado)
-- ---------------------------------------------------------------------
create table if not exists public.admin_audit (
  id         bigint generated always as identity primary key,
  admin_id   uuid,
  action     text not null,          -- insert / update / delete / bloquear ...
  entity     text not null,          -- products, interest_requests, cliente ...
  entity_id  text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit(created_at desc);
alter table public.admin_audit enable row level security;
drop policy if exists "historico: admin vê" on public.admin_audit;
create policy "historico: admin vê" on public.admin_audit
  for select to authenticated using (public.is_admin());
-- ninguém altera nem apaga o histórico pela API

create or replace function public.audit_row()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rnew jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  rold jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  diff jsonb;
begin
  if not public.is_admin_account() then return coalesce(new, old); end if; -- só ações do admin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(key, jsonb_build_object('de', rold -> key, 'para', value)), '{}'::jsonb)
      into diff
      from jsonb_each(rnew)
     where key not in ('updated_at') and rold -> key is distinct from value;
    if diff = '{}'::jsonb then return new; end if;
  elsif tg_op = 'INSERT' then diff := rnew - 'description';
  else diff := rold - 'description';
  end if;
  insert into public.admin_audit (admin_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(rnew ->> 'id', rold ->> 'id', rnew ->> 'key', rold ->> 'key'), diff);
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------
-- 7.2) CONFIGURAÇÕES DO SITE (editáveis no painel, sem mexer no código)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key check (key in (
               'shopeeUrl','tiktokUrl','instagramUrl','calculatorSalesUrl',
               'announcement','announcementLink','announcementOn')),
  value      text check (char_length(value) <= 600),
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "config: leitura pública" on public.site_settings;
create policy "config: leitura pública" on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists "config: admin altera" on public.site_settings;
create policy "config: admin altera" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 7.3) ACESSOS AO SITE (estatística própria, só com consentimento de cookies)
--      Sem IP, sem nome, sem e-mail: página, origem, tipo de aparelho e um
--      identificador aleatório do navegador.
-- ---------------------------------------------------------------------
create table if not exists public.site_visits (
  id         bigint generated always as identity primary key,
  visitor    uuid not null,
  path       text not null check (char_length(path) <= 200),
  referrer   text check (char_length(referrer) <= 120),
  device     text check (device in ('mobile','tablet','desktop')),
  logged_in  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists site_visits_created_idx on public.site_visits(created_at desc);
alter table public.site_visits enable row level security;
drop policy if exists "visitas: registrar" on public.site_visits;
create policy "visitas: registrar" on public.site_visits
  for insert to anon, authenticated with check (true);
drop policy if exists "visitas: admin vê" on public.site_visits;
create policy "visitas: admin vê" on public.site_visits
  for select to authenticated using (public.is_admin());

-- Resumo das visitas para o painel (fuso de São Paulo)
create or replace function public.admin_visit_stats(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare tz text := 'America/Sao_Paulo';
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  return (
    with v as (
      select *, (created_at at time zone tz)::date as dia
        from public.site_visits
       where created_at > now() - make_interval(days => greatest(1, least(p_days, 400)))
    )
    select jsonb_build_object(
      'visitas',   (select count(*) from v),
      'visitantes',(select count(distinct visitor) from v),
      'hoje',      (select count(*) from v where dia = (now() at time zone tz)::date),
      'logados',   (select count(*) from v where logged_in),
      'por_dia',   (select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'visitas', c, 'visitantes', u) order by dia), '[]'::jsonb)
                      from (select dia, count(*) c, count(distinct visitor) u from v group by dia) x),
      'paginas',   (select coalesce(jsonb_agg(jsonb_build_object('nome', path, 'total', c) order by c desc), '[]'::jsonb)
                      from (select path, count(*) c from v group by path order by c desc limit 10) x),
      'origens',   (select coalesce(jsonb_agg(jsonb_build_object('nome', coalesce(referrer, 'Direto / desconhecido'), 'total', c) order by c desc), '[]'::jsonb)
                      from (select referrer, count(*) c from v group by referrer order by c desc limit 10) x),
      'aparelhos', (select coalesce(jsonb_agg(jsonb_build_object('nome', coalesce(device, '?'), 'total', c) order by c desc), '[]'::jsonb)
                      from (select device, count(*) c from v group by device) x)
    )
  );
end $$;
revoke execute on function public.admin_visit_stats(int) from public, anon;
grant  execute on function public.admin_visit_stats(int) to authenticated;

-- ---------------------------------------------------------------------
-- 7.4) GESTÃO DE CLIENTES (editar, anotar, bloquear)
-- ---------------------------------------------------------------------
create or replace function public.admin_update_client(
  p_user uuid, p_full_name text, p_phone text, p_blocked boolean, p_note text)
returns void
language plpgsql security definer set search_path = public, auth
as $$
declare before jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if p_user = auth.uid() and p_blocked then raise exception 'Você não pode bloquear a sua própria conta'; end if;

  select to_jsonb(p) into before from public.profiles p where id = p_user;
  insert into public.profiles (id) values (p_user) on conflict (id) do nothing;
  update public.profiles
     set full_name  = nullif(left(trim(p_full_name), 120), ''),
         phone      = nullif(left(trim(p_phone), 30), ''),
         blocked    = coalesce(p_blocked, false),
         admin_note = nullif(left(p_note, 2000), '')
   where id = p_user;

  -- bloqueio de verdade no login (o Supabase recusa entrar e renovar a sessão)
  update auth.users
     set banned_until = case when p_blocked then now() + interval '100 years' else null end
   where id = p_user;

  insert into public.admin_audit (admin_id, action, entity, entity_id, details)
  values (auth.uid(),
          case when p_blocked and not coalesce((before->>'blocked')::boolean, false) then 'bloquear'
               when not p_blocked and coalesce((before->>'blocked')::boolean, false) then 'desbloquear'
               else 'update' end,
          'cliente', p_user::text,
          jsonb_build_object('nome', p_full_name, 'telefone', p_phone, 'bloqueado', p_blocked));
end $$;
revoke execute on function public.admin_update_client(uuid, text, text, boolean, text) from public, anon;
grant  execute on function public.admin_update_client(uuid, text, text, boolean, text) to authenticated;

-- Lista de administradores (só leitura no painel; incluir/remover admin é só pelo SQL)
create or replace function public.admin_list_admins()
returns table (email text, desde timestamptz)
language plpgsql stable security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  return query select u.email::text, a.created_at from public.admins a join auth.users u on u.id = a.user_id order by a.created_at;
end $$;
revoke execute on function public.admin_list_admins() from public, anon;
grant  execute on function public.admin_list_admins() to authenticated;

-- Gatilhos do histórico
drop trigger if exists audit_products on public.products;
create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_row();
drop trigger if exists audit_interest on public.interest_requests;
create trigger audit_interest after update or delete on public.interest_requests
  for each row execute function public.audit_row();
drop trigger if exists audit_data_requests on public.data_requests;
create trigger audit_data_requests after update on public.data_requests
  for each row execute function public.audit_row();
drop trigger if exists audit_settings on public.site_settings;
create trigger audit_settings after insert or update or delete on public.site_settings
  for each row execute function public.audit_row();
drop trigger if exists audit_waitlist on public.calculator_waitlist;
create trigger audit_waitlist after delete on public.calculator_waitlist
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- 8) FUNÇÕES DO TITULAR E DO ADMIN
-- ---------------------------------------------------------------------

-- O próprio usuário apaga a conta (LGPD art. 18, VI). Apaga perfil e pedidos em cascata.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  delete from public.calculator_waitlist where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;

-- Lista de clientes para o painel admin (junta e-mail do auth com o perfil)
drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, provider text, created_at timestamptz, last_sign_in_at timestamptz,
  email_confirmed_at timestamptz, full_name text, phone text, marketing_opt_in boolean,
  accepted_terms_at timestamptz, terms_version text, blocked boolean, admin_note text,
  is_admin boolean, pedidos bigint
)
language plpgsql stable security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  return query
    select u.id, u.email::text,
           coalesce(u.raw_app_meta_data->>'provider', 'email')::text,
           u.created_at, u.last_sign_in_at, u.email_confirmed_at,
           p.full_name, p.phone, coalesce(p.marketing_opt_in, false),
           p.accepted_terms_at, p.terms_version, coalesce(p.blocked, false), p.admin_note,
           exists (select 1 from public.admins a where a.user_id = u.id),
           (select count(*) from public.interest_requests r where r.user_id = u.id)
      from auth.users u
      left join public.profiles p on p.id = u.id
     order by u.created_at desc;
end $$;
revoke execute on function public.admin_list_users() from public, anon;
grant  execute on function public.admin_list_users() to authenticated;

-- Admin exclui um cadastro (ex.: atendendo a pedido de exclusão por e-mail)
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if p_user = auth.uid() then raise exception 'Use a área Minha conta para excluir a sua própria conta'; end if;
  insert into public.admin_audit (admin_id, action, entity, entity_id, details)
  select auth.uid(), 'delete', 'cliente', p_user::text, jsonb_build_object('email', email)
    from auth.users where id = p_user;
  delete from public.calculator_waitlist where user_id = p_user;
  delete from auth.users where id = p_user;
end $$;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant  execute on function public.admin_delete_user(uuid) to authenticated;

-- Números do painel
create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  return jsonb_build_object(
    'usuarios',          (select count(*) from auth.users),
    'usuarios_7d',       (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'marketing',         (select count(*) from public.profiles where marketing_opt_in),
    'pedidos',           (select count(*) from public.interest_requests),
    'pedidos_novos',     (select count(*) from public.interest_requests where status = 'novo'),
    'produtos',          (select count(*) from public.products where active),
    'lista_calculadora', (select count(*) from public.calculator_waitlist),
    'lgpd_abertas',      (select count(*) from public.data_requests where status in ('aberta','em_andamento')),
    'bloqueados',        (select count(*) from public.profiles where blocked),
    'visitas_hoje',      (select count(*) from public.site_visits where (created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date),
    'visitas_30d',       (select count(*) from public.site_visits where created_at > now() - interval '30 days'),
    'cookies_aceitos',   (select count(*) from public.consent_logs where consent_type = 'cookies' and granted),
    'cookies_recusados', (select count(*) from public.consent_logs where consent_type = 'cookies' and not granted)
  );
end $$;
revoke execute on function public.admin_stats() from public, anon;
grant  execute on function public.admin_stats() to authenticated;

-- Limpeza periódica (retenção mínima — LGPD art. 15/16).
-- Opcional: agende com pg_cron (Database > Extensions > pg_cron) e rode:
--   select cron.schedule('lgpd-limpeza', '0 4 * * 0', $$ select public.lgpd_cleanup(); $$);
create or replace function public.lgpd_cleanup()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- registros anônimos de cookies com mais de 2 anos
  delete from public.consent_logs
   where consent_type = 'cookies' and user_id is null and created_at < now() - interval '2 years';
  -- estatísticas de visitas com mais de 13 meses
  delete from public.site_visits where created_at < now() - interval '13 months';
  -- solicitações LGPD concluídas há mais de 5 anos
  delete from public.data_requests
   where status in ('concluida','recusada') and resolved_at < now() - interval '5 years';
end $$;
revoke execute on function public.lgpd_cleanup() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 9) ARMAZENAMENTO DE FOTOS DOS PRODUTOS (bucket público "produtos")
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "produtos: admin envia foto" on storage.objects;
create policy "produtos: admin envia foto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produtos' and public.is_admin());

drop policy if exists "produtos: admin altera foto" on storage.objects;
create policy "produtos: admin altera foto" on storage.objects
  for update to authenticated
  using (bucket_id = 'produtos' and public.is_admin());

drop policy if exists "produtos: admin apaga foto" on storage.objects;
create policy "produtos: admin apaga foto" on storage.objects
  for delete to authenticated
  using (bucket_id = 'produtos' and public.is_admin());

-- ---------------------------------------------------------------------
-- 10) PRODUTOS DE EXEMPLO (edite/apague pelo painel admin depois)
-- ---------------------------------------------------------------------
insert into public.products (slug, name, description, category, badge, featured, sort_order) values
  ('chaveiro-arrogante', 'Chaveiro Arrogante', 'Collab oficial com @helton.neygaucho. Acabamento fosco, argola de metal e detalhes caprichados.', 'chaveiros', 'Collab', true, 1),
  ('miniatura-neygaucho', 'Miniatura NeyGaucho "a mi no"', 'Busto colecionável com balão de fala. Collab oficial com @helton.neygaucho.', 'miniaturas', 'Collab', true, 2),
  ('chaveiro-bob', 'Chaveiro Bob', 'O cachorro mais famoso dos memes, agora no seu chaveiro.', 'chaveiros', 'Novo', true, 3),
  ('karambit-replica', 'Karambit Réplica Gamer', 'Réplica decorativa em tamanho real, leve e sem corte. Peça de coleção para o seu setup.', 'gamer', 'Mais vendido', true, 4),
  ('spinner-gamer', 'Spinner de Dedo Gamer', 'Spinner com design inspirado em games. Gira liso e silencioso.', 'gamer', null, false, 5),
  ('suporte-celular-parede', 'Suporte de Celular de Parede', 'Adesivo, sem furos. Deixa o celular carregando com segurança perto da tomada.', 'casa', null, true, 6),
  ('suporte-controle-remoto', 'Suporte Universal de Controle Remoto', 'Para controles de TV e ar-condicionado. Acompanha fita dupla face (também pode ser parafusado).', 'casa', null, false, 7),
  ('enfeite-natal-urso', 'Enfeite de Natal Urso Polar', 'Urso polar com gorro e textura de crochê, ~6,5 cm. Perfeito para a árvore.', 'natal', 'Natal', false, 8),
  ('enfeite-natal-rena', 'Enfeite de Natal Rena', 'Rena com textura de crochê, ~6,5 cm. Combina com o urso polar.', 'natal', 'Natal', false, 9)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 11) TORNE-SE ADMIN (rode DEPOIS de criar a sua conta no site)
--     Só quem está nesta tabela entra no painel — e sempre com 2FA.
--     Não existe botão no site para criar admin: é de propósito.
-- ---------------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'collection3d13@gmail.com'
-- on conflict do nothing;

-- ---------------------------------------------------------------------
-- 12) BANNERS DA PÁGINA INICIAL (editáveis no painel, com foto)
--     Sem nenhum banner ativo, o site mostra os banners padrão.
-- ---------------------------------------------------------------------
create table if not exists public.site_banners (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 2 and 90),
  subtitle    text check (char_length(subtitle) <= 220),
  image_url   text check (char_length(image_url) <= 600),
  button_text text check (char_length(button_text) <= 40),
  button_link text check (char_length(button_link) <= 600),
  theme       text not null default 'claro' check (theme in ('claro','verde','escuro','areia')),
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.site_banners enable row level security;
drop policy if exists "banners: leitura pública" on public.site_banners;
create policy "banners: leitura pública" on public.site_banners
  for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "banners: admin gerencia" on public.site_banners;
create policy "banners: admin gerencia" on public.site_banners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop trigger if exists banners_touch on public.site_banners;
create trigger banners_touch before update on public.site_banners
  for each row execute function public.touch_updated_at();
drop trigger if exists audit_banners on public.site_banners;
create trigger audit_banners after insert or update or delete on public.site_banners
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- 13) PERMISSÕES EXPLÍCITAS DA API
--     Funciona com "Automatically expose new tables" DESMARCADO (recomendado).
--     O que cada pessoa vê ou altera continua decidido pelas regras RLS acima.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- visitantes (sem login)
grant select on public.products, public.site_settings, public.site_banners to anon;
grant insert on public.consent_logs, public.calculator_waitlist, public.site_visits to anon;

-- usuários logados (inclui o admin; as regras RLS limitam cada um)
grant select, insert, update, delete on public.products, public.site_settings, public.site_banners to authenticated;
grant select, insert, update, delete on public.interest_requests to authenticated;
grant select, insert, update on public.data_requests to authenticated;
grant select, insert, delete on public.calculator_waitlist to authenticated;
grant select, insert on public.consent_logs, public.site_visits to authenticated;
grant select on public.admin_audit to authenticated;
-- profiles: permissões por coluna já definidas na seção 3
-- admins: sem acesso pela API (só pelas funções)

grant usage, select on all sequences in schema public to anon, authenticated;

-- Perdeu o celular do 2FA? Rode isto e cadastre o código de novo no painel:
-- delete from auth.mfa_factors
--  where user_id = (select id from auth.users where email = 'collection3d13@gmail.com');


-- =====================================================================
-- 14) MODELOS 3D (o mesmo conteúdo de modelos-3d.sql)
-- =====================================================================
create table if not exists public.models3d (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name         text not null check (char_length(name) between 2 and 120),
  description  text check (char_length(description) <= 2000),
  print_notes  text check (char_length(print_notes) <= 600),
  category     text not null default 'outros' check (char_length(category) <= 40),
  image_url    text check (char_length(image_url) <= 600),
  formats      text[] not null default array['STL']::text[]
                 check (cardinality(formats) between 1 and 4 and formats <@ array['STL','3MF','OBJ','STEP']::text[]),
  is_free      boolean not null default true,
  price        numeric(10,2) check (price is null or price >= 0),
  download_url text check (char_length(download_url) <= 600 and download_url ~ '^https://'),
  buy_url      text check (char_length(buy_url) <= 600 and buy_url ~ '^https://'),
  license      text not null default 'pessoal' check (license in ('pessoal','comercial')),
  badge        text check (char_length(badge) <= 24),
  active       boolean not null default true,
  sort_order   int not null default 0,
  downloads    int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- grátis precisa do link de download; pago precisa do link de compra (e nunca de link de download)
  constraint models3d_links check (
    case when is_free then download_url is not null and buy_url is null
         else buy_url is not null and download_url is null end)
);
alter table public.models3d enable row level security;

drop policy if exists "modelos: leitura pública" on public.models3d;
create policy "modelos: leitura pública" on public.models3d
  for select to anon, authenticated
  using (active or public.is_admin());

drop policy if exists "modelos: admin gerencia" on public.models3d;
create policy "modelos: admin gerencia" on public.models3d
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists models3d_touch on public.models3d;
create trigger models3d_touch before update on public.models3d
  for each row execute function public.touch_updated_at();

-- histórico do painel
drop trigger if exists audit_models3d on public.models3d;
create trigger audit_models3d after insert or update or delete on public.models3d
  for each row execute function public.audit_row();

-- Conta +1 download (só modelos grátis e visíveis). Não guarda quem baixou.
create or replace function public.count_model_download(p_id uuid)
returns void
language sql volatile security definer set search_path = public
as $$
  update public.models3d set downloads = downloads + 1
   where id = p_id and is_free and active;
$$;
revoke execute on function public.count_model_download(uuid) from public;
grant  execute on function public.count_model_download(uuid) to anon, authenticated;

-- o contador não pode ser alterado à mão por visitantes (só pela função acima)
grant select on public.models3d to anon;
grant select, insert, update, delete on public.models3d to authenticated;
