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

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()); $$;

grant execute on function public.is_admin() to anon, authenticated;

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
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.profiles enable row level security;

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
  with check (user_id = auth.uid() and status = 'novo');

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

-- Lista de cadastros para o painel admin (junta e-mail do auth com o perfil)
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, provider text, created_at timestamptz, last_sign_in_at timestamptz,
  email_confirmed_at timestamptz, full_name text, phone text, marketing_opt_in boolean,
  accepted_terms_at timestamptz, terms_version text, pedidos bigint
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
           p.accepted_terms_at, p.terms_version,
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
-- ---------------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'collection3d13@gmail.com'
-- on conflict do nothing;
