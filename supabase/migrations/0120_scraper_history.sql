-- 0120 — Historial del scraper: cada cuenta de IG deja su FICHA (scrape_accounts) y
-- cada búsqueda deja su CORRIDA (scrape_runs) con fotos y costo (real de Apify + estimado).
-- RLS: solo staff (admin/supervisor) lee; el edge (service_role) escribe.

-- Existía una scrape_runs huérfana (0 filas, sin código): la reemplazamos por la nueva.
drop table if exists public.scrape_runs cascade;

create table if not exists public.scrape_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  handle text not null,
  platform text not null default 'instagram',
  status text not null default 'active',   -- active | private | dead
  notes text,
  added_by uuid,
  added_at timestamptz not null default now(),
  last_run_at timestamptz,
  unique (creator_id, handle)
);
alter table public.scrape_accounts enable row level security;
drop policy if exists scrape_accounts_read on public.scrape_accounts;
create policy scrape_accounts_read on public.scrape_accounts for select using (public.is_staff());

create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid references public.scrape_accounts(id) on delete set null,
  kind text not null default 'account',    -- account | tema
  query text,                              -- @handle o los nichos usados
  run_at timestamptz not null default now(),
  found int not null default 0,            -- items que devolvió Apify
  saved int not null default 0,            -- guardadas nuevas (tras dedup)
  kept int,                                -- que pasaron el filtro IA (nullable)
  cost_real numeric,                       -- Apify usageTotalUsd (si vino)
  cost_est numeric,                        -- estimado = found * tarifa
  apify_status int,
  status text not null default 'ok',       -- ok | error | empty
  error text,
  run_by uuid
);
alter table public.scrape_runs enable row level security;
drop policy if exists scrape_runs_read on public.scrape_runs;
create policy scrape_runs_read on public.scrape_runs for select using (public.is_staff());
create index if not exists scrape_runs_creator_idx on public.scrape_runs (creator_id, run_at desc);
create index if not exists scrape_runs_account_idx on public.scrape_runs (account_id, run_at desc);

-- Tarifa estimada por foto del scraper (ajustable en /conexion). Apify IG ≈ US$2.3/1000 ≈ 0.0023.
insert into public.app_config (key, value, updated_at)
values ('scraper_cost_per_photo', '0.0023', now())
on conflict (key) do nothing;

-- Migrar las cuentas guía que hoy viven como texto en creator_search_profile.seed_accounts.
insert into public.scrape_accounts (creator_id, handle)
select sp.creator_id, lower(trim(both from a)) as handle
from public.creator_search_profile sp
cross join lateral unnest(coalesce(sp.seed_accounts, array[]::text[])) as a
where coalesce(trim(a), '') <> ''
on conflict (creator_id, handle) do nothing;

-- Sembrar last_run_at con la foto más reciente que ya trajimos de esa cuenta (proxy histórico).
update public.scrape_accounts sa
set last_run_at = v.mx
from (
  select creator_id, lower(source_handle) as h, max(created_at) as mx
  from public.creator_vault
  where kind = 'ref' and source_handle is not null
  group by 1, 2
) v
where v.creator_id = sa.creator_id and v.h = lower(sa.handle) and sa.last_run_at is null;
