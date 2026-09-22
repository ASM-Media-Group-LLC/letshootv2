-- Perfil de búsqueda POR MODELO para el scraper (Apify) + saldo/scraper config en app_config.
create table if not exists creator_search_profile (
  creator_id uuid primary key references profiles(id) on delete cascade,
  niches text[] not null default '{}',
  hashtags text[] not null default '{}',
  accounts text[] not null default '{}',
  notes text,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table creator_search_profile enable row level security;
drop policy if exists csp_staff_all on creator_search_profile;
create policy csp_staff_all on creator_search_profile for all using (is_staff()) with check (is_staff());
alter table creator_vault add column if not exists source_url text;
alter table creator_vault add column if not exists source_handle text;
alter table creator_vault add column if not exists likes bigint;
alter table creator_vault add column if not exists source_platform text;
