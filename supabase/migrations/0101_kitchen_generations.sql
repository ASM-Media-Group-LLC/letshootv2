-- /kitchen: identidades API-nativas de las modelos + registro de cada generación
-- con su costo (para el contador de créditos). Solo staff. Ver [[julia-parker-soul]].
create table if not exists public.creator_identity (
  creator_id uuid primary key references public.profiles(id) on delete cascade,
  character_id text,
  status text not null default 'pending',
  n_photos int default 0,
  updated_at timestamptz not null default now()
);
alter table public.creator_identity enable row level security;
drop policy if exists creator_identity_staff on public.creator_identity;
create policy creator_identity_staff on public.creator_identity
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete set null,
  reference_url text,
  result_url text,
  request_id text,
  status text not null default 'queued',
  credits numeric,
  usd numeric,
  model text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists generations_creator_idx on public.generations (creator_id, created_at desc);
alter table public.generations enable row level security;
drop policy if exists generations_staff on public.generations;
create policy generations_staff on public.generations
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
