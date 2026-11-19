-- =====================================================================
--  COLLECTION 3D — Modelos 3D (arquivos STL / 3MF)
--  Como usar: Supabase > SQL Editor > New query > cole TUDO > RUN.
--  Pode rodar de novo sem problema.
--
--  • Grátis: o botão "Baixar" abre o seu link (Google Drive, etc.).
--  • Pagos: o botão "Comprar" abre a plataforma de venda (Kiwify, Hotmart,
--    Cults3D...). O arquivo pago NUNCA fica com link público aqui: quem
--    entrega é a plataforma, depois do pagamento.
--  • Só o admin (com 2FA) cria, edita ou apaga. Visitantes só leem.
--  • O contador de downloads não guarda nada de quem baixou (LGPD).
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
